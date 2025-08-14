import { Router } from 'express';
import { recordVisit } from '../controllers/miscController.js';

const router = Router();

router.post('/visit', recordVisit);

export default router;
