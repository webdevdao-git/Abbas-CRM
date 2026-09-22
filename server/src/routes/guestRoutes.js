import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  listGuests, listQuerySchema, getGuest, createGuest, createGuestSchema,
  updateGuest, updateGuestSchema, setRsvp, rsvpSchema, deleteGuest,
  getGuestMessage, logInvitationSent,
  bulkMarkInvitationSent, bulkDelete, bulkSchema, exportCsv,
} from '../controllers/guestController.js';

const router = Router();
router.use(requireAuth);

// Static paths before /:id so they are not swallowed by the param route.
router.get('/export/csv', exportCsv);
router.post('/bulk/mark-invited', validate(bulkSchema), bulkMarkInvitationSent);
router.post('/bulk/delete', validate(bulkSchema), bulkDelete);

router.get('/', validate(listQuerySchema, 'query'), listGuests);
router.post('/', validate(createGuestSchema), createGuest);

router.get('/:id', getGuest);
router.put('/:id', validate(updateGuestSchema), updateGuest);
router.delete('/:id', deleteGuest);

router.post('/:id/rsvp', validate(rsvpSchema), setRsvp);
router.get('/:id/message', getGuestMessage);
router.post('/:id/invitation-log', logInvitationSent);

export default router;
