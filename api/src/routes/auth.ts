import { Router } from 'express';
import { demoLogin, login, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validation/auth.schema.js';

const router = Router();

// No public signup (F-12) — login + sandbox demo login only.
router.post('/login', validate(loginSchema), login);
router.post('/demo', demoLogin);
router.get('/me', requireAuth, me);

export default router;
