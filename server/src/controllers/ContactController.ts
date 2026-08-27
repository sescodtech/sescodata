import { Response } from 'express';
import { ContactMessage } from '../models/ContactMessage';
import { EmailService } from '../services/EmailService';

export class ContactController {
  static async submit(req: any, res: Response) {
    try {
      const { name, email, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: 'Name, email and message are required' });
      }

      const contact = await ContactMessage.create({
        name, email, message,
        userId: req.user?.id, // present if the request happened to include a valid token
      });

      EmailService.sendContactFormNotifications({ name, email, message }).catch(() => {});

      res.status(201).json({ success: true, message: 'Message received. We will respond within a few hours.', id: contact._id });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}
