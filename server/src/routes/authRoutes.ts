import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', protect, AuthController.me);
router.put('/profile', protect, AuthController.updateProfile);
router.put('/change-password', protect, AuthController.changePassword);
router.post('/request-reset', AuthController.requestReset);
router.post('/reset-password', AuthController.resetPassword);

export default router;
