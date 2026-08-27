import mongoose from 'mongoose';

/**
 * Admin-editable layer sitting on top of ProductService's existing
 * static+dynamic catalog, rather than replacing it. The catalog itself
 * (hardcoded plans + live provider fetches) stays exactly as-is and
 * untouched — this collection only stores the *deltas* an admin applies:
 * enable/disable, visibility, and price/markup overrides, keyed by the
 * same productId the catalog already uses. ProductService.getCatalog()
 * merges these in; if no override exists for a product, behavior is
 * identical to before Module 5 existed.
 */
const ProductOverrideSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  category: { type: String, required: true }, // denormalized for fast filtering

  enabled: { type: Boolean, default: true },  // false = blocks purchase entirely (getProductById returns nothing)
  visible: { type: Boolean, default: true },  // false = hidden from the public catalog but still purchasable directly (e.g. staged rollout)

  customSellingPrice: { type: Number },  // if set, takes precedence over markup-computed price
  customMarkupPct: { type: Number },     // if set (and customSellingPrice isn't), overrides the category's global markup for this product only

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: { type: String },
}, { timestamps: true });

ProductOverrideSchema.index({ category: 1 });

export const ProductOverride = mongoose.model('ProductOverride', ProductOverrideSchema);
