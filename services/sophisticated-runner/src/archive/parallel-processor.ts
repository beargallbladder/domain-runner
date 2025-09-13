/**
 * Parallel Domain Processor
 * Processes multiple domains concurrently for SPEED
 */

import { Pool } from 'pg';

// Database pool with more connections for parallel processing
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 50, // Allow 50 concurrent DB connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Process multiple domains in parallel
export async function processDomainsInParallel(limit: number = 50): Promise<number> {
  try {
    // Fetch batch of pending domains
    const result = await pool.query(
      'SELECT id, domain FROM domains WHERE status = $1 LIMIT $2',
      ['pending', limit]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    // Process all domains in parallel
    const promises = result.rows.map(row => 
      processSingleDomain(row.id, row.domain).catch(err => {
        console.error(`Error processing domain ${row.domain}:`, err);
        return null;
      })
    );

    // Wait for all to complete
    await Promise.all(promises);

    return result.rows.length;
  } catch (error) {
    console.error('Parallel processing error:', error);
    return 0;
  }
}

// Process a single domain with all LLMs in parallel
async function processSingleDomain(domainId: number, domain: string): Promise<void> {
  const prompts = ['business_analysis', 'content_strategy', 'technical_assessment'];
  
  // All LLM providers
  const providers = [
    { name: 'openai', fn: queryOpenAI },
    { name: 'anthropic', fn: queryAnthropic },
    { name: 'deepseek', fn: queryDeepSeek },
    { name: 'mistral', fn: queryMistral },
    { name: 'xai', fn: queryXAI },
    { name: 'together', fn: queryTogether },
    { name: 'perplexity', fn: queryPerplexity },
    { name: 'google', fn: queryGoogle },
    { name: 'cohere', fn: queryCohere },
    { name: 'ai21', fn: queryAI21 },
    { name: 'groq', fn: queryGroq }
  ];

  // Create all tasks (11 LLMs × 3 prompts = 33 API calls per domain)
  const tasks = [];
  for (const prompt of prompts) {
    for (const provider of providers) {
      tasks.push(
        provider.fn(`${prompt} for domain: ${domain}`)
          .then(response => ({
            domainId,
            model: provider.name,
            promptType: prompt,
            response: response || 'No response',
          }))
          .catch(err => ({
            domainId,
            model: provider.name,
            promptType: prompt,
            response: `Error: ${err.message}`,
          }))
      );
    }
  }

  // Execute all 33 API calls in parallel
  const results = await Promise.all(tasks);

  // Batch insert all responses
  const insertPromises = results.map(result =>
    pool.query(
      'INSERT INTO domain_responses (domain_id, model, prompt_type, response) VALUES ($1, $2, $3, $4)',
      [result.domainId, result.model, result.promptType, result.response]
    ).catch(err => console.error('Insert error:', err))
  );

  await Promise.all(insertPromises);

  // Mark domain as completed
  await pool.query('UPDATE domains SET status = $1 WHERE id = $2', ['completed', domainId]);
}

// LLM query functions (using fetch with timeout)
async function queryWithTimeout(url: string, options: any, timeout: number = 30000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function queryOpenAI(prompt: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });
    
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    return null;
  }
}

async function queryAnthropic(prompt: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });
    
    return data.content?.[0]?.text || null;
  } catch (error) {
    return null;
  }
}

async function queryDeepSeek(prompt: string): Promise<string | null> {
  if (!process.env.DEEPSEEK_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });
    
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    return null;
  }
}

async function queryMistral(prompt: string): Promise<string | null> {
  if (!process.env.MISTRAL_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });
    
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    return null;
  }
}

async function queryXAI(prompt: string): Promise<string | null> {
  if (!process.env.XAI_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });
    
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    return null;
  }
}

async function queryTogether(prompt: string): Promise<string | null> {
  if (!process.env.TOGETHER_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3-70b-chat-hf',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });
    
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    return null;
  }
}

async function queryPerplexity(prompt: string): Promise<string | null> {
  if (!process.env.PERPLEXITY_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });
    
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    return null;
  }
}

async function queryGoogle(prompt: string): Promise<string | null> {
  if (!process.env.GOOGLE_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500 }
        })
      }
    );
    
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    return null;
  }
}

async function queryCohere(prompt: string): Promise<string | null> {
  if (!process.env.COHERE_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: prompt,
        model: 'command',
        stream: false
      })
    });
    
    return data.text || null;
  } catch (error) {
    return null;
  }
}

async function queryAI21(prompt: string): Promise<string | null> {
  if (!process.env.AI21_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout('https://api.ai21.com/studio/v1/j2-ultra/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AI21_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        numResults: 1,
        maxTokens: 500
      })
    });
    
    return data.completions?.[0]?.data?.text || null;
  } catch (error) {
    return null;
  }
}

async function queryGroq(prompt: string): Promise<string | null> {
  if (!process.env.GROQ_API_KEY) return null;
  
  try {
    const data = await queryWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });
    
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    return null;
  }
}