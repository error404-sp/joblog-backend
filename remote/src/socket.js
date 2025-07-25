const { io } = require("socket.io-client");

let socket;
let retryDelay = 2000; // 2s initial delay
const MAX_DELAY = 60000; // 1 min max

function connectSocket() {
  socket = io(`${process.env.BACKEND_URL}`, { reconnection: false });

  socket.on("connect", () => {
    console.log("Socket connected to backend");
    retryDelay = 2000; // reset delay
  });

  socket.on("disconnect", () => {
    console.warn("Socket disconnected. Retrying in", retryDelay / 1000, "s");
    setTimeout(connectSocket, retryDelay);
    retryDelay = Math.min(retryDelay * 2, MAX_DELAY); // exponential backoff
  });
}

function sendUpdate(jobId, data) {
  if (socket && socket.connected) {
    socket.emit("jobUpdate", { jobId, ...data });
  } else {
    console.warn("Socket not connected. Skipping update:", jobId, data);
  }
}

module.exports = { connectSocket, sendUpdate };
