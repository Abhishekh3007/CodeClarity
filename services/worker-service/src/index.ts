import dotenv from 'dotenv';
import { ensureReviewSchema } from './db/schema';
import { createReviewWorker } from './queue/review.queue';
import { analyzeCode } from './services/analysis.service';
import { advanceReviewProgress, markFileFailed, markFileReviewed } from './services/review-result.service';

dotenv.config();

async function main(): Promise<void> {
  await ensureReviewSchema();

  const worker = createReviewWorker(async (job) => {
    try {
      const result = await analyzeCode({
        language: job.data.language,
        filePath: job.data.filePath,
        code: job.data.content
      });

      await markFileReviewed({
        reviewRunId: job.data.reviewRunId,
        filePath: job.data.filePath,
        language: job.data.language,
        result
      });
      await advanceReviewProgress(job.data.reviewRunId);
    } catch (error) {
      await markFileFailed({
        reviewRunId: job.data.reviewRunId,
        filePath: job.data.filePath,
        errorMessage: (error as Error).message || 'Unknown review error'
      });
      await advanceReviewProgress(job.data.reviewRunId);
      throw error;
    }
  });

  worker.on('completed', (job) => {
    console.log(`Completed review job ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Review job ${job?.id} failed`, error?.message || error);
  });

  const port = Number(process.env.PORT) || 3004;
  console.log(`Worker service is ready on port ${port}`);
}

main().catch((error: Error) => {
  console.error('Failed to start worker-service', error);
  process.exit(1);
});
