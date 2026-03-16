import { Router } from 'express';
import { login, profile, register } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/profile', authenticateToken, profile);

export default authRouter;
