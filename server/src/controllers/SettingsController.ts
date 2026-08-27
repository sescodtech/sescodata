import { Request, Response } from 'express';
import { BrandingSettings } from '../models/BrandingSettings';
import { SupportSettings } from '../models/SupportSettings';
import { User } from '../models/User';
import { AuditLogService } from '../services/AuditLogService';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
// Loose on purpose — admins paste numbers in all kinds of formats (spaces,
// dashes, leading +234). We only need enough validation to catch empty/junk
// input; WhatsApp's wa.me links tolerate digits-only numbers fine.
const MIN_PHONE_DIGITS = 10;

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

  /** GET /api/settings/support — public, no auth. Read-only.
   * Every customer-facing page (WhatsApp button, Support page, footer, contact
   * page, receipts) reads support contact details from here instead of
   * hardcoding them, so an admin can update the number/email once and have
   * it apply everywhere immediately. */
  static async getSupportSettings(_req: Request, res: Response) {
    try {
      const doc = await SupportSettings.findOne({ key: 'default' });
      res.json({
        success: true,
        supportEmail: doc?.supportEmail || 'support@sescohub.com',
        whatsappNumber: doc?.whatsappNumber || '08140112803',
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** PUT /api/admin/support-settings — admin only. */
  static async setSupportSettings(req: any, res: Response) {
    try {
      const { supportEmail, whatsappNumber } = req.body;
      const digits = String(whatsappNumber || '').replace(/\D/g, '');

      if (!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(supportEmail).trim())) {
        return res.status(400).json({ success: false, error: 'A valid support email is required.' });
      }
      if (digits.length < MIN_PHONE_DIGITS) {
        return res.status(400).json({ success: false, error: 'A valid WhatsApp number is required.' });
      }

      const before = await SupportSettings.findOne({ key: 'default' });
      const doc = await SupportSettings.findOneAndUpdate(
        { key: 'default' },
        { supportEmail: String(supportEmail).trim(), whatsappNumber: digits, updatedBy: req.user?.id, updatedAt: new Date() },
        { upsert: true, new: true },
      );

      const admin = await User.findById(req.user.id).select('name email');
      AuditLogService.log({
        admin: { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin' },
        action: 'settings.support',
        targetType: 'system',
        before: { supportEmail: before?.supportEmail, whatsappNumber: before?.whatsappNumber },
        after: { supportEmail: doc.supportEmail, whatsappNumber: doc.whatsappNumber },
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, supportEmail: doc.supportEmail, whatsappNumber: doc.whatsappNumber });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
