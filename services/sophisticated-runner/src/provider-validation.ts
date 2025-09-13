// PROVIDER VALIDATION AND AUTO-HEALING SYSTEM
import { Request, Response } from 'express';
import fetch from 'node-fetch';

// Model fallback configurations
export const PROVIDER_FALLBACK_CONFIGS = {
  groq: {
    models: ['llama3-8b-8192', 'llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    endpoint: 'https://api.groq.com/openai/v1/chat/completions'
  },
  xai: {
    models: ['grok-2', 'grok-beta', 'grok-2-mini'],
    endpoint: 'https://api.x.ai/v1/chat/completions'
  },
  perplexity: {
    models: ['sonar', 'sonar-small-chat', 'sonar-medium-chat', 'llama-3.1-sonar-small-128k-online'],
    endpoint: 'https://api.perplexity.ai/chat/completions'
  },
  ai21: {
    models: ['jamba-mini', 'jamba-large', 'j2-ultra', 'j2-mid'],
    endpoints: [
      'https://api.ai21.com/studio/v1/chat/completions',
      'https://api.ai21.com/studio/v1/j2-ultra/complete'
    ]
  },
  google: {
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'],
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
  }
};

// Environment variable scanner
export function scanForApiKeys(): Record<string, string[]> {
  const providers: Record<string, string[]> = {};
  
  Object.keys(process.env).forEach(key => {
    // Match patterns like OPENAI_API_KEY, OPENAI_API_KEY_1, OPENAI_API_KEY2
    const match = key.match(/^([A-Z0-9]+)_API_KEY(_?\d*)?$/);
    if (match && process.env[key]) {
      const provider = match[1].toLowerCase();
      if (!providers[provider]) providers[provider] = [];
      providers[provider].push(process.env[key]!);
    }
  });
  
  return providers;
}

// Test a single provider with fallback models
export async function testProviderWithFallback(
  provider: any,
  testPrompt: string = 'Say "OK" in one word'
): Promise<{
  working: boolean;
  model: string;
  responseTime: number;
  error?: string;
  alternativeModels?: string[];
}> {
  const startTime = Date.now();
  const fallbackConfig = PROVIDER_FALLBACK_CONFIGS[provider.name as keyof typeof PROVIDER_FALLBACK_CONFIGS];
  const modelsToTry = fallbackConfig?.models || [provider.model];
  
  for (const model of modelsToTry) {
    try {
      // Get the first available key
      const apiKey = provider.keys[0];
      if (!apiKey) {
        return {
          working: false,
          model: provider.model,
          responseTime: Date.now() - startTime,
          error: 'No API keys configured'
        };
      }

      // Build request based on provider
      let response;
      
      if (provider.name === 'google') {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: testPrompt }] }],
              generationConfig: { maxOutputTokens: 50 }
            }),
            timeout: 10000
          }
        );
      } else if (provider.name === 'anthropic') {
        response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 50,
            messages: [{ role: 'user', content: testPrompt }]
          }),
          timeout: 10000
        });
      } else if (provider.name === 'cohere') {
        response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            prompt: testPrompt,
            max_tokens: 50
          }),
          timeout: 10000
        });
      } else {
        // Standard OpenAI-compatible format
        response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 50
          }),
          timeout: 10000
        });
      }

      if (response.ok) {
        // Update provider model if different
        if (model !== provider.model) {
          console.log(`✅ Provider ${provider.name} works with fallback model: ${model}`);
        }
        
        return {
          working: true,
          model: model,
          responseTime: Date.now() - startTime,
          alternativeModels: modelsToTry.filter(m => m !== model)
        };
      }

      const errorText = await response.text();
      
      // Check if it's a model-specific error
      if (errorText.includes('decommissioned') || 
          errorText.includes('does not exist') || 
          errorText.includes('Invalid model')) {
        console.log(`❌ Model ${model} failed for ${provider.name}, trying next...`);
        continue;
      }
      
      // Non-model error, don't try other models
      return {
        working: false,
        model: provider.model,
        responseTime: Date.now() - startTime,
        error: errorText.substring(0, 200)
      };

    } catch (error: any) {
      // Network or other error
      if (model === modelsToTry[modelsToTry.length - 1]) {
        return {
          working: false,
          model: provider.model,
          responseTime: Date.now() - startTime,
          error: error.message
        };
      }
    }
  }

  return {
    working: false,
    model: provider.model,
    responseTime: Date.now() - startTime,
    error: 'All models failed'
  };
}

// Validation endpoint handler
export async function validateProvidersHandler(req: Request, res: Response) {
  const { FAST_PROVIDERS, MEDIUM_PROVIDERS, SLOW_PROVIDERS } = req.app.locals;
  const allProviders = [...FAST_PROVIDERS, ...MEDIUM_PROVIDERS, ...SLOW_PROVIDERS];
  
  const results: Record<string, any> = {};
  const startTime = Date.now();
  
  // Test all providers in parallel
  const tests = await Promise.all(
    allProviders.map(async (provider: any) => {
      const result = await testProviderWithFallback(provider);
      return { provider: provider.name, ...result };
    })
  );
  
  // Build results object
  tests.forEach(test => {
    results[test.provider] = test;
  });
  
  // Get environment scan
  const envKeys = scanForApiKeys();
  
  // Summary stats
  const working = tests.filter(t => t.working).length;
  const failed = tests.filter(t => !t.working).length;
  
  res.json({
    timestamp: new Date().toISOString(),
    totalTime: Date.now() - startTime,
    summary: {
      total: allProviders.length,
      working,
      failed,
      health: `${Math.round((working / allProviders.length) * 100)}%`
    },
    providers: results,
    environmentKeys: envKeys,
    recommendations: generateRecommendations(results, envKeys)
  });
}

// Generate recommendations based on validation results
function generateRecommendations(results: Record<string, any>, envKeys: Record<string, string[]>): string[] {
  const recommendations: string[] = [];
  
  Object.entries(results).forEach(([provider, result]) => {
    if (!result.working) {
      if (result.error?.includes('No API keys')) {
        recommendations.push(`❌ ${provider}: Add API keys (supports formats: ${provider.toUpperCase()}_API_KEY, ${provider.toUpperCase()}_API_KEY_1, ${provider.toUpperCase()}_API_KEY2)`);
      } else if (result.error?.includes('decommissioned') || result.error?.includes('Invalid model')) {
        recommendations.push(`⚠️ ${provider}: Model ${result.model} is deprecated. Update configuration.`);
      } else if (result.error?.includes('401') || result.error?.includes('403')) {
        recommendations.push(`🔑 ${provider}: API key is invalid or expired. Replace key.`);
      } else {
        recommendations.push(`❓ ${provider}: Unknown error - check logs.`);
      }
    } else if (result.model !== result.originalModel) {
      recommendations.push(`✅ ${provider}: Using fallback model ${result.model}. Consider updating default.`);
    }
  });
  
  // Check for unused keys
  Object.entries(envKeys).forEach(([provider, keys]) => {
    if (!results[provider]) {
      recommendations.push(`💡 Found ${keys.length} API keys for '${provider}' but no provider configured.`);
    }
  });
  
  return recommendations;
}

// Auto-healing function to update broken providers
export async function autoHealProviders(providers: any[]): Promise<any[]> {
  const healedProviders = await Promise.all(
    providers.map(async (provider) => {
      const result = await testProviderWithFallback(provider);
      
      if (result.working && result.model !== provider.model) {
        console.log(`🔧 Auto-healed ${provider.name}: ${provider.model} → ${result.model}`);
        return {
          ...provider,
          model: result.model,
          lastHealed: new Date().toISOString()
        };
      }
      
      return provider;
    })
  );
  
  return healedProviders;
}

// Monitoring endpoint for continuous health checks
export function setupMonitoring(app: any) {
  // Run validation every 30 minutes
  setInterval(async () => {
    const { FAST_PROVIDERS, MEDIUM_PROVIDERS, SLOW_PROVIDERS } = app.locals;
    const allProviders = [...FAST_PROVIDERS, ...MEDIUM_PROVIDERS, ...SLOW_PROVIDERS];
    
    const healed = await autoHealProviders(allProviders);
    
    // Update providers if any were healed
    const healedCount = healed.filter((p, i) => p.model !== allProviders[i].model).length;
    if (healedCount > 0) {
      console.log(`✅ Auto-healed ${healedCount} providers`);
      
      // Update the provider arrays
      app.locals.FAST_PROVIDERS = healed.filter(p => p.tier === 'fast');
      app.locals.MEDIUM_PROVIDERS = healed.filter(p => p.tier === 'medium');
      app.locals.SLOW_PROVIDERS = healed.filter(p => p.tier === 'slow');
    }
  }, 30 * 60 * 1000); // 30 minutes
}