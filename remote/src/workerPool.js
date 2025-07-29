const { Worker } = require("worker_threads");
const path = require("path");
const { sendUpdate } = require("./socket");

const MAX_WORKERS = 2;

class WorkerPool {
  constructor() {
    this.activeWorkers = new Map();
  }

  isBusy() {
    return this.activeWorkers.size >= MAX_WORKERS;
  }

  runJob(job) {
    if (!job.id) return;

    // Handle cancelled job before assignment
    if (job.status === "cancelled") {
      this.cancelJob(job.id);
      sendUpdate("status", job.id, { status: "cancelled" });
      return;
    }

    const worker = new Worker(path.resolve(__dirname, "./workers/worker.js"), {
      workerData: job,
    });

    // Track active worker
    this.activeWorkers.set(job.id, worker);

    worker.on("message", (data) => {
      const { type, jobId, data: payload } = data;

      if (type === "status") {
        // Remove cancelled jobs
        if (payload.status === "cancelled") {
          this.cancelJob(jobId);
        }
        // Remove completed/failed jobs
        if (["completed", "failed"].includes(payload.status)) {
          this.activeWorkers.delete(jobId);
        }
      }

      sendUpdate(type, jobId, payload);
    });

    worker.on("error", (err) => {
      console.error(`Worker error for job ${job.id}:`, err.message);
      sendUpdate("status", job.id, { status: "failed", output: err.message });
      this.activeWorkers.delete(job.id);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        console.warn(`Worker for job ${job.id} exited with code ${code}`);
      }
      this.activeWorkers.delete(job.id);
    });
  }

  cancelJob(jobId) {
    const worker = this.activeWorkers.get(jobId);
    if (worker) {
      worker.postMessage({ type: "cancel" });

      // Force terminate if it doesn't exit

      worker.terminate();
      this.activeWorkers.delete(jobId);

      sendUpdate("status", jobId, { status: "cancelled" });
      return true;
    }
    return false;
  }

  cleanupAll() {
    for (const [jobId, worker] of this.activeWorkers.entries()) {
      worker.postMessage({ type: "cancel" });
      worker.terminate();
      sendUpdate("status", jobId, { status: "cancelled" });
    }
    this.activeWorkers.clear();
  }

  size() {
    return this.activeWorkers.size;
  }
}

module.exports = new WorkerPool();
