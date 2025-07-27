const { io } = require("socket.io-client");
const workerPool = require("./workerPool");
const os = require("node:os");
const queue = require("./queue");

let socket;
let retryDelay = 2000; // 2s initial delay
const MAX_DELAY = 60000; // 1 min max
const HEALTH_BASE_INTERVAL = 5 * 60 * 1000; // 5 min
const HEALTH_BACKOFF_MAX = 60 * 60 * 1000; // 60 min
const BACKEND_URL = "http://localhost:5000";
function connectSocket() {
  socket = io(BACKEND_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
  });

  socket.on("connect", () => {
    console.log("Socket connected to backend");
    retryDelay = 2000; // reset delay
    healthIntervalMs = HEALTH_BASE_INTERVAL;
    restartHealthTimer();
  });

  let healthInterval = null;
  let healthIntervalMs = HEALTH_BASE_INTERVAL;

  function sendHealth() {
    socket.emit(
      "agent_health",
      {
        agentId: os.hostname(),
        workers: workerPool.size(),
        queueLength: queue.length(),
        memory: process.memoryUsage().rss,
        timestamp: new Date().toISOString(),
      },
      (ack) => {
        if (ack?.success) {
          healthIntervalMs = HEALTH_BASE_INTERVAL;
        } else {
          healthIntervalMs = Math.min(healthIntervalMs * 2, HEALTH_BACKOFF_MAX);
          if (healthIntervalMs == HEALTH_BACKOFF_MAX)
            healthIntervalMs = HEALTH_BASE_INTERVAL;
        }
        restartHealthTimer();
      }
    );
  }

  function restartHealthTimer() {
    if (healthInterval) clearTimeout(healthInterval);
    healthInterval = setTimeout(sendHealth, healthIntervalMs);
  }

  socket.on("disconnect", () => {
    console.warn("Socket disconnected. Retrying in", retryDelay / 1000, "s");
    setTimeout(connectSocket, retryDelay);
    retryDelay = Math.min(retryDelay * 2, MAX_DELAY);
  });
}

function sendUpdate(type, jobId, data) {
  if (socket && socket.connected) {
    socket.emit(`${type}`, { jobId, ...data });
  } else {
    console.warn("Socket not connected. Skipping update:", jobId, data);
  }
}

module.exports = { connectSocket, sendUpdate };
