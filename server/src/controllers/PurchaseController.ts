import { Response } from 'express';
import { WalletService } from '../services/WalletService';
import { providerOrchestrator } from '../providers/ProviderOrchestrator';
import { Transaction } from '../models/Transaction';
import { ProductService } from '../services/ProductService';
import { User } from '../models/User';
import { EmailService } from '../services/EmailService';

/**
 * Shared purchase pattern used by every buy-* endpoint:
 *   1. Debit wallet up-front (fails fast on insufficient balance).
 *   2. Attempt delivery through the provider orchestrator (with failover).
 *   3. On success: log a delivered transaction.
 *   4. On failure: refund the wallet and log a failed transaction.
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

  // Pure balance mutation — throws (before any Transaction is written) if the
  // wallet can't cover it. No ledger row is created for a rejected attempt.
  await WalletService.debit(userId, userPrice);

  const ref = `${refPrefix}-${Date.now()}`;
  const result = await providerOrchestrator.executeWithFailover(providerMethod, { ...providerParams, ref });

  if (result.success) {
    // Single ledger row per purchase: negative amount = what left the wallet.
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
      paymentReference: ref
    });

    User.findById(userId).then((user) => {
      if (user) EmailService.sendPurchaseSuccess(user, { product: productMeta.name, recipient: productMeta.recipient, amount: userPrice, ref }).catch(() => {});
    }).catch(() => {});

    return { ok: true as const, ref, message: successMessage };
  }

  // Delivery failed — refund the balance mutation, then log a single failed row.
  await WalletService.credit(userId, userPrice);
  await Transaction.create({
    userId,
    amount: -userPrice,
    cost: 0,
    profit: 0,
    type: 'purchase',
    status: 'failed',
    deliveryStatus: 'failed',
    product: productMeta,
    paymentReference: ref,
    failReason: result.error
  });

  User.findById(userId).then((user) => {
    if (user) EmailService.sendPurchaseFailed(user, { product: productMeta.name, amount: userPrice, ref, reason: result.error }).catch(() => {});
  }).catch(() => {});

  return { ok: false as const, error: result.error || 'Delivery failed. You have been refunded.' };
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
      if (!product) return res.status(404).json({ success: false, error: 'Cable plan not found' });

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

      const markupPct = ProductService.markup['bills'] ?? 8;
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
