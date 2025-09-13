import { Domain, DomainStatus, DomainResponse, PromptType } from '../../types';

export interface IDatabaseService {
  // Domain operations
  getPendingDomains(limit: number): Promise<Domain[]>;
  updateDomainStatus(domainId: number, status: DomainStatus): Promise<void>;
  getDomainById(domainId: number): Promise<Domain | null>;
  
  // Response operations
  saveDomainResponse(response: DomainResponse): Promise<void>;
  saveDomainResponses(responses: DomainResponse[]): Promise<void>;
  getDomainResponses(domainId: number): Promise<DomainResponse[]>;
  
  // Metrics operations
  getDomainStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }>;
  
  // Health check
  isHealthy(): Promise<boolean>;
  close(): Promise<void>;
}

export interface ITransactionManager {
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  runInTransaction<T>(operation: () => Promise<T>): Promise<T>;
}