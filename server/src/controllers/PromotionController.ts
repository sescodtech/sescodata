import { Request, Response } from 'express';
import { Promotion } from '../models/Promotion';
import { ProductService } from '../services/ProductService';

export class PromotionController {
  /**
   * GET /api/promotions/active — public, no auth.
   * Returns only promotions that are enabled AND currently within their
   * start/end date window, sorted by sortOrder. Expired or not-yet-started
   * promotions, and anything disabled, are filtered out server-side.
   *
   * Each promotion's product name and original price are resolved live from
   * ProductService.getProductById — never stored on the promotion — so the
   * dashboard always reflects the current catalog price, and a promotion
   * whose product was removed/disabled is silently skipped instead of
   * showing broken/stale data.
   */
  static async listActive(_req: Request, res: Response) {
    try {
      const now = new Date();
      const promotions = await Promotion.find({
        enabled: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }).sort({ sortOrder: 1, createdAt: -1 });

      const resolved = await Promise.all(
        promotions.map(async (promo) => {
          const product = await ProductService.getProductById(promo.productId);
          if (!product) return null; // product removed/disabled since the promotion was created

          const originalPrice = product.sellingPrice;
          const discountedPrice = promo.promotionType === 'percentage'
            ? Math.max(0, Math.round(originalPrice * (1 - (promo.discountPercent || 0) / 100)))
            : Math.max(0, Math.round(promo.promoPrice || 0));

          return {
            _id: promo._id,
            productId: promo.productId,
            productName: product.name,
            category: promo.category,
            network: promo.network,
            originalPrice,
            discountedPrice,
            promotionType: promo.promotionType,
            discountPercent: promo.discountPercent,
            sortOrder: promo.sortOrder,
          };
        }),
      );

      res.json({ success: true, promotions: resolved.filter(Boolean) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
