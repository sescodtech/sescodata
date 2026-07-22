import { Request, Response } from 'express';
import { BrandingSettings } from '../models/BrandingSettings';
import { User } from '../models/User';
import { AuditLogService } from '../services/AuditLogService';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export class SettingsController {
  /** GET /api/settings/branding — public, no auth. Read-only. */
  static async getBranding(_req: Request, res: Response) {
    try {
      const doc = await BrandingSettings.findOne({ key: 'default' });
      res.json({ success: true, primaryColor: doc?.primaryColor || '#2563EB' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** PUT /api/admin/branding — admin only (mounted under adminRoutes, which already guards with protect + authorize('admin')). */
  static async setBranding(req: any, res: Response) {
    try {
      const { primaryColor } = req.body;
      if (!primaryColor || !HEX_COLOR.test(primaryColor)) {
        return res.status(400).json({ success: false, error: 'primaryColor must be a hex color like #2563EB' });
      }

      const before = await BrandingSettings.findOne({ key: 'default' });
      const doc = await BrandingSettings.findOneAndUpdate(
        { key: 'default' },
        { primaryColor, updatedBy: req.user?.id, updatedAt: new Date() },
        { upsert: true, new: true },
      );

      const admin = await User.findById(req.user.id).select('name email');
      AuditLogService.log({
        admin: { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin' },
        action: 'settings.branding',
        targetType: 'system',
        before: { primaryColor: before?.primaryColor || '#2563EB' },
        after: { primaryColor: doc.primaryColor },
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, primaryColor: doc.primaryColor });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
