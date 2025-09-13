import { IJobQueue, QueueStats } from './interfaces';
import { ProcessingJob } from '../../types';
import { Logger } from '../../utils/logger';
import { EventEmitter } from 'events';

interface QueueItem {
  job: ProcessingJob;
  priority: number;
  addedAt: Date;
}

export class JobQueue extends EventEmitter implements IJobQueue {
  private queue: QueueItem[] = [];
  private activeJobs: Map<string, ProcessingJob> = new Map();
  private maxConcurrency: number;
  private isPausedFlag: boolean = false;
  private stats: QueueStats = {
    pending: 0,
    active: 0,
    completed: 0,
    failed: 0,
    averageProcessingTime: 0,
    throughput: 0
  };
  private processingTimes: number[] = [];
  private throughputWindow: Date[] = [];
  private logger: Logger;
  private processor?: (item: ProcessingJob) => Promise<void>;

  constructor(maxConcurrency: number, logger: Logger) {
    super();
    this.maxConcurrency = maxConcurrency;
    this.logger = logger;
  }

  async add(job: ProcessingJob, priority: number = 5): Promise<void> {
    const queueItem: QueueItem = {
      job,
      priority,
      addedAt: new Date()
    };

    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(item => item.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(insertIndex, 0, queueItem);
    }

    this.stats.pending++;
    this.logger.debug(`Added job to queue: ${job.domain} (priority: ${priority})`);
    
    // Try to process if we have capacity
    this.processNext();
  }

  async addBatch(jobs: ProcessingJob[], priority: number = 5): Promise<void> {
    for (const job of jobs) {
      await this.add(job, priority);
    }
  }

  process(handler: (item: ProcessingJob) => Promise<void>): void {
    this.processor = handler;
    
    // Start processing existing items
    for (let i = 0; i < this.maxConcurrency; i++) {
      this.processNext();
    }
  }

  pause(): void {
    this.isPausedFlag = true;
    this.logger.info('Queue paused');
  }

  resume(): void {
    this.isPausedFlag = false;
    this.logger.info('Queue resumed');
    
    // Resume processing
    const currentActive = this.activeJobs.size;
    for (let i = currentActive; i < this.maxConcurrency; i++) {
      this.processNext();
    }
  }

  async clear(): Promise<void> {
    this.queue = [];
    this.stats.pending = 0;
    this.logger.info('Queue cleared');
  }

  size(): number {
    return this.queue.length;
  }

  isPaused(): boolean {
    return this.isPausedFlag;
  }

  getStats(): QueueStats {
    // Calculate throughput (jobs per minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    this.throughputWindow = this.throughputWindow.filter(date => date > oneMinuteAgo);
    
    return {
      ...this.stats,
      pending: this.queue.length,
      active: this.activeJobs.size,
      throughput: this.throughputWindow.length
    };
  }

  setMaxConcurrency(concurrency: number): void {
    const oldConcurrency = this.maxConcurrency;
    this.maxConcurrency = concurrency;
    
    if (concurrency > oldConcurrency && !this.isPausedFlag) {
      // Start more processors if we increased concurrency
      const currentActive = this.activeJobs.size;
      for (let i = currentActive; i < concurrency; i++) {
        this.processNext();
      }
    }
  }

  onError(handler: (error: Error, job: ProcessingJob) => void): void {
    this.on('error', handler);
  }

  onComplete(handler: (job: ProcessingJob, result: any) => void): void {
    this.on('complete', handler);
  }

  private async processNext(): Promise<void> {
    if (this.isPausedFlag || 
        this.activeJobs.size >= this.maxConcurrency || 
        this.queue.length === 0 ||
        !this.processor) {
      return;
    }

    const queueItem = this.queue.shift();
    if (!queueItem) return;

    const { job } = queueItem;
    const jobId = `${job.domainId}-${Date.now()}`;
    
    this.activeJobs.set(jobId, job);
    this.stats.pending--;
    this.stats.active++;

    const startTime = Date.now();

    try {
      await this.processor(job);
      
      // Update stats
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift(); // Keep last 100 times
      }
      
      this.stats.completed++;
      this.stats.averageProcessingTime = 
        this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      
      this.throughputWindow.push(new Date());
      
      this.emit('complete', job, { processingTime });
      this.logger.debug(`Completed job: ${job.domain} (${processingTime}ms)`);
      
    } catch (error: any) {
      this.stats.failed++;
      this.emit('error', error, job);
      this.logger.error(`Failed job: ${job.domain}`, error);
    } finally {
      this.activeJobs.delete(jobId);
      this.stats.active--;
      
      // Process next item
      this.processNext();
    }
  }
}