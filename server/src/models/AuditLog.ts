import mongoose from 'mongoose';

/**
 * Records every sensitive admin action platform-wide. Written by a single
 * shared helper (AuditLogService.log) called from every mutating admin
 * endpoint, rather than each controller writing its own log entry — keeps
 * the log shape consistent and means no admin action can "forget" to log.
 */
const AuditLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, required: true }, // denormalized so old logs still read fine if the admin account is later deleted
  action: { type: String, required: true }, // e.g. 'user.suspend', 'wallet.credit', 'user.password_reset'
  targetType: { type: String, enum: ['user', 'transaction', 'system', 'ticket'], default: 'user' },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  targetLabel: { type: String }, // denormalized target name/email for quick display
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed },
  reason: { type: String },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now },
});

AuditLogSchema.index({ targetId: 1, createdAt: -1 });
AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
