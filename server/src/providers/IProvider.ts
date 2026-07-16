export interface ProviderResponse {
  success: boolean;
  reference?: string;
  message?: string;
  data?: any;
  error?: string;
  failReason?: 'insufficient_balance' | 'provider_error' | 'invalid_params' | 'network_error' | 'timeout' | 'config_error';
  actualCost?: number;
  usedProvider?: string;
}

export interface IProvider {
  name: string;
  getBalance(): Promise<{ success: boolean, balance: number, error?: string }>;
  buyData(params: { planId: string, phone: string, network: string, ref: string }): Promise<ProviderResponse>;
  buyAirtime(params: { network: string, phone: string, amount: number, ref: string }): Promise<ProviderResponse>;
  buyCable(params: { provider: string, smartcard: string, planId: string, phone: string, ref: string }): Promise<ProviderResponse>;
  buyElectricity(params: { disco: string, meter: string, amount: number, phone: string, ref: string }): Promise<ProviderResponse>;
  buyExamPin(params: { examName: string, quantity: number, ref: string }): Promise<ProviderResponse>;
  buyRechargeCard(params: { network: string, amount: number, quantity: number, ref: string }): Promise<ProviderResponse>;
  getAllPlans(): Promise<any[]>;
}
