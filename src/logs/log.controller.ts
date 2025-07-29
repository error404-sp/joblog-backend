import { Server } from "socket.io";
import http from "http";
import { jobQueue } from "../utils/jobQueue";
import {
  getRetries,
  insertJobLog,
  insertJobOutput,
  updateHealthStats,
  updateJobStatus,
} from "./log.helper";
import { getJobById, getJobOnlyById } from "../jobs/job.helper";

export function initSocket(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // Allow frontend/agent
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("job_stop", async ({ jobId }) => {
      const job = await getJobOnlyById(jobId);
      if (job) {
        const { jobQuery: jobVal } = job;
        jobQueue.enqueue({ ...jobVal, priority: 10, status: "cancelled" });
      }
    });
    // Listen for logs
    socket.on("log", async ({ jobId, log }) => {
      try {
        await insertJobLog(jobId, log);
        io.emit(`log`, { jobId, log, time: Date.now() });
      } catch (error) {
        console.error("Error saving log:", error);
      }
    });

    // Listen for status changes
    socket.on("status", async ({ jobId, status, output }) => {
      console.log(status);
      try {
        switch (status) {
          case "cancelled":
            await updateJobStatus(jobId, "cancelled");
            io.emit(`job_status_${jobId}`, { status, time: Date.now() });
            break;
          case "queued":
            io.emit(`job_status_${jobId}`, { status, time: Date.now() });
            await updateJobStatus(jobId, "queued");
            break;

          case "running":
            io.emit(`job_status_${jobId}`, { status, time: Date.now() });
            await updateJobStatus(jobId, "running");
            break;

          case "completed":
            await updateJobStatus(jobId, "completed");
            await insertJobOutput(jobId, output, true);
            const currentRetries = await getRetries(jobId);
            io.emit(`job_status_${jobId}`, {
              status,
              output,
              retries: currentRetries,
              time: Date.now(),
            });
            break;

          case "failed":
            await updateJobStatus(jobId, "failed");
            await insertJobOutput(jobId, output, false);
            const retries = await getRetries(jobId);
            io.emit(`job_status_${jobId}`, {
              status,
              output,
              retries,
              time: Date.now(),
            });
            break;

          // // Retry logic: fetch job and requeue
          // const job = await getJobOnlyById(jobId);
          // if (job) {
          //   const { jobQuery: jobVal } = job;
          //   if (retries < 3) {
          //     jobQueue.enqueue({ ...jobVal, priority: 5, status: "queued" });
          //   }
          // }
          // break;

          default:
            console.warn(`Unknown status received: ${status}`);
        }
      } catch (error) {
        console.error(`Error handling status for job ${jobId}:`, error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Agent disconnected: ${socket.id}`);
    });
  });
}
