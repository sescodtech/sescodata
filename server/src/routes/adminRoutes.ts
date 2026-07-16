import express from 'express';
import { AdminController } from '../controllers/AdminController';
import { protect, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Single-tenant platform: only the 'admin' role exists now (was 'super_admin').
router.use(protect, authorize('admin'));

router.get('/stats', AdminController.getStats);
router.get('/revenue-chart', AdminController.getRevenueChart);
router.get('/users', AdminController.listUsers);
router.put('/users/:id/role', AdminController.updateRole);
router.put('/users/:id/status', AdminController.updateStatus);
router.get('/transactions', AdminController.listTransactions);
router.get('/markup', AdminController.getGlobalMarkup);
router.put('/markup', AdminController.setGlobalMarkup);
router.get('/providers/status', AdminController.getProviderStatus);

export default router;
