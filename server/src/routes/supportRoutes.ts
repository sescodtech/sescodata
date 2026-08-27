import express from 'express';
import { SupportController } from '../controllers/SupportController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Protected — the Support page lives inside the customer dashboard.
router.post('/tickets', protect, SupportController.createTicket);
router.get('/tickets', protect, SupportController.myTickets);
router.get('/tickets/:id', protect, SupportController.getTicket);
router.post('/tickets/:id/reply', protect, SupportController.replyToTicket);

export default router;
