import axios from 'axios';
import { IProvider, ProviderResponse } from './IProvider';

const BASE_URL = 'https://www.gladtidingsdata.com/api';

export class GladTidingsProvider implements IProvider {
  public name = 'gladtidings';
  private readonly apiKey = process.env.GLADTIDINGS_API_KEY || '';

  private headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.apiKey}`,
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
    if (!this.apiKey) return { success: false, balance: 0, error: 'GLADTIDINGS_API_KEY not set' };
    try {
      const r = await axios.get(`${BASE_URL}/user/`, {
        headers: this.headers(),
        timeout: 10000,
      });
      const data = r.data;
      const balance = parseFloat(data.user?.wallet_balance || data.user?.Account_Balance || data.wallet_balance || data.Account_Balance || data.balance || 0);
      return { success: true, balance };
    } catch (e: any) {
      return { success: false, balance: 0, error: e.response?.data?.detail || e.message };
    }
  }

  async buyData({ planId, phone, network, ref }: { planId: string, phone: string, network: string, ref: string }): Promise<ProviderResponse> {
    if (!this.apiKey) return { success: false, error: 'GLADTIDINGS_API_KEY not set', failReason: 'config_error' };
    const net = this.normalizeNetwork(network);
    const networkMap: Record<string, number> = { mtn: 1, glo: 2, airtel: 3, '9mobile': 6 };
    const networkId = networkMap[net];
    if (!networkId) return { success: false, error: `Unknown network: ${network}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/data/`, {
        network: networkId,
        mobile_number: phone,
        plan: planId,
        Ported_number: true,
        ref: ref,
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.Status === 'successful' || d.status === 'successful';
      return {
        success: ok,
        reference: d.id || d.ident,
        message: d.api_response || d.message || (ok ? 'Data delivered' : 'Data failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async buyAirtime({ network, phone, amount, ref }: { network: string, phone: string, amount: number, ref: string }): Promise<ProviderResponse> {
    if (!this.apiKey) return { success: false, error: 'GLADTIDINGS_API_KEY not set', failReason: 'config_error' };
    const net = this.normalizeNetwork(network);
    const networkMap: Record<string, number> = { mtn: 1, glo: 2, airtel: 3, '9mobile': 6 };
    const networkId = networkMap[net];
    if (!networkId) return { success: false, error: `Unknown network: ${network}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/topup/`, {
        network: networkId,
        mobile_number: phone,
        Ported_number: true,
        airtime_type: 'VTU',
        amount: Number(amount),
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.Status === 'successful' || d.status === 'successful';
      return {
        success: ok,
        reference: d.id,
        message: d.api_response || d.message || (ok ? 'Airtime delivered' : 'Airtime failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async buyCable({ provider, smartcard, planId, phone, ref }: { provider: string, smartcard: string, planId: string, phone: string, ref: string }): Promise<ProviderResponse> {
    const cableMap: Record<string, number> = { gotv: 1, dstv: 2, startimes: 3 };
    const cableId = cableMap[(provider || '').toLowerCase()];
    if (!cableId) return { success: false, error: `Unknown cable provider: ${provider}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/cablesub/`, {
        cabletv_name: cableId,
        smart_card_number: smartcard,
        plan: planId,
        phone: phone,
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.Status === 'successful' || d.status === 'successful';
      return {
        success: ok,
        reference: d.id,
        message: d.api_response || d.message || (ok ? 'Cable subscription done' : 'Cable subscription failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async buyElectricity({ disco, meter, amount, phone, ref }: { disco: string, meter: string, amount: number, phone: string, ref: string }): Promise<ProviderResponse> {
    const discoMap: Record<string, number> = {
      ikeja: 18, ikedc: 18,
      ibadan: 19, ibedc: 19,
      eko: 20, ekedc: 20,
      'port harcourt': 21, phed: 21,
      kaduna: 22,
      kano: 23,
      jos: 24, jedplc: 24,
      abuja: 25, aedc: 25,
      enugu: 26,
      yola: 28,
      benin: 29,
    };
    const discoId = discoMap[(disco || '').toLowerCase()];
    if (!discoId) return { success: false, error: `Unknown disco: ${disco}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/v2/billpayment/`, {
        disco_id: discoId,
        meter_number: meter,
        amount: Number(amount),
        meter_type: 'prepaid',
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.Status === 'successful' || d.status === 'successful';
      return {
        success: ok,
        reference: d.id,
        message: d.api_response || d.message || (ok ? 'Electricity token generated' : 'Electricity failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async buyExamPin({ examName, quantity, ref }: { examName: string, quantity: number, ref: string }): Promise<ProviderResponse> {
    const validExams = ['WAEC', 'NECO', 'NABTEB'];
    const exam = (examName || '').toUpperCase();
    if (!validExams.includes(exam)) {
      return { success: false, error: `Invalid exam. Use: ${validExams.join(', ')}`, failReason: 'invalid_params' };
    }
    try {
      const r = await axios.post(`${BASE_URL}/epin/`, {
        exam_name: exam,
        quantity: Number(quantity),
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.Status === 'successful';
      return {
        success: ok,
        reference: d.id,
        message: d.message || (ok ? 'Exam pin purchased' : 'Exam pin failed'),
        data: d,
      };
    } catch (e: any) {
      return { success: false, error: e.response?.data?.detail || e.message, failReason: 'provider_error' };
    }
  }

  async buyRechargeCard({ network, amount, quantity, ref }: { network: string, amount: number, quantity: number, ref: string }): Promise<ProviderResponse> {
    const networkMap: Record<string, number> = { mtn: 1, glo: 2, airtel: 3, '9mobile': 6 };
    const net = this.normalizeNetwork(network);
    const networkId = networkMap[net];
    if (!networkId) return { success: false, error: `Unknown network: ${network}`, failReason: 'invalid_params' };

    const rechargeAmounts: Record<number, Record<number, number>> = {
      1: { 100:1, 200:5, 500:8, 1000:9 },
      2: { 100:2, 200:6, 500:10 },
      3: { 100:3, 200:7, 300:13, 500:11 },
      6: { 100:4, 200:12 },
    };

    const networkAmountId = rechargeAmounts[networkId]?.[amount];
    if (!networkAmountId) return { success: false, error: `No recharge plan for ${net} ₦${amount}`, failReason: 'invalid_params' };

    try {
      const r = await axios.post(`${BASE_URL}/rechargepin/`, {
        network: networkId,
        network_amount: networkAmountId,
        quantity: Number(quantity),
        name_on_card: 'SESCOHUBS',
      }, { headers: this.headers(), timeout: 30000 });

      const d = r.data;
      const ok = d.Status === 'successful';
      return {
        success: ok,
        reference: d.id,
        message: d.message || (ok ? 'Recharge card generated' : 'Recharge card failed'),
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
