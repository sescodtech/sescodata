import mongoose from 'mongoose';

/**
 * DB-persisted global markup config (category -> % added on top of provider
 * cost). Previously this lived only as an in-memory static object on
 * ProductService, mutated directly by AdminController.setGlobalMarkup — any
 * change was lost on the next server restart/redeploy, which is why admin
 * pricing changes appeared not to stick. Singleton document (one row, upserted).
 */
const MarkupSettingsSchema = new mongoose.Schema({
  singleton: { type: String, default: 'default', unique: true },
  markup: {
    type: Map,
    of: Number,
    default: {},
  },
}, { timestamps: true });

export const MarkupSettings = mongoose.model('MarkupSettings', MarkupSettingsSchema);
