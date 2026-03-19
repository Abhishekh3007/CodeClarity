import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import repoRouter from './routes/repo.routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3002;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' }
});

app.use(express.json());
app.use(limiter);
app.use('/', repoRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'repo-service' });
});

app.listen(port, () => {
  console.log(`Repo service listening on port ${port}`);
});
