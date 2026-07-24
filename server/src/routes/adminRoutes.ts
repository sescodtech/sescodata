import express from 'express';
import { AdminController } from '../controllers/AdminController';
import { AdminOperationsController } from '../controllers/AdminOperationsController';
import { AdminProductController } from '../controllers/AdminProductController';
import { AdminProviderController } from '../controllers/AdminProviderController';
import { AdminReportsController } from '../controllers/AdminReportsController';
import { AdminSupportController } from '../controllers/AdminSupportController';
import { SettingsController } from '../controllers/SettingsController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Single-tenant platform: only the 'admin' role exists now (was 'super_admin').
router.use(protect, authorize('admin'));

// Module 1 — Dashboard
router.get('/stats', AdminController.getStats);
router.get('/revenue-chart', AdminController.getRevenueChart);
router.get('/providers/status', AdminController.getProviderStatus);

// Module 2 — User Management
router.get('/users', AdminController.listUsers);
router.get('/users/:id', AdminController.getUserDetail);
router.put('/users/:id/role', AdminController.updateRole);
router.put('/users/:id/status', AdminController.updateStatus);
router.put('/users/:id/lock', AdminController.setLock);
router.post('/users/:id/reset-password', AdminController.adminResetPassword);
router.post('/users/:id/notes', AdminController.addAdminNote);
router.post('/users/:id/notify', AdminController.sendUserNotification);
router.get('/audit-logs', AdminController.listAuditLogs);

// Module 3 — Wallet & Transaction Management
router.post('/users/:id/wallet/credit', AdminController.creditWallet);
router.post('/users/:id/wallet/debit', AdminController.debitWallet);
router.get('/transactions', AdminController.listTransactions);

// Module 4 — Retry Failed Transactions & Manual Processing
router.get('/operations/stats', AdminOperationsController.getOperationsStats);
router.get('/operations/failed', AdminOperationsController.getFailedQueue);
router.get('/operations/pending', AdminOperationsController.getPendingQueue);
router.get('/operations/manual-review', AdminOperationsController.getManualReviewQueue);
router.get('/operations/transactions/:id/timeline', AdminOperationsController.getTransactionTimeline);
router.post('/operations/transactions/:id/retry', AdminOperationsController.retryTransaction);
router.post('/operations/transactions/bulk-retry', AdminOperationsController.bulkRetry);
router.post('/operations/transactions/:id/flag-review', AdminOperationsController.flagForManualReview);
router.post('/operations/transactions/:id/approve', AdminOperationsController.approveTransaction);
router.post('/operations/transactions/:id/reject', AdminOperationsController.rejectTransaction);
router.post('/operations/transactions/:id/complete', AdminOperationsController.markCompleted);
router.post('/operations/transactions/:id/refund', AdminOperationsController.refundWallet);
router.post('/operations/transactions/:id/reverse', AdminOperationsController.reverseWallet);
router.post('/operations/transactions/:id/notes', AdminOperationsController.addProcessingNote);

// Products / Pricing (Module 5)
router.get('/products', AdminProductController.listProducts);
router.get('/products/categories', AdminProductController.getCategories);
router.get('/products/provider-mapping', AdminProductController.getProviderMapping);
router.put('/products/:productId/enabled', AdminProductController.toggleEnabled);
router.put('/products/:productId/visibility', AdminProductController.toggleVisibility);
router.put('/products/:productId/pricing', AdminProductController.setCustomPricing);
router.post('/products/bulk-pricing', AdminProductController.bulkUpdatePricing);
router.get('/products/export', AdminProductController.exportPricing);
router.post('/products/import', AdminProductController.importPricing);

// Global category markup (unchanged from earlier modules)
router.get('/markup', AdminController.getGlobalMarkup);
router.put('/markup', AdminController.setGlobalMarkup);

// Branding — primary brand color shown across the customer app
router.put('/branding', SettingsController.setBranding);

// Module 6 — Provider Control Center
router.get('/providers', AdminProviderController.getDashboard);
router.put('/providers/settings', AdminProviderController.updateSettings);
router.post('/providers/:name/test', AdminProviderController.testConnection);
router.get('/providers/logs', AdminProviderController.getLogs);

// Module 7 — Reports & Analytics
router.get('/reports/dashboard', AdminReportsController.getDashboard);
router.get('/reports/summary', AdminReportsController.getReport);
router.get('/reports/charts', AdminReportsController.getChart);
router.get('/reports/export/transactions.csv', AdminReportsController.exportTransactionsCsv);
router.get('/reports/export/summary.csv', AdminReportsController.exportSummaryCsv);
router.post('/reports/export/log', AdminReportsController.logExport);

// Module 8 — Support Center
router.get('/support/dashboard', AdminSupportController.getDashboard);
router.get('/support/tickets', AdminSupportController.listTickets);
router.get('/support/admins', AdminSupportController.listAdmins);
router.get('/support/tickets/:id', AdminSupportController.getTicketDetail);
router.post('/support/tickets/:id/reply', AdminSupportController.reply);
router.post('/support/tickets/:id/notes', AdminSupportController.addNote);
router.post('/support/tickets/:id/status', AdminSupportController.changeStatus);
router.post('/support/tickets/:id/priority', AdminSupportController.changePriority);
router.post('/support/tickets/:id/category', AdminSupportController.changeCategory);
router.post('/support/tickets/:id/assign', AdminSupportController.assign);
router.delete('/support/tickets/:id', AdminSupportController.deleteTicket);

export default router;
