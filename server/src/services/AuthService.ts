import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
}
