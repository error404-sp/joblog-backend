import { Router } from "express";
import {
  handleCreateJob,
  handleAllJobs,
  handleGetJobById,
  handleStopJob,
} from "./job.controller";

const router = Router();

router.post("/", handleCreateJob);
router.get("/", handleAllJobs);
router.get("/:id", handleGetJobById);
router.post("/:id/stop", handleStopJob);

export default router;
