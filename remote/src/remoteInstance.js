const fetch = require("node-fetch");
const queue = require("./queue");
const workerPool = require("./workerPool");
const { connectSocket } = require("./socket");

const POLL_API = "http://localhost:5000/api/agent/poll";
const MAX_BACKOFF = 120_000; // 2 min
const POLL_INTERVAL_EMPTY = 2_000; // 2s (when there are jobs running)
const POLL_INTERVAL_NORMAL = 5_000; // default polling interval

let backoffDelay = 5000;
let pollIntervalId = null;

async function pollJobs() {
  try {
    if (queue.size() >= 5 || workerPool.isBusy()) {
      return;
    }

    const availableSlots = 5 - queue.size();
    const url = `${POLL_API}?batchSize=${availableSlots}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const { jobs } = await res.json();
    if (backoffDelay == MAX_BACKOFF) backoffDelay = 15000;
    if (jobs && jobs.length > 0) {
      queue.batchEnqueue(jobs);
      backoffDelay = 2000;
    } else {
      backoffDelay = Math.min(backoffDelay * 2, MAX_BACKOFF);
    }
  } catch (err) {
    backoffDelay = Math.min(backoffDelay * 2, MAX_BACKOFF);
  }
}

function assignJobsToWorkers() {
  // Assign jobs from queue to workerPool
  while (!queue.isEmpty() && !workerPool.isBusy()) {
    const job = queue.dequeue();
    workerPool.runJob(job);
  }
}

function startPolling() {
  if (pollIntervalId) clearInterval(pollIntervalId);

  pollIntervalId = setInterval(async () => {
    await pollJobs();
    assignJobsToWorkers();
  }, backoffDelay);
}

function setupCleanup() {
  process.on("SIGINT", () => {
    clearInterval(pollIntervalId);
    workerPool.cleanupAll();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    clearInterval(pollIntervalId);
    workerPool.cleanupAll();
    process.exit(0);
  });
}

connectSocket();
startPolling();
setupCleanup();
