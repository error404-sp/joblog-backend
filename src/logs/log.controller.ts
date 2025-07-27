import { Server } from "socket.io";
import http from "http";
import { jobQueue } from "../utils/jobQueue";
import {
  getRetries,
  insertJobLog,
  insertJobOutput,
  updateJobStatus,
} from "./log.helper";
import { getJobById } from "../jobs/job.helper";
import cors from "cors";

export function initSocket(server: http.Server) {
  const io = new Server(server);

  io.on("connection", (socket) => {
    console.log("socket connected");
    console.log(`Agent connected: ${socket.id}`);
    // Listen for logs
    socket.on("log", async ({ jobId, log }) => {
      try {
        if (jobId && log) {
          await insertJobLog(jobId, log);
          io.emit(`job_log_${jobId}`, log, Date.now());
          io.emit(`log`, jobId, log, Date.now());
        }
      } catch (error) {
        console.error("Error saving log:", error);
      }
    });

    // Listen for status changes
    socket.on("status", async ({ jobId, status, output }) => {
      try {
        switch (status) {
          case "running":
            await updateJobStatus(jobId, "running");
            io.emit(`job_status_${jobId}`, status, Date.now());
            break;

          case "completed":
            await updateJobStatus(jobId, "completed");
            await insertJobOutput(jobId, output, true);
            const currentRetries = await getRetries(jobId);
            io.emit(
              `job_status_${jobId}`,
              status,
              output,
              currentRetries,
              Date.now()
            );
            break;

          case "failed":
            await updateJobStatus(jobId, "failed");
            await insertJobOutput(jobId, output, false);
            const retries = await getRetries(jobId);
            io.emit(`job_status_${jobId}`, status, output, retries, Date.now());

            // Retry logic: fetch job and requeue
            const job = await getJobById(jobId);
            if (job) {
              jobQueue.enqueue({ ...job, priority: 5 });
            }
            break;

          case "cancelled":
            await updateJobStatus(jobId, "cancelled");
            io.emit(`job_status_${jobId}`, status, Date.now());
            break;

          default:
            console.warn(`Unknown status received: ${status}`);
        }
      } catch (error) {
        console.error(`Error handling status for job ${jobId}:`, error);
      }
    });

    socket.on("agent_health", (data, ack) => {
      try {
        console.log(`✅ Health update from ${data.agentId}:`, data);

        // Forward health update to frontend
        io.emit("agent:health", {
          agentId: data.agentId,
          workers: data.workers,
          queueLength: data.queueLength,
          memory: data.memory,
        });

        ack({ success: true });
      } catch (err) {
        console.error("❌ Failed to handle agent_health:", err);
        ack({ success: false });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Agent disconnected: ${socket.id}`);
    });
  });
}
