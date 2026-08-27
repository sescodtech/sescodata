import express from 'express';
import { WalletController } from '../controllers/WalletController';
import { KycController } from '../controllers/KycController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/wallet', protect, WalletController.getMyWallet);
router.get('/transactions', protect, WalletController.getMyTransactions);
router.post('/kyc', protect, KycController.submit);

export default router;
