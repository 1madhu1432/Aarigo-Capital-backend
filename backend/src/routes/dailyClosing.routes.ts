import { Router } from 'express';
import { DailyClosingController } from '../controllers/dailyClosing.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createDailyClosingSchema,
  dailyClosingQuerySchema,
} from '../validators/dailyClosing.validator';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createDailyClosingSchema), DailyClosingController.performClosing);
router.get('/today', DailyClosingController.getTodayClosing);
router.get('/', validate(dailyClosingQuerySchema), DailyClosingController.getDailyClosings);
router.get('/:id', DailyClosingController.getDailyClosingById);

export default router;
