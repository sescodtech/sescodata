import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthService } from '../services/AuthService';
import { User } from '../models/User';
import { EmailService } from '../services/EmailService';
import { LoginEvent } from '../models/LoginEvent';
import { AuditLogService } from '../services/AuditLogService';

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
      // Real login history — fire-and-forget, must never block login itself.
      LoginEvent.create({
        userId: result.user._id,
        ip: AuditLogService.getClientIp(req),
        userAgent: req.headers['user-agent'],
      }).catch(() => {});
      EmailService.sendLoginAlert(result.user, {
        ip: AuditLogService.getClientIp(req),
        userAgent: req.headers['user-agent'],
        time: new Date(),
      }).catch((err) => console.error('[login] failed to send login alert:', err));
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
      if (!newPassword || String(newPassword).length < 8) {
        return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
      }
      const user = await User.findById(req.user.id);
      if (!user) throw new Error('User not found');

      const isMatch = await AuthService.comparePassword(currentPassword, user.password);
      if (!isMatch) throw new Error('Current password incorrect');

      user.password = await AuthService.hashPassword(newPassword);
      await user.save({ validateModifiedOnly: true });

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (e: any) {
      // Only these two messages are ever safe to show a user directly — both
      // are user-input problems, not internal failures. Anything else (DB
      // errors, unexpected exceptions) is logged server-side and given a
      // generic message instead of leaking internals to the client.
      const safeMessages = ['User not found', 'Current password incorrect'];
      if (safeMessages.includes(e.message)) {
        return res.status(400).json({ success: false, error: e.message });
      }
      console.error('[changePassword] failed:', e);
      res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
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

      const { resetUrl } = await AuthService.generateResetToken(user);
      EmailService.sendPasswordReset(user, resetUrl).catch((err) => {
        console.error(`[requestReset] failed to send reset email to ${user.email}:`, err);
      });

      res.json(genericResponse);
    } catch (e: any) {
      console.error('[requestReset] failed:', e);
      res.status(500).json({ success: false, error: 'Something went wrong. Please try again in a moment.' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, email, newPassword } = req.body;
      if (!token || !email || !newPassword) {
        return res.status(400).json({ success: false, error: 'Token, email and new password are required' });
      }
      if (String(newPassword).length < 8) {
        return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
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
      await user.save({ validateModifiedOnly: true });

      const token2 = AuthService.generateToken(user);
      res.json({ success: true, message: 'Password has been reset', token: token2, user });
    } catch (e: any) {
      console.error('[resetPassword] failed:', e);
      res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
    }
  }
}
