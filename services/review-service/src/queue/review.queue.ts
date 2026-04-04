import { Queue } from 'bullmq';
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

export const reviewQueue = new Queue<AnalyzeFileJobPayload>('reviewQueue', {
  connection: new IORedis(getEnv('REDIS_URL'))
});
