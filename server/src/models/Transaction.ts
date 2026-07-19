import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  amount: { type: Number, required: true },
  cost: { type: Number, default: 0 }, // Raw cost paid to the provider (never shown to the user)
  profit: { type: Number, default: 0 },

  type: {
    type: String,
    enum: ['deposit', 'purchase', 'refund', 'admin_adjustment'],
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },

  deliveryStatus: {
    type: String,
    enum: ['pending', 'delivered', 'failed'],
    default: 'pending'
  },

  product: {
    productId: String,
    name: String,
    category: String,
    recipient: String,
    quantity: { type: Number, default: 1 }
  },

  // Internal only — never serialized to the client. See toJSON below.
  provider: {
    name: String,
    reference: String,
    apiResponse: Object
  },

  // Captured at purchase time so a retry can safely replay the exact same
  // provider call, instead of trying to reconstruct params from the
  // (lossy) product summary. Internal only — never serialized to the client.
  providerMethod: { type: String }, // 'buyData' | 'buyAirtime' | 'buyCable' | 'buyElectricity' | 'buyExamPin' | 'buyRechargeCard'
  providerParams: { type: mongoose.Schema.Types.Mixed },

  paymentReference: { type: String },
  failReason: { type: String },
  deliveryError: { type: String },

  // ── Module 4: Retry & Manual Processing ──────────────────────
  // Retries update this same document in place (status/deliveryStatus)
  // rather than creating a new Transaction row, consistent with the V2.1
  // fix that made "one ledger row per purchase" the rule. Full history of
  // attempts lives in retryHistory instead.
  retryCount: { type: Number, default: 0 },
  isRetryLocked: { type: Boolean, default: false }, // mutex — prevents two concurrent retries on the same transaction
  retryHistory: [{
    attemptedAt: { type: Date, default: Date.now },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminName: String,
    previousDeliveryStatus: String,
    newDeliveryStatus: String,
    providerUsed: String,
    reason: String,
    error: String,
  }],

  manualReview: {
    status: { type: String, enum: ['none', 'pending', 'approved', 'rejected', 'completed'], default: 'none' },
    providerReference: String, // manual confirmation ref from the provider, entered by admin
    evidenceUrl: String,       // optional supporting evidence link (screenshot, provider dashboard export, etc.)
    notes: [{
      adminName: String,
      note: String,
      createdAt: { type: Date, default: Date.now },
    }],
  },

  // Guards against a manual Refund/Reverse action firing twice on the same transaction.
  refundedManually: { type: Boolean, default: false },
  reversedManually: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret: any) {
      // Never leak which upstream provider fulfilled an order, or the raw
      // params sent to it.
      if (ret.provider) delete ret.provider.name;
      if (ret.provider) delete ret.provider.apiResponse;
      delete ret.providerMethod;
      delete ret.providerParams;
      return ret;
    }
  }
});

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ paymentReference: 1 });
TransactionSchema.index({ 'provider.reference': 1 });
TransactionSchema.index({ deliveryStatus: 1, createdAt: -1 });
TransactionSchema.index({ 'manualReview.status': 1, createdAt: -1 });

export const Transaction = mongoose.model('Transaction', TransactionSchema);
