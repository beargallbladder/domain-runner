import express from 'express';
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
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'sophisticated-runner',
    timestamp: new Date().toISOString()
  });
});

// API key status check
app.get('/api-keys', (req, res) => {
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
app.post('/process-pending-domains', async (req, res) => {
  try {
    console.log('🔥 FAST PROCESSING STARTED');
    
    // Get 10 pending domains
    const result = await pool.query(
      'SELECT id, domain FROM domains WHERE status = $1 ORDER BY updated_at ASC LIMIT 10',
      ['pending']
    );
    
    if (result.rows.length === 0) {
      return res.json({ message: 'No pending domains', processed: 0 });
    }
    
    console.log(`📊 Processing ${result.rows.length} domains`);
    
    let processed = 0;
    const errors = [];
    
    for (const domainRow of result.rows) {
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
              [domainRow.id, response.model, response.prompt, response.content]
            );
          } else {
            errors.push(`${response.model}: ${response.error}`);
          }
        }
        
        // Mark as completed
        await pool.query(
          'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
          ['completed', domainRow.id]
        );
        
        processed++;
        console.log(`✅ Completed ${domainRow.domain} (${responses.filter(r => r.success).length}/${responses.length} responses)`);
        
             } catch (domainError: any) {
         console.error(`❌ Failed ${domainRow.domain}:`, domainError.message);
         errors.push(`${domainRow.domain}: ${domainError.message}`);
        
        // Mark as pending again for retry
        await pool.query(
          'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
          ['pending', domainRow.id]
        );
      }
    }
    
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

async function processAllLLMs(domain: string) {
  const prompts = ['business_analysis', 'content_strategy', 'technical_assessment'];
  const providers = [
    {
      name: 'openai',
      model: 'gpt-4o-mini',
      key: process.env.OPENAI_API_KEY,
      endpoint: 'https://api.openai.com/v1/chat/completions'
    },
    {
      name: 'anthropic',
      model: 'claude-3-haiku-20240307',
      key: process.env.ANTHROPIC_API_KEY,
      endpoint: 'https://api.anthropic.com/v1/messages'
    },
    {
      name: 'deepseek',
      model: 'deepseek-chat',
      key: process.env.DEEPSEEK_API_KEY,
      endpoint: 'https://api.deepseek.com/v1/chat/completions'
    },
    {
      name: 'mistral',
      model: 'mistral-small-latest',
      key: process.env.MISTRAL_API_KEY,
      endpoint: 'https://api.mistral.ai/v1/chat/completions'
    },
    {
      name: 'xai',
      model: 'grok-beta',
      key: process.env.XAI_API_KEY,
      endpoint: 'https://api.x.ai/v1/chat/completions'
    },
    {
      name: 'together',
      model: 'meta-llama/Llama-3-8b-chat-hf',
      key: process.env.TOGETHER_API_KEY,
      endpoint: 'https://api.together.xyz/v1/chat/completions'
    },
    {
      name: 'perplexity',
      model: 'llama-3.1-sonar-small-128k-online',
      key: process.env.PERPLEXITY_API_KEY,
      endpoint: 'https://api.perplexity.ai/chat/completions'
    },
    {
      name: 'google',
      model: 'gemini-1.5-flash',
      key: process.env.GOOGLE_API_KEY,
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
    }
  ].filter(p => p.key); // Only use providers with keys
  
     const allResponses: any[] = [];
  
  // Process all prompts for all providers
  for (const prompt of prompts) {
    const providerPromises = providers.map(provider => 
      callLLM(provider, domain, prompt)
    );
    
    // Wait for all providers to respond for this prompt
    const results = await Promise.allSettled(providerPromises);
    
    results.forEach((result, index) => {
      const provider = providers[index];
      if (result.status === 'fulfilled') {
        allResponses.push({
          success: true,
          model: `${provider.name}/${provider.model}`,
          prompt,
          content: result.value
        });
      } else {
        allResponses.push({
          success: false,
          model: `${provider.name}/${provider.model}`,
          prompt,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
    
    // Small delay between prompts to be conservative
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return allResponses;
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
