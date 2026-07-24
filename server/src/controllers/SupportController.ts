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
        timeline: [{ type: 'created', label: `${user.name} created the ticket`, actorName: user.name, createdAt: new Date() }],
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

  static async getTicket(req: any, res: Response) {
    try {
      const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user.id });
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
      ticket.lastReadByCustomerAt = new Date();
      await ticket.save();
      res.json({ success: true, ticket });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** Customer reply — updates the same ticket the admin sees, and pings the admin inbox via the existing EmailService (no new email service). */
  static async replyToTicket(req: any, res: Response) {
    try {
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ success: false, error: 'Message is required' });

      const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user.id });
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const now = new Date();
      ticket.replies.push({ from: 'customer', message, createdAt: now } as any);
      ticket.timeline.push({ type: 'reply', label: `${ticket.name} replied to the ticket`, actorName: ticket.name, createdAt: now } as any);
      ticket.lastReplyAt = now;
      ticket.lastReadByCustomerAt = now;
      // A customer reply on a resolved/closed ticket implicitly reopens it — same as most helpdesks.
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        ticket.status = 'open';
        ticket.timeline.push({ type: 'reopened', label: `Ticket reopened by ${ticket.name}'s reply`, actorName: ticket.name, createdAt: now } as any);
      }
      await ticket.save();

      EmailService.sendSystemAnnouncement(
        { email: process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '' },
        `New reply on ticket #${String(ticket._id).slice(-6)}`,
        `${ticket.name} replied to "${ticket.subject}":\n\n${message}`,
        'Open Support Center', `${process.env.APP_URL || ''}/admin/support`,
      ).catch(() => {});

      res.json({ success: true, ticket });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
