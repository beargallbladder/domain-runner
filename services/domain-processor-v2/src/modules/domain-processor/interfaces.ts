import { Domain, ProcessingJob, DomainResponse, PromptType } from '../../types';

export interface IDomainProcessor {
  processDomain(domain: Domain): Promise<ProcessingResult>;
  processBatch(domains: Domain[]): Promise<BatchProcessingResult>;
  retryFailedDomain(domainId: number): Promise<ProcessingResult>;
}

export interface ProcessingResult {
  domainId: number;
  domain: string;
  success: boolean;
  responses: DomainResponse[];
  errors: ProcessingError[];
  processingTime: number;
}

export interface BatchProcessingResult {
  totalDomains: number;
  successfulDomains: number;
  failedDomains: number;
  results: ProcessingResult[];
  totalProcessingTime: number;
}

export interface ProcessingError {
  provider: string;
  promptType: PromptType;
  error: string;
  timestamp: Date;
}

export interface IProcessingStrategy {
  name: string;
  execute(job: ProcessingJob): Promise<DomainResponse[]>;
}

export interface IRetryPolicy {
  shouldRetry(error: Error, attemptNumber: number): boolean;
  getRetryDelay(attemptNumber: number): number;
  getMaxRetries(): number;
}