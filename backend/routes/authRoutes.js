import { Router } from 'express';
import { login, me, stream } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, me);
router.get('/stream', stream);

export default router;
