import express from 'express';
import { PaymentController } from '../controllers/PaymentController';

const router = express.Router();

// No 'initiate' route — deposits are initiated via POST /api/wallet/deposit/initiate,
// which owns the pending-transaction creation. This route just verifies + credits.
router.get('/callback', PaymentController.callback);
router.post('/webhook', PaymentController.webhook);

export default router;
