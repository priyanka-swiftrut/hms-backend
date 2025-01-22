import express from 'express';
import { createOrder, verifyPayment } from '../controllers/razoepayController.js';

const router = express.Router();

router.post('/create-order', createOrder);
router.post('/create-order-direct-pay', createOrder);

router.post('/verify-payment', verifyPayment);

export default router;