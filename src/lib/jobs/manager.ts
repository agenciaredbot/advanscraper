import { v4 as uuidv4 } from "uuid";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobProgress {
  phase: string;
  current: number;
  total: number;
  message: string;
}

export interface Job {
  id: string;
  userId: string;
  type: string;
  status: JobStatus;
  progress: JobProgress;
  result?: unknown;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// In-memory job store
const jobs = new Map<string, Job>();

/**
 * Create a new job and return its ID
 */
export function createJob(userId: string, type: string): string {
  const id = uuidv4();
  const job: Job = {
    id,
    userId,
    type,
    status: "pending",
    progress: {
      phase: "Inicializando",
      current: 0,
      total: 0,
      message: "Preparando búsqueda...",
    },
    createdAt: new Date(),
  };
  jobs.set(id, job);
  return id;
}

/**
 * Get job by ID
 */
export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

/**
 * Get all jobs for a user
 */
export function getUserJobs(userId: string): Job[] {
  return Array.from(jobs.values())
    .filter((job) => job.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Update job status
 */
export function updateJobStatus(id: string, status: JobStatus): void {
  const job = jobs.get(id);
  if (!job) return;

  job.status = status;
  if (status === "running") job.startedAt = new Date();
  if (status === "completed" || status === "failed") job.completedAt = new Date();
}

/**
 * Update job progress
 */
export function updateJobProgress(
  id: string,
  progress: Partial<JobProgress>
): void {
  const job = jobs.get(id);
  if (!job) return;
  job.progress = { ...job.progress, ...progress };
}

/**
 * Set job result
 */
export function setJobResult(id: string, result: unknown): void {
  const job = jobs.get(id);
  if (!job) return;
  job.result = result;
}

/**
 * Set job error
 */
export function setJobError(id: string, error: string): void {
  const job = jobs.get(id);
  if (!job) return;
  job.error = error;
  job.status = "failed";
  job.completedAt = new Date();
}

/**
 * Cancel a running job
 */
export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job || job.status !== "running") return false;
  job.status = "cancelled";
  job.completedAt = new Date();
  return true;
}

/**
 * Clean up old jobs (older than 24 hours)
 */
export function cleanupOldJobs(): void {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.createdAt.getTime() < cutoff) {
      jobs.delete(id);
    }
  }
}
