import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import { errorHandler } from "./middleware/errorHandler";
import jobRoutes from "./jobs/job.routes";
import agentRoutes from "./poll/poll.route";
import { initSocket } from "./logs/log.controller";

dotenv.config();

export const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/jobs", jobRoutes);
app.use("/api/agent", agentRoutes);
initSocket(server);

app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
