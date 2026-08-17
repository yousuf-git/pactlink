import { Router } from 'express';
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  updateClient,
} from '../controllers/clients.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createClientSchema, updateClientSchema } from '../validation/client.schema.js';

const router = Router();

router.use(requireAuth); // all client routes are owner-scoped

router.get('/', listClients);
router.post('/', validate(createClientSchema), createClient);
router.get('/:id', getClient);
router.patch('/:id', validate(updateClientSchema), updateClient);
router.delete('/:id', deleteClient);

export default router;
