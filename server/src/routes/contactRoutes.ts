import express from 'express';
import { ContactController } from '../controllers/ContactController';
import { publicFormLimiter } from '../middlewares/rateLimiter';

const router = express.Router();

// Public — the Contact page is reachable from the marketing site without login.
router.post('/', publicFormLimiter, ContactController.submit);

export default router;
