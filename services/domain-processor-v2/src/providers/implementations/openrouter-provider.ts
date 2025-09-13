import { BaseProvider } from '../base-provider';
import axios from 'axios';

export class OpenRouterProvider extends BaseProvider {
  constructor() {
    super({
      id: 'openrouter',
      name: 'OpenRouter',
      apiKeyEnvVar: 'OPENROUTER_API_KEY',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'nousresearch/hermes-3-llama-3.1-70b',
      weight: 1.0,
      tier: 'fast' as any
    });
  }

  async processRequest(prompt: string): Promise<any> {
    const apiKey = process.env[this.config.apiKeyEnvVar];
    if (!apiKey) throw new Error(`Missing ${this.config.apiKeyEnvVar}`);

    const response = await axios.post(
      this.config.endpoint,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are analyzing domains for brand sentiment and market presence.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://llmrank.io',
          'X-Title': 'LLMRank Domain Analysis',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      response: response.data.choices[0].message.content,
      model: this.config.model,
      provider: this.config.id,
      usage: response.data.usage
    };
  }
}