import mongoose, { Schema } from 'mongoose';

/**
 * Admin-managed product promotions shown in the customer dashboard's
 * "Active Promotions" card. Every promotion points at a real product from
 * the existing catalog (ProductService) via productId — no free-text
 * title/description/CTA. Product name and original price are resolved live
 * from ProductService at read time (see PromotionController), so this model
 * only stores the discount + validity window, not a price snapshot.
 */
export interface IPromotion extends mongoose.Document {
  productId: string;
  category: 'data' | 'airtime' | 'electricity' | 'education';
  network?: string;
  promotionType: 'percentage' | 'fixed';
  discountPercent?: number;
  promoPrice?: number;
  startDate: Date;
  endDate: Date;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    productId: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ['data', 'airtime', 'electricity', 'education'] },
    network: { type: String, trim: true },
    promotionType: { type: String, required: true, enum: ['percentage', 'fixed'] },
    discountPercent: { type: Number },
    promoPrice: { type: Number },
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
PromotionSchema.index({ productId: 1 });

export const Promotion = mongoose.model<IPromotion>('Promotion', PromotionSchema);
