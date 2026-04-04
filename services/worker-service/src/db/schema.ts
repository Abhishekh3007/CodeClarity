import { pool } from './pool';

export async function ensureReviewSchema(): Promise<void> {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS review_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      repository_name TEXT NOT NULL,
      repository_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      score INTEGER NOT NULL DEFAULT 100,
      total_files INTEGER NOT NULL DEFAULT 0,
      completed_files INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      error_message TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS file_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_run_id UUID NOT NULL REFERENCES review_runs(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      language TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      score INTEGER NOT NULL DEFAULT 100,
      bugs JSONB NOT NULL DEFAULT '[]'::jsonb,
      security JSONB NOT NULL DEFAULT '[]'::jsonb,
      performance JSONB NOT NULL DEFAULT '[]'::jsonb,
      improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
      raw_response TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (review_run_id, file_path)
    )
  `);
}
