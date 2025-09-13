import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import winston from 'winston';
import { 
  validateProvidersHandler, 
  scanForApiKeys, 
  autoHealProviders,
  setupMonitoring
} from './provider-validation';

// Flexible API key discovery function
function getApiKeys(providerName: string): string[] {
  const upperName = providerName.toUpperCase();
  const keys: string[] = [];
  
  // Try base key
  if (process.env[`${upperName}_API_KEY`]) {
    keys.push(process.env[`${upperName}_API_KEY`]);
  }
  
  // Try numbered keys with both formats
  for (let i = 1; i <= 5; i++) {
    // Try with underscore: KEY_1, KEY_2, etc
    if (process.env[`${upperName}_API_KEY_${i}`]) {
      keys.push(process.env[`${upperName}_API_KEY_${i}`]);
    }
    // Try without underscore: KEY1, KEY2, etc
    if (process.env[`${upperName}_API_KEY${i}`]) {
      keys.push(process.env[`${upperName}_API_KEY${i}`]);
    }
  }
  
  return keys.filter(Boolean);
}

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Deployment timestamp: 2025-08-02 17:49 PST

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Configure providers with flexible key discovery
const FAST_PROVIDERS = [
  { name: 'groq', model: 'llama3-8b-8192', keys: getApiKeys('groq'), endpoint: 'https://api.groq.com/openai/v1/chat/completions', tier: 'fast' },
  { name: 'deepseek', model: 'deepseek-chat', keys: getApiKeys('deepseek'), endpoint: 'https://api.deepseek.com/v1/chat/completions', tier: 'fast' },
  { name: 'together', model: 'meta-llama/Llama-3-8b-chat-hf', keys: getApiKeys('together'), endpoint: 'https://api.together.xyz/v1/chat/completions', tier: 'fast' },
  { name: 'xai', model: 'grok-2', keys: getApiKeys('xai'), endpoint: 'https://api.x.ai/v1/chat/completions', tier: 'fast' },
  { name: 'perplexity', model: 'sonar', keys: getApiKeys('perplexity'), endpoint: 'https://api.perplexity.ai/chat/completions', tier: 'fast' }
];

const MEDIUM_PROVIDERS = [
  { name: 'openai', model: 'gpt-4o-mini', keys: getApiKeys('openai'), endpoint: 'https://api.openai.com/v1/chat/completions', tier: 'medium' },
  { name: 'mistral', model: 'mistral-small-latest', keys: getApiKeys('mistral'), endpoint: 'https://api.mistral.ai/v1/chat/completions', tier: 'medium' },
  { name: 'cohere', model: 'command-r-plus', keys: getApiKeys('cohere'), endpoint: 'https://api.cohere.ai/v1/generate', tier: 'medium' },
  { name: 'ai21', model: 'jamba-mini', keys: getApiKeys('ai21'), endpoint: 'https://api.ai21.com/studio/v1/chat/completions', tier: 'medium' }
];

const SLOW_PROVIDERS = [
  { name: 'anthropic', model: 'claude-3-haiku-20240307', keys: getApiKeys('anthropic'), endpoint: 'https://api.anthropic.com/v1/messages', tier: 'slow' },
  { name: 'google', model: 'gemini-1.5-flash', keys: getApiKeys('google'), endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', tier: 'slow' }
];

// Store providers in app locals for access in handlers
app.locals.FAST_PROVIDERS = FAST_PROVIDERS;
app.locals.MEDIUM_PROVIDERS = MEDIUM_PROVIDERS;
app.locals.SLOW_PROVIDERS = SLOW_PROVIDERS;

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  logger.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy',
      service: 'sophisticated-runner',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Provider validation endpoint
app.get('/api/validate-providers', validateProvidersHandler);

// Environment keys endpoint
app.get('/api/environment-keys', (req: Request, res: Response) => {
  const keys = scanForApiKeys();
  res.json({
    timestamp: new Date().toISOString(),
    providers: keys,
    total: Object.keys(keys).length
  });
});

// Auto-heal endpoint
app.post('/api/auto-heal', async (req: Request, res: Response) => {
  try {
    const { FAST_PROVIDERS, MEDIUM_PROVIDERS, SLOW_PROVIDERS } = req.app.locals;
    const allProviders = [...FAST_PROVIDERS, ...MEDIUM_PROVIDERS, ...SLOW_PROVIDERS];
    
    const healed = await autoHealProviders(allProviders);
    const healedCount = healed.filter((p, i) => p.model !== allProviders[i].model).length;
    
    res.json({
      timestamp: new Date().toISOString(),
      healedCount,
      providers: healed
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process domains endpoint
app.post('/api/process-domains-synchronized', async (req: Request, res: Response) => {
  try {
    const limit = req.body.limit || 10;
    logger.info(`Processing ${limit} domains with all 11 LLM providers`);
    
    // Get pending domains
    const result = await pool.query(
      'SELECT * FROM domains WHERE status = $1 ORDER BY created_at ASC LIMIT $2',
      ['pending', limit]
    );
    
    if (result.rows.length === 0) {
      return res.json({ 
        message: 'No pending domains to process',
        processed: 0 
      });
    }
    
    const domains = result.rows;
    logger.info(`Found ${domains.length} pending domains`);
    
    // Get all providers
    const allProviders = [...FAST_PROVIDERS, ...MEDIUM_PROVIDERS, ...SLOW_PROVIDERS];
    logger.info(`Using ${allProviders.length} providers`);
    
    // Process each domain
    for (const domain of domains) {
      try {
        // Update status to processing
        await pool.query(
          'UPDATE domains SET status = $1 WHERE id = $2',
          ['processing', domain.id]
        );
        
        // Process with each provider
        const prompts = [
          `Who owns ${domain.domain} and what is their business model?`,
          `What products or services does ${domain.domain} offer?`,
          `Who are the main competitors to ${domain.domain}?`
        ];
        
        for (const provider of allProviders) {
          if (!provider.keys || provider.keys.length === 0) {
            logger.warn(`Skipping ${provider.name} - no API keys found`);
            continue;
          }
          
          for (let i = 0; i < prompts.length; i++) {
            try {
              // Make API call to provider
              const apiKey = provider.keys[0];
              const headers: any = {
                'Content-Type': 'application/json'
              };
              
              // Set auth header based on provider
              if (provider.name === 'google') {
                headers['x-goog-api-key'] = apiKey;
              } else {
                headers['Authorization'] = `Bearer ${apiKey}`;
              }
              
              // Prepare request body
              let body: any;
              if (provider.name === 'anthropic') {
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
                delete headers['Authorization'];
                body = {
                  model: provider.model,
                  messages: [{ role: 'user', content: prompts[i] }],
                  max_tokens: 500
                };
              } else if (provider.name === 'cohere') {
                body = {
                  prompt: prompts[i],
                  model: provider.model,
                  max_tokens: 500
                };
              } else if (provider.name === 'google') {
                body = {
                  contents: [{ parts: [{ text: prompts[i] }] }]
                };
              } else {
                body = {
                  model: provider.model,
                  messages: [{ role: 'user', content: prompts[i] }],
                  max_tokens: 500
                };
              }
              
              const response = await fetch(provider.endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
              });
              
              if (response.ok) {
                const data: any = await response.json();
                let content = '';
                
                // Extract content based on provider response format
                if (provider.name === 'anthropic') {
                  content = data.content?.[0]?.text || '';
                } else if (provider.name === 'cohere') {
                  content = data.generations?.[0]?.text || '';
                } else if (provider.name === 'google') {
                  content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                } else {
                  content = data.choices?.[0]?.message?.content || '';
                }
                
                // Store response
                await pool.query(`
                  INSERT INTO domain_responses 
                  (domain_id, model, prompt_type, response, created_at)
                  VALUES ($1, $2, $3, $4, NOW())
                `, [domain.id, provider.name, `business_model_${i+1}`, content]);
                
              } else {
                const errorText = await response.text();
                logger.error(`${provider.name} API error: ${response.status} - ${errorText}`);
              }
              
            } catch (error) {
              logger.error(`Error processing with ${provider.name}: ${error}`);
            }
          }
        }
        
        // Update status to completed
        await pool.query(
          'UPDATE domains SET status = $1, updated_at = NOW() WHERE id = $2',
          ['completed', domain.id]
        );
        
      } catch (error) {
        logger.error(`Error processing domain ${domain.domain}: ${error}`);
      }
    }
    
    res.json({ 
      message: 'Processing started',
      processed: domains.length,
      providers: allProviders.length
    });
    
  } catch (error) {
    logger.error('Error in process-domains:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Sophisticated Runner service started on port ${PORT}`);
  logger.info('Provider validation endpoints available:');
  logger.info('- GET /health');
  logger.info('- GET /api/validate-providers');
  logger.info('- GET /api/environment-keys');
  logger.info('- POST /api/auto-heal');
  
  // Setup monitoring
  setupMonitoring(app);
});

// Export for testing
export default app;

// Deployment trigger: 1754201333
// FORCE DEPLOYMENT - 11 LLM FIX READY
