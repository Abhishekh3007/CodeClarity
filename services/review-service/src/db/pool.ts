import { Pool } from 'pg';
import { getEnv } from '../config';

export const pool = new Pool({
  connectionString: getEnv('DATABASE_URL')
});
