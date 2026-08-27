import mongoose, { Schema } from 'mongoose';

/**
 * Singleton document (there is only ever one row, keyed by `key: 'default'`)
 * holding the customer-app's primary brand color. The admin panel writes to
 * this via PUT /api/admin/branding; the public GET /api/settings/branding
 * endpoint lets both the customer app and the admin panel read the current
 * value without needing to be logged in first (the color has to be applied
 * before the landing page even renders a login button).
 */
export interface IBrandingSettings extends mongoose.Document {
  key: string;
  primaryColor: string;
  updatedBy?: string;
  updatedAt: Date;
}

const BrandingSettingsSchema = new Schema<IBrandingSettings>({
  key: { type: String, default: 'default', unique: true },
  primaryColor: { type: String, default: '#2563EB' },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

export const BrandingSettings = mongoose.model<IBrandingSettings>('BrandingSettings', BrandingSettingsSchema);
