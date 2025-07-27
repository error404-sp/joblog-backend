const { parentPort, workerData } = require("worker_threads");
const { execFile, spawn } = require("child_process");
const { sendUpdate } = require("../socket");

const { job } = workerData;

function send(type, data) {
  parentPort.postMessage({ type, jobId: job.id, data });
}

function runCommand() {
  const command = job.command;
  const params = job.parameters ? Object.values(job.parameters) : [];

  send("status", { status: "running" });

  const child = spawn(command, params, { shell: true });

  child.stdout.on("data", (data) => {
    send("log", data.toString());
  });

  child.stderr.on("data", (data) => {
    send("log", data.toString());
  });

  child.on("error", (err) => {
    send("status", { status: "failed", output: err.message });
  });

  child.on("close", (code) => {
    if (code === 0) {
      send("status", { status: "completed", output: "Success" });
    } else {
      send("status", {
        status: "failed",
        output: `Exited with code ${code}`,
      });
    }
  });

  return child;
}

function runScript() {
  const scriptPath = job.command;
  const params = job.parameters ? Object.values(job.parameters) : [];

  send("status", { status: "running" });

  execFile(scriptPath, params, (err, stdout, stderr) => {
    if (err) {
      send("status", { status: "failed", output: stderr || err.message });
    } else {
      send("log", stdout);
      send("status", { status: "completed", output: stdout });
    }
  });
}

if (job.status === "cancelled") {
  send("status", { status: "cancelled" });
} else if (job.type === "command") {
  runCommand();
} else {
  runScript();
}
