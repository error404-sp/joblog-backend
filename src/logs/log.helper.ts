import pool from "../config/db";
import { v4 as uuidv4 } from "uuid";

export async function updateJobStatus(id: string, status: string) {
  await pool.query(`UPDATE jobs SET status=$1, updated_at=NOW() WHERE id=$2`, [
    status,
    id,
  ]);
}

export async function insertJobLog(job_id: string, log: string) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO job_logs (id, job_id, log) VALUES ($1, $2, $3)`,
    [id, job_id, log]
  );
}

export async function insertJobOutput(
  job_id: string,
  output: string,
  success: boolean
) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO job_outputs (id, job_id, output, success, retries)
       VALUES ($1, $2, $3, $4, 0)
       ON CONFLICT (job_id)
       DO UPDATE SET 
         output = EXCLUDED.output, 
         success = EXCLUDED.success,
         retries = job_outputs.retries + 1`,
    [id, job_id, output, success]
  );
}
