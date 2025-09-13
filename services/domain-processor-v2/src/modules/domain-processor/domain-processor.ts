import { IDomainProcessor, ProcessingResult, BatchProcessingResult, ProcessingError } from './interfaces';
import { IDatabaseService } from '../database/interfaces';
import { ILLMProviderRegistry } from '../llm-providers/interfaces';
import { Domain, DomainStatus, ProcessingJob, DomainResponse, PromptType, ProviderTier } from '../../types';
import { Logger } from '../../utils/logger';
import { TieredProcessingStrategy } from './strategies/tiered-processing-strategy';
import { ExponentialBackoffRetryPolicy } from './retry-policy';

export class DomainProcessor implements IDomainProcessor {
  private processingStrategy: TieredProcessingStrategy;
  private retryPolicy: ExponentialBackoffRetryPolicy;

  constructor(
    private database: IDatabaseService,
    private providerRegistry: ILLMProviderRegistry,
    private logger: Logger
  ) {
    this.processingStrategy = new TieredProcessingStrategy(providerRegistry, logger);
    this.retryPolicy = new ExponentialBackoffRetryPolicy();
  }

  async processDomain(domain: Domain): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: ProcessingError[] = [];
    let responses: DomainResponse[] = [];

    try {
      // Update status to processing
      await this.database.updateDomainStatus(domain.id, DomainStatus.PROCESSING);

      // Create processing job
      const job: ProcessingJob = {
        domainId: domain.id,
        domain: domain.domain,
        prompts: [PromptType.COMPREHENSIVE_ANALYSIS],
        providers: this.providerRegistry.getAvailableProviders().map(p => p.name),
        priority: 1,
        retryCount: 0,
        createdAt: new Date()
      };

      // Execute processing strategy
      responses = await this.processingStrategy.execute(job);

      // Save successful responses
      const successfulResponses = responses.filter(r => r.success);
      if (successfulResponses.length > 0) {
        await this.database.saveDomainResponses(successfulResponses);
      }

      // Collect errors
      responses.filter(r => !r.success).forEach(r => {
        errors.push({
          provider: r.model.split('/')[0],
          promptType: r.promptType,
          error: r.error || 'Unknown error',
          timestamp: new Date()
        });
      });

      // Update status
      const finalStatus = successfulResponses.length > 0 
        ? DomainStatus.COMPLETED 
        : DomainStatus.FAILED;
      
      await this.database.updateDomainStatus(domain.id, finalStatus);

      return {
        domainId: domain.id,
        domain: domain.domain,
        success: successfulResponses.length > 0,
        responses: successfulResponses,
        errors,
        processingTime: Date.now() - startTime
      };

    } catch (error: any) {
      this.logger.error(`Failed to process domain ${domain.domain}`, error);
      
      // Revert to pending status on error
      await this.database.updateDomainStatus(domain.id, DomainStatus.PENDING);

      return {
        domainId: domain.id,
        domain: domain.domain,
        success: false,
        responses: [],
        errors: [{
          provider: 'system',
          promptType: PromptType.COMPREHENSIVE_ANALYSIS,
          error: error.message,
          timestamp: new Date()
        }],
        processingTime: Date.now() - startTime
      };
    }
  }

  async processBatch(domains: Domain[]): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const results: ProcessingResult[] = [];

    // Process domains concurrently with controlled concurrency
    const batchSize = 5;
    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      const batchPromises = batch.map(domain => this.processDomain(domain));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Handle rejected promise
          const domain = batch[index];
          results.push({
            domainId: domain.id,
            domain: domain.domain,
            success: false,
            responses: [],
            errors: [{
              provider: 'system',
              promptType: PromptType.COMPREHENSIVE_ANALYSIS,
              error: result.reason?.message || 'Processing failed',
              timestamp: new Date()
            }],
            processingTime: 0
          });
        }
      });
    }

    const successfulDomains = results.filter(r => r.success).length;
    const failedDomains = results.filter(r => !r.success).length;

    return {
      totalDomains: domains.length,
      successfulDomains,
      failedDomains,
      results,
      totalProcessingTime: Date.now() - startTime
    };
  }

  async retryFailedDomain(domainId: number): Promise<ProcessingResult> {
    const domain = await this.database.getDomainById(domainId);
    
    if (!domain) {
      throw new Error(`Domain ${domainId} not found`);
    }

    if (domain.status !== DomainStatus.FAILED) {
      throw new Error(`Domain ${domainId} is not in failed status`);
    }

    return this.processDomain(domain);
  }
}