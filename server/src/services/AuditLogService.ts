import { AuditLog } from '../models/AuditLog';

export class AuditLogService {
  static async log(opts: {
    admin: { id: string; name: string };
    action: string;
    targetType?: 'user' | 'transaction' | 'system';
    targetId?: string;
    targetLabel?: string;
    before?: any;
    after?: any;
    reason?: string;
    ip?: string;
  }) {
    try {
      await AuditLog.create({
        adminId: opts.admin.id,
        adminName: opts.admin.name,
        action: opts.action,
        targetType: opts.targetType || 'user',
        targetId: opts.targetId,
        targetLabel: opts.targetLabel,
        before: opts.before,
        after: opts.after,
        reason: opts.reason,
        ip: opts.ip,
      });
    } catch (e) {
      // An audit log failure must never block the underlying admin action —
      // log the failure itself server-side instead.
      console.error('[AuditLogService] Failed to write audit log:', e);
    }
  }

  static getClientIp(req: any): string {
    return (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket?.remoteAddress
      || req.ip
      || '';
  }
}
