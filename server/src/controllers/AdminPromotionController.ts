import { Response } from 'express';
import { Promotion } from '../models/Promotion';
import { User } from '../models/User';
import { ProductService } from '../services/ProductService';
import { AuditLogService } from '../services/AuditLogService';

async function getActor(req: any): Promise<{ id: string; name: string }> {
  const admin = await User.findById(req.user.id).select('name');
  return { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin' };
}

const VALID_CATEGORIES = ['data', 'airtime', 'electricity', 'education'];

/** Validates the payload against the real product catalog — a promotion can only ever point at a product that actually exists. */
async function validatePayload(body: any, { partial = false } = {}) {
  const errors: string[] = [];

  if (!partial || body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) errors.push('A valid category is required.');
  }
  if (!partial || body.productId !== undefined) {
    if (!body.productId || !String(body.productId).trim()) errors.push('A product is required.');
  }
  if (!partial || body.promotionType !== undefined) {
    if (!['percentage', 'fixed'].includes(body.promotionType)) errors.push('Promotion type must be percentage or fixed.');
  }
  if (body.promotionType === 'percentage' && (body.discountPercent === undefined || Number(body.discountPercent) <= 0 || Number(body.discountPercent) >= 100)) {
    errors.push('Discount percent must be between 1 and 99.');
  }
  if (body.promotionType === 'fixed' && (body.promoPrice === undefined || Number(body.promoPrice) <= 0)) {
    errors.push('Promo price must be greater than 0.');
  }
  if (!partial || body.startDate !== undefined) {
    if (!body.startDate || Number.isNaN(new Date(body.startDate).getTime())) errors.push('A valid start date is required.');
  }
  if (!partial || body.endDate !== undefined) {
    if (!body.endDate || Number.isNaN(new Date(body.endDate).getTime())) errors.push('A valid end date is required.');
  }
  if (body.startDate && body.endDate && !Number.isNaN(new Date(body.startDate).getTime()) && !Number.isNaN(new Date(body.endDate).getTime())) {
    if (new Date(body.endDate) < new Date(body.startDate)) errors.push('End date must be on or after the start date.');
  }

  // Cross-check the product actually exists in the catalog and belongs to the stated category.
  if (errors.length === 0 && body.productId && body.category) {
    const product = await ProductService.getProductById(String(body.productId));
    if (!product) errors.push('Selected product was not found in the catalog.');
    else if (product.category !== body.category) errors.push('Selected product does not belong to the chosen category.');
  }

  return errors;
}

export class AdminPromotionController {
  /** GET /api/admin/promotions — every promotion, including disabled/expired ones, for the management table. */
  static async list(_req: any, res: Response) {
    try {
      const promotions = await Promotion.find().sort({ sortOrder: 1, createdAt: -1 });
      res.json({ success: true, promotions });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** POST /api/admin/promotions */
  static async create(req: any, res: Response) {
    try {
      const errors = await validatePayload(req.body);
      if (errors.length) return res.status(400).json({ success: false, error: errors.join(' ') });

      const { productId, category, network, promotionType, discountPercent, promoPrice, startDate, endDate, sortOrder, enabled } = req.body;
      const promotion = await Promotion.create({
        productId: String(productId).trim(),
        category,
        network: network ? String(network).trim() : undefined,
        promotionType,
        discountPercent: promotionType === 'percentage' ? Number(discountPercent) : undefined,
        promoPrice: promotionType === 'fixed' ? Number(promoPrice) : undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
        enabled: enabled !== undefined ? !!enabled : true,
      });

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor,
        action: 'promotion.create',
        targetType: 'system',
        targetId: String(promotion._id),
        targetLabel: promotion.productId,
        after: promotion.toObject(),
        ip: AuditLogService.getClientIp(req),
      });

      res.status(201).json({ success: true, promotion });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** PUT /api/admin/promotions/:id */
  static async update(req: any, res: Response) {
    try {
      const before = await Promotion.findById(req.params.id);
      if (!before) return res.status(404).json({ success: false, error: 'Promotion not found' });

      const merged = { ...before.toObject(), ...req.body };
      const errors = await validatePayload(merged, { partial: true });
      if (errors.length) return res.status(400).json({ success: false, error: errors.join(' ') });

      const { productId, category, network, promotionType, discountPercent, promoPrice, startDate, endDate, sortOrder, enabled } = req.body;
      if (productId !== undefined) before.productId = String(productId).trim();
      if (category !== undefined) before.category = category;
      if (network !== undefined) before.network = network ? String(network).trim() : undefined;
      if (promotionType !== undefined) before.promotionType = promotionType;
      const effectiveType = promotionType ?? before.promotionType;
      if (effectiveType === 'percentage') {
        if (discountPercent !== undefined) before.discountPercent = Number(discountPercent);
        before.promoPrice = undefined;
      } else if (effectiveType === 'fixed') {
        if (promoPrice !== undefined) before.promoPrice = Number(promoPrice);
        before.discountPercent = undefined;
      }
      if (startDate !== undefined) before.startDate = new Date(startDate);
      if (endDate !== undefined) before.endDate = new Date(endDate);
      if (sortOrder !== undefined) before.sortOrder = Number(sortOrder) || 0;
      if (enabled !== undefined) before.enabled = !!enabled;

      const beforeSnapshot = before.toObject();
      await before.save();

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor,
        action: 'promotion.update',
        targetType: 'system',
        targetId: String(before._id),
        targetLabel: before.productId,
        before: beforeSnapshot,
        after: before.toObject(),
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, promotion: before });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** PUT /api/admin/promotions/:id/enabled — dedicated toggle endpoint, mirrors AdminProductController's toggleEnabled. */
  static async toggleEnabled(req: any, res: Response) {
    try {
      const { enabled } = req.body;
      const promotion = await Promotion.findById(req.params.id);
      if (!promotion) return res.status(404).json({ success: false, error: 'Promotion not found' });

      const wasEnabled = promotion.enabled;
      promotion.enabled = !!enabled;
      await promotion.save();

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor,
        action: 'promotion.toggle',
        targetType: 'system',
        targetId: String(promotion._id),
        targetLabel: promotion.productId,
        before: { enabled: wasEnabled },
        after: { enabled: promotion.enabled },
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, promotion });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** DELETE /api/admin/promotions/:id */
  static async remove(req: any, res: Response) {
    try {
      const promotion = await Promotion.findById(req.params.id);
      if (!promotion) return res.status(404).json({ success: false, error: 'Promotion not found' });

      const snapshot = promotion.toObject();
      await promotion.deleteOne();

      const actor = await getActor(req);
      AuditLogService.log({
        admin: actor,
        action: 'promotion.delete',
        targetType: 'system',
        targetId: String(snapshot._id),
        targetLabel: snapshot.productId,
        before: snapshot,
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
