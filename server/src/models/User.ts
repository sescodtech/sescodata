import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String },

  // Single-tenant platform: only two roles exist.
  role: {
    type: String,
    enum: ['admin', 'customer'],
    required: true,
    default: 'customer'
  },

  walletBalance: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },

  // Distinct from `status`: status is a business decision (suspend for policy
  // reasons); isLocked is a security gate an admin can apply independently
  // (e.g. suspected compromise) without changing the account's business status.
  isLocked: { type: Boolean, default: false },

  // No KYC verification flow (ID capture, third-party verification) exists in
  // this platform yet — this field honestly reflects that: every account
  // starts and stays 'not_started' until a real verification flow is built.
  // Not faked as 'verified' for anyone.
  kycStatus: {
    type: String,
    enum: ['not_started', 'pending', 'verified', 'rejected'],
    default: 'not_started'
  },

  lastLogin: { type: Date },
  resetPasswordTokenHash: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret: any) {
      // SECURITY FIX: the original schema had no transform, so User.create(...)
      // and User.findById(...) results — including the bcrypt hash — were being
      // serialized straight into register/login/me API responses.
      delete ret.password;
      return ret;
    }
  }
});

export const User = mongoose.model('User', UserSchema);
