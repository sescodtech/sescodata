import axios from 'axios';
import { ProductOverride } from '../models/ProductOverride';
import { SuppressedProduct } from '../models/SuppressedProduct';
import { MarkupSettings } from '../models/MarkupSettings';

export interface Product {
  id: string;
  name: string;
  category: string;
  provider: string;
  providerId: string;
  costPrice: number;
  sellingPrice: number;
  validity?: string;
  planType?: string;
  isPromo: boolean;
  originalPrice?: number;
  enabled?: boolean;
  visible?: boolean;
}

interface RawPlan {
  id: string;
  name: string;
  validity: string;
  cat: string;
  prov: string;
  providerId: string;
  cost: number;
  planType: string;
}

/**
 * Electricity has no catalog entry in RAW — PurchaseController.buyElectricity
 * takes disco/meter/amount directly from the customer and computes price as
 * amount * (1 + markup%) on the fly, since the amount itself is user-chosen
 * rather than a fixed plan. This static list is what Module 5 manages
 * (enable/disable, custom markup per disco) — the same 6 discos already
 * hardcoded in the customer-facing UtilityBills.tsx picker.
 */
export const ELECTRICITY_DISCOS = [
  { id: 'ikedc', name: 'Ikeja Electric' },
  { id: 'ekedc', name: 'Eko Electric' },
  { id: 'aedc', name: 'Abuja Electric' },
  { id: 'phed', name: 'Port Harcourt PHED' },
  { id: 'ibedc', name: 'Ibadan Disco' },
  { id: 'kano', name: 'Kano Disco' },
];

export class ProductService {
  private static _dynamicCache = { plans: [] as RawPlan[], fetchedAt: 0 };
  private static readonly DYNAMIC_CACHE_TTL = 10 * 60 * 1000;

  // Single, platform-wide markup config (category -> % added on top of provider cost).
  // Persisted in MongoDB (MarkupSettings) — see getMarkupConfig/setMarkupConfig below.
  // A previous in-memory-only version of this was lost on every server restart.
  private static readonly DEFAULT_MARKUP: Record<string, number> = {
    data: 10,
    airtime: 3,
    cable: 6,
    education: 8,
    recharge: 3,
    bills: 8
  };
  private static _markupCache: { data: Record<string, number>; expiresAt: number } | null = null;

  static async getMarkupConfig(): Promise<Record<string, number>> {
    if (this._markupCache && this._markupCache.expiresAt > Date.now()) return this._markupCache.data;
    let doc = await MarkupSettings.findOne({ singleton: 'default' });
    if (!doc) {
      doc = await MarkupSettings.create({ singleton: 'default', markup: this.DEFAULT_MARKUP });
    }
    const data = { ...this.DEFAULT_MARKUP, ...Object.fromEntries(doc.markup as any) };
    this._markupCache = { data, expiresAt: Date.now() + 10_000 };
    return data;
  }

  /** Admin-facing write path — persists to MongoDB and invalidates the cache immediately so the next read (including this same request's response) reflects it. */
  static async setMarkupConfig(updates: Record<string, number>): Promise<Record<string, number>> {
    const current = await this.getMarkupConfig();
    const merged = { ...current, ...updates };
    await MarkupSettings.findOneAndUpdate({ singleton: 'default' }, { $set: { markup: merged } }, { upsert: true });
    this._markupCache = null;
    return merged;
  }

  private static readonly RAW: RawPlan[] = [
    // ── DATA ──
    // Data plans come exclusively from fetchGladtidingsPlans() below, which
    // pulls real dataplan_id codes live from GladTidings' /api/user/
    // endpoint for MTN/Glo/Airtel/9mobile. See getAllPlans().

    // ── AIRTIME ──
    // GladTidingsProvider.buyAirtime only needs network + phone + amount,
    // no plan code, so these are safe to keep static.
    { id:'airtime_mtn',    name:'MTN Airtime',    validity:'', cat:'airtime', prov:'mtn',     providerId:'airtime_mtn', cost:100, planType:'airtime' },
    { id:'airtime_airtel', name:'Airtel Airtime', validity:'', cat:'airtime', prov:'airtel',  providerId:'airtime_airtel', cost:100, planType:'airtime' },
    { id:'airtime_glo',    name:'Glo Airtime',    validity:'', cat:'airtime', prov:'glo',     providerId:'airtime_glo', cost:100, planType:'airtime' },
    { id:'airtime_9mobile',name:'9mobile Airtime',validity:'', cat:'airtime', prov:'9mobile', providerId:'airtime_9mobile', cost:100, planType:'airtime' },

    // ── CABLE ──
    // Excluded from the customer-facing catalog (see TEMP_DISABLED_CATEGORIES
    // below) — no verified GladTidings cable variation codes exist yet.
    // Kept here for admin visibility and future re-enablement only.
    { id:'dstv_premium', name:'DSTV Premium', validity:'1 Month', cat:'cable', prov:'dstv_subscription', providerId:'dstv_subscription_1_months_dstv_premium', cost:44500, planType:'cable' },
    { id:'dstv_compact', name:'DSTV Compact', validity:'1 Month', cat:'cable', prov:'dstv_subscription', providerId:'dstv_subscription_1_months_dstv_compact', cost:30000, planType:'cable' },
    { id:'dstv_confam',  name:'DSTV Confam',  validity:'1 Month', cat:'cable', prov:'dstv_subscription', providerId:'dstv_subscription_1_months_dstv_confam',  cost:12750, planType:'cable' },
    { id:'gotv_supa',    name:'GOTV Supa',    validity:'1 Month', cat:'cable', prov:'gotv_subscription', providerId:'gotv_subscription_1_months_gotv_supa', cost:11400, planType:'cable' },
    { id:'gotv_max',     name:'GOTV Max',     validity:'1 Month', cat:'cable', prov:'gotv_subscription', providerId:'gotv_subscription_1_months_gotv_max', cost:8500, planType:'cable' },

    // ── EXAM PINS ──
    // GladTidingsProvider.buyExamPin only sends exam_name + quantity, no providerId.
    { id:'waec_pin', name:'WAEC PIN', validity:'', cat:'education', prov:'waec', providerId:'waec', cost:3900, planType:'education' },
    { id:'neco_pin', name:'NECO PIN', validity:'', cat:'education', prov:'neco', providerId:'neco', cost:2700, planType:'education' },

    // ── RECHARGE CARDS ──
    // GladTidingsProvider.buyRechargeCard ignores providerId, using its own
    // internal network+amount -> networkAmountId map instead.
    { id:'recharge_mtn_100', name:'MTN ₦100',  validity:'', cat:'recharge', prov:'mtn', providerId:'100', cost:100, planType:'recharge' },
    { id:'recharge_mtn_200', name:'MTN ₦200',  validity:'', cat:'recharge', prov:'mtn', providerId:'200', cost:200, planType:'recharge' },
    { id:'recharge_mtn_500', name:'MTN ₦500',  validity:'', cat:'recharge', prov:'mtn', providerId:'500', cost:500, planType:'recharge' },
  ];

  /**
   * Categories temporarily withheld from the customer-facing catalog: no
   * verified GladTidings product ID exists for these yet, so they're
   * excluded here rather than left purchasable and failing at the provider.
   */
  private static readonly TEMP_DISABLED_CATEGORIES: string[] = ['cable'];

  private static async fetchGladtidingsPlans(): Promise<RawPlan[]> {
    const GLAD_KEY = process.env.GLADTIDINGS_API_KEY;
    if (!GLAD_KEY) return [];
    try {
      const r = await axios.get('https://www.gladtidingsdata.com/api/user/', {
        headers: { Authorization: 'Token ' + GLAD_KEY },
        timeout: 15000,
      });
      const Dataplans = r.data?.Dataplans;
      if (!Dataplans) return [];

      const plans: RawPlan[] = [];
      const GTD_NET = { MTN_PLAN:'mtn', GLO_PLAN:'glo', AIRTEL_PLAN:'airtel', '9MOBILE_PLAN':'9mobile' };

      for (const [planKey, planGroups] of Object.entries(Dataplans)) {
        const prov = GTD_NET[planKey as keyof typeof GTD_NET];
        if (!prov) continue;

        // Merge every sub-group (not just 'ALL') since GladTidings doesn't
        // always keep 'ALL' in sync with newer categories per network, then
        // dedupe by dataplan_id since groups can overlap.
        const groupKeys = Object.keys(planGroups as object);
        const merged: any[] = groupKeys
          .map((k) => (planGroups as any)[k])
          .filter((v) => Array.isArray(v))
          .flat();
        const seen = new Set<string>();
        const raw: any[] = [];
        for (const item of merged) {
          const key = String(item.dataplan_id || item.id);
          if (seen.has(key)) continue;
          seen.add(key);
          raw.push(item);
        }
        if (raw.length === 0) continue;

        for (const item of raw) {
          const planId = item.dataplan_id || item.id;
          const cost = parseFloat(item.plan_amount || 0);
          const rawName = (item.plan || '').trim();
          if (!planId || !cost || !rawName) continue;
          const rawType = (item.plan_type || '').toUpperCase();
          let planType: string;
          if (rawType.includes('SME')) planType = 'sme';
          else if (rawType.includes('AWOOF')) planType = 'awoof';
          else if (rawType.includes('TALKMORE') || rawType.includes('TALK MORE')) planType = 'talkmore';
          else if (rawType.includes('CORPORATE')) planType = 'corporate_gifting';
          else planType = 'gifting';

          plans.push({
            id: 'gtd_' + prov + '_' + planId,
            name: rawName,
            validity: item.month_validate || '',
            cat: 'data',
            prov,
            providerId: String(planId),
            cost,
            planType,
          });
        }
      }
      return plans;
    } catch(e) {
      console.warn('GladtidingsData: could not fetch plans', e);
      return [];
    }
  }

  static async getAllPlans(): Promise<RawPlan[]> {
    const now = Date.now();
    if (now - this._dynamicCache.fetchedAt < this.DYNAMIC_CACHE_TTL) {
      return [...this.RAW, ...this._dynamicCache.plans];
    }
    try {
      // GladTidings-only launch: this is now the ONLY source of Data plans.
      // No Jarapoint/CheapDataHub fan-out — see fetchGladtidingsPlans() above.
      const gtdPlans = await this.fetchGladtidingsPlans();
      const staticIds = new Set(this.RAW.map(p => p.id));
      const dynamic = gtdPlans.filter(p => !staticIds.has(p.id));
      this._dynamicCache = { plans: dynamic, fetchedAt: now };
      return [...this.RAW, ...this._dynamicCache.plans];
    } catch(e) {
      console.error('getAllPlans error:', e);
      return [...this.RAW];
    }
  }

  /**
   * Purchase-safe catalog: every product a customer could currently buy.
   * Applies admin overrides (custom price/markup) and excludes anything
   * an admin has disabled — but keeps "invisible" (unlisted) products
   * resolvable here, since getProductById relies on this for purchases.
   */
  static async getCatalog() {
    const [allPlans, overrides, markup, suppressedIds] = await Promise.all([
      this.getAllPlans(),
      ProductOverride.find(),
      this.getMarkupConfig(),
      this.getSuppressedProductIds(),
    ]);
    const overrideMap = new Map(overrides.map((o) => [o.productId, o]));

    return allPlans
      .map(plan => {
        const category = plan.cat || 'data';
        const override = overrideMap.get(plan.id);
        const markupPct = override?.customMarkupPct ?? markup[category] ?? 10;
        const computedPrice = Math.ceil(plan.cost * (1 + markupPct / 100));
        const sellingPrice = override?.customSellingPrice ?? computedPrice;

        return {
          id: plan.id,
          name: plan.name,
          category,
          provider: plan.prov,
          providerId: plan.providerId,
          costPrice: plan.cost, // NOTE: only ever return this to admin-facing endpoints
          sellingPrice,
          validity: plan.validity,
          planType: plan.planType,
          isPromo: false,
          enabled: override?.enabled ?? true,
          visible: override?.visible ?? true,
        };
      })
      // GladTidings-only launch: categories with no verified GladTidings
      // product ID (currently just 'cable') are excluded from the
      // purchase-safe catalog entirely, so buyCable can never resolve a
      // product and no customer can reach a failed purchase.
      .filter((p) => !this.TEMP_DISABLED_CATEGORIES.includes(p.category))
      .filter((p) => p.enabled)
      // Temporarily withheld because GladTidings itself just rejected this
      // exact product as unavailable — see SuppressedProduct. Self-expires,
      // so this filter naturally stops applying once the window passes.
      .filter((p) => !suppressedIds.has(p.id));
  }

  /** Product IDs GladTidings has explicitly rejected as unavailable recently.
   *  Expired entries are already gone from Mongo (TTL index) — this is a
   *  plain read, no cleanup needed here. */
  static async getSuppressedProductIds(): Promise<Set<string>> {
    const docs = await SuppressedProduct.find({}, { productId: 1 }).lean();
    return new Set(docs.map((d: any) => d.productId));
  }

  /** Called by PurchaseController when GladTidings explicitly signals a
   *  specific product is unavailable — not for generic failures. Self-heals
   *  via TTL; if still unavailable next attempt, this just re-suppresses it
   *  for another window. Default 6 days — long enough that a bundle GladTidings
   *  pulls for a while doesn't quietly reappear and fail again; admins can
   *  clear it early any time via unsuppressProduct(). */
  static async suppressProduct(productId: string, opts: { providerMessage?: string; network?: string; ttlHours?: number }) {
    const ttlHours = opts.ttlHours ?? 144;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await SuppressedProduct.findOneAndUpdate(
      { productId },
      { productId, reason: 'provider_unavailable', providerMessage: opts.providerMessage, network: opts.network, suppressedAt: new Date(), expiresAt },
      { upsert: true }
    ).catch(() => {});
  }

  /** Admin manual override — brings a suppressed bundle back into the
   *  catalog immediately instead of waiting out the TTL. No-op (still
   *  succeeds) if the product wasn't suppressed. */
  static async unsuppressProduct(productId: string): Promise<boolean> {
    const result = await SuppressedProduct.deleteOne({ productId });
    return result.deletedCount > 0;
  }

  static async getPublicCatalog() {
    const catalog = await this.getCatalog();
    // Strip internal cost price before it ever reaches the customer-facing client,
    // and hide anything an admin has marked not-visible (unlisted, still directly purchasable).
    return catalog.filter((p) => p.visible).map(({ costPrice, ...rest }) => rest);
  }

  static async getProductById(productId: string) {
    const catalog = await this.getCatalog();
    return catalog.find(p => p.id === productId);
  }

  // ============================================================
  // Module 5 — Admin Product & Pricing Management
  // ============================================================

  /**
   * Unfiltered catalog for the admin product management screen — includes
   * disabled/invisible products (the admin needs to see and re-enable them),
   * unlike getCatalog() which is purchase-safe and excludes disabled items.
   */
  static async getFullCatalogForAdmin(): Promise<Product[]> {
    const [allPlans, overrides, markup, suppressedDocs] = await Promise.all([
      this.getAllPlans(),
      ProductOverride.find(),
      this.getMarkupConfig(),
      SuppressedProduct.find().lean(),
    ]);
    const overrideMap = new Map(overrides.map((o) => [o.productId, o]));
    const suppressedMap = new Map(suppressedDocs.map((d: any) => [d.productId, d]));

    const catalogProducts: Product[] = allPlans.map((plan) => {
      const category = plan.cat || 'data';
      const override = overrideMap.get(plan.id);
      const markupPct = override?.customMarkupPct ?? markup[category] ?? 10;
      const computedPrice = Math.ceil(plan.cost * (1 + markupPct / 100));
      const suppression = suppressedMap.get(plan.id);
      return {
        id: plan.id,
        name: plan.name,
        category,
        provider: plan.prov,
        providerId: plan.providerId,
        costPrice: plan.cost,
        sellingPrice: override?.customSellingPrice ?? computedPrice,
        validity: plan.validity,
        planType: plan.planType,
        isPromo: false,
        enabled: override?.enabled ?? true,
        visible: override?.visible ?? true,
        // Admin-only diagnostic info — not part of the customer-facing catalog.
        // Present only when GladTidings has recently rejected this exact
        // product as unavailable; disappears on its own once it expires.
        ...(suppression ? {
          suppressed: true,
          suppressedReason: suppression.providerMessage,
          suppressedUntil: suppression.expiresAt,
        } as any : {}),
      };
    });

    // Electricity has no fixed plan price (amount is user-chosen at purchase
    // time), so it's represented here with costPrice/sellingPrice both 0 —
    // the admin UI shows its markup % instead of a fixed price.
    const electricityProducts: Product[] = ELECTRICITY_DISCOS.map((disco) => {
      const productId = `electricity_${disco.id}`;
      const override = overrideMap.get(productId);
      return {
        id: productId,
        name: disco.name,
        category: 'electricity',
        provider: disco.id,
        providerId: disco.id,
        costPrice: 0,
        sellingPrice: 0,
        planType: 'electricity',
        isPromo: false,
        enabled: override?.enabled ?? true,
        visible: override?.visible ?? true,
      };
    });

    return [...catalogProducts, ...electricityProducts];
  }

  /** Effective markup % for a given disco — a per-disco override if the admin set one, otherwise the global 'bills' category markup (identical to pre-Module-5 behavior). */
  static async getElectricityMarkup(disco: string): Promise<number> {
    const [override, markup] = await Promise.all([
      ProductOverride.findOne({ productId: `electricity_${disco}` }),
      this.getMarkupConfig(),
    ]);
    return override?.customMarkupPct ?? markup['bills'] ?? 8;
  }

  /** Whether an admin has disabled purchases for a given disco. Defaults to enabled — identical to pre-Module-5 behavior when no override exists. */
  static async isElectricityEnabled(disco: string): Promise<boolean> {
    const override = await ProductOverride.findOne({ productId: `electricity_${disco}` });
    return override?.enabled ?? true;
  }
}
