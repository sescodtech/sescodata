import { Response } from 'express';
import { WalletService } from '../services/WalletService';
import { providerOrchestrator } from '../providers/ProviderOrchestrator';
import { Transaction } from '../models/Transaction';
import { ProductService } from '../services/ProductService';
import { User } from '../models/User';
import { EmailService } from '../services/EmailService';
import { getTransactionLimit } from '../config/accountTiers';

/**
 * Production-safe purchase flow:
 *   1. Atomically acquire a per-user purchase lock — a concurrent duplicate
 *      request (double-tap, browser retry, network retry, duplicate API
 *      call) is rejected immediately instead of being processed twice.
 *   2. Atomically debit the wallet ($inc guarded by walletBalance >= amount
 *      in the same query) — this reserves the funds before calling
 *      GladTidings, closing the race window completely; no separate
 *      check-then-write steps exist to race against.
 *   3. Attempt delivery via GladTidingsProvider.
 *   4. On success: log a delivered transaction.
 *      On failure: atomically refund the exact amount just debited, log a
 *      failed (refunded) transaction.
 *   5. Always release the lock, success or failure.
 */
async function executePurchase(opts: {
  userId: string;
  userPrice: number;
  cost: number;
  productMeta: { productId: string; name: string; category: string; recipient: string; quantity: number };
  refPrefix: string;
  providerMethod: 'buyData' | 'buyAirtime' | 'buyCable' | 'buyElectricity' | 'buyExamPin' | 'buyRechargeCard';
  providerParams: any;
  successMessage: string;
}) {
  const { userId, userPrice, cost, productMeta, refPrefix, providerMethod, providerParams, successMessage } = opts;

  // Account tier limit: Basic accounts (no approved KYC) are capped per
  // transaction; Verified accounts (BVN + NIN reviewed and approved) get a
  // higher ceiling. Checked before the lock/debit so a request that would be
  // rejected never reserves funds.
  const buyer = await User.findById(userId).select('kycStatus');
  const limit = getTransactionLimit(buyer?.kycStatus);
  if (userPrice > limit) {
    throw new Error(`This transaction exceeds your account's limit of \u20a6${limit.toLocaleString('en-NG')}. Verify your account (BVN + NIN) in Settings to increase your limit.`);
  }

  const gotLock = await WalletService.acquirePurchaseLock(userId);
  if (!gotLock) throw new Error('A purchase is already in progress. Please wait a moment and check your transaction history before trying again.');

  const ref = `${refPrefix}-${Date.now()}`;

  try {
    // Reserve funds up front — atomic, so a concurrent request for the same
    // user cannot also pass this check before this one commits.
    await WalletService.debit(userId, userPrice);

    let result: any;
    try {
      // productId is included purely so ProviderOrchestrator can attach it to
      // diagnostics/logs — providers themselves ignore unknown params.
      result = await providerOrchestrator.executePurchase(providerMethod, { ...providerParams, productId: productMeta.productId, ref });
    } catch (e: any) {
      result = {
        success: false,
        error: 'Transaction could not be completed at the moment. Please try again shortly.',
        reference: undefined,
        usedProvider: undefined,
        failReason: 'network_error',
        data: { rawError: e.message, providerStatus: 'exception', durationMs: 0 },
      };
      console.error(`[purchase] ref=${ref} unexpected provider exception: ${e.message}`);
    }

    if (result.success) {
      await Transaction.create({
        userId,
        amount: -userPrice,
        cost,
        profit: userPrice - cost,
        type: 'purchase',
        status: 'success',
        deliveryStatus: 'delivered',
        product: productMeta,
        provider: { name: result.usedProvider, reference: result.reference },
        providerMethod,
        providerParams: { ...providerParams, ref },
        paymentReference: ref
      });

      User.findById(userId).then((user) => {
        if (user) EmailService.sendPurchaseSuccess(user, { product: productMeta.name, recipient: productMeta.recipient, amount: userPrice, ref }).catch(() => {});
      }).catch(() => {});

      return { ok: true as const, ref, message: successMessage };
    }

    // Delivery failed — refund the exact amount just reserved.
    const balanceAfterRefund = await WalletService.credit(userId, userPrice);
    console.log(`[purchase] ref=${ref} userId=${userId} FAILED and refunded amount=${userPrice} balanceAfterRefund=${balanceAfterRefund} reason=${result.error}`);
    // Internal diagnostics only — never sent to the customer. Logged
    // separately from the line above so Render's log stream shows the real
    // cause without needing a DB lookup.
    console.error(
      `[purchase-diagnostics] ref=${ref} product=${productMeta.productId} network=${result.data?.network || providerParams?.network || providerParams?.disco || providerParams?.provider || 'n/a'} ` +
      `purchaseType=${providerMethod} failReason=${result.failReason || 'n/a'} providerStatus=${result.data?.providerStatus || 'n/a'} durationMs=${result.data?.durationMs ?? 'n/a'} ` +
      `providerError=${result.data?.rawError || 'n/a'}`
    );

    // GladTidings can list a bundle as purchasable while its live catalog
    // still shows it, then reject it as unavailable at purchase time. This
    // is a narrow, exact-phrase match — only this specific unambiguous
    // signal auto-hides the product; every other failure reason (balance,
    // invalid phone, network error, etc.) leaves the catalog untouched.
    const providerErrorText = String(result.data?.rawError || '');
    const isPlanUnavailable = /not available (on|for) this network/i.test(providerErrorText);
    if (isPlanUnavailable) {
      const network = result.data?.network || providerParams?.network || providerParams?.disco || providerParams?.provider;
      ProductService.suppressProduct(productMeta.productId, { providerMessage: providerErrorText, network }).catch(() => {});
      console.warn(`[purchase-diagnostics] auto-suppressed product=${productMeta.productId} network=${network} for 6 days — provider says: ${providerErrorText}`);
    }
    // Customer-facing message: still no raw provider text leaked, but this
    // one specific, well-understood case gets an honest, non-misleading
    // message instead of "try again shortly" — we already know retrying
    // won't help, and the bundle is being hidden from the catalog right now.
    // Every other failure reason is completely unchanged.
    const customerMessage = isPlanUnavailable
      ? 'This plan is currently unavailable. Please choose a different plan.'
      : (result.error || 'Transaction could not be completed. Please try again shortly.');

    await Transaction.create({
      userId,
      amount: 0,
      cost: 0,
      profit: 0,
      type: 'purchase',
      status: 'failed',
      deliveryStatus: 'failed',
      product: productMeta,
      providerMethod,
      providerParams: { ...providerParams, ref },
      paymentReference: ref,
      failReason: customerMessage, // customer-safe message
      providerDiagnostics: {
        reference: ref,
        productId: productMeta.productId,
        network: result.data?.network || providerParams?.network || providerParams?.disco || providerParams?.provider,
        purchaseType: providerMethod,
        maskedRecipient: result.data?.maskedRecipient,
        providerFailReason: result.failReason,
        providerError: result.data?.rawError,
        providerStatus: result.data?.providerStatus,
        durationMs: result.data?.durationMs,
      }
    });

    User.findById(userId).then((user) => {
      if (user) EmailService.sendPurchaseFailed(user, { product: productMeta.name, amount: userPrice, ref, reason: customerMessage }).catch(() => {});
    }).catch(() => {});

    return { ok: false as const, error: customerMessage };
  } finally {
    await WalletService.releasePurchaseLock(userId);
  }
}

/**
 * Standalone export for the retry flow: re-attempts delivery for an
 * *existing* transaction. Debit/refund handling for retries stays in that
 * flow's own code — this just makes the GladTidings call.
 */
export async function attemptProviderDelivery(
  providerMethod: 'buyData' | 'buyAirtime' | 'buyCable' | 'buyElectricity' | 'buyExamPin' | 'buyRechargeCard',
  providerParams: any,
) {
  return providerOrchestrator.executePurchase(providerMethod, providerParams);
}

export class PurchaseController {
  static async buyData(req: any, res: Response) {
    try {
      const { productId, recipient, quantity = 1 } = req.body;
      const userId = req.user.id;

      const product = await ProductService.getProductById(productId);
      if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

      const cost = product.costPrice * quantity;
      const userPrice = product.sellingPrice * quantity;

      const result = await executePurchase({
        userId, userPrice, cost,
        productMeta: { productId, name: product.name, category: product.category, recipient, quantity },
        refPrefix: 'TXN',
        providerMethod: 'buyData',
        providerParams: { planId: product.providerId, phone: recipient, network: product.provider },
        successMessage: 'Data delivered successfully'
      });

      if (result.ok) return res.json({ success: true, message: result.message, ref: result.ref });
      return res.status(500).json({ success: false, error: result.error });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async buyAirtime(req: any, res: Response) {
    try {
      const { network, phone, amount, quantity = 1 } = req.body;
      const userId = req.user.id;

      const product = await ProductService.getProductById(`airtime_${String(network).toLowerCase()}`);
      if (!product) return res.status(404).json({ success: false, error: 'Airtime network not supported' });

      const cost = amount * quantity;
      const userPrice = amount * quantity;

      const result = await executePurchase({
        userId, userPrice, cost,
        productMeta: { productId: product.id, name: `${network} Airtime`, category: 'airtime', recipient: phone, quantity },
        refPrefix: 'AT',
        providerMethod: 'buyAirtime',
        providerParams: { network, phone, amount: amount * quantity },
        successMessage: 'Airtime delivered successfully'
      });

      if (result.ok) return res.json({ success: true, message: result.message, ref: result.ref });
      return res.status(500).json({ success: false, error: result.error });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async buyCable(req: any, res: Response) {
    try {
      const { productId, smartcard, phone } = req.body;
      const userId = req.user.id;

      const product = await ProductService.getProductById(productId);
      if (!product) return res.status(404).json({ success: false, error: 'Cable TV subscriptions are temporarily unavailable. Please check back soon.' });

      const cost = product.costPrice;
      const userPrice = product.sellingPrice;

      const result = await executePurchase({
        userId, userPrice, cost,
        productMeta: { productId, name: product.name, category: 'cable', recipient: smartcard, quantity: 1 },
        refPrefix: 'CB',
        providerMethod: 'buyCable',
        providerParams: { provider: product.provider, smartcard, planId: product.providerId, phone },
        successMessage: 'Cable subscription successful'
      });

      if (result.ok) return res.json({ success: true, message: result.message, ref: result.ref });
      return res.status(500).json({ success: false, error: result.error });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /** NEW — wires up buyElectricity, which every provider already implements but had no controller/route. */
  static async buyElectricity(req: any, res: Response) {
    try {
      const { disco, meter, amount, phone } = req.body;
      const userId = req.user.id;

      if (!disco || !meter || !amount) {
        return res.status(400).json({ success: false, error: 'disco, meter and amount are required' });
      }

      const isEnabled = await ProductService.isElectricityEnabled(disco);
      if (!isEnabled) {
        return res.status(404).json({ success: false, error: 'This electricity provider is currently unavailable. Please try again later.' });
      }

      const markupPct = await ProductService.getElectricityMarkup(disco);
      const cost = Number(amount);
      const userPrice = Math.ceil(cost * (1 + markupPct / 100));

      const result = await executePurchase({
        userId, userPrice, cost,
        productMeta: { productId: `electricity_${disco}`, name: `${disco} Electricity`, category: 'electricity', recipient: meter, quantity: 1 },
        refPrefix: 'EL',
        providerMethod: 'buyElectricity',
        providerParams: { disco, meter, amount: cost, phone },
        successMessage: 'Electricity token purchased successfully'
      });

      if (result.ok) return res.json({ success: true, message: result.message, ref: result.ref });
      return res.status(500).json({ success: false, error: result.error });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /** NEW — wires up buyExamPin (WAEC/NECO), previously unreachable despite full provider support. */
  static async buyExamPin(req: any, res: Response) {
    try {
      const { productId, quantity = 1 } = req.body;
      const userId = req.user.id;

      const product = await ProductService.getProductById(productId);
      if (!product) return res.status(404).json({ success: false, error: 'Exam PIN product not found' });

      const cost = product.costPrice * quantity;
      const userPrice = product.sellingPrice * quantity;

      const result = await executePurchase({
        userId, userPrice, cost,
        productMeta: { productId, name: product.name, category: 'education', recipient: '', quantity },
        refPrefix: 'EX',
        providerMethod: 'buyExamPin',
        providerParams: { examName: product.provider, quantity },
        successMessage: 'PIN(s) generated successfully'
      });

      if (result.ok) return res.json({ success: true, message: result.message, ref: result.ref });
      return res.status(500).json({ success: false, error: result.error });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /** NEW — wires up buyRechargeCard printing, same reasoning as above. */
  static async buyRechargeCard(req: any, res: Response) {
    try {
      const { network, amount, quantity = 1 } = req.body;
      const userId = req.user.id;

      const product = await ProductService.getProductById(`recharge_${String(network).toLowerCase()}_${amount}`);
      const unitCost = product?.costPrice ?? Number(amount);
      const cost = unitCost * quantity;
      const userPrice = cost;

      const result = await executePurchase({
        userId, userPrice, cost,
        productMeta: { productId: `recharge_${network}_${amount}`, name: `${network} \u20a6${amount} Recharge Card`, category: 'recharge', recipient: '', quantity },
        refPrefix: 'RC',
        providerMethod: 'buyRechargeCard',
        providerParams: { network, amount: Number(amount), quantity },
        successMessage: 'Recharge card PIN(s) generated successfully'
      });

      if (result.ok) return res.json({ success: true, message: result.message, ref: result.ref });
      return res.status(500).json({ success: false, error: result.error });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}
