import express from 'express';
import { ProductController } from '../controllers/ProductController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', protect, ProductController.list);
router.get('/:id', protect, ProductController.getOne);

export default router;
