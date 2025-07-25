const { Worker } = require("worker_threads");
const path = require("path");
const { sendUpdate } = require("./socket");

const MAX_WORKERS = 3;

class WorkerPool {
  constructor() {
    this.activeWorkers = new Map();
  }

  isBusy() {
    return this.activeWorkers.size >= MAX_WORKERS;
  }

  runJob(job) {
    // Handle cancelled job before assignment
    if (job.status === "cancelled") {
      console.log(`🚫 Job ${job.id} was already cancelled`);
      sendUpdate(job.id, { status: "cancelled" });
      return;
    }

    const worker = new Worker(path.resolve(__dirname, "./workers/worker.js"), {
      workerData: job,
    });
    this.activeWorkers.set(job.id, worker);

    worker.on("message", (data) => {
      if (data.type === "log") {
        sendUpdate(data.jobId, { type: "log", log: data.message });
      } else if (data.type === "status") {
        sendUpdate(data.jobId, { status: data.status, output: data.output });
      }
    });

    worker.on("error", (err) => {
      console.error(`Worker error for job ${job.id}:`, err.message);
      sendUpdate(job.id, { status: "failed", output: err.message });
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
      console.log(`Cancelling job ${jobId}`);
      worker.terminate();
      sendUpdate(jobId, { status: "cancelled" });
      this.activeWorkers.delete(jobId);
      return true;
    }
    return false;
  }

  cleanupAll() {
    for (const [jobId, worker] of this.activeWorkers.entries()) {
      worker.terminate();
      sendUpdate(jobId, { status: "cancelled" });
    }
    this.activeWorkers.clear();
  }
}

module.exports = new WorkerPool();
