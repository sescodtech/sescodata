import mongoose from 'mongoose';

/** Internal notes admins leave on a customer's account — never shown to the customer. */
const AdminNoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, required: true },
  note: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

AdminNoteSchema.index({ userId: 1, createdAt: -1 });

export const AdminNote = mongoose.model('AdminNote', AdminNoteSchema);
