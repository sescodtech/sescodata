import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-12345';
const TOKEN_EXPIRY = '7d';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  static generateToken(user: any): string {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  }

  static async register(userData: any) {
    const { email, password, role, ...rest } = userData;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) throw new Error('Email already registered');

    const hashedPassword = await this.hashPassword(password);
    // Public registration can never grant admin — that's set manually in the DB / by an existing admin.
    const user = await User.create({
      ...rest,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'customer'
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  static async login(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error('Invalid email or password');

    if (user.status === 'suspended') throw new Error('This account has been suspended');
    if (user.isLocked) throw new Error('This account has been locked for security reasons. Contact support.');

    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) throw new Error('Invalid email or password');

    user.lastLogin = new Date();
    await user.save();

    const token = this.generateToken(user);
    return { user, token };
  }

  static async verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Shared by both the customer self-service "forgot password" flow
   * (AuthController.requestReset) and the admin-triggered "reset this
   * user's password" action (AdminController) — one implementation instead
   * of two copies of the same token-hashing logic.
   */
  static async generateResetToken(user: any) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    return { rawToken, resetUrl };
  }
}
