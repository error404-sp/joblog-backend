import { jobQueue } from "../utils/jobQueue";
import { app } from "../index";
import request from "supertest";

describe("pollJobs API", () => {
  const baseUrl = "/api/agent/poll";
  beforeEach(() => {
    jobQueue.clear();
  });

  it("should return immediately if jobs are available", async () => {
    jobQueue.enqueue({
      id: "test-id",
      command: "echo test",
      type: "command",
    });

    const res = await request(app).get(`${baseUrl}?batchSize=1`);

    expect(res.status).toBe(200);
    expect(res.body.jobs.length).toBe(1);
    expect(res.body.jobs[0].id).toBe("test-id");
  });

  test("should wait and then return job if enqueued within timeout", async () => {
    setTimeout(() => {
      jobQueue.enqueue({
        id: "test2",
        command: "ls -al",
        type: "command",
      });
    }, 100);

    const res = await request(app).get(`${baseUrl}?batchSize=1`);
    expect(res.status).toBe(200);
    expect(res.body.jobs.length).toBe(1);
  }, 200);

  it("should return empty if timeout occurs", async () => {
    const res = await request(app).get(`${baseUrl}?batchSize=1`);

    expect(res.status).toBe(200);
    expect(res.body.jobs.length).toBe(0);
  }, 31000); // Allow enough time for 30s timeout
});
