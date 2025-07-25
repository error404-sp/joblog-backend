import { Job } from "../jobs/job.types";
import EventEmitter from "events";

class JobQueue extends EventEmitter {
  private queue: Job[] = [];

  enqueue(job: Job) {
    this.queue.push(job);
    this.emit("job_added");
  }

  batchDequeue(batchSize: number): Job[] {
    const dequeued: Job[] = [];
    while (this.queue.length > 0 && dequeued.length < batchSize) {
      dequeued.push(this.queue.shift()!);
    }
    return dequeued;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear() {
    this.queue = [];
  }
}

export const jobQueue = new JobQueue();
