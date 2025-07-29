const { parentPort, workerData } = require("worker_threads");
const { spawn } = require("child_process");

const job = workerData;
let childProcess;
let timeoutHandle;
const timeoutMs = (job.timeout || 10) * 1000;

function send(type, data) {
  parentPort.postMessage({ type, jobId: job.id, data });
}

function killProcess(reason = "cancelled") {
  if (timeoutHandle) clearTimeout(timeoutHandle);

  if (childProcess && !childProcess.killed) {
    try {
      process.kill(-childProcess.pid, "SIGTERM"); // kill group
      send("log", { log: `Job ${job.id} ${reason}` });
      send("status", { status: reason });
    } catch (err) {
      send("log", { log: `Error killing job ${job.id}: ${err.message}` });
    }
  }
}

function runCommand() {
  const command = job.command;
  const params = job.parameters ? Object.values(job.parameters) : [];
  let output = "";

  send("status", { status: "running" });
  send("log", { log: `Executing command: ${command} ${params.join(" ")}` });

  const isWindows = process.platform === "win32";
  const shell = isWindows ? "cmd.exe" : "sh";
  const args = isWindows
    ? ["/c", `${command} ${params.join(" ")}`]
    : ["-c", `${command} ${params.join(" ")}`];

  childProcess = spawn(shell, args, { stdio: "pipe", detached: true });

  // Kill after timeout
  timeoutHandle = setTimeout(() => {
    killProcess("timeout");
  }, timeoutMs);

  childProcess.stdout.on("data", (data) => {
    const message = data.toString();
    output += `${message}\n`;
    send("log", { log: `[stdout] ${message}` });
  });

  childProcess.stderr.on("data", (data) => {
    const message = data.toString();
    output += `${message}\n`;
    send("log", { log: `[stderr] ${message}` });
  });

  childProcess.on("error", (err) => {
    clearTimeout(timeoutHandle);
    const message = `Process error: ${err.message}`;
    output += `${message}\n`;
    send("log", { log: message });
    send("status", { status: "failed", output });
  });

  childProcess.on("close", (code) => {
    clearTimeout(timeoutHandle);
    if (code === 0) {
      send("status", { status: "completed", output });
    } else if (!childProcess.killed) {
      send("status", {
        status: "failed",
        output: `${output}\nProcess exited with code ${code}`,
      });
    }
  });
}

// Listen for cancel from pool
parentPort.on("message", (message) => {
  if (message.type === "cancel") {
    killProcess("cancelled");
  }
});

// Start job
if (job.status === "cancelled") {
  killProcess("cancelled");
} else {
  runCommand();
}
