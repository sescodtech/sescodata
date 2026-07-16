import express from 'express';
import { WalletController } from '../controllers/WalletController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/wallet', protect, WalletController.getMyWallet);
router.get('/transactions', protect, WalletController.getMyTransactions);

export default router;
