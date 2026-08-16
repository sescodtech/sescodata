import { Response } from 'express';
import { Promotion } from '../models/Promotion';
import { User } from '../models/User';
import { AuditLogService } from '../services/AuditLogService';

async function getActor(req: any): Promise<{ id: string; name: string }> {
  const admin = await User.findById(req.user.id).select('name');
  return { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin' };
}

function validatePayload(body: any, { partial = false } = {}) {
  const errors: string[] = [];
  if (!partial || body.title !== undefined) {
    if (!body.title || !String(body.title).trim()) errors.push('Title is required.');
  }
  if (!partial || body.description !== undefined) {
    if (!body.description || !String(body.description).trim()) errors.push('Description is required.');
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
      const errors = validatePayload(req.body);
      if (errors.length) return res.status(400).json({ success: false, error: errors.join(' ') });

      const { title, description, ctaText, ctaLink, startDate, endDate, sortOrder, enabled } = req.body;
      const promotion = await Promotion.create({
        title: String(title).trim(),
        description: String(description).trim(),
        ctaText: ctaText ? String(ctaText).trim() : undefined,
        ctaLink: ctaLink ? String(ctaLink).trim() : undefined,
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
        targetLabel: promotion.title,
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
      const errors = validatePayload(req.body, { partial: true });
      if (errors.length) return res.status(400).json({ success: false, error: errors.join(' ') });

      const before = await Promotion.findById(req.params.id);
      if (!before) return res.status(404).json({ success: false, error: 'Promotion not found' });

      const { title, description, ctaText, ctaLink, startDate, endDate, sortOrder, enabled } = req.body;
      if (title !== undefined) before.title = String(title).trim();
      if (description !== undefined) before.description = String(description).trim();
      if (ctaText !== undefined) before.ctaText = ctaText ? String(ctaText).trim() : undefined;
      if (ctaLink !== undefined) before.ctaLink = ctaLink ? String(ctaLink).trim() : undefined;
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
        targetLabel: before.title,
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
        targetLabel: promotion.title,
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
        targetLabel: snapshot.title,
        before: snapshot,
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
