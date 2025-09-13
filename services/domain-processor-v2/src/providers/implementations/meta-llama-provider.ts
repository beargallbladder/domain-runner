import { BaseProvider } from '../base-provider';
import axios from 'axios';

export class MetaLlamaProvider extends BaseProvider {
  constructor() {
    super({
      id: 'meta-llama',
      name: 'Meta Llama 3.1',
      apiKeyEnvVar: 'REPLICATE_API_TOKEN',
      endpoint: 'https://api.replicate.com/v1/predictions',
      model: 'meta/llama-3.1-405b-instruct',
      weight: 1.1,
      tier: 'slow' as any
    });
  }

  async processRequest(prompt: string): Promise<any> {
    const apiKey = process.env[this.config.apiKeyEnvVar];
    if (!apiKey) throw new Error(`Missing ${this.config.apiKeyEnvVar}`);

    // Create prediction
    const createResponse = await axios.post(
      this.config.endpoint,
      {
        version: 'meta/llama-3.1-405b-instruct:latest',
        input: {
          prompt,
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9
        }
      },
      {
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Poll for result
    const predictionId = createResponse.data.id;
    let prediction = createResponse.data;
    
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const getResponse = await axios.get(
        `${this.config.endpoint}/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${apiKey}`
          }
        }
      );
      prediction = getResponse.data;
    }

    if (prediction.status === 'failed') {
      throw new Error('Replicate prediction failed');
    }

    return {
      response: prediction.output.join(''),
      model: this.config.model,
      provider: this.config.id
    };
  }
}