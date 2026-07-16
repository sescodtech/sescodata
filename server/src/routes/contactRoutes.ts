import express from 'express';
import { ContactController } from '../controllers/ContactController';

const router = express.Router();

// Public — the Contact page is reachable from the marketing site without login.
router.post('/', ContactController.submit);

export default router;
