import { Request, Response } from 'express';
import { SupportTicket } from '../models/SupportTicket';
import { User } from '../models/User';
import { EmailService } from '../services/EmailService';
import { AuditLogService } from '../services/AuditLogService';
import { buildCustomerSnapshot } from './AdminController';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Same "who's the acting admin" lookup every other admin controller uses. */
async function getActor(req: any): Promise<{ id: string; name: string; email: string }> {
  const admin = await User.findById(req.user.id).select('name email');
  return { id: req.user.id, name: admin?.name || req.user.email || 'Unknown Admin', email: admin?.email || req.user.email };
}

/**
 * There is no super_admin role in this single-tenant schema (it was
 * intentionally collapsed into a single 'admin' role — see adminRoutes.ts).
 * ADMIN_EMAIL is the one already-existing env value that designates the
 * platform's primary/owning admin, so it's reused here as the gate for the
 * one truly destructive action (deleting a ticket) rather than inventing a
 * new role or schema field for a single checkbox.
 */
function isSuperAdmin(req: any): boolean {
  const configured = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const actorEmail = (req.user?.email || '').toLowerCase().trim();
  return !!configured && configured === actorEmail;
}

function buildFilter(query: Record<string, any>) {
  const { status, priority, category, userId, assignedAdminId, search, dateFrom, dateTo } = query;
  const filter: any = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (userId) filter.userId = userId;
  if (assignedAdminId) filter.assignedAdminId = assignedAdminId === 'unassigned' ? null : assignedAdminId;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }
  if (search) {
    filter.$or = [
      { subject: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } },
    ];
  }
  return filter;
}

export class AdminSupportController {
  // ============================================================
  // SUPPORT DASHBOARD
  // ============================================================
  static async getDashboard(_req: Request, res: Response) {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now.getTime() - 7 * DAY_MS);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        total, open, pending, resolved, closed, highPriority,
        todayCount, weekCount, monthCount, responseAgg,
      ] = await Promise.all([
        SupportTicket.countDocuments({}),
        SupportTicket.countDocuments({ status: 'open' }),
        SupportTicket.countDocuments({ status: 'in_progress' }),
        SupportTicket.countDocuments({ status: 'resolved' }),
        SupportTicket.countDocuments({ status: 'closed' }),
        SupportTicket.countDocuments({ priority: { $in: ['high', 'urgent'] }, status: { $nin: ['resolved', 'closed'] } }),
        SupportTicket.countDocuments({ createdAt: { $gte: startOfToday } }),
        SupportTicket.countDocuments({ createdAt: { $gte: startOfWeek } }),
        SupportTicket.countDocuments({ createdAt: { $gte: startOfMonth } }),
        // Average Response Time = avg(first admin reply time − ticket creation time),
        // across tickets that have received at least one admin reply.
        SupportTicket.aggregate([
          { $match: { 'replies.from': 'admin' } },
          { $project: { createdAt: 1, firstAdminReply: { $first: { $filter: { input: '$replies', as: 'r', cond: { $eq: ['$$r.from', 'admin'] } } } } } },
          { $project: { diffMs: { $subtract: ['$firstAdminReply.createdAt', '$createdAt'] } } },
          { $group: { _id: null, avgMs: { $avg: '$diffMs' }, count: { $sum: 1 } } },
        ]),
      ]);

      const avgResponseMs = responseAgg[0]?.avgMs || 0;

      res.json({
        success: true,
        stats: {
          totalTickets: total,
          openTickets: open,
          pendingTickets: pending,
          resolvedTickets: resolved,
          closedTickets: closed,
          highPriority,
          avgResponseTimeMinutes: avgResponseMs > 0 ? Math.round((avgResponseMs / 60000) * 10) / 10 : 0,
          todayTickets: todayCount,
          weekTickets: weekCount,
          monthTickets: monthCount,
        },
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // TICKET LIST — search, filter, sort, paginate
  // ============================================================
  static async listTickets(req: Request, res: Response) {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
      const sortField = ['createdAt', 'lastReplyAt', 'priority', 'status'].includes(String(req.query.sortBy)) ? String(req.query.sortBy) : 'createdAt';
      const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

      const filter = buildFilter(req.query as Record<string, any>);

      const [tickets, total] = await Promise.all([
        SupportTicket.find(filter)
          .select('-internalNotes -timeline') // keep the list payload light; detail view fetches those
          .sort({ [sortField]: sortDir })
          .skip((page - 1) * pageSize)
          .limit(pageSize),
        SupportTicket.countDocuments(filter),
      ]);

      res.json({ success: true, tickets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async listAdmins(req: any, res: Response) {
    try {
      const admins = await User.find({ role: 'admin' }).select('name email').sort({ name: 1 });
      res.json({ success: true, admins, isSuperAdmin: isSuperAdmin(req) });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // TICKET DETAIL — full customer context for the drawer
  // ============================================================
  static async getTicketDetail(req: Request, res: Response) {
    try {
      const ticket = await SupportTicket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const [snapshot, previousTickets] = await Promise.all([
        buildCustomerSnapshot(ticket.userId),
        SupportTicket.find({ userId: ticket.userId, _id: { $ne: ticket._id } })
          .select('subject status priority createdAt')
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

      // Silent — marks the ticket read by the admin viewing it, doesn't spam the timeline.
      ticket.lastReadByAdminAt = new Date();
      await ticket.save();

      res.json({
        success: true,
        ticket,
        customer: snapshot ? {
          user: snapshot.user,
          accountAgeDays: Math.floor((Date.now() - new Date((snapshot.user as any).createdAt).getTime()) / DAY_MS),
          walletBalance: (snapshot.user as any).walletBalance,
          lastLogin: (snapshot.user as any).lastLogin,
          totalTransactions: snapshot.transactionSummary.delivered + snapshot.transactionSummary.failed + snapshot.transactionSummary.pending,
          successfulTransactions: snapshot.transactionSummary.delivered,
          failedTransactions: snapshot.transactionSummary.failed,
          recentPurchases: snapshot.recentTransactions,
        } : null,
        previousTickets,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ============================================================
  // ADMIN ACTIONS
  // ============================================================

  /** Reply — saved to Mongo, branded email sent via the existing EmailService, timeline updated. */
  static async reply(req: any, res: Response) {
    try {
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ success: false, error: 'Reply message is required' });

      const ticket = await SupportTicket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const actor = await getActor(req);
      const now = new Date();

      ticket.replies.push({ from: 'admin', message, adminId: actor.id, adminName: actor.name, createdAt: now } as any);
      ticket.timeline.push({ type: 'reply', label: `${actor.name} replied to the ticket`, actorName: actor.name, createdAt: now } as any);
      ticket.lastReplyAt = now;
      ticket.lastReadByAdminAt = now;
      await ticket.save();

      // EMAIL: reuse the existing EmailService — no new email service created.
      EmailService.sendAdminReply({ name: ticket.name, email: ticket.email }, ticket.subject, message, String(ticket._id)).catch(() => {});

      await AuditLogService.log({
        admin: actor, action: 'support.reply', targetType: 'ticket', targetId: String(ticket._id),
        targetLabel: ticket.subject, after: { message }, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, ticket });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** Add Internal Note — customer-invisible, no email, still audited. */
  static async addNote(req: any, res: Response) {
    try {
      const { note } = req.body;
      if (!note?.trim()) return res.status(400).json({ success: false, error: 'Note text is required' });

      const ticket = await SupportTicket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const actor = await getActor(req);
      const now = new Date();
      ticket.internalNotes.push({ adminId: actor.id, adminName: actor.name, note, createdAt: now } as any);
      ticket.timeline.push({ type: 'note', label: `${actor.name} added an internal note`, actorName: actor.name, createdAt: now } as any);
      await ticket.save();

      await AuditLogService.log({
        admin: actor, action: 'support.note', targetType: 'ticket', targetId: String(ticket._id),
        targetLabel: ticket.subject, after: { note }, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, ticket });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** Change status — powers Close / Reopen / Mark Pending / Mark Resolved (one endpoint, four buttons). */
  static async changeStatus(req: any, res: Response) {
    try {
      const { status } = req.body as { status: 'open' | 'in_progress' | 'resolved' | 'closed' };
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const ticket = await SupportTicket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const before = ticket.status;
      if (before === status) return res.json({ success: true, ticket });

      const actor = await getActor(req);
      const now = new Date();
      const STATUS_LABEL: Record<string, string> = { open: 'Open', in_progress: 'Pending', resolved: 'Resolved', closed: 'Closed' };
      const wasReopen = (before === 'closed' || before === 'resolved') && status === 'open';

      ticket.status = status;
      ticket.timeline.push({
        type: wasReopen ? 'reopened' : 'status_change',
        label: wasReopen ? `${actor.name} reopened the ticket` : `${actor.name} changed status to ${STATUS_LABEL[status]}`,
        actorName: actor.name, createdAt: now,
      } as any);
      await ticket.save();

      // NOTIFICATIONS: "Status Changed" — reuses EmailService.sendSystemAnnouncement (no new email method).
      EmailService.sendSystemAnnouncement(
        { email: ticket.email },
        `Your ticket has been ${STATUS_LABEL[status].toLowerCase()}`,
        `Hi ${ticket.name}, the status of your ticket "${ticket.subject}" was updated to ${STATUS_LABEL[status]}.`,
        'View Ticket', `${process.env.APP_URL || ''}/app/support`,
      ).catch(() => {});

      await AuditLogService.log({
        admin: actor, action: 'support.status_change', targetType: 'ticket', targetId: String(ticket._id),
        targetLabel: ticket.subject, before: { status: before }, after: { status }, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, ticket });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** Change priority. */
  static async changePriority(req: any, res: Response) {
    try {
      const { priority } = req.body as { priority: 'low' | 'medium' | 'high' | 'urgent' };
      if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ success: false, error: 'Invalid priority' });
      }

      const ticket = await SupportTicket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const before = ticket.priority;
      const actor = await getActor(req);
      ticket.priority = priority;
      ticket.timeline.push({ type: 'priority_change', label: `${actor.name} changed priority to ${priority}`, actorName: actor.name, createdAt: new Date() } as any);
      await ticket.save();

      await AuditLogService.log({
        admin: actor, action: 'support.priority_change', targetType: 'ticket', targetId: String(ticket._id),
        targetLabel: ticket.subject, before: { priority: before }, after: { priority }, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, ticket });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** Change category. */
  static async changeCategory(req: any, res: Response) {
    try {
      const { category } = req.body as { category: string };
      if (!['billing', 'technical', 'account', 'transaction', 'general'].includes(category)) {
        return res.status(400).json({ success: false, error: 'Invalid category' });
      }
      const ticket = await SupportTicket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const actor = await getActor(req);
      ticket.category = category as any;
      await ticket.save();

      await AuditLogService.log({
        admin: actor, action: 'support.category_change', targetType: 'ticket', targetId: String(ticket._id),
        targetLabel: ticket.subject, after: { category }, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, ticket });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** Assign Admin. */
  static async assign(req: any, res: Response) {
    try {
      const { adminId } = req.body as { adminId: string | null };
      const ticket = await SupportTicket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const actor = await getActor(req);
      let assignedAdmin: { name: string; email: string } | null = null;

      if (adminId) {
        const targetAdmin = await User.findOne({ _id: adminId, role: 'admin' }).select('name email');
        if (!targetAdmin) return res.status(404).json({ success: false, error: 'Admin not found' });
        assignedAdmin = { name: targetAdmin.name, email: targetAdmin.email };
        ticket.assignedAdminId = targetAdmin._id as any;
        ticket.assignedAdminName = targetAdmin.name;
      } else {
        ticket.assignedAdminId = null as any;
        ticket.assignedAdminName = null as any;
      }

      ticket.timeline.push({
        type: 'assignment',
        label: assignedAdmin ? `${actor.name} assigned the ticket to ${assignedAdmin.name}` : `${actor.name} unassigned the ticket`,
        actorName: actor.name, createdAt: new Date(),
      } as any);
      await ticket.save();

      // NOTIFICATIONS: "Ticket Assigned" — reuses EmailService.sendSystemAnnouncement.
      if (assignedAdmin) {
        EmailService.sendSystemAnnouncement(
          { email: assignedAdmin.email },
          'A ticket has been assigned to you',
          `Hi ${assignedAdmin.name}, "${ticket.subject}" from ${ticket.name} has been assigned to you in the Support Center.`,
          'Open Ticket', `${process.env.APP_URL || ''}/admin/support`,
        ).catch(() => {});
      }

      await AuditLogService.log({
        admin: actor, action: 'support.assign', targetType: 'ticket', targetId: String(ticket._id),
        targetLabel: ticket.subject, after: { assignedAdminId: adminId || null, assignedAdminName: assignedAdmin?.name || null },
        ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, ticket });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /** Delete Ticket — Super Admin only. */
  static async deleteTicket(req: any, res: Response) {
    try {
      if (!isSuperAdmin(req)) {
        return res.status(403).json({ success: false, error: 'Only the super admin can delete tickets' });
      }
      const ticket = await SupportTicket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const actor = await getActor(req);
      const snapshot = ticket.toObject();
      await SupportTicket.deleteOne({ _id: ticket._id });

      await AuditLogService.log({
        admin: actor, action: 'support.delete', targetType: 'ticket', targetId: String(ticket._id),
        targetLabel: ticket.subject, before: snapshot, ip: AuditLogService.getClientIp(req),
      });

      res.json({ success: true, message: 'Ticket deleted' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}
