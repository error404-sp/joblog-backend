import { NextFunction, Request, Response } from "express";
import { jobQueue } from "../utils/jobQueue";
import { Job } from "../jobs/job.types";

const POLL_TIMEOUT_MS = 30_000;

export const pollJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const batchSize = parseInt(req.query.batchSize as string);

  const jobs = jobQueue.batchDequeue(batchSize);
  if (jobs.length > 0) {
    console.log(jobs);
    return res.json({ jobs });
  }

  // If no jobs, wait for jobs or timeout
  const timer = setTimeout(() => {
    cleanup();
    if (!res.writableEnded) res.json({ jobs: [] });
  }, POLL_TIMEOUT_MS);

  const onJob = () => {
    cleanup();
    const newJobs = jobQueue.batchDequeue(batchSize);
    console.log(newJobs);
    if (!res.writableEnded) res.json({ jobs: newJobs });
  };

  const cleanup = () => {
    clearTimeout(timer);
    jobQueue.off("job_added", onJob);
    res.off("close", cleanup);
    res.off("error", cleanup);
  };

  jobQueue.once("job_added", onJob);
  res.once("close", cleanup);
  res.once("error", cleanup);
};
