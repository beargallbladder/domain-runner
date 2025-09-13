import { PromptType, ProviderTier } from '../../types';

export interface ILLMProvider {
  name: string;
  model: string;
  tier: ProviderTier;
  
  // Core methods
  generateResponse(prompt: string, domain: string, promptType: PromptType): Promise<LLMResponse>;
  isAvailable(): boolean;
  getMetrics(): ProviderMetrics;
}

export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
  model: string;
  promptType: PromptType;
  processingTime: number;
  tokensUsed?: number;
}

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastError?: string;
  lastRequestAt?: Date;
}

export interface ILLMProviderRegistry {
  registerProvider(provider: ILLMProvider): void;
  getProvider(name: string): ILLMProvider | undefined;
  getProvidersByTier(tier: ProviderTier): ILLMProvider[];
  getAllProviders(): ILLMProvider[];
  getAvailableProviders(): ILLMProvider[];
}

export interface IAPIKeyManager {
  getNextKey(provider: string): string | null;
  addKeys(provider: string, keys: string[]): void;
  removeKey(provider: string, key: string): void;
  getKeyCount(provider: string): number;
  rotateKey(provider: string): void;
}