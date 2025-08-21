import { Router } from 'express';
import { login, register, me, stream, checkPhone } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/check-phone', checkPhone);
router.post('/login', login);
router.get('/me', authenticate, me);
router.get('/stream', stream);

export default router;
