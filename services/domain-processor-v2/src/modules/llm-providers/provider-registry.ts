import { ILLMProvider, ILLMProviderRegistry } from './interfaces';
import { ProviderTier } from '../../types';
import { Logger } from '../../utils/logger';

export class ProviderRegistry implements ILLMProviderRegistry {
  private providers: Map<string, ILLMProvider> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  registerProvider(provider: ILLMProvider): void {
    if (this.providers.has(provider.name)) {
      this.logger.warn(`Provider ${provider.name} already registered, overwriting`);
    }

    this.providers.set(provider.name, provider);
    this.logger.info(`Registered provider: ${provider.name} (${provider.model})`);
  }

  getProvider(name: string): ILLMProvider | undefined {
    return this.providers.get(name);
  }

  getProvidersByTier(tier: ProviderTier): ILLMProvider[] {
    return Array.from(this.providers.values()).filter(p => p.tier === tier);
  }

  getAllProviders(): ILLMProvider[] {
    return Array.from(this.providers.values());
  }

  getAvailableProviders(): ILLMProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isAvailable());
  }

  getProviderMetrics(): Map<string, any> {
    const metrics = new Map();
    
    for (const [name, provider] of this.providers) {
      metrics.set(name, {
        ...provider.getMetrics(),
        available: provider.isAvailable(),
        tier: provider.tier,
        model: provider.model
      });
    }

    return metrics;
  }
}