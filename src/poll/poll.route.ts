import { Router } from "express";
import { pollJobs } from "./poll.controller";

const router = Router();

router.get("/poll", pollJobs);

export default router;
