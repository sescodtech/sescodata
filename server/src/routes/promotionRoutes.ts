import express from 'express';
import { PromotionController } from '../controllers/PromotionController';

const router = express.Router();

// Public and unauthenticated on purpose — the dashboard's "Active Promotions"
// card needs this data as soon as it renders, same reasoning as /api/settings/branding.
router.get('/active', PromotionController.listActive);

export default router;
