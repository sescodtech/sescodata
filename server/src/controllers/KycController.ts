import { Response } from 'express';
import { User } from '../models/User';

const ID_NUMBER = /^\d{11}$/;

export class KycController {
  /**
   * POST /api/my/kyc — submit BVN + NIN for review.
   * Simple KYC: two ID numbers only, no document/photo uploads, no
   * third-party storage. Sets status to 'pending' for admin review.
   */
  static async submit(req: any, res: Response) {
    try {
      const { bvn, nin } = req.body;
      if (!ID_NUMBER.test(String(bvn || ''))) {
        return res.status(400).json({ success: false, error: 'BVN must be exactly 11 digits.' });
      }
      if (!ID_NUMBER.test(String(nin || ''))) {
        return res.status(400).json({ success: false, error: 'NIN must be exactly 11 digits.' });
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      if (user.kycStatus === 'verified') {
        return res.status(400).json({ success: false, error: 'Your account is already verified.' });
      }
      if (user.kycStatus === 'pending') {
        return res.status(400).json({ success: false, error: 'Your verification is already pending review.' });
      }

      user.bvn = bvn;
      user.nin = nin;
      user.kycStatus = 'pending';
      user.kycSubmittedAt = new Date();
      user.kycRejectionReason = undefined;
      await user.save();

      res.json({ success: true, kycStatus: user.kycStatus });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
