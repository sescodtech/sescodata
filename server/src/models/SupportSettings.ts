import mongoose, { Schema } from 'mongoose';

/**
 * Singleton document (one row, keyed by `key: 'default'`) holding the
 * platform's support contact details. Same pattern as BrandingSettings —
 * admin panel writes via PUT /api/admin/support-settings, and the public
 * GET /api/settings/support endpoint lets every customer-facing page (and
 * anonymous visitors on public pages) read the current values without
 * hardcoding them or requiring login.
 *
 * Defaults match the values that were previously hardcoded across the app
 * (FloatingSupportButtons, SupportPage, PublicFooter, ContactPage), so
 * nothing changes for existing deployments until an admin updates them.
 */
export interface ISupportSettings extends mongoose.Document {
  key: string;
  supportEmail: string;
  whatsappNumber: string;
  updatedBy?: string;
  updatedAt: Date;
}

const SupportSettingsSchema = new Schema<ISupportSettings>({
  key: { type: String, default: 'default', unique: true },
  supportEmail: { type: String, default: 'support@sescohub.com' },
  whatsappNumber: { type: String, default: '08140112803' },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

export const SupportSettings = mongoose.model<ISupportSettings>('SupportSettings', SupportSettingsSchema);
