import { Router } from 'express';
import { CollectionController } from '../controllers/collection.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createCollectionSchema, collectionQuerySchema } from '../validators/collection.validator';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createCollectionSchema), CollectionController.recordCollection);
router.get('/', validate(collectionQuerySchema), CollectionController.getCollections);
router.get('/:id', CollectionController.getCollectionById);

export default router;
