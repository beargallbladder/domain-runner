// Core domain types
export interface Domain {
  id: number;
  domain: string;
  status: DomainStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum DomainStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

// LLM Provider types
export interface LLMProvider {
  name: string;
  model: string;
  tier: ProviderTier;
  endpoint: string;
  headers: (apiKey: string) => Record<string, string>;
  formatRequest: (prompt: string) => any;
  parseResponse: (response: any) => string;
  rateLimit: RateLimitConfig;
}

export enum ProviderTier {
  FAST = 'fast',
  MEDIUM = 'medium',
  SLOW = 'slow'
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
  retryAfter: number;
}

// API Key management
export interface APIKeyPool {
  provider: string;
  keys: string[];
  currentIndex: number;
}

// Processing types
export interface ProcessingJob {
  domainId: number;
  domain: string;
  prompts: PromptType[];
  providers: string[];
  priority: number;
  retryCount: number;
  createdAt: Date;
}

export enum PromptType {
  BUSINESS_ANALYSIS = 'business_analysis',
  CONTENT_STRATEGY = 'content_strategy',
  TECHNICAL_ASSESSMENT = 'technical_assessment',
  COMPREHENSIVE_ANALYSIS = 'comprehensive_analysis'
}

// Response types
export interface DomainResponse {
  domainId: number;
  model: string;
  promptType: PromptType;
  response: string;
  success: boolean;
  error?: string;
  processingTime: number;
  createdAt: Date;
}

// Queue types
export interface QueueConfig {
  concurrency: number;
  batchSize: number;
  retryLimit: number;
  timeout: number;
}

// Monitoring types
export interface ProviderMetrics {
  provider: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  lastError?: string;
  lastCallAt?: Date;
}

export interface ProcessingMetrics {
  totalDomains: number;
  completedDomains: number;
  failedDomains: number;
  pendingDomains: number;
  averageProcessingTime: number;
  providersStatus: Map<string, ProviderMetrics>;
}

// Configuration types
export interface AppConfig {
  database: DatabaseConfig;
  providers: ProvidersConfig;
  queue: QueueConfig;
  monitoring: MonitoringConfig;
}

export interface DatabaseConfig {
  connectionString: string;
  poolSize: number;
  idleTimeout: number;
  connectionTimeout: number;
}

export interface ProvidersConfig {
  [key: string]: {
    enabled: boolean;
    apiKeys: string[];
    tier: ProviderTier;
    model: string;
  };
}

export interface MonitoringConfig {
  metricsInterval: number;
  healthCheckInterval: number;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    queueSize: number;
  };
}