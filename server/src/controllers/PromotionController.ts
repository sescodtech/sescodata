import { Request, Response } from 'express';
import { Promotion } from '../models/Promotion';

export class PromotionController {
  /**
   * GET /api/promotions/active — public, no auth.
   * Returns only promotions that are enabled AND currently within their
   * start/end date window, sorted by sortOrder. Expired or not-yet-started
   * promotions, and anything disabled, are filtered out server-side so the
   * dashboard never has to reason about dates itself.
   */
  static async listActive(_req: Request, res: Response) {
    try {
      const now = new Date();
      const promotions = await Promotion.find({
        enabled: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .sort({ sortOrder: 1, createdAt: -1 })
        .select('title description ctaText ctaLink startDate endDate sortOrder');

      res.json({ success: true, promotions });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
