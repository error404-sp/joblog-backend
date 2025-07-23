import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import pool from "./config/db";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
