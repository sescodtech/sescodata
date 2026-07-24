import mongoose from 'mongoose';

const ReplySchema = new mongoose.Schema({
  from: { type: String, enum: ['customer', 'admin'], required: true },
  message: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // set when from==='admin', for attribution in the thread
  adminName: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

// Module 8 — internal, customer-invisible notes admins leave on a ticket.
const InternalNoteSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, required: true },
  note: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

// Module 8 — Ticket Timeline: every admin action (status/priority/assignment
// change, reply, note) appends one entry here, so the drawer can render a
// real activity history instead of reconstructing one from other logs.
const TimelineEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['created', 'reply', 'status_change', 'priority_change', 'assignment', 'note', 'reopened'],
    required: true,
  },
  label: { type: String, required: true }, // human-readable, e.g. "Status changed to Resolved"
  actorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

// Module 8 — schema-ready for attachments; there is no file-upload service
// (Cloudinary/S3/multer) anywhere in this backend to reuse, so no upload UI
// was built. This only renders in the UI "if available" per the spec.
const AttachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  name: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const SupportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  // 'in_progress' is displayed to admins as "Pending" (see STATUS_LABELS on
  // the frontend) — kept as the original DB value so no migration is needed.
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  replies: { type: [ReplySchema], default: [] },

  // ── Module 8: Support Center additions (all additive/optional) ──
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  category: { type: String, enum: ['billing', 'technical', 'account', 'transaction', 'general'], default: 'general' },
  assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAdminName: { type: String, default: null },
  internalNotes: { type: [InternalNoteSchema], default: [] },
  timeline: { type: [TimelineEventSchema], default: [] },
  attachments: { type: [AttachmentSchema], default: [] },
  lastReplyAt: { type: Date, default: null },
  lastReadByAdminAt: { type: Date, default: null },
  lastReadByCustomerAt: { type: Date, default: null },
}, { timestamps: true });

SupportTicketSchema.index({ userId: 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ priority: 1, createdAt: -1 });
SupportTicketSchema.index({ assignedAdminId: 1, createdAt: -1 });
SupportTicketSchema.index({ subject: 'text', message: 'text', name: 'text', email: 'text' });

export const SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema);
