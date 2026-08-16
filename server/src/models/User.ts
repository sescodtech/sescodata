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

  // Set atomically at the start of a purchase attempt, cleared at the end.
  // A second concurrent purchase request for the same user is rejected while
  // this is in the future — see WalletService/PurchaseController.
  purchaseLockUntil: { type: Date, default: null },

  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },

  // Distinct from `status`: status is a business decision (suspend for policy
  // reasons); isLocked is a security gate an admin can apply independently
  // (e.g. suspected compromise) without changing the account's business status.
  isLocked: { type: Boolean, default: false },

  // Simple KYC: BVN + NIN only. No document uploads, no third-party storage —
  // just the two ID numbers, reviewed manually by an admin. select:false
  // keeps them out of default queries (User.find, /api/me, etc.) since
  // they're sensitive PII; only the admin KYC review endpoint explicitly
  // selects them.
  bvn: { type: String, select: false },
  nin: { type: String, select: false },
  kycStatus: {
    type: String,
    enum: ['not_started', 'pending', 'verified', 'rejected'],
    default: 'not_started'
  },
  kycSubmittedAt: { type: Date },
  kycReviewedAt: { type: Date },
  kycReviewedBy: { type: String },
  kycRejectionReason: { type: String },

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
