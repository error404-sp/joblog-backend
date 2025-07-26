import { Server } from "socket.io";
import http from "http";
import { jobQueue } from "../utils/jobQueue";
import { insertJobLog, insertJobOutput, updateJobStatus } from "./log.helper";
import { getJobById } from "../jobs/job.helper";

export function initSocket(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log(`Agent connected: ${socket.id}`);

    // Listen for logs
    socket.on("log", async ({ jobId, log }) => {
      try {
        if (jobId && log) {
          await insertJobLog(jobId, log);
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
            break;

          case "completed":
            await updateJobStatus(jobId, "completed");
            await insertJobOutput(jobId, output || "Success", true);
            break;

          case "failed":
            await updateJobStatus(jobId, "failed");
            await insertJobOutput(jobId, output || "Failed", false);

            // Retry logic: fetch job and requeue
            const job = await getJobById(jobId);
            if (job) {
              jobQueue.enqueue({ ...job, priority: 5 });
            }
            break;

          case "cancelled":
            await updateJobStatus(jobId, "cancelled");
            break;

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
