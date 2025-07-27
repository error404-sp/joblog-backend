// @ts-nocheck
import pool from "../config/db";
import { Job } from "./job.types";

export async function createJob(job: Job) {
  const result = await pool.query(
    `INSERT INTO jobs (id, command, type, parameters, priority, timeout, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
    [
      job.id,
      job.command,
      job.type,
      job.parameters ? JSON.stringify(job.parameters) : null,
      job.priority ?? 0,
      job.timeout ?? null,
      job.status ?? "queued",
    ]
  );
  return result.rows[0];
}

export async function getAllJobs(
  page = 1,
  limit = 10
): Promise<{ jobs: Job[]; total: number }> {
  const offset = (page - 1) * limit;
  const result = await pool.query(
    `
      SELECT *, COUNT(*) OVER() AS total_count
      FROM jobs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );

  const jobs = result.rows.map((row) => {
    const { total_count, ...job } = row;
    return job;
  });

  const total =
    result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;

  return { jobs, total };
}

export async function getJobById(id: string): any {
  const jobQuery = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [id]);
  const outputQuery = await pool.query(
    `SELECT * FROM job_outputs WHERE job_id = $1`,
    [id]
  );

  const logsQuery = await pool.query(
    `SELECT * FROM job_logs WHERE job_id = $1 ORDER BY created_at ASC`,
    [id]
  );

  const result = {
    jobQuery,
    outputQuery,
    logsQuery,
  };
  return result;
}
