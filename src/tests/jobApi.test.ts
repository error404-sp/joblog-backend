import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { app } from "../index";

describe("Job API Tests", () => {
  const baseUrl = "/api/jobs";

  it("should create a job successfully", async () => {
    const res = await request(app).post(`${baseUrl}/`).send({
      command: "echo Hello",
      type: "command",
      priority: 1,
      timeout: 10,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.job).toHaveProperty("id");
    expect(res.body.job.command).toBe("echo Hello");
  });

  it("should fail to create a job with missing fields", async () => {
    const res = await request(app).post(`${baseUrl}/`).send({
      type: "command",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Missing required fields.");
  });

  it("should fetch paginated jobs", async () => {
    const res = await request(app).get(`${baseUrl}?page=1&limit=10`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.jobs).toBeInstanceOf(Array);
  });

  it("should fetch job by ID", async () => {
    // First create a job
    const createRes = await request(app).post(`${baseUrl}/`).send({
      command: "ls -la",
      type: "command",
    });

    const jobId = createRes.body.job.id;

    const res = await request(app).get(`${baseUrl}/${jobId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.job.id).toBe(jobId);
  });

  it("should return 404 for invalid job ID", async () => {
    const res = await request(app).get(`${baseUrl}/${uuidv4()}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Job not found");
  });

  it("should stop (cancel) a job", async () => {
    // Create job first
    const createRes = await request(app).post(`${baseUrl}`).send({
      command: "sleep 10",
      type: "command",
    });

    const jobId = createRes.body.job.id;
    const res = await request(app).post(`${baseUrl}/${jobId}/stop`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Job stop signal received/i);
    expect(res.body.job.id).toBe(jobId);
  });

  it("should return 404 when stopping non-existent job", async () => {
    const res = await request(app).post(`${baseUrl}/${uuidv4()}/stop/`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Job not found");
  });
});
