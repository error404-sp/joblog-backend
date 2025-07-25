const { workerData, parentPort } = require("worker_threads");
const { exec } = require("child_process");

const job = workerData;

function send(type, data) {
  parentPort.postMessage({ ...data, type });
}

(async () => {
  try {
    const command = job.type === "script" ? `sh ${job.command}` : job.command;

    const process = exec(command, { timeout: job.timeout || 60000 });

    process.stdout.on("data", (data) => {
      send("log", { log: data.toString(), jobId: job.id });
    });

    process.stderr.on("data", (data) => {
      send("log", { log: data.toString(), jobId: job.id });
    });

    process.on("exit", (code) => {
      send("status", {
        status: code === 0 ? "completed" : "failed",
        output: `Exit code: ${code}`,
        jobId: job.id,
      });
    });
  } catch (error) {
    send("status", { status: "failed", output: error.message, jobId: job.id });
  }
})();
