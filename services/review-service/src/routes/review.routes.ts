import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { analyzeRepository, getReviewResultsHandler, getReviewStatus, healthCheck } from '../controllers/review.controller';

const reviewRouter = Router();

reviewRouter.get('/health', healthCheck);
reviewRouter.post('/reviews/analyze', authenticateToken, analyzeRepository);
reviewRouter.get('/reviews/:reviewId', authenticateToken, getReviewStatus);
reviewRouter.get('/reviews/:reviewId/results', authenticateToken, getReviewResultsHandler);

export default reviewRouter;
