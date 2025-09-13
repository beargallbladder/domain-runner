import { ProcessingJob } from '../../types';

export interface IQueue<T> {
  add(item: T, priority?: number): Promise<void>;
  addBatch(items: T[], priority?: number): Promise<void>;
  process(handler: (item: T) => Promise<void>): void;
  pause(): void;
  resume(): void;
  clear(): Promise<void>;
  size(): number;
  isPaused(): boolean;
}

export interface IJobQueue extends IQueue<ProcessingJob> {
  getStats(): QueueStats;
  setMaxConcurrency(concurrency: number): void;
  onError(handler: (error: Error, job: ProcessingJob) => void): void;
  onComplete(handler: (job: ProcessingJob, result: any) => void): void;
}

export interface QueueStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  averageProcessingTime: number;
  throughput: number; // jobs per minute
}

export interface IScheduler {
  schedule(job: ProcessingJob, delay?: number): Promise<void>;
  scheduleRecurring(job: ProcessingJob, interval: number): string;
  cancelRecurring(jobId: string): void;
  getScheduledJobs(): ScheduledJob[];
}

export interface ScheduledJob {
  id: string;
  job: ProcessingJob;
  nextRun: Date;
  interval?: number;
}