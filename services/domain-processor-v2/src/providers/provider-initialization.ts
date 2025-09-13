/**
 * Provider Initialization
 * Registers all LLM providers including new ones
 */

import { ProviderRegistry } from '../modules/llm-providers/provider-registry';
import { MetaLlamaProvider } from './implementations/meta-llama-provider';
import { OpenRouterProvider } from './implementations/openrouter-provider';
import { BedrockProvider } from './implementations/bedrock-provider';
import { Logger } from '../utils/logger';

export function registerNewProviders(registry: any, logger: Logger): void {
  try {
    // Register OpenRouter if API key exists - THIS IS THE ONLY ONE THAT MATTERS
    if (process.env.OPENROUTER_API_KEY) {
      const provider = new OpenRouterProvider() as any;
      registry.registerProvider(provider);
      logger.info('✅ Registered OpenRouter provider - Access to 100+ models');
    }

    // Skip Meta Llama - already have it via Together/Groq
    // Skip Bedrock - too complex for now

    logger.info(`Total providers registered: ${registry.getAllProviders().length}`);
  } catch (error) {
    logger.error('Failed to register new providers', error);
  }
}

/**
 * Environment variable template for new providers
 */
export const NEW_PROVIDER_ENV_TEMPLATE = `
# Meta Llama via Replicate
REPLICATE_API_TOKEN=your_replicate_token_here

# OpenRouter - Access to 100+ models
OPENROUTER_API_KEY=your_openrouter_key_here

# Amazon Bedrock - AWS Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Optional: Additional providers
DASHSCOPE_API_KEY=your_alibaba_qwen_key_here
FIREWORKS_API_KEY=your_fireworks_key_here
`;