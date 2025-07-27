const { parentPort, workerData } = require("worker_threads");
const { execFile, spawn } = require("child_process");
const { sendUpdate } = require("../socket");

const job = workerData;

function send(type, data) {
  parentPort.postMessage({ type, jobId: job.id, data });
}

function runCommand() {
  const command = job.command;
  const params = job.parameters ? Object.values(job.parameters) : [];

  let output = ""; // Collect all logs

  send("status", { status: "running" });
  send("log", { log: `Executing command: ${command} ${params.join(" ")}` });

  const child = spawn(command, params, { shell: true });

  // STDOUT
  child.stdout.on("data", (data) => {
    const message = data.toString();
    output += `${message}\n`;
    send("log", { log: String(`[stdout] ${message}\n`) });
  });

  // STDERR
  child.stderr.on("data", (data) => {
    const message = String(data);
    output += `${message}\n`;
    send("log", { log: String(`[stderr] ${message}\n`) });
  });

  // ERROR EVENT
  child.on("error", (err) => {
    const message = `Process error: ${err.message}`;
    output += `${message}\n`;
    send("log", { log: String(message) });
    send("status", { status: "failed", output });
  });

  // CLOSE EVENT
  child.on("close", (code) => {
    send("log", { log: String(`Process exited with code ${code}`) });
    if (code === 0) {
      send("status", { status: "completed", output });
    } else {
      send("status", {
        status: "failed",
        output: `${output}\nProcess exited with code ${code}`,
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
      send("log", { log: stdout });
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
