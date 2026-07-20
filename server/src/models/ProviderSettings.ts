import mongoose from 'mongoose';

/**
 * Module 6 preparation — DB-backed provider configuration, replacing the
 * current env-var-only PROVIDER_PRIORITY (flagged in the V3 audit: changing
 * failover order today requires editing an env var and restarting the
 * server). This is a singleton document (one row, upserted).
 *
 * NOT YET CONSULTED by ProviderOrchestrator — this model exists so Module 6
 * has a real, seeded place to read/write from, but wiring it into
 * executeWithFailover's actual provider-selection logic is explicitly
 * Module 6's job, not this refinement pass's. Today's failover behavior is
 * unchanged: it still reads PROVIDER_PRIORITY from the environment exactly
 * as before.
 */
const ProviderSettingsSchema = new mongoose.Schema({
  singleton: { type: String, default: 'default', unique: true }, // enforces exactly one document

  // Mirrors today's env-var priority order once Module 6 wires it in.
  priorityOrder: { type: [String], default: ['gladtidings', 'cheapdatahub', 'jarapoint'] },

  // Module 6: lets an admin force every purchase to use one specific
  // provider regardless of priorityOrder — e.g. for testing a provider or
  // routing around a known partial outage. Null = normal failover behavior.
  manualOverrideProvider: { type: String, default: null },

  // Module 6: lets an admin take a provider out of rotation entirely
  // without removing its API credentials/config.
  disabledProviders: { type: [String], default: [] },

  minBalanceThreshold: { type: Number, default: 500 }, // mirrors ProviderOrchestrator's current hardcoded minBalance

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: { type: String },
}, { timestamps: true });

export const ProviderSettings = mongoose.model('ProviderSettings', ProviderSettingsSchema);
