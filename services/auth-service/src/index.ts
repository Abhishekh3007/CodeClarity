import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import authRouter from './routes/auth.routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' }
});

app.use(express.json());
app.use('/auth', authRateLimiter, authRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ message: error.message || 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Auth service listening on port ${port}`);
});
