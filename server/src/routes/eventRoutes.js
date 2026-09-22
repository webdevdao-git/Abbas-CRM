import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getEvent, updateEvent, updateEventSchema,
  updateFunction, updateFunctionSchema,
  listTemplates, updateTemplate, updateTemplateSchema,
} from '../controllers/eventController.js';

const router = Router();
router.use(requireAuth);

router.get('/', getEvent);
router.put('/', validate(updateEventSchema), updateEvent);
router.put('/functions/:key', validate(updateFunctionSchema), updateFunction);
router.get('/templates', listTemplates);
router.put('/templates/:key', validate(updateTemplateSchema), updateTemplate);

export default router;
