// Test script for Volatility Swarm functionality

import { SwarmOrchestrator, VolatilityEngine, SWARM_PROVIDERS } from '../src/volatility-swarm';
import { Pool } from 'pg';
import winston from 'winston';

// Test logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

async function testSwarmConfiguration() {
  console.log('🧪 Testing Volatility Swarm Configuration...\n');
  
  // Check available providers
  const availableProviders = SWARM_PROVIDERS.filter(p => p.apiKey && p.apiKey !== '');
  console.log(`✅ Available Providers: ${availableProviders.length}`);
  
  // Count total models
  const totalModels = availableProviders.reduce((sum, p) => sum + p.models.length, 0);
  console.log(`✅ Total Models Available: ${totalModels}`);
  
  // List providers and models
  console.log('\n📋 Provider Breakdown:');
  availableProviders.forEach(provider => {
    console.log(`  - ${provider.name} (${provider.tier}): ${provider.models.length} models`);
    provider.models.forEach(model => {
      console.log(`    • ${model}`);
    });
  });
  
  // Check API keys
  console.log('\n🔑 API Key Status:');
  const apiKeyStatus = {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    together: !!process.env.TOGETHER_API_KEY,
    cohere: !!process.env.COHERE_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
    google: !!process.env.GOOGLE_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    xai: !!process.env.XAI_API_KEY
  };
  
  Object.entries(apiKeyStatus).forEach(([provider, hasKey]) => {
    console.log(`  ${hasKey ? '✅' : '❌'} ${provider}`);
  });
}

async function testVolatilityCalculation() {
  console.log('\n🧪 Testing Volatility Calculation...\n');
  
  // Create mock pool
  const mockPool = {
    query: async () => ({ rows: [] })
  } as any;
  
  const volatilityEngine = new VolatilityEngine(mockPool, logger);
  
  // Test with mock responses
  const mockResponses = [
    {
      model: 'gpt-4',
      content: 'This domain shows strong market leadership and innovative approach.',
      provider: 'openai',
      tier: 'premium'
    },
    {
      model: 'claude-3',
      content: 'The domain appears to be struggling with declining market share.',
      provider: 'anthropic',
      tier: 'premium'
    },
    {
      model: 'llama-3',
      content: 'Rapid growth detected with significant funding influx.',
      provider: 'together',
      tier: 'fast'
    }
  ];
  
  try {
    const volatility = await volatilityEngine.calculateVolatility('test-domain.com', mockResponses);
    console.log('✅ Volatility Score Calculated:');
    console.log(`  - Overall Volatility: ${volatility.overallVolatility.toFixed(2)}`);
    console.log(`  - Memory Drift: ${volatility.memoryDriftVelocity.toFixed(2)}`);
    console.log(`  - Sentiment Variance: ${volatility.sentimentVariance.toFixed(2)}`);
    console.log(`  - SEO Opportunity: ${volatility.seoOpportunityScore.toFixed(2)}`);
    console.log(`  - Signals: ${volatility.signals.length}`);
  } catch (error) {
    console.error('❌ Volatility calculation failed:', error);
  }
}

async function testSwarmAllocation() {
  console.log('\n🧪 Testing Swarm Allocation Logic...\n');
  
  const testScenarios = [
    { volatility: 0.95, expected: 'MAXIMUM_COVERAGE' },
    { volatility: 0.75, expected: 'HIGH_QUALITY_COVERAGE' },
    { volatility: 0.55, expected: 'BALANCED_COVERAGE' },
    { volatility: 0.3, expected: 'EFFICIENT_COVERAGE' }
  ];
  
  console.log('📊 Volatility Tiering:');
  testScenarios.forEach(scenario => {
    console.log(`  Volatility ${scenario.volatility} → ${scenario.expected}`);
  });
}

// Run all tests
async function runTests() {
  console.log('🐝 VOLATILITY SWARM TEST SUITE\n');
  console.log('=' .repeat(50) + '\n');
  
  await testSwarmConfiguration();
  await testVolatilityCalculation();
  await testSwarmAllocation();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ All tests completed!\n');
}

// Execute tests
runTests().catch(console.error);