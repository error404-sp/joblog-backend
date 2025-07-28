import { NextFunction, Request, Response } from "express";
import { createJob, getAllJobs, getJobById } from "./job.helper";
import { v4 as uuidv4 } from "uuid";
import { jobQueue } from "../utils/jobQueue";

export async function handleCreateJob(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { command, type, parameters, priority, timeout } = req.body;

    if (!command || !type) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const job = await createJob({
      id: uuidv4(),
      command,
      type,
      parameters,
      priority,
      timeout,
    });
    console.log(job, job.id);
    jobQueue.enqueue(job);

    return res.status(201).json({ success: true, job });
  } catch (err) {
    next(err);
  }
}

export async function handleAllJobs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const page = parseInt(req.query.page as string);
    const limit = parseInt(req.query.limit as string);

    const { jobs, total } = await getAllJobs(page, limit);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      jobs,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetJobById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const job = await getJobById(id);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    return res.status(200).json({ success: true, job });
  } catch (err) {
    next(err);
  }
}

export const handleStopJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    const job = await getJobById(id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    jobQueue.enqueue({ ...job, priority: 10, status: "cancelled" });

    return res.status(200).json({
      message: "Job stop signal received. Preparing to stop...",
      job,
    });
  } catch (error) {
    next(error);
  }
};
