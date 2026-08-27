import axios from 'axios';
import { IProvider, ProviderResponse } from './IProvider';

const BASE_URL = 'https://www.jarapoint.com';

export class JarapointProvider implements IProvider {
  public name = 'jarapoint';
  private readonly apiKey = process.env.JARAPOINT_API_KEY || '';

  private headers() {
    return {
      'Authorization': `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
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
    try {
      const r = await axios.get(`${BASE_URL}/api/balance/`, {
        headers: this.headers(),
        timeout: 10000,
      });
      const balance = parseFloat(r.data?.balance ?? r.data?.wallet_balance ?? 0);
      return { success: true, balance };
    } catch (e: any) {
      return { success: false, balance: 0, error: e.response?.data?.detail || e.message };
    }
  }

  async buyData({ planId, phone, network, ref }: { planId: string, phone: string, network: string, ref: string }): Promise<ProviderResponse> {
    try {
      const r = await axios.post(`${BASE_URL}/api/data/`, {
        plan_id: planId,
        mobile_number: phone,
        Ported_number: true,
        reference: ref,
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      return {
        success: d.Status === 'successful' || d.status === 'true' || d.success,
        reference: d.id || d.transaction_id || d.ident,
        message: d.api_response || d.message || 'Data purchase processed',
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async buyAirtime({ network, phone, amount, ref }: { network: string, phone: string, amount: number, ref: string }): Promise<ProviderResponse> {
    const networkIds: Record<string, number> = { mtn: 1, glo: 2, airtel: 3, '9mobile': 6 };
    const net = this.normalizeNetwork(network);
    const networkId = networkIds[net];
    if (!networkId) return { success: false, error: `Unknown network: ${network}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/api/topup/`, {
        network: networkId,
        mobile_number: phone,
        amount,
        Ported_number: true,
        airtime_type: 'VTU',
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      return {
        success: d.Status === 'successful' || d.status === 'true',
        reference: d.id || d.transaction_id,
        message: d.api_response || d.message || 'Airtime delivered',
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async buyCable({ provider, smartcard, planId, phone, ref }: { provider: string, smartcard: string, planId: string, phone: string, ref: string }): Promise<ProviderResponse> {
    const cableIds: Record<string, number> = { gotv: 1, dstv: 2, startime: 3, startimes: 3 };
    const cableId = cableIds[(provider || '').toLowerCase()];
    if (!cableId) return { success: false, error: `Unknown cable provider: ${provider}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/api/cablesub/`, {
        cabletv_name: cableId,
        smart_card_number: smartcard,
        plan: planId,
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      return {
        success: d.Status === 'successful' || d.status === 'true',
        reference: d.id || d.transaction_id,
        message: d.api_response || d.message || 'Cable subscription processed',
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async buyElectricity({ disco, meter, amount, phone, ref }: { disco: string, meter: string, amount: number, phone: string, ref: string }): Promise<ProviderResponse> {
    try {
      const r = await axios.post(`${BASE_URL}/api/elect/`, {
        disco_name: disco,
        meter_no: meter,
        amount,
        MobileNumber: phone,
        meter_type: 'prepaid',
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      return {
        success: d.Status === 'successful' || d.status === 'true',
        reference: d.id,
        message: d.api_response || d.message || 'Electricity token generated',
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async buyExamPin({ examName, quantity, ref }: { examName: string, quantity: number, ref: string }): Promise<ProviderResponse> {
    try {
      const r = await axios.post(`${BASE_URL}/api/result/`, {
        exam_name: examName.toUpperCase(),
        quantity,
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      return {
        success: d.Status === 'successful',
        reference: d.id,
        message: d.message || 'Exam pin purchase successful',
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async buyRechargeCard({ network, amount, quantity, ref }: { network: string, amount: number, quantity: number, ref: string }): Promise<ProviderResponse> {
    const networkIds: Record<string, number> = { mtn: 1, glo: 2, airtel: 3, '9mobile': 6 };
    const net = this.normalizeNetwork(network);
    const networkId = networkIds[net];
    if (!networkId) return { success: false, error: `Unknown network: ${network}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/api/rechargepin/`, {
        network: networkId,
        network_amount: amount,
        quantity,
        name_on_card: `SESCOHUBS ${net.toUpperCase()} ₦${amount}`,
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      return {
        success: d.Status === 'successful',
        reference: d.id,
        message: d.message || 'Recharge card generated',
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async getAllPlans() {
    return [];
  }
}
