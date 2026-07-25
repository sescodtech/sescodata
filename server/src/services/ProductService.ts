import axios from 'axios';
import { ProductOverride } from '../models/ProductOverride';

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
  /**
   * ROOT-CAUSE FIX (Production Stabilization, Priority 1): which upstream
   * API this plan's `providerId` is actually formatted for (e.g. a plan
   * with providerId 'mtn_sme_500_mb_1_weeks' is a Jarapoint plan code and
   * will be rejected if sent to GladTidings as-is). This field existed on
   * the internal RawPlan all along but was previously dropped when mapping
   * to Product, so PurchaseController had no way to route the purchase to
   * the correct provider first. See ProviderOrchestrator.executeWithFailover.
   */
  apiSource?: string;
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
  apiSource: string;
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
  // FIX (GladTidings-only launch): these two ids previously didn't match
  // GladTidingsProvider.buyElectricity's discoMap ('phed' / 'kano'), so
  // Port Harcourt and Kano purchases would always fail with "Unknown disco"
  // even when everything else worked. Ids below now match the provider.
  { id: 'phed', name: 'Port Harcourt PHED' },
  { id: 'ibedc', name: 'Ibadan Disco' },
  { id: 'kano', name: 'Kano Disco' },
];

export class ProductService {
  private static _dynamicCache = { plans: [] as RawPlan[], fetchedAt: 0 };
  private static readonly DYNAMIC_CACHE_TTL = 10 * 60 * 1000;

  // Single, platform-wide markup config (category -> % added on top of provider cost).
  // Replaces the old per-tenant markupSettings map. Admin can update this at runtime
  // via AdminController.setGlobalMarkup.
  static markup: Record<string, number> = {
    data: 10,
    airtime: 3,
    cable: 6,
    education: 8,
    recharge: 3,
    bills: 8
  };

  /**
   * GLADTIDINGS-ONLY LAUNCH (Priority 1): the static Jarapoint/CheapDataHub
   * data catalog (53 entries) and the 5 static Jarapoint-format cable plans
   * have been removed entirely — their plan codes are foreign-provider
   * formats that GladTidings rejects (see Priority-1 audit). Data plans now
   * come exclusively from the live fetchGladtidingsPlans() call below.
   * Cable has no verified GladTidings variation codes anywhere in this
   * codebase, so it stays disabled (see PurchaseController.buyCable and
   * UtilityBills.tsx) until real codes are sourced from GladTidings.
   *
   * The remaining static entries (airtime, exam pins, recharge cards) are
   * genuinely provider-agnostic — GladTidingsProvider's buyAirtime/
   * buyExamPin/buyRechargeCard never read `providerId` from the catalog at
   * all, so these work correctly against GladTidings today. apiSource is
   * tagged 'gladtidings' throughout since GladTidings is now the only
   * provider this platform ever calls.
   */
  private static readonly RAW: RawPlan[] = [
    // ── AIRTIME ──
    { id:'airtime_mtn',    name:'MTN Airtime',    validity:'', cat:'airtime', prov:'mtn',     providerId:'airtime_mtn', cost:100, planType:'airtime', apiSource:'gladtidings' },
    { id:'airtime_airtel', name:'Airtel Airtime', validity:'', cat:'airtime', prov:'airtel',  providerId:'airtime_airtel', cost:100, planType:'airtime', apiSource:'gladtidings' },
    { id:'airtime_glo',    name:'Glo Airtime',    validity:'', cat:'airtime', prov:'glo',     providerId:'airtime_glo', cost:100, planType:'airtime', apiSource:'gladtidings' },
    { id:'airtime_9mobile',name:'9mobile Airtime',validity:'', cat:'airtime', prov:'9mobile', providerId:'airtime_9mobile', cost:100, planType:'airtime', apiSource:'gladtidings' },
    // ── EXAM PINS ──
    { id:'waec_pin', name:'WAEC PIN', validity:'', cat:'education', prov:'waec', providerId:'waec', cost:3900, planType:'education', apiSource:'gladtidings' },
    { id:'neco_pin', name:'NECO PIN', validity:'', cat:'education', prov:'neco', providerId:'neco', cost:2700, planType:'education', apiSource:'gladtidings' },
    // ── RECHARGE CARDS ──
    { id:'recharge_mtn_100', name:'MTN ₦100',  validity:'', cat:'recharge', prov:'mtn', providerId:'100', cost:100, planType:'recharge', apiSource:'gladtidings' },
    { id:'recharge_mtn_200', name:'MTN ₦200',  validity:'', cat:'recharge', prov:'mtn', providerId:'200', cost:200, planType:'recharge', apiSource:'gladtidings' },
    { id:'recharge_mtn_500', name:'MTN ₦500',  validity:'', cat:'recharge', prov:'mtn', providerId:'500', cost:500, planType:'recharge', apiSource:'gladtidings' },
  ];

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
        const raw = (planGroups as any).ALL || (planGroups as any)[Object.keys(planGroups as object)[0]];
        if (!Array.isArray(raw)) continue;
        for (const item of raw) {
          const planId = item.dataplan_id || item.id;
          const cost = parseFloat(item.plan_amount || 0);
          const rawName = (item.plan || '').trim();
          if (!planId || !cost || !rawName) continue;
          plans.push({
            id: 'gtd_' + rawName.toLowerCase().replace(/\s+/g, '_'),
            name: rawName,
            validity: item.month_validate || '',
            cat: 'data',
            prov,
            providerId: String(planId),
            cost,
            planType: (item.plan_type || '').toUpperCase().includes('SME') ? 'sme' : 'gifting',
            apiSource: 'gladtidings',
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
      // GladTidings-only launch: this live fetch is now the sole source of
      // Data plans. No other provider's catalog is ever merged in.
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
    const [allPlans, overrides] = await Promise.all([
      this.getAllPlans(),
      ProductOverride.find(),
    ]);
    const overrideMap = new Map(overrides.map((o) => [o.productId, o]));

    return allPlans
      .map(plan => {
        const category = plan.cat || 'data';
        const override = overrideMap.get(plan.id);
        const markupPct = override?.customMarkupPct ?? this.markup[category] ?? 10;
        const computedPrice = Math.ceil(plan.cost * (1 + markupPct / 100));
        const sellingPrice = override?.customSellingPrice ?? computedPrice;

        return {
          id: plan.id,
          name: plan.name,
          category,
          provider: plan.prov,
          providerId: plan.providerId,
          apiSource: plan.apiSource,
          costPrice: plan.cost, // NOTE: only ever return this to admin-facing endpoints
          sellingPrice,
          validity: plan.validity,
          planType: plan.planType,
          isPromo: false,
          enabled: override?.enabled ?? true,
          visible: override?.visible ?? true,
        };
      })
      .filter((p) => p.enabled);
  }

  static async getPublicCatalog() {
    const catalog = await this.getCatalog();
    // Strip internal cost price before it ever reaches the customer-facing client,
    // and hide anything an admin has marked not-visible (unlisted, still directly purchasable).
    return catalog.filter((p) => p.visible).map(({ costPrice, apiSource, ...rest }) => rest);
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
    const [allPlans, overrides] = await Promise.all([
      this.getAllPlans(),
      ProductOverride.find(),
    ]);
    const overrideMap = new Map(overrides.map((o) => [o.productId, o]));

    const catalogProducts: Product[] = allPlans.map((plan) => {
      const category = plan.cat || 'data';
      const override = overrideMap.get(plan.id);
      const markupPct = override?.customMarkupPct ?? this.markup[category] ?? 10;
      const computedPrice = Math.ceil(plan.cost * (1 + markupPct / 100));
      return {
        id: plan.id,
        name: plan.name,
        category,
        provider: plan.prov,
        providerId: plan.providerId,
        apiSource: plan.apiSource,
        costPrice: plan.cost,
        sellingPrice: override?.customSellingPrice ?? computedPrice,
        validity: plan.validity,
        planType: plan.planType,
        isPromo: false,
        enabled: override?.enabled ?? true,
        visible: override?.visible ?? true,
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
    const override = await ProductOverride.findOne({ productId: `electricity_${disco}` });
    return override?.customMarkupPct ?? this.markup['bills'] ?? 8;
  }

  /** Whether an admin has disabled purchases for a given disco. Defaults to enabled — identical to pre-Module-5 behavior when no override exists. */
  static async isElectricityEnabled(disco: string): Promise<boolean> {
    const override = await ProductOverride.findOne({ productId: `electricity_${disco}` });
    return override?.enabled ?? true;
  }
}
