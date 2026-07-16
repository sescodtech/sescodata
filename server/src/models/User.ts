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
