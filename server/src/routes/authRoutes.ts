import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { protect } from '../middlewares/authMiddleware';
import { authLimiter } from '../middlewares/rateLimiter';

const router = express.Router();

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.get('/me', protect, AuthController.me);
router.put('/profile', protect, AuthController.updateProfile);
router.put('/change-password', protect, AuthController.changePassword);
router.post('/request-reset', authLimiter, AuthController.requestReset);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

export default router;
