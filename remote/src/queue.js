class JobQueue {
  constructor() {
    this.queue = [];
  }

  batchEnqueue(jobs) {
    jobs.forEach((job) => this.enqueue(job));
  }

  enqueue(job) {
    this.queue.push(job);
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  dequeue() {
    return this.queue.shift();
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  size() {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
  }
}

module.exports = new JobQueue();
