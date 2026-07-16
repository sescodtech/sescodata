import axios from 'axios';
import { IProvider, ProviderResponse } from './IProvider';

const BASE_URL = 'https://www.cheapdatahub.ng/api/v1/resellers';

export class CheapDataHubProvider implements IProvider {
  public name = 'cheapdatahub';
  private readonly apiKey = process.env.CHEAPDATAHUB_API_KEY || '';

  private headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private normalizeNetwork(net: string) {
    const n = (net || '').toLowerCase();
    if (n.includes('mtn')) return 'mtn';
    if (n.includes('airtel')) return 'airtel';
    if (n.includes('glo')) return 'glo';
    if (n.includes('9mobile') || n.includes('etisalat')) return '9mobile';
    return n;
  }

  async getBalance(): Promise<{ success: boolean, balance: number, error?: string }> {
    if (!this.apiKey) return { success: false, balance: 0, error: 'CHEAPDATAHUB_API_KEY not set' };
    try {
      const r = await axios.get(`${BASE_URL}/wallet/balance/`, {
        headers: this.headers(),
        timeout: 10000,
      });
      const data = r.data;
      if (data.status === 'true' || data.status === true) {
        return { success: true, balance: parseFloat(data.data?.balance ?? 0) };
      }
      return { success: false, balance: 0, error: data.message || 'Balance fetch failed' };
    } catch (e: any) {
      return { success: false, balance: 0, error: e.response?.data?.message || e.message };
    }
  }

  async buyData({ planId, phone, network, ref }: { planId: string, phone: string, network: string, ref: string }): Promise<ProviderResponse> {
    if (!this.apiKey) return { success: false, error: 'CHEAPDATAHUB_API_KEY not set', failReason: 'config_error' };
    const numericBundleId = Number(planId);
    if (!numericBundleId) return { success: false, error: `Invalid CheapDataHub bundle ID: ${planId}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/data/purchase/`, {
        bundle_id: numericBundleId,
        phone_number: phone,
        reference: ref,
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.status === 'true' || d.status === true;
      return {
        success: ok,
        reference: d.transaction_id || d.reference,
        message: d.message || (ok ? 'Data purchased' : 'Data purchase failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.message || e.message, failReason: 'provider_error' };
    }
  }

  async buyAirtime({ network, phone, amount, ref }: { network: string, phone: string, amount: number, ref: string }): Promise<ProviderResponse> {
    const networkMap: Record<string, number> = { mtn: 1, glo: 2, airtel: 3, '9mobile': 4 };
    const net = this.normalizeNetwork(network);
    const providerId = networkMap[net];
    if (!providerId) return { success: false, error: `Unknown network: ${network}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/airtime/purchase/`, {
        provider_id: providerId,
        phone_number: phone,
        amount: Number(amount),
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.status === 'true' || d.status === true;
      return {
        success: ok,
        reference: d.transaction_id || d.reference || d.CDH,
        message: d.message || (ok ? 'Airtime delivered' : 'Airtime failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.message || e.message, failReason: 'provider_error' };
    }
  }

  async buyCable({ provider, smartcard, planId, phone, ref }: { provider: string, smartcard: string, planId: string, phone: string, ref: string }): Promise<ProviderResponse> {
    const cableMap: Record<string, number> = { gotv: 1, dstv: 2, startimes: 3, startime: 3 };
    const cableId = cableMap[(provider || '').toLowerCase()];
    if (!cableId) return { success: false, error: `Unknown cable provider: ${provider}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/cable/purchase/`, {
        cable_id: cableId,
        smart_card_number: smartcard,
        plan_id: planId,
        phone_number: phone,
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.status === 'true' || d.status === true;
      return {
        success: ok,
        reference: d.transaction_id || d.reference,
        message: d.message || (ok ? 'Cable subscription processed' : 'Cable subscription failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.message || e.message, failReason: 'provider_error' };
    }
  }

  async buyElectricity({ disco, meter, amount, phone, ref }: { disco: string, meter: string, amount: number, phone: string, ref: string }): Promise<ProviderResponse> {
    const discoMap: Record<string, number> = {
      aedc: 1, abuja: 1,
      ekedc: 2, eko: 2,
      ibedc: 3, ibadan: 3,
      ikedc: 4, ikeja: 4,
      kaduna: 5,
      phed: 6, 'port harcourt': 6,
      jos: 7,
      enugu: 8,
      yola: 9,
      benin: 10,
    };
    const discoId = discoMap[(disco || '').toLowerCase()];
    if (!discoId) return { success: false, error: `Unknown disco: ${disco}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/electricity/purchase/`, {
        disco: discoId,
        meter_number: meter,
        amount: Number(amount),
        phone_number: phone,
        meter_type: 'prepaid',
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.status === 'true' || d.status === true;
      return {
        success: ok,
        reference: d.transaction_id || d.reference,
        message: d.message || (ok ? 'Electricity token generated' : 'Electricity purchase failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.message || e.message, failReason: 'provider_error' };
    }
  }

  async buyExamPin({ examName, quantity, ref }: { examName: string, quantity: number, ref: string }): Promise<ProviderResponse> {
    try {
      const r = await axios.post(`${BASE_URL}/exam-pin/purchase/`, {
        product_id: examName,
        quantity,
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.status === 'true' || d.status === true;
      return {
        success: ok,
        reference: d.transaction_id,
        message: d.message || (ok ? 'Exam pin purchased' : 'Exam pin failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.message || e.message, failReason: 'provider_error' };
    }
  }

  async buyRechargeCard({ network, amount, quantity, ref }: { network: string, amount: number, quantity: number, ref: string }): Promise<ProviderResponse> {
    const networkMap: Record<string, number> = { mtn: 1, glo: 2, airtel: 3, '9mobile': 4 };
    const net = this.normalizeNetwork(network);
    const providerId = networkMap[net];
    if (!providerId) return { success: false, error: `Unknown network: ${network}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/airtime/purchase/`, {
        provider_id: providerId,
        amount: Number(amount),
        // Note: CDH requires phone_number for airtime purchase too, but the IProvider interface doesn't have it.
        // This might need a fix in IProvider or a fallback.
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.status === 'true' || d.status === true;
      return {
        success: ok,
        reference: d.transaction_id || d.reference,
        message: d.message || (ok ? 'Airtime delivered' : 'Airtime failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.message || e.message, failReason: 'provider_error' };
    }
  }

  async getAllPlans() {
    return [];
  }
}
