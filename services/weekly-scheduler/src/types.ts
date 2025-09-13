// Scheduler configuration types
export interface SchedulerConfig {
  schedules: {
    weekly: ScheduleConfig;
    daily: ScheduleConfig;
    hourly: ScheduleConfig;
  };
  processingModes: {
    full: ProcessingModeConfig;
    incremental: ProcessingModeConfig;
    priority: ProcessingModeConfig;
  };
  alerts: AlertConfig;
}

export interface ScheduleConfig {
  pattern: string; // Cron pattern
  enabled: boolean;
  description: string;
}

export interface ProcessingModeConfig {
  name: string;
  batchSize: number;
  maxConcurrency: number;
  targetService: string;
  endpoints: string[];
}

export interface AlertConfig {
  slackWebhook?: string;
  emailRecipients: string[];
  alertOnFailure: boolean;
  alertOnSuccess: boolean;
  alertOnLongRunning: boolean;
  longRunningThresholdMinutes: number;
}

// Job types
export type ProcessingMode = 'full' | 'incremental' | 'priority';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ProcessingJob {
  id: string;
  mode: ProcessingMode;
  status: JobStatus;
  startTime: Date;
  endTime?: Date;
  triggeredBy: string;
  progress: {
    total: number;
    processed: number;
    failed: number;
    percentage: number;
  };
  error?: string;
}

export interface ScheduleStatus {
  schedule: string;
  enabled: boolean;
  pattern: string;
  nextRun?: Date;
  lastRun?: Date;
  lastStatus?: JobStatus;
}

// Database types
export interface SchedulerJobRecord {
  id: string;
  mode: ProcessingMode;
  status: JobStatus;
  triggered_by: string;
  start_time: Date;
  end_time?: Date;
  processed: number;
  failed: number;
  total: number;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

// Notification types
export interface NotificationPayload {
  type: 'started' | 'completed' | 'failed' | 'progress';
  mode: ProcessingMode;
  jobId?: string;
  timestamp: Date;
  data: {
    processed?: number;
    failed?: number;
    total?: number;
    duration?: number;
    error?: string;
  };
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    database: HealthCheck;
    targetServices: HealthCheck;
    cronJobs: HealthCheck;
    memory: HealthCheck;
  };
  activeJobs: number;
  lastJobStatus?: JobStatus;
  uptime: number;
}

export interface HealthCheck {
  status: 'ok' | 'warning' | 'error';
  message?: string;
  details?: any;
}