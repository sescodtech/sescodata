import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthService } from '../services/AuthService';
import { User } from '../models/User';
import { EmailService } from '../services/EmailService';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({ success: true, ...result });
      // Fire-and-forget — a failed welcome email must never fail registration.
      EmailService.sendWelcome(result.user).catch(() => {});
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(401).json({ success: false, error: e.message });
    }
  }

  static async me(req: any, res: Response) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      res.json({
        success: true,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, walletBalance: user.walletBalance }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async updateProfile(req: any, res: Response) {
    try {
      const { name, phone } = req.body;
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { name, phone },
        { new: true }
      );
      res.json({ success: true, message: 'Profile updated', user });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  static async changePassword(req: any, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) throw new Error('User not found');

      const isMatch = await AuthService.comparePassword(currentPassword, user.password);
      if (!isMatch) throw new Error('Current password incorrect');

      user.password = await AuthService.hashPassword(newPassword);
      await user.save();

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * FIXED: this was a complete mock — no token was ever generated, and
   * resetPassword() below accepted any token and reset the password
   * unconditionally. Real implementation: a random token is generated and
   * only its SHA-256 hash is stored (so a DB leak alone can't be used to
   * reset accounts), expires in 1 hour, and is emailed as a reset link.
   * Always responds with the same generic message regardless of whether the
   * email exists, to avoid leaking which emails are registered.
   */
  static async requestReset(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const genericResponse = { success: true, message: 'If this email exists, a reset link has been sent.' };

      const user = await User.findOne({ email: String(email || '').toLowerCase() });
      if (!user) return res.json(genericResponse);

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.resetPasswordTokenHash = tokenHash;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
      EmailService.sendPasswordReset(user, resetUrl).catch(() => {});

      res.json(genericResponse);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, email, newPassword } = req.body;
      if (!token || !email || !newPassword) {
        return res.status(400).json({ success: false, error: 'Token, email and new password are required' });
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const user = await User.findOne({
        email: String(email).toLowerCase(),
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+resetPasswordTokenHash +resetPasswordExpires');

      if (!user) {
        return res.status(400).json({ success: false, error: 'This reset link is invalid or has expired' });
      }

      user.password = await AuthService.hashPassword(newPassword);
      user.resetPasswordTokenHash = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      const token2 = AuthService.generateToken(user);
      res.json({ success: true, message: 'Password has been reset', token: token2, user });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
