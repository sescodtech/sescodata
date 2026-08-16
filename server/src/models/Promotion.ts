import mongoose, { Schema } from 'mongoose';

/**
 * Admin-managed promotional banners shown in the customer dashboard's
 * "Active Promotions" card. Distinct from discounted products (Product.is_promo) —
 * this is free-form marketing copy (title/description/CTA) with a validity
 * window, not a product price override.
 */
export interface IPromotion extends mongoose.Document {
  title: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
  startDate: Date;
  endDate: Date;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    ctaText: { type: String, trim: true, maxlength: 40 },
    ctaLink: { type: String, trim: true, maxlength: 300 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    enabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// The public "active promotions" query filters on enabled + date range and
// sorts by sortOrder — index the fields that query actually touches.
PromotionSchema.index({ enabled: 1, startDate: 1, endDate: 1 });
PromotionSchema.index({ sortOrder: 1 });

export const Promotion = mongoose.model<IPromotion>('Promotion', PromotionSchema);
