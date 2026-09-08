import { Router } from 'express';
import { VisitController } from '../controllers/visit.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createVisitSchema, updateVisitSchema, visitQuerySchema } from '../validators/visit.validator';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createVisitSchema), VisitController.createVisit);
router.get('/', validate(visitQuerySchema), VisitController.getVisits);
router.get('/:id', VisitController.getVisitById);
router.put('/:id', validate(updateVisitSchema), VisitController.updateVisit);

export default router;
