import express from 'express';
import { AgentController } from '../controllers/AgentController';

const router = express.Router();

// Public — Become an Agent is a marketing/lead-capture page, no login required.
router.post('/apply', AgentController.apply);

export default router;
