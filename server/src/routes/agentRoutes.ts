import express from 'express';
import { AgentController } from '../controllers/AgentController';
import { publicFormLimiter } from '../middlewares/rateLimiter';

const router = express.Router();

// Public — Become an Agent is a marketing/lead-capture page, no login required.
router.post('/apply', publicFormLimiter, AgentController.apply);

export default router;
