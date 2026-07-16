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

  paymentReference: { type: String },
  failReason: { type: String },
  deliveryError: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret: any) {
      // Never leak which upstream provider fulfilled an order.
      if (ret.provider) delete ret.provider.name;
      if (ret.provider) delete ret.provider.apiResponse;
      return ret;
    }
  }
});

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ paymentReference: 1 });
TransactionSchema.index({ 'provider.reference': 1 });

export const Transaction = mongoose.model('Transaction', TransactionSchema);
