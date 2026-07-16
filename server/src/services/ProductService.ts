import axios from 'axios';
import { IProvider } from '../providers/IProvider';

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

  private static readonly RAW: RawPlan[] = [
    // ── MTN DATA (Jarapoint SME plans) ──
    { id:'mtn_sme_1_weeks_500_mb',    name:'MTN 500MB',  validity:'1 Week',   cat:'data', prov:'mtn', providerId:'mtn_sme_500_mb_1_weeks',    cost:325,  planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_weeks_1_gb',      name:'MTN 1GB',    validity:'1 Week',   cat:'data', prov:'mtn', providerId:'mtn_sme_1_gb_1_weeks',      cost:470,  planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_months_1_gb',     name:'MTN 1GB',    validity:'1 Month',  cat:'data', prov:'mtn', providerId:'mtn_sme_1_gb_1_months',     cost:575,  planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_months_1.2_gb',   name:'MTN 1.2GB',  validity:'1 Month',  cat:'data', prov:'mtn', providerId:'mtn_sme_1.2_gb_1_months',   cost:497,  planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_weeks_2_gb',      name:'MTN 2GB',    validity:'1 Week',   cat:'data', prov:'mtn', providerId:'mtn_sme_2_gb_1_weeks',      cost:930,  planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_months_2_gb',     name:'MTN 2GB',    validity:'1 Month',  cat:'data', prov:'mtn', providerId:'mtn_sme_2_gb_1_months',     cost:965,  planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_2_days_3.2_gb',     name:'MTN 3.2GB',  validity:'2 Days',   cat:'data', prov:'mtn', providerId:'mtn_sme_3.2_gb_2_days',     cost:1195, planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_7_days_3_gb',       name:'MTN 3GB',    validity:'7 Days',   cat:'data', prov:'mtn', providerId:'mtn_sme_3_gb_7_days',       cost:1375, planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_months_3_gb',     name:'MTN 3GB',    validity:'1 Month',  cat:'data', prov:'mtn', providerId:'mtn_sme_3_gb_1_months',     cost:1444, planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_weeks_3.5_gb',    name:'MTN 3.5GB',  validity:'1 Week',   cat:'data', prov:'mtn', providerId:'mtn_sme_3.5_gb_1_weeks',    cost:1700, planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_months_5_gb',     name:'MTN 5GB',    validity:'1 Month',  cat:'data', prov:'mtn', providerId:'mtn_sme_5_gb_1_months',     cost:1975, planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_weeks_6_gb',      name:'MTN 6GB',    validity:'1 Week',   cat:'data', prov:'mtn', providerId:'mtn_sme_6_gb_1_weeks',      cost:2875, planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_weeks_11_gb',     name:'MTN 11GB',   validity:'1 Week',   cat:'data', prov:'mtn', providerId:'mtn_sme_11_gb_1_weeks',     cost:4220, planType:'sme',       apiSource:'jarapoint' },
    { id:'mtn_sme_1_weeks_20_gb',     name:'MTN 20GB',   validity:'1 Week',   cat:'data', prov:'mtn', providerId:'mtn_sme_20_gb_1_weeks',      cost:6250, planType:'corporate', apiSource:'jarapoint' },
    { id:'mtn_sme_1_months_36_gb',    name:'MTN 36GB',   validity:'1 Month',  cat:'data', prov:'mtn', providerId:'mtn_sme_36_gb_1_months',    cost:12995,planType:'corporate', apiSource:'jarapoint' },
    { id:'mtn_sme_1_months_60_gb',    name:'MTN 60GB',   validity:'1 Month',  cat:'data', prov:'mtn', providerId:'mtn_sme_60_gb_1_months',    cost:18500,planType:'corporate', apiSource:'jarapoint' },
    { id:'mtn_sme_1_months_120_gb',   name:'MTN 120GB',  validity:'1 Month',  cat:'data', prov:'mtn', providerId:'mtn_sme_120_gb_1_months',   cost:30000,planType:'corporate', apiSource:'jarapoint' },
    { id:'mtn_gifting_1gb_1day',      name:'MTN 1GB',    validity:'1 Day',    cat:'data', prov:'mtn', providerId:'mtn_gifting_1gb_1day',      cost:310,  planType:'gifting',   apiSource:'cheapdatahub' },
    { id:'mtn_gifting_2gb_1day',      name:'MTN 2GB',    validity:'1 Day',    cat:'data', prov:'mtn', providerId:'mtn_gifting_2gb_1day',      cost:550,  planType:'gifting',   apiSource:'cheapdatahub' },
    // ── AIRTEL DATA ──
    { id:'airtel_sme_1_weeks_500_mb', name:'Airtel 500MB',validity:'1 Week',  cat:'data', prov:'airtel', providerId:'airtel_sme_500_mb_1_weeks',  cost:525,  planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_1_weeks_1_gb',   name:'Airtel 1GB', validity:'1 Week',   cat:'data', prov:'airtel', providerId:'airtel_sme_1_gb_1_weeks',    cost:835,  planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_1_weeks_1.5_gb', name:'Airtel 1.5GB',validity:'1 Week', cat:'data', prov:'airtel', providerId:'airtel_sme_1.5_gb_1_weeks',  cost:595,  planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_1_months_2_gb',  name:'Airtel 2GB', validity:'1 Month',  cat:'data', prov:'airtel', providerId:'airtel_sme_2_gb_1_months',   cost:1620, planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_2_days_3.2_gb',  name:'Airtel 3.2GB',validity:'2 Days', cat:'data', prov:'airtel', providerId:'airtel_sme_3.2_gb_2_days',   cost:1070, planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_1_weeks_3.5_gb', name:'Airtel 3.5GB',validity:'1 Week', cat:'data', prov:'airtel', providerId:'airtel_sme_3.5_gb_1_weeks',  cost:1730, planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_1_months_3_gb',  name:'Airtel 3GB', validity:'1 Month',  cat:'data', prov:'airtel', providerId:'airtel_sme_3_gb_1_months',   cost:2125, planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_1_months_4_gb',  name:'Airtel 4GB', validity:'1 Month',  cat:'data', prov:'airtel', providerId:'airtel_sme_4_gb_1_months',   cost:2675, planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_1_weeks_5_gb',   name:'Airtel 5GB', validity:'1 Week',   cat:'data', prov:'airtel', providerId:'airtel_sme_5_gb_1_weeks',    cost:1800, planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_1_months_8_gb',  name:'Airtel 8GB', validity:'1 Month',  cat:'data', prov:'airtel', providerId:'airtel_sme_8_gb_1_months',   cost:3446, planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_1_weeks_10_gb',  name:'Airtel 10GB',validity:'1 Week',   cat:'data', prov:'airtel', providerId:'airtel_sme_10_gb_1_weeks',    cost:3600, planType:'sme',       apiSource:'jarapoint' },
    { id:'airtel_sme_1_months_18_gb', name:'Airtel 18GB',validity:'1 Month',  cat:'data', prov:'airtel', providerId:'airtel_sme_18_e_gb_1_months',  cost:7050, planType:'corporate', apiSource:'jarapoint' },
    { id:'airtel_sme_1_months_25_gb', name:'Airtel 25GB',validity:'1 Month',  cat:'data', prov:'airtel', providerId:'airtel_sme_25_gb_1_months',   cost:9475, planType:'corporate', apiSource:'jarapoint' },
    { id:'airtel_sme_1_months_100_gb',name:'Airtel 100GB',validity:'1 Month',  cat:'data', prov:'airtel', providerId:'airtel_sme_100_gb_1_months', cost:25000,planType:'corporate', apiSource:'jarapoint' },
    { id:'airtel_gifting_1gb_1day',   name:'Airtel 1GB', validity:'1 Day',    cat:'data', prov:'airtel', providerId:'airtel_gifting_1gb_1day',    cost:290,  planType:'gifting',   apiSource:'cheapdatahub' },
    // ── GLO DATA ──
    { id:'glo_sme_1_months_500_mb',   name:'Glo 500MB',  validity:'1 Month',  cat:'data', prov:'glo', providerId:'glo_sme_500_mb_1_months',   cost:238,  planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_3_days_1_gb',       name:'Glo 1GB',    validity:'3 Days',   cat:'data', prov:'glo', providerId:'glo_sme_1_gb_3_days',       cost:310,  planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_7_days_1_gb',       name:'Glo 1GB',    validity:'7 Days',   cat:'data', prov:'glo', providerId:'glo_sme_1_gb_7_days',       cost:350,  planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_1_weeks_1_gb',      name:'Glo 1GB',    validity:'1 Week',   cat:'data', prov:'glo', providerId:'glo_sme_1_gb_1_weeks',      cost:350,  planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_1_months_1_gb',     name:'Glo 1GB',    validity:'1 Month',  cat:'data', prov:'glo', providerId:'glo_sme_1_gb_1_months',     cost:465,  planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_1_months_2_gb',     name:'Glo 2GB',    validity:'1 Month',  cat:'data', prov:'glo', providerId:'glo_sme_2_gb_1_months',     cost:930,  planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_1_weeks_3_gb',      name:'Glo 3GB',    validity:'1 Week',   cat:'data', prov:'glo', providerId:'glo_sme_3_gb_1_weeks',      cost:935,  planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_1_months_3_gb',     name:'Glo 3GB',    validity:'1 Month',  cat:'data', prov:'glo', providerId:'glo_sme_3_gb_1_months',     cost:1395, planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_1_months_5_gb',     name:'Glo 5GB',    validity:'1 Month',  cat:'data', prov:'glo', providerId:'glo_sme_5_gb_1_months',     cost:2325, planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_1_months_10_gb',    name:'Glo 10GB',   validity:'1 Month',  cat:'data', prov:'glo', providerId:'glo_sme_10_gb_1_months',    cost:4650, planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_1_weeks_10_gb',     name:'Glo 10GB',   validity:'1 Week',   cat:'data', prov:'glo', providerId:'glo_sme_10_gb_1_weeks',     cost:2595, planType:'sme',       apiSource:'jarapoint' },
    { id:'glo_sme_1_months_20_gb',    name:'Glo 20GB',   validity:'1 Month',  cat:'data', prov:'glo', providerId:'glo_sme_20_gb_1_months',    cost:7080, planType:'corporate', apiSource:'jarapoint' },
    { id:'glo_gifting_1gb_1day',      name:'Glo 1GB',    validity:'1 Day',    cat:'data', prov:'glo', providerId:'glo_gifting_1gb_1day',      cost:250,  planType:'gifting',   apiSource:'cheapdatahub' },
    // ── 9MOBILE DATA ──
    { id:'9mobile_sme_1_months_500_mb',name:'9mobile 500MB',validity:'1 Month',cat:'data',prov:'9mobile',providerId:'9mobile_sme_500_mb_1_months',cost:290,  planType:'sme',       apiSource:'jarapoint' },
    { id:'9mobile_sme_1_months_1_gb', name:'9mobile 1GB',validity:'1 Month',cat:'data',prov:'9mobile', providerId:'9mobile_sme_1_gb_1_months',   cost:555,  planType:'sme',       apiSource:'jarapoint' },
    { id:'9mobile_sme_1_months_2_gb', name:'9mobile 2GB',validity:'1 Month',cat:'data',prov:'9mobile', providerId:'9mobile_sme_2_gb_1_months',   cost:1110, planType:'sme',       apiSource:'jarapoint' },
    { id:'9mobile_sme_1_months_3_gb', name:'9mobile 3GB',validity:'1 Month',cat:'data',prov:'9mobile', providerId:'9mobile_sme_3_gb_1_months',   cost:1665, planType:'sme',       apiSource:'jarapoint' },
    { id:'9mobile_sme_1_months_10_gb',name:'9mobile 10GB',validity:'1 Month', cat:'data',prov:'9mobile', providerId:'9mobile_sme_10_gb_1_months',  cost:5550, planType:'corporate', apiSource:'jarapoint' },
    { id:'9mobile_gifting_1gb_1day',  name:'9mobile 1GB',validity:'1 Day',   cat:'data',prov:'9mobile', providerId:'9mobile_gifting_1gb_1day',    cost:280,  planType:'gifting', apiSource:'gladtidings' },
    // ── AIRTIME ──
    { id:'airtime_mtn',    name:'MTN Airtime',    validity:'', cat:'airtime', prov:'mtn',     providerId:'airtime_mtn', cost:100, planType:'airtime', apiSource:'jarapoint' },
    { id:'airtime_airtel', name:'Airtel Airtime', validity:'', cat:'airtime', prov:'airtel',  providerId:'airtime_airtel', cost:100, planType:'airtime', apiSource:'jarapoint' },
    { id:'airtime_glo',    name:'Glo Airtime',    validity:'', cat:'airtime', prov:'glo',     providerId:'airtime_glo', cost:100, planType:'airtime', apiSource:'jarapoint' },
    { id:'airtime_9mobile',name:'9mobile Airtime',validity:'', cat:'airtime', prov:'9mobile', providerId:'airtime_9mobile', cost:100, planType:'airtime', apiSource:'jarapoint' },
    // ── CABLE ──
    { id:'dstv_premium', name:'DSTV Premium', validity:'1 Month', cat:'cable', prov:'dstv_subscription', providerId:'dstv_subscription_1_months_dstv_premium', cost:44500, planType:'cable', apiSource:'jarapoint' },
    { id:'dstv_compact', name:'DSTV Compact', validity:'1 Month', cat:'cable', prov:'dstv_subscription', providerId:'dstv_subscription_1_months_dstv_compact', cost:30000, planType:'cable', apiSource:'jarapoint' },
    { id:'dstv_confam',  name:'DSTV Confam',  validity:'1 Month', cat:'cable', prov:'dstv_subscription', providerId:'dstv_subscription_1_months_dstv_confam',  cost:12750, planType:'cable', apiSource:'jarapoint' },
    { id:'gotv_supa',    name:'GOTV Supa',    validity:'1 Month', cat:'cable', prov:'gotv_subscription', providerId:'gotv_subscription_1_months_gotv_supa', cost:11400, planType:'cable', apiSource:'jarapoint' },
    { id:'gotv_max',     name:'GOTV Max',     validity:'1 Month', cat:'cable', prov:'gotv_subscription', providerId:'gotv_subscription_1_months_gotv_max', cost:8500, planType:'cable', apiSource:'jarapoint' },
    { id:'waec_pin', name:'WAEC PIN', validity:'', cat:'education', prov:'waec', providerId:'waec', cost:3900, planType:'education', apiSource:'jarapoint' },
    { id:'neco_pin', name:'NECO PIN', validity:'', cat:'education', prov:'neco', providerId:'neco', cost:2700, planType:'education', apiSource:'jarapoint' },
    { id:'recharge_mtn_100', name:'MTN ₦100',  validity:'', cat:'recharge', prov:'mtn', providerId:'100', cost:100, planType:'recharge', apiSource:'jarapoint' },
    { id:'recharge_mtn_200', name:'MTN ₦200',  validity:'', cat:'recharge', prov:'mtn', providerId:'200', cost:200, planType:'recharge', apiSource:'jarapoint' },
    { id:'recharge_mtn_500', name:'MTN ₦500',  validity:'', cat:'recharge', prov:'mtn', providerId:'500', cost:500, planType:'recharge', apiSource:'jarapoint' },
  ];

  private static async fetchCheapDataHubPlans(): Promise<RawPlan[]> {
    const CDH_KEY = process.env.CHEAPDATAHUB_API_KEY;
    if (!CDH_KEY) return [];
    try {
      const r = await axios.get('https://www.cheapdatahub.ng/api/v1/resellers/plans', {
        headers: { Authorization: 'Bearer ' + CDH_KEY }
      });
      const plans = (r.data?.plans || []).map((p: any) => ({
        id: p.id,
        name: (p.network || '').toUpperCase() + ' ' + (p.size || ''),
        validity: p.validity || '',
        cat: 'data',
        prov: p.network,
        providerId: String(p.bundleId),
        cost: p.price,
        planType: p.planType || 'gifting',
        apiSource: 'cheapdatahub',
      }));
      return plans;
    } catch(e) {
      console.warn('CheapDataHub: could not load plans', e);
      return [];
    }
  }

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
      const [cdh, gtd] = await Promise.allSettled([
        this.fetchCheapDataHubPlans(),
        this.fetchGladtidingsPlans(),
      ]);
      const cdhPlans = cdh.status === 'fulfilled' ? cdh.value : [];
      const gtdPlans = gtd.status === 'fulfilled' ? gtd.value : [];
      const staticIds = new Set(this.RAW.map(p => p.id));
      const dynamic = [...gtdPlans, ...cdhPlans].filter(p => !staticIds.has(p.id));
      this._dynamicCache = { plans: dynamic, fetchedAt: now };
      return [...this.RAW, ...this._dynamicCache.plans];
    } catch(e) {
      console.error('getAllPlans error:', e);
      return [...this.RAW];
    }
  }

  static async getCatalog() {
    const allPlans = await this.getAllPlans();

    return allPlans.map(plan => {
      const category = plan.cat || 'data';
      const markupPct = this.markup[category] ?? 10;
      const sellingPrice = Math.ceil(plan.cost * (1 + markupPct / 100));

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
      };
    });
  }

  static async getPublicCatalog() {
    const catalog = await this.getCatalog();
    // Strip internal cost price before it ever reaches the customer-facing client.
    return catalog.map(({ costPrice, ...rest }) => rest);
  }

  static async getProductById(productId: string) {
    const catalog = await this.getCatalog();
    return catalog.find(p => p.id === productId);
  }
}
