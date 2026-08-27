import { Response } from 'express';
import { User } from '../models/User';
import { AuditLogService } from '../services/AuditLogService';
import { EmailService } from '../services/EmailService';

async function getActor(req: any): Promise<{ id: string; name: string }> {
  const admin = await User.findById(req.user.id).select('name');
  return { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin' };
}

export class AdminKycController {
  /**
   * GET /api/admin/kyc?status=pending — view submitted KYC.
   * Defaults to 'pending' (the review queue); pass ?status=all for every
   * submission, or a specific status to filter.
   */
  static async list(req: any, res: Response) {
    try {
      const status = (req.query.status as string) || 'pending';
      const filter: any = { kycStatus: { $in: ['pending', 'verified', 'rejected'] } };
      if (status !== 'all') filter.kycStatus = status;

      const users = await User.find(filter)
        .select('+bvn +nin name email phone kycStatus kycSubmittedAt kycReviewedAt kycReviewedBy kycRejectionReason')
        .sort({ kycSubmittedAt: -1 });

      res.json({ success: true, submissions: users });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** POST /api/admin/kyc/:userId/approve */
  static async approve(req: any, res: Response) {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      if (user.kycStatus !== 'pending') {
        return res.status(400).json({ success: false, error: 'Only pending submissions can be approved.' });
      }

      const actor = await getActor(req);
      user.kycStatus = 'verified';
      user.kycReviewedAt = new Date();
      user.kycReviewedBy = actor.name;
      user.kycRejectionReason = undefined;
      await user.save();

      AuditLogService.log({
        admin: actor,
        action: 'kyc.approve',
        targetType: 'user',
        targetId: String(user._id),
        targetLabel: user.email,
        ip: AuditLogService.getClientIp(req),
      });

      EmailService.sendKycApproved(user).catch(() => {});

      res.json({ success: true, kycStatus: user.kycStatus });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** POST /api/admin/kyc/:userId/reject  { reason?: string } */
  static async reject(req: any, res: Response) {
    try {
      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      if (user.kycStatus !== 'pending') {
        return res.status(400).json({ success: false, error: 'Only pending submissions can be rejected.' });
      }

      const { reason } = req.body;
      const actor = await getActor(req);
      user.kycStatus = 'rejected';
      user.kycReviewedAt = new Date();
      user.kycReviewedBy = actor.name;
      user.kycRejectionReason = reason ? String(reason).trim() : undefined;
      await user.save();

      AuditLogService.log({
        admin: actor,
        action: 'kyc.reject',
        targetType: 'user',
        targetId: String(user._id),
        targetLabel: user.email,
        after: { reason: user.kycRejectionReason },
        ip: AuditLogService.getClientIp(req),
      });

      EmailService.sendKycRejected(user, user.kycRejectionReason).catch(() => {});

      res.json({ success: true, kycStatus: user.kycStatus });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
