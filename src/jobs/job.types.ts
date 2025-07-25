export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Job {
  id: string;
  command: string;
  type: "script" | "command";
  parameters?: Record<string, string>;
  priority?: number;
  timeout?: number;
  status?: JobStatus;
  created_at?: Date;
  updated_at?: Date;
}
