import { Response } from 'express';
import { AgentApplication } from '../models/AgentApplication';
import { EmailService } from '../services/EmailService';

export class AgentController {
  static async apply(req: any, res: Response) {
    try {
      const { name, phone, email, message } = req.body;
      if (!name || !phone || !email) {
        return res.status(400).json({ success: false, error: 'Name, phone and email are required' });
      }

      const application = await AgentApplication.create({
        name, phone, email, message,
        userId: req.user?.id,
      });

      EmailService.sendAgentApplicationNotifications({ name, phone, email, message }).catch(() => {});

      res.status(201).json({ success: true, message: 'Application received. Our team will be in touch soon.', id: application._id });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}
