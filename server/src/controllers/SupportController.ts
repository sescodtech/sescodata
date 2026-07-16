import { Response } from 'express';
import { SupportTicket } from '../models/SupportTicket';
import { EmailService } from '../services/EmailService';
import { User } from '../models/User';

export class SupportController {
  static async createTicket(req: any, res: Response) {
    try {
      const { subject, message } = req.body;
      if (!subject || !message) {
        return res.status(400).json({ success: false, error: 'Subject and message are required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const ticket = await SupportTicket.create({
        userId: user._id,
        name: user.name,
        email: user.email,
        subject,
        message,
        status: 'open',
      });

      EmailService.sendSupportTicketNotifications({
        name: user.name, email: user.email, subject, message, ticketId: String(ticket._id),
      }).catch(() => {});

      res.status(201).json({ success: true, message: 'Support ticket created', ticket });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async myTickets(req: any, res: Response) {
    try {
      const tickets = await SupportTicket.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
      res.json({ success: true, tickets });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
