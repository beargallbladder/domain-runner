import OpenAI from 'openai';
import { PromptTemplate } from '../prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = 'gpt-3.5-turbo';
const MAX_TOKENS = 500;

export interface LLMResponse {
  raw_response: string;
  token_count: number;
}

export async function getOpenAIResponse(domain: string, prompt: PromptTemplate): Promise<LLMResponse> {
  try {
    console.log(`Calling OpenAI for ${domain} with prompt: ${prompt.id}`);
    
    const interpolatedPrompt = prompt.template.replace('{domain}', domain);
    
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: interpolatedPrompt }],
      max_tokens: MAX_TOKENS
    });
    
    const response = completion.choices[0].message.content || '';
    const tokenCount = completion.usage?.total_tokens || 0;
    
    console.log(`✅ OpenAI response received for ${domain} (${tokenCount} tokens)`);
    
    return {
      raw_response: response,
      token_count: tokenCount
    };
  } catch (error) {
    console.error(`❌ OpenAI API error for ${domain}:`, error);
    throw error;
  }
} 