import express from 'express';
import { PurchaseController } from '../controllers/PurchaseController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// All six categories now wired — buyAirtime/buyCable existed but were unrouted,
// buyElectricity/buyExamPin/buyRechargeCard existed on every provider but had
// no controller/route at all.
router.post('/buy-data', protect, PurchaseController.buyData);
router.post('/buy-airtime', protect, PurchaseController.buyAirtime);
router.post('/buy-cable', protect, PurchaseController.buyCable);
router.post('/buy-electricity', protect, PurchaseController.buyElectricity);
router.post('/buy-exam', protect, PurchaseController.buyExamPin);
router.post('/buy-recharge-card', protect, PurchaseController.buyRechargeCard);

export default router;
