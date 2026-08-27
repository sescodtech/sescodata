import mongoose from 'mongoose';

/**
 * Module 6 preparation — a record of every provider call attempt, so
 * "Provider Analytics" (success rate, volume, latency trends per provider
 * over time) has real historical data to work with as soon as Module 6
 * builds a UI for it, instead of starting from zero. Written additively
 * inside ProviderOrchestrator.executePurchase — logging an attempt
 * never changes which provider is selected or what gets returned to the
 * caller; today's failover/selection behavior is unchanged.
 */
const ProviderCallLogSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  method: { type: String, required: true }, // 'buyData' | 'buyAirtime' | etc.
  success: { type: Boolean, required: true },
  durationMs: { type: Number, required: true },
  error: { type: String },       // raw provider error/response text — internal/admin use only
  failReason: { type: String },  // GladTidings failure category, e.g. 'invalid_params' | 'provider_error' | 'network_error' | 'config_error'

  // Diagnostic context so a failed row can be traced back to a specific
  // bundle/network/transaction without joining anything. Admin-only data —
  // this model is never serialized to end users.
  reference: { type: String },      // our internal purchase reference (ref)
  productId: { type: String },      // our product/plan ID at time of purchase
  network: { type: String },        // network/disco/cable provider involved, if applicable
  maskedRecipient: { type: String },// masked phone/recipient, e.g. "080***1234"
  providerStatus: { type: String }, // raw status string returned by the provider (e.g. GladTidings' Status field)

  createdAt: { type: Date, default: Date.now },
});

ProviderCallLogSchema.index({ provider: 1, createdAt: -1 });
ProviderCallLogSchema.index({ createdAt: -1 });
ProviderCallLogSchema.index({ method: 1, success: 1, createdAt: -1 });

export const ProviderCallLog = mongoose.model('ProviderCallLog', ProviderCallLogSchema);
