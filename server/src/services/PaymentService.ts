export interface PaymentGateway {
  initialize(params: { email: string, amount: number, reference: string, callbackUrl: string, metadata?: any }): Promise<{ url: string, reference: string }>;
  verify(reference: string): Promise<{ success: boolean, amount: number, status: string }>;
}

export class PaystackGateway implements PaymentGateway {
  private secretKey = process.env.PAYSTACK_SECRET_KEY || '';

  async initialize({ email, amount, reference, callbackUrl, metadata }: any) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack uses kobo
        reference,
        callback_url: callbackUrl,
        metadata
      })
    });
    const data = await response.json();
    if (!data.data) throw new Error(data.message || 'Paystack initialization failed');
    return { url: data.data.authorization_url, reference: data.data.reference };
  }

  async verify(reference: string) {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` }
    });
    const data = await response.json();
    const ps = data.data;
    return {
      success: ps.status === 'success',
      amount: ps.amount / 100,
      status: ps.status
    };
  }
}

export class PaymentService {
  private gateways: Map<string, PaymentGateway> = new Map();

  constructor() {
    this.gateways.set('paystack', new PaystackGateway());
    // Flutterwave and Monnify can be added here
  }

  getGateway(name: string): PaymentGateway {
    const gateway = this.gateways.get(name.toLowerCase());
    if (!gateway) throw new Error(`Payment gateway ${name} not supported`);
    return gateway;
  }

  async initializePayment(gatewayName: string, params: any) {
    const gateway = this.getGateway(gatewayName);
    return gateway.initialize(params);
  }

  async verifyPayment(gatewayName: string, reference: string) {
    const gateway = this.getGateway(gatewayName);
    return gateway.verify(reference);
  }
}

export const paymentService = new PaymentService();
