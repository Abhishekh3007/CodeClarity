import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import reviewRouter from './routes/review.routes';
import { ensureReviewSchema } from './db/schema';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3003;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' }
});

app.use(express.json({ limit: '2mb' }));
app.use(limiter);
app.use('/', reviewRouter);

ensureReviewSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Review service listening on port ${port}`);
    });
  })
  .catch((error: Error) => {
    console.error('Failed to initialize review-service schema', error);
    process.exit(1);
  });
