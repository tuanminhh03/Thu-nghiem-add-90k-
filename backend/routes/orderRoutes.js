import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createOrder, getOrders, extendOrder, localSavings } from '../controllers/orderController.js';

const router = Router();

router.post('/', authenticate, createOrder);
router.get('/', authenticate, getOrders);
router.post('/:id/extend', authenticate, extendOrder);
router.post('/local-savings', authenticate, localSavings);

export default router;
