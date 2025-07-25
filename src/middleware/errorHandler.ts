import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("❌ Internal Server Error:", err);

  res.status(500).json({
    success: false,
    message: "Something went wrong on the server.",
    error: err.message,
  });
}
