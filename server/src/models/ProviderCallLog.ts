import mongoose from 'mongoose';

/**
 * Module 6 preparation — a record of every provider call attempt, so
 * "Provider Analytics" (success rate, volume, latency trends per provider
 * over time) has real historical data to work with as soon as Module 6
 * builds a UI for it, instead of starting from zero. Written additively
 * inside ProviderOrchestrator.executeWithFailover — logging an attempt
 * never changes which provider is selected or what gets returned to the
 * caller; today's failover/selection behavior is unchanged.
 */
const ProviderCallLogSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  method: { type: String, required: true }, // 'buyData' | 'buyAirtime' | etc.
  success: { type: Boolean, required: true },
  durationMs: { type: Number, required: true },
  error: { type: String },
  failReason: { type: String },
  createdAt: { type: Date, default: Date.now },
});

ProviderCallLogSchema.index({ provider: 1, createdAt: -1 });
ProviderCallLogSchema.index({ createdAt: -1 });

export const ProviderCallLog = mongoose.model('ProviderCallLog', ProviderCallLogSchema);
