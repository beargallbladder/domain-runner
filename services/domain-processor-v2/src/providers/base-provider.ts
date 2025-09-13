/**
 * Base Provider Class
 * Abstract base for all LLM providers
 */

import { ILLMProvider } from '../modules/llm-providers/interfaces';
import { ProviderTier } from '../types';

export interface ProviderConfig {
  id: string;
  name: string;
  apiKeyEnvVar: string;
  endpoint: string;
  model: string;
  weight: number;
  tier: ProviderTier;
}

export abstract class BaseProvider implements ILLMProvider {
  public name: string;
  public model: string;
  public tier: ProviderTier;
  public weight: number;
  protected config: ProviderConfig;
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalLatency: 0
  };

  constructor(config: ProviderConfig) {
    this.config = config;
    this.name = config.name;
    this.model = config.model;
    this.tier = config.tier;
    this.weight = config.weight;
  }

  async process(prompt: string): Promise<any> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const result = await this.processRequest(prompt);
      this.metrics.successfulRequests++;
      this.metrics.totalLatency += Date.now() - startTime;
      return result;
    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }

  async generateResponse(prompt: string): Promise<any> {
    return this.process(prompt);
  }

  isAvailable(): boolean {
    const apiKey = process.env[this.config.apiKeyEnvVar];
    return !!apiKey;
  }

  getMetrics(): any {
    const avgLatency = this.metrics.totalRequests > 0 
      ? this.metrics.totalLatency / this.metrics.totalRequests 
      : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0,
      averageLatency: avgLatency
    };
  }

  abstract processRequest(prompt: string): Promise<any>;
}