import express from 'express';
import { SettingsController } from '../controllers/SettingsController';

const router = express.Router();

// Public and unauthenticated on purpose: the landing page and login screen
// need to render in the platform's chosen brand color before anyone is
// logged in, so this can't sit behind `protect`.
router.get('/branding', SettingsController.getBranding);

// Public and unauthenticated on purpose: the WhatsApp floating button, footer,
// and public contact/support pages need these values before anyone logs in.
router.get('/support', SettingsController.getSupportSettings);

export default router;
