import mongoose from 'mongoose';

/**
 * Real login history — the User model previously only tracked a single
 * `lastLogin` timestamp with no history. Written on every successful login
 * from AuthController (has access to req.ip/user-agent; AuthService itself
 * stays request-agnostic).
 */
const LoginEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

LoginEventSchema.index({ userId: 1, createdAt: -1 });

export const LoginEvent = mongoose.model('LoginEvent', LoginEventSchema);
