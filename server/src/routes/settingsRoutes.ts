import express from 'express';
import { SettingsController } from '../controllers/SettingsController';

const router = express.Router();

// Public and unauthenticated on purpose: the landing page and login screen
// need to render in the platform's chosen brand color before anyone is
// logged in, so this can't sit behind `protect`.
router.get('/branding', SettingsController.getBranding);

export default router;
