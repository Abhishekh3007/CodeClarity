import { pool } from '../db/pool';
import { AnalysisResult } from './analysis.service';

export async function markFileReviewed(params: {
  reviewRunId: string;
  filePath: string;
  language: string;
  result: AnalysisResult;
}): Promise<void> {
  await pool.query(
    `UPDATE file_reviews
     SET status = 'completed',
         score = $1,
         bugs = $2::jsonb,
         security = $3::jsonb,
         performance = $4::jsonb,
         improvements = $5::jsonb,
         raw_response = $6,
         updated_at = NOW()
     WHERE review_run_id = $7 AND file_path = $8`,
    [
      params.result.score,
      JSON.stringify(params.result.bugs),
      JSON.stringify(params.result.security),
      JSON.stringify(params.result.performance),
      JSON.stringify(params.result.improvements),
      params.result.rawResponse ?? JSON.stringify(params.result),
      params.reviewRunId,
      params.filePath
    ]
  );
}

export async function markFileFailed(params: {
  reviewRunId: string;
  filePath: string;
  errorMessage: string;
}): Promise<void> {
  await pool.query(
    `UPDATE file_reviews
     SET status = 'failed',
         raw_response = $1,
         updated_at = NOW()
     WHERE review_run_id = $2 AND file_path = $3`,
    [params.errorMessage, params.reviewRunId, params.filePath]
  );
}

export async function advanceReviewProgress(reviewRunId: string): Promise<void> {
  const reviewRun = await pool.query<{ completed_files: number; total_files: number }>(
    `UPDATE review_runs
     SET completed_files = completed_files + 1,
         updated_at = NOW()
     WHERE id = $1
     RETURNING completed_files, total_files`,
    [reviewRunId]
  );

  const current = reviewRun.rows[0];

  if (current && current.completed_files >= current.total_files) {
    const scoreResult = await pool.query<{ score: number }>(
      `SELECT COALESCE(ROUND(AVG(score))::int, 100) AS score FROM file_reviews WHERE review_run_id = $1`,
      [reviewRunId]
    );

    await pool.query(
      `UPDATE review_runs
       SET status = CASE
         WHEN EXISTS (
           SELECT 1 FROM file_reviews WHERE review_run_id = $1 AND status = 'failed'
         ) THEN 'failed'
         ELSE 'completed'
       END,
           score = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [reviewRunId, scoreResult.rows[0]?.score ?? 100]
    );
  }
}
