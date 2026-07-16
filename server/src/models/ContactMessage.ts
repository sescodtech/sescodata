import mongoose from 'mongoose';

const ContactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // set if submitted while logged in
}, { timestamps: true });

export const ContactMessage = mongoose.model('ContactMessage', ContactMessageSchema);
