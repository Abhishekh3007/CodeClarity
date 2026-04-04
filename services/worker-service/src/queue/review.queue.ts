import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { getEnv } from '../config';

export interface AnalyzeFileJobPayload {
  reviewRunId: string;
  userId: string;
  repositoryId: string;
  repositoryName: string;
  repositoryUrl?: string | null;
  filePath: string;
  language: string;
  content: string;
  totalFiles: number;
}

export function createRedisConnection(): IORedis {
  return new IORedis(getEnv('REDIS_URL'));
}

export function createReviewWorker(handler: (job: { data: AnalyzeFileJobPayload }) => Promise<void>): Worker<AnalyzeFileJobPayload> {
  return new Worker<AnalyzeFileJobPayload>('reviewQueue', async (job) => handler(job), {
    connection: createRedisConnection(),
    concurrency: 4
  });
}
