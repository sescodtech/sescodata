import express from 'express';
import { WalletController } from '../controllers/WalletController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Matches /api/wallet/deposit/initiate
router.post('/deposit/initiate', protect, WalletController.depositInitiate);

export default router;
