import mongoose from 'mongoose';

const ReplySchema = new mongoose.Schema({
  from: { type: String, enum: ['customer', 'admin'], required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const SupportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  replies: { type: [ReplySchema], default: [] },
}, { timestamps: true });

SupportTicketSchema.index({ userId: 1, createdAt: -1 });

export const SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema);
