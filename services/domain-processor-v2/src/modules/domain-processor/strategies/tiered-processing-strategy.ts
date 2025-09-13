import { IProcessingStrategy } from '../interfaces';
import { ILLMProviderRegistry } from '../../llm-providers/interfaces';
import { ProcessingJob, DomainResponse, ProviderTier } from '../../../types';
import { Logger } from '../../../utils/logger';

export class TieredProcessingStrategy implements IProcessingStrategy {
  name = 'tiered-processing';

  constructor(
    private providerRegistry: ILLMProviderRegistry,
    private logger: Logger
  ) {}

  async execute(job: ProcessingJob): Promise<DomainResponse[]> {
    const responses: DomainResponse[] = [];

    // Get providers by tier
    const fastProviders = this.providerRegistry.getProvidersByTier(ProviderTier.FAST);
    const mediumProviders = this.providerRegistry.getProvidersByTier(ProviderTier.MEDIUM);
    const slowProviders = this.providerRegistry.getProvidersByTier(ProviderTier.SLOW);

    this.logger.info(`Processing ${job.domain} with tiered strategy`, {
      fast: fastProviders.length,
      medium: mediumProviders.length,
      slow: slowProviders.length
    });

    // Process all tiers in parallel
    const allPromises: Promise<DomainResponse>[] = [];

    // Fast tier - no delay
    for (const provider of fastProviders) {
      if (!provider.isAvailable()) continue;
      
      for (const promptType of job.prompts) {
        allPromises.push(
          this.processWithProvider(provider, job, promptType)
        );
      }
    }

    // Medium tier - small delay between providers
    for (const provider of mediumProviders) {
      if (!provider.isAvailable()) continue;
      
      for (const promptType of job.prompts) {
        allPromises.push(
          this.processWithProvider(provider, job, promptType, 250)
        );
      }
    }

    // Slow tier - larger delay between providers
    for (const provider of slowProviders) {
      if (!provider.isAvailable()) continue;
      
      for (const promptType of job.prompts) {
        allPromises.push(
          this.processWithProvider(provider, job, promptType, 1000)
        );
      }
    }

    // Execute all promises and collect results
    const results = await Promise.allSettled(allPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
      }
    }

    this.logger.info(`Completed processing ${job.domain}`, {
      totalResponses: responses.length,
      successful: responses.filter(r => r.success).length,
      failed: responses.filter(r => !r.success).length
    });

    return responses;
  }

  private async processWithProvider(
    provider: any,
    job: ProcessingJob,
    promptType: any,
    delay: number = 0
  ): Promise<DomainResponse> {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const startTime = Date.now();
    const result = await provider.generateResponse('', job.domain, promptType);

    return {
      domainId: job.domainId,
      model: `${provider.name}/${provider.model}`,
      promptType,
      response: result.content || '',
      success: result.success,
      error: result.error,
      processingTime: Date.now() - startTime,
      createdAt: new Date()
    };
  }
}