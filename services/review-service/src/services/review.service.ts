import { randomUUID } from 'crypto';
import { pool } from '../db/pool';
import { reviewQueue, AnalyzeFileJobPayload } from '../queue/review.queue';

export interface FileInput {
  filePath: string;
  language: string;
  content: string;
}

export interface ReviewRunRow {
  id: string;
  user_id: string;
  repository_id: string;
  repository_name: string;
  repository_url: string | null;
  status: string;
  score: number;
  total_files: number;
  completed_files: number;
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

export async function getRepositoryForUser(repositoryId: string, userId: string): Promise<{ id: string; repoName: string; repoUrl: string }> {
  const result = await pool.query<{ id: string; repoName: string; repoUrl: string }>(
    `SELECT id, "repoName" as "repoName", "repoUrl" as "repoUrl" FROM repositories WHERE id = $1 AND "userId" = $2`,
    [repositoryId, userId]
  );

  if (result.rowCount === 0) {
    throw Object.assign(new Error('Repository not found for this user'), { status: 404 });
  }

  return result.rows[0];
}

export async function createReviewRun(params: {
  userId: string;
  repositoryId: string;
  repositoryName: string;
  repositoryUrl?: string | null;
  files: FileInput[];
}): Promise<ReviewRunRow> {
  const reviewId = randomUUID();

  await pool.query(
    `INSERT INTO review_runs (id, user_id, repository_id, repository_name, repository_url, status, total_files, completed_files, score)
     VALUES ($1, $2, $3, $4, $5, 'processing', $6, 0, 100)` ,
    [reviewId, params.userId, params.repositoryId, params.repositoryName, params.repositoryUrl ?? null, params.files.length]
  );

  for (const file of params.files) {
    await pool.query(
      `INSERT INTO file_reviews (review_run_id, file_path, language, status, score, bugs, security, performance, improvements)
       VALUES ($1, $2, $3, 'pending', 100, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
       ON CONFLICT (review_run_id, file_path) DO NOTHING`,
      [reviewId, file.filePath, file.language]
    );
  }

  const reviewRun = await pool.query<ReviewRunRow>('SELECT * FROM review_runs WHERE id = $1', [reviewId]);

  await Promise.all(
    params.files.map((file) =>
      reviewQueue.add('analyzeFile', {
        reviewRunId: reviewId,
        userId: params.userId,
        repositoryId: params.repositoryId,
        repositoryName: params.repositoryName,
        repositoryUrl: params.repositoryUrl ?? null,
        filePath: file.filePath,
        language: file.language,
        content: file.content,
        totalFiles: params.files.length
      } satisfies AnalyzeFileJobPayload)
    )
  );

  return reviewRun.rows[0];
}

export async function getReviewRun(reviewRunId: string, userId: string): Promise<ReviewRunRow> {
  const result = await pool.query<ReviewRunRow>('SELECT * FROM review_runs WHERE id = $1 AND user_id = $2', [reviewRunId, userId]);

  if (result.rowCount === 0) {
    throw Object.assign(new Error('Review run not found'), { status: 404 });
  }

  return result.rows[0];
}

export async function getReviewResults(reviewRunId: string, userId: string): Promise<unknown[]> {
  const result = await pool.query(
    `SELECT fr.id, fr.review_run_id as "reviewRunId", fr.file_path as "filePath", fr.language, fr.status, fr.score,
            fr.bugs, fr.security, fr.performance, fr.improvements, fr.raw_response as "rawResponse",
            fr.created_at as "createdAt", fr.updated_at as "updatedAt"
     FROM file_reviews fr
     INNER JOIN review_runs rr ON rr.id = fr.review_run_id
     WHERE fr.review_run_id = $1 AND rr.user_id = $2
     ORDER BY fr.file_path ASC`,
    [reviewRunId, userId]
  );

  return result.rows;
}
