import { Router } from 'express';
import { RouteController } from '../controllers/route.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createRouteSchema, updateRouteSchema, routeQuerySchema } from '../validators/route.validator';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createRouteSchema), RouteController.createRoute);
router.get('/', validate(routeQuerySchema), RouteController.getRoutes);
router.get('/:id', RouteController.getRouteById);
router.put('/:id', validate(updateRouteSchema), RouteController.updateRoute);

export default router;
