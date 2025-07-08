import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 3003;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

app.use(cors());
app.use(express.json());

console.log('🚀 Starting Sophisticated Runner Service...');

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'sophisticated-runner',
    timestamp: new Date().toISOString()
  });
});

// API key status check
app.get('/api-keys', (req: Request, res: Response) => {
  const keys = {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
    xai: !!process.env.XAI_API_KEY,
    together: !!process.env.TOGETHER_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    google: !!process.env.GOOGLE_API_KEY
  };
  
  const working = Object.values(keys).filter(Boolean).length;
  
  res.json({
    keys,
    workingKeys: working,
    timestamp: new Date().toISOString()
  });
});

// Fast domain processing endpoint
app.post('/process-pending-domains', async (req: Request, res: Response) => {
  try {
    console.log('🔥 FAST PROCESSING STARTED');
    
    // Get 100 pending domains for high-concurrency processing
    const result = await pool.query(
      'SELECT id, domain FROM domains WHERE status = $1 ORDER BY updated_at ASC LIMIT 100',
      ['pending']
    );
    
    if (result.rows.length === 0) {
      return res.json({ message: 'No pending domains', processed: 0 });
    }
    
    console.log(`📊 Processing ${result.rows.length} domains`);
    
    let processed = 0;
    const errors: string[] = [];
    
    // Process all domains in parallel
    const domainPromises = result.rows.map(async (domainRow) => {
      try {
        console.log(`🔄 Processing ${domainRow.domain}`);
        
        // Mark as processing
        await pool.query(
          'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
          ['processing', domainRow.id]
        );
        
        // Process with all available LLMs simultaneously
        const responses = await processAllLLMs(domainRow.domain);
        
        // Store all responses
        for (const response of responses) {
          if (response.success) {
            await pool.query(
              'INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at) VALUES ($1, $2, $3, $4, NOW())',
              [domainRow.id, response.model, response.prompt, (response as any).content]
            );
          } else {
            errors.push(`${response.model}: ${(response as any).error}`);
          }
        }
        
        // Mark as completed
        await pool.query(
          'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
          ['completed', domainRow.id]
        );
        
        console.log(`✅ Completed ${domainRow.domain} (${responses.filter(r => r.success).length}/${responses.length} responses)`);
        return true;
        
      } catch (domainError: any) {
        console.error(`❌ Failed ${domainRow.domain}:`, domainError.message);
        errors.push(`${domainRow.domain}: ${domainError.message}`);
        
        // Mark as pending again for retry
        await pool.query(
          'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
          ['pending', domainRow.id]
        );
        return false;
      }
    });
    
    // Wait for all domains to complete
    const results = await Promise.allSettled(domainPromises);
    processed = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    res.json({
      processed,
      errors: errors.length,
      errorDetails: errors,
      timestamp: new Date().toISOString()
    });
    
     } catch (error: any) {
     console.error('🚨 PROCESSING ERROR:', error);
     res.status(500).json({ 
       error: error.message, 
       timestamp: new Date().toISOString() 
     });
  }
});

// PROVIDER-SPECIFIC RATE LIMITS & MULTI-KEY CONFIGURATION
const AI_PROVIDERS = [
  // OPENAI GPT-4O-MINI - 500 RPM per key
  {
    name: 'openai',
    model: 'gpt-4o-mini',
    keys: [process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY2].filter(k => k),
    endpoint: 'https://api.openai.com/v1/chat/completions',
    rpm_per_key: 500,
    delay_ms: 120, // 60000ms / 500 = 120ms between requests per key
    format: 'openai'
  },
  // OPENAI GPT-3.5-TURBO - 500 RPM per key (CRITICAL FOR TENSOR COVERAGE)
  {
    name: 'openai',
    model: 'gpt-3.5-turbo',
    keys: [process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY2].filter(k => k),
    endpoint: 'https://api.openai.com/v1/chat/completions',
    rpm_per_key: 500,
    delay_ms: 120, // 60000ms / 500 = 120ms between requests per key
    format: 'openai'
  },
  // ANTHROPIC - 50 RPM per key (strict limits!)
  {
    name: 'anthropic', 
    model: 'claude-3-haiku-20240307',
    keys: [process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY2].filter(k => k),
    endpoint: 'https://api.anthropic.com/v1/messages',
    rpm_per_key: 50,
    delay_ms: 1200, // 60000ms / 50 = 1200ms between requests per key
    format: 'anthropic'
  },
  // DEEPSEEK - 60 RPM per key
  {
    name: 'deepseek',
    model: 'deepseek-chat', 
    keys: [process.env.DEEPSEEK_API_KEY, process.env.DEEPSEEK_API_KEY2].filter(k => k),
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    rpm_per_key: 60,
    delay_ms: 1000, // 60000ms / 60 = 1000ms between requests per key
    format: 'openai'
  },
  // MISTRAL - 100 RPM per key
  {
    name: 'mistral',
    model: 'mistral-small-latest',
    keys: [process.env.MISTRAL_API_KEY, process.env.MISTRAL_API_KEY2].filter(k => k), 
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    rpm_per_key: 100,
    delay_ms: 600, // 60000ms / 100 = 600ms between requests per key
    format: 'openai'
  },
  // XAI - 60 RPM per key
  {
    name: 'xai',
    model: 'grok-2-1212',
    keys: [process.env.XAI_API_KEY, process.env.XAI_API_KEY2].filter(k => k),
    endpoint: 'https://api.x.ai/v1/chat/completions', 
    rpm_per_key: 60,
    delay_ms: 1000, // 60000ms / 60 = 1000ms between requests per key
    format: 'openai'
  },
  // TOGETHER - 60 RPM per key
  {
    name: 'together',
    model: 'meta-llama/Llama-3-8b-chat-hf',
    keys: [process.env.TOGETHER_API_KEY, process.env.TOGETHER_API_KEY2].filter(k => k),
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    rpm_per_key: 60, 
    delay_ms: 1000, // 60000ms / 60 = 1000ms between requests per key
    format: 'openai'
  },
  // PERPLEXITY - 20 RPM per key (very strict!)
  {
    name: 'perplexity',
    model: 'llama-3.1-sonar-small-128k-online', 
    keys: [process.env.PERPLEXITY_API_KEY, process.env.PERPLEXITY_API_KEY2].filter(k => k),
    endpoint: 'https://api.perplexity.ai/chat/completions',
    rpm_per_key: 20,
    delay_ms: 3000, // 60000ms / 20 = 3000ms between requests per key
    format: 'openai'
  },
  // GOOGLE - 60 RPM per key
  {
    name: 'google',
    model: 'gemini-1.5-flash',
    keys: [process.env.GOOGLE_API_KEY, process.env.GOOGLE_API_KEY2].filter(k => k),
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    rpm_per_key: 60,
    delay_ms: 1000, // 60000ms / 60 = 1000ms between requests per key
    format: 'google'
  }
].filter(p => p.keys.length > 0); // Only use providers with at least one key

// Track last request time for each key
const keyTimestamps = new Map();

// Initialize all key timestamps
AI_PROVIDERS.forEach(provider => {
  provider.keys.forEach(key => {
    if (key) keyTimestamps.set(key, 0);
  });
});

console.log(`🔧 Configured ${AI_PROVIDERS.length} providers with ${AI_PROVIDERS.reduce((sum, p) => sum + p.keys.length, 0)} total API keys`);

async function processAllLLMs(domain: string) {
  const prompts = ['business_analysis', 'content_strategy', 'technical_assessment'];
  
        // Process ALL prompts and providers in parallel with throttling
   const allPromises = [];
   for (const prompt of prompts) {
     for (const provider of AI_PROVIDERS) {
       allPromises.push(
         makeThrottledCall(provider, domain, prompt).then(response => ({
           success: true,
           model: response.model,
           prompt,
           content: response.content
         })).catch(error => ({
           success: false,
           model: `${provider.name}/${provider.model}`,
           prompt,
           error: error.message || 'Unknown error'
         }))
       );
     }
   }
   
   // Wait for ALL API calls to complete in parallel
   const allResponses = await Promise.all(allPromises);
  
  return allResponses;
}

// THROTTLED API CALL WITH KEY ROTATION
async function makeThrottledCall(provider: any, domain: string, prompt: string) {
  // Find the key that's been idle longest
  let bestKey = null;
  let oldestTime = Date.now();
  
  for (const key of provider.keys) {
    if (!key) continue;
    const lastUsed = keyTimestamps.get(key) || 0;
    if (lastUsed < oldestTime) {
      oldestTime = lastUsed;
      bestKey = key;
    }
  }
  
  if (!bestKey) {
    throw new Error(`No available keys for ${provider.name}`);
  }
  
  // Calculate required wait time
  const now = Date.now();
  const timeSinceLastUse = now - oldestTime;
  const requiredDelay = provider.delay_ms;
  
  if (timeSinceLastUse < requiredDelay) {
    const waitTime = requiredDelay - timeSinceLastUse;
    console.log(`⏳ ${provider.name}: waiting ${waitTime}ms for rate limit`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Update timestamp
  keyTimestamps.set(bestKey, Date.now());
  
  // Build request
  const payload = buildPayload(provider, domain, prompt);
  const headers = buildHeaders(provider, bestKey);
  
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  const responseData = await response.json();
  const content = extractContent(responseData, provider);
  
  return {
    model: `${provider.name}/${provider.model}`,
    content,
    provider: provider.name
  };
}

// BUILD REQUEST PAYLOAD
function buildPayload(provider: any, domain: string, prompt: string) {
  const fullPrompt = `${prompt}\n\nDomain: ${domain}`;
  
  switch (provider.format) {
    case 'openai':
      return {
        model: provider.model,
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 500,
        temperature: 0.7
      };
      
    case 'anthropic':
      return {
        model: provider.model,
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 500
      };
      
    case 'google':
      return {
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      };
      
    default:
      throw new Error(`Unknown format: ${provider.format}`);
  }
}

// BUILD REQUEST HEADERS
function buildHeaders(provider: any, apiKey: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  
  switch (provider.format) {
    case 'openai':
      headers['Authorization'] = `Bearer ${apiKey}`;
      break;
      
    case 'anthropic':
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
      
    case 'google':
      // Google uses API key in URL
      provider.endpoint = `${provider.endpoint}?key=${apiKey}`;
      break;
  }
  
  return headers;
}

// EXTRACT CONTENT FROM RESPONSE
function extractContent(data: any, provider: any) {
  switch (provider.format) {
    case 'openai':
      return data.choices?.[0]?.message?.content || 'No content';
      
    case 'anthropic':
      return data.content?.[0]?.text || 'No content';
      
    case 'google':
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No content';
      
    default:
      return 'Unknown format';
  }
}

async function callLLM(provider: any, domain: string, prompt: string): Promise<string> {
  const promptText = `Analyze ${domain} for ${prompt}. Provide detailed insights about this domain's business strategy, market position, and competitive advantages.`;
  
  let requestBody: any;
  let headers: any;
  
  if (provider.name === 'anthropic') {
    headers = {
      'x-api-key': provider.key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    };
    requestBody = {
      model: provider.model,
      max_tokens: 500,
      messages: [{ role: 'user', content: promptText }]
    };
  } else if (provider.name === 'google') {
    headers = {
      'Content-Type': 'application/json'
    };
    const endpoint = `${provider.endpoint}?key=${provider.key}`;
    requestBody = {
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        maxOutputTokens: 500
      }
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  } else {
    headers = {
      'Authorization': `Bearer ${provider.key}`,
      'Content-Type': 'application/json'
    };
    requestBody = {
      model: provider.model,
      messages: [{ role: 'user', content: promptText }],
      max_tokens: 500
    };
  }
  
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data: any = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || 'API Error');
  }
  
  // Extract content based on provider
  if (provider.name === 'anthropic') {
    return data.content?.[0]?.text || 'No response';
  } else {
    return data.choices?.[0]?.message?.content || 'No response';
  }
}

app.listen(port, () => {
  console.log(`✅ Sophisticated Runner Service running on port ${port}`);
  console.log(`🔥 Domain processing: POST /process-pending-domains`);
  console.log(`🔑 API key status: GET /api-keys`);
  console.log(`🏥 Health check: GET /health`);
});
