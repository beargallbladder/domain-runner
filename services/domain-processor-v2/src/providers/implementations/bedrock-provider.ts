import { BaseProvider } from '../base-provider';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export class BedrockProvider extends BaseProvider {
  private client: BedrockRuntimeClient;

  constructor() {
    super({
      id: 'bedrock',
      name: 'Amazon Bedrock',
      apiKeyEnvVar: 'AWS_ACCESS_KEY_ID',
      endpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com',
      model: 'anthropic.claude-3-opus-20240229-v1:0',
      weight: 1.2,
      tier: 'medium' as any
    });

    this.client = new BedrockRuntimeClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
  }

  async processRequest(prompt: string): Promise<any> {
    const command = new InvokeModelCommand({
      modelId: this.config.model,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: 1000,
        temperature: 0.7,
        top_p: 0.9,
        stop_sequences: ['\n\nHuman:']
      })
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return {
      response: responseBody.completion,
      model: this.config.model,
      provider: this.config.id,
      usage: {
        prompt_tokens: responseBody.usage?.input_tokens,
        completion_tokens: responseBody.usage?.output_tokens,
        total_tokens: responseBody.usage?.total_tokens
      }
    };
  }
}