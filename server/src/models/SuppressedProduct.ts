import mongoose from 'mongoose';

/**
 * Auto-suppression for a single product ID after GladTidings explicitly
 * rejects it as unavailable at purchase time (not a general failure —
 * only the specific "not available on this network" signal triggers this).
 *
 * Self-heals: `expiresAt` has a TTL index, so MongoDB deletes the document
 * on its own once the suppression window passes and the bundle becomes
 * purchasable again — no cron job, no manual admin action required. If the
 * bundle is still unavailable next time someone tries it, PurchaseController
 * re-suppresses it for another window.
 *
 * This only affects catalog visibility (getCatalog/getPublicCatalog/
 * getProductById in ProductService) — it does not touch pricing, wallet
 * logic, KYC, or the admin catalog (admins still see suppressed products,
 * flagged, via getFullCatalogForAdmin).
 */
const SuppressedProductSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  reason: { type: String, default: 'provider_unavailable' },
  providerMessage: { type: String }, // the exact GladTidings text that triggered this
  network: { type: String },
  suppressedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

SuppressedProductSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SuppressedProduct = mongoose.model('SuppressedProduct', SuppressedProductSchema);
