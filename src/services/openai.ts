import OpenAI from 'openai';
import { PromptTemplate } from '../prompts';
import { incrementResponses, incrementErrors } from '../monitoring';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = 'gpt-3.5-turbo';
const MAX_TOKENS = 500;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const DOMAIN_DELAY = 60000; // 60 seconds between domains
let lastDomainTime = 0;

// Helper to handle rate limits
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface LLMResponse {
  raw_response: string;
  token_count: number;
}

async function callWithRetry(domain: string, prompt: string, attempt = 1): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      // Handle rate limits
      if (error.status === 429 && attempt < MAX_RETRIES) {
        console.log(`Rate limited, waiting ${RETRY_DELAY}ms before retry ${attempt}...`);
        await sleep(RETRY_DELAY * attempt); // Exponential backoff
        return callWithRetry(domain, prompt, attempt + 1);
      }
      
      // Handle other API errors
      console.error(`OpenAI API error for ${domain}:`, {
        status: error.status,
        message: error.message,
        type: error.type
      });
    }
    throw error;
  }
}

export async function getOpenAIResponse(domain: string, prompt: PromptTemplate): Promise<LLMResponse> {
  try {
    // Basic rate limiting - wait if it's been less than 60 seconds since last domain
    const now = Date.now();
    if (lastDomainTime && (now - lastDomainTime) < DOMAIN_DELAY) {
      const waitTime = DOMAIN_DELAY - (now - lastDomainTime);
      console.log(`Rate limiting: waiting ${Math.round(waitTime/1000)}s before processing ${domain}`);
      await sleep(waitTime);
    }
    lastDomainTime = Date.now();

    console.log(`Calling OpenAI for ${domain} with prompt: ${prompt.id}`);
    const startTime = Date.now();
    
    const interpolatedPrompt = prompt.template.replace('{domain}', domain);
    const completion = await callWithRetry(domain, interpolatedPrompt);
    
    const response = completion.choices[0].message.content || '';
    const tokenCount = completion.usage?.total_tokens || 0;
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ OpenAI response received for ${domain} (${tokenCount} tokens)`);
    
    // Track metrics
    incrementResponses(tokenCount, response.length, responseTime);
    
    return {
      raw_response: response,
      token_count: tokenCount
    };
  } catch (error) {
    console.error(`❌ Error processing ${domain}:`, error);
    incrementErrors();
    throw error;
  }
} 