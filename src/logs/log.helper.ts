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
    `INSERT INTO job_outputs (id, job_id, output, success)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (job_id)
     DO UPDATE SET 
        output = EXCLUDED.output,
        success = EXCLUDED.success,
        `,
    [id, job_id, output, success]
  );
}

export async function getRetries(jobId: string) {
  const result = await pool.query(
    `SELECT retries FROM job_outputs WHERE job_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [jobId]
  );
  return result.rows[0]?.retries || 0;
}

export async function updateHealthStats(health: any) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO agent_health (id, agent_id, workers, queue_length, memory)
         VALUES ($1, $2, $3, $4, $5)`,
    [id, health.agentId, health.workers, health.queueLength, health.memory]
  );
}
