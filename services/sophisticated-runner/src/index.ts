import express from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

dotenv.config();

// ============================================================================
// SOPHISTICATED RUNNER - COMPREHENSIVE MODE (JOLT + ALL MODELS)
// ============================================================================
// 🎯 Mission: Full comprehensive analysis with ALL models and JOLT enhancement
// 🎯 Strategy: Complete cost spectrum - ultra cheap to premium models  
// 🎯 Database: SAME EXACT schema as raw-capture-runner - NO processor_id!
// 🎯 COMPREHENSIVE MODE: 2025-06-10 - ALL MODELS + JOLT ADDITIONAL PROMPTS
// ============================================================================

console.log('🚀 SOPHISTICATED RUNNER STARTING - COMPREHENSIVE MODE');
console.log('   Service ID: sophisticated_v1_comprehensive');
console.log('   Mode: comprehensive_all_models');
console.log('   JOLT Integration: ACTIVE');

const SERVICE_ID = 'sophisticated_v1_comprehensive';
const SERVICE_MODE = 'comprehensive_all_models';

// ============================================================================
// 🔗 INDUSTRY INTELLIGENCE INTEGRATION
// ============================================================================
// Purpose: Dynamic JOLT detection via industry-intelligence API
// Benefit: Modular, configurable, testable JOLT management

const INDUSTRY_INTELLIGENCE_URL = process.env.INDUSTRY_INTELLIGENCE_URL || 'https://industry-intelligence.onrender.com';

// 🔥 COMPLETE 30-DOMAIN JOLT SYSTEM - Your Full Brand Crisis Benchmarks
const LOCAL_JOLT_FALLBACK = {
  'facebook.com': { jolt: true, type: 'brand_transition', severity: 'critical', additional_prompts: 3, description: 'Facebook → Meta corporate rebrand ($10B+ investment)' },
  'twitter.com': { jolt: true, type: 'brand_transition', severity: 'critical', additional_prompts: 4, description: 'Twitter → X complete rebrand (Musk acquisition)' },
  'google.com': { jolt: true, type: 'corporate_restructure', severity: 'high', additional_prompts: 2, description: 'Google → Alphabet corporate restructure' },
  'weightwatchers.com': { jolt: true, type: 'brand_simplification', severity: 'medium', additional_prompts: 2, description: 'Weight Watchers → WW brand simplification' },
  'dunkindonuts.com': { jolt: true, type: 'brand_simplification', severity: 'medium', additional_prompts: 2, description: 'Dunkin\' Donuts → Dunkin\' brand simplification' },
  'comcast.com': { jolt: true, type: 'consumer_rebrand', severity: 'critical', additional_prompts: 4, description: 'Comcast → Xfinity consumer brand (ongoing confusion)' },
  'altria.com': { jolt: true, type: 'reputation_rebrand', severity: 'critical', additional_prompts: 4, description: 'Philip Morris → Altria (reputation management)' },
  'blackberry.com': { jolt: true, type: 'business_collapse', severity: 'critical', additional_prompts: 4, description: 'BlackBerry → BlackBerry Limited (mobile decline)' },
  'netflix.com': { jolt: true, type: 'business_model_transition', severity: 'high', additional_prompts: 3, description: 'Netflix DVD → Streaming pivot (Qwikster crisis)' },
  'ibm.com': { jolt: true, type: 'strategic_pivot', severity: 'high', additional_prompts: 3, description: 'IBM → Cloud/AI focus (Red Hat acquisition)' },
  'xerox.com': { jolt: true, type: 'category_expansion', severity: 'high', additional_prompts: 3, description: 'Xerox → Document Technology solutions' },
  'fedex.com': { jolt: true, type: 'brand_simplification', severity: 'medium', additional_prompts: 2, description: 'Federal Express → FedEx (successful simplification)' },
  'bp.com': { jolt: true, type: 'strategic_rebrand', severity: 'medium', additional_prompts: 2, description: 'British Petroleum → BP \'Beyond Petroleum\'' },
  'kfc.com': { jolt: true, type: 'brand_simplification', severity: 'medium', additional_prompts: 2, description: 'Kentucky Fried Chicken → KFC' },
  'instagram.com': { jolt: true, type: 'acquisition_integration', severity: 'medium', additional_prompts: 2, description: 'Instagram independent → Facebook acquisition' },
  'linkedin.com': { jolt: true, type: 'acquisition_integration', severity: 'medium', additional_prompts: 2, description: 'LinkedIn independent → Microsoft acquisition' },
  'paypal.com': { jolt: true, type: 'spinoff_independence', severity: 'medium', additional_prompts: 2, description: 'PayPal eBay subsidiary → Independent company' },
  'radioshack.com': { jolt: true, type: 'failed_rebrand', severity: 'low', additional_prompts: 1, description: 'RadioShack → The Shack (failed, reverted 2011)' },
  'apple.com': { jolt: true, type: 'ceo_death_transition', severity: 'critical', additional_prompts: 4, description: 'Steve Jobs death → Tim Cook era transition' },
  'theranos.com': { jolt: true, type: 'fraud_collapse', severity: 'critical', additional_prompts: 4, description: 'Theranos fraud scandal → Complete business collapse' },
  'wework.com': { jolt: true, type: 'ceo_scandal_collapse', severity: 'critical', additional_prompts: 4, description: 'Adam Neumann scandal → WeWork IPO collapse' },
  'ftx.com': { jolt: true, type: 'fraud_collapse', severity: 'critical', additional_prompts: 4, description: 'FTX collapse → Sam Bankman-Fried fraud conviction' },
  'tesla.com': { jolt: true, type: 'ceo_controversy_ongoing', severity: 'high', additional_prompts: 3, description: 'Elon Musk Twitter acquisition → Tesla brand stress' },
  'enron.com': { jolt: true, type: 'corporate_collapse', severity: 'high', additional_prompts: 3, description: 'Enron accounting scandal → Complete corporate collapse' },
  'lehman.com': { jolt: true, type: 'financial_collapse', severity: 'high', additional_prompts: 3, description: 'Lehman Brothers collapse → Global financial crisis trigger' },
  'starbucks.com': { jolt: true, type: 'ceo_transition_return', severity: 'medium', additional_prompts: 2, description: 'Howard Schultz return as CEO → Brand turnaround' },
  'disney.com': { jolt: true, type: 'acquisition_spree', severity: 'medium', additional_prompts: 2, description: 'Disney mega-acquisitions → Marvel, Star Wars, Fox integration' },
  'uber.com': { jolt: true, type: 'ceo_scandal_transition', severity: 'high', additional_prompts: 3, description: 'Travis Kalanick resignation → Multiple scandals fallout' },
  'wells-fargo.com': { jolt: true, type: 'scandal_reputation_crisis', severity: 'high', additional_prompts: 3, description: 'Wells Fargo fake accounts scandal → Massive reputation damage' },
  'meta.com': { jolt: true, type: 'brand_transition', severity: 'high', additional_prompts: 2, description: 'Facebook to Meta rebrand - new domain identity' }
};

interface JoltData {
  jolt: boolean;
  type?: 'brand_transition' | 'corporate_restructure' | 'acquisition_merger' | 'leadership_change';
  date?: string;
  description?: string;
  paired_domain?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  additional_prompts?: number;
}

class JoltService {
  private joltCache: Map<string, JoltData> = new Map();
  private lastCacheUpdate: number = 0;
  private cacheValidityMs: number = 300000; // 5 minutes

  async getJoltData(domain: string): Promise<JoltData> {
    // Check cache first
    if (this.joltCache.has(domain) && Date.now() - this.lastCacheUpdate < this.cacheValidityMs) {
      return this.joltCache.get(domain)!;
    }

    // 🔥 DIRECT JOLT LOOKUP: Use embedded 30-domain JOLT system (no external service calls)
    if (LOCAL_JOLT_FALLBACK[domain as keyof typeof LOCAL_JOLT_FALLBACK]) {
      const localData = LOCAL_JOLT_FALLBACK[domain as keyof typeof LOCAL_JOLT_FALLBACK];
      const joltData: JoltData = {
        jolt: localData.jolt,
        type: localData.type as any,
        severity: localData.severity as any,
        additional_prompts: localData.additional_prompts,
        description: localData.description
      };
      
      this.joltCache.set(domain, joltData);
      console.log(`🔥 JOLT DOMAIN: ${domain} - ${joltData.additional_prompts} additional prompts (${joltData.severity} severity)`);
      
      return joltData;
    }

    // Not a JOLT domain - regular processing
    const regularData: JoltData = { jolt: false, additional_prompts: 0 };
    this.joltCache.set(domain, regularData);
    return regularData;
  }

  async getJoltDomainList(): Promise<string[]> {
    // 🔥 DIRECT RETURN: Use embedded 30-domain JOLT system (no external service calls)
    console.log(`✅ Using embedded JOLT system: ${Object.keys(LOCAL_JOLT_FALLBACK).length} crisis domains`);
    return Object.keys(LOCAL_JOLT_FALLBACK);
  }

  clearCache(): void {
    this.joltCache.clear();
    this.lastCacheUpdate = 0;
  }
}

const joltService = new JoltService();

// ============================================================================
// 🎯 COMPREHENSIVE MODEL SELECTION - ALL TIERS (COMPLETE COST SPECTRUM)
// ============================================================================

// 💎 ULTRA-CHEAP TIER ($0.0001-$0.001) - Maximum efficiency
const ULTRA_CHEAP_MODELS = [
  'claude-3-haiku-20240307',      // Champion: $0.00000025
  'deepseek-chat',                // Ultra-competitive: $0.000002
  'gpt-4o-mini',                  // OpenAI baseline: $0.0000015
  'meta-llama/Meta-Llama-3-8B-Instruct', // Together AI: $0.0000008
  'gemini-1.5-flash',             // Google fast: $0.00000025
  'mistral-small-latest',         // European alt: $0.000002  
];

// ⚖️ MIDDLE TIER ($0.001-$0.005) - Balanced performance/cost
const MIDDLE_TIER_MODELS = [
  'gpt-3.5-turbo',               // Reliable workhorse: $0.000001
  'claude-3-sonnet-20240229',    // Claude mid-tier: $0.000003
  'deepseek-coder',              // Specialized coding: $0.000006
  'meta-llama/Meta-Llama-3.1-70B-Instruct', // Large model: $0.000012
  'mistralai/Mixtral-8x7B-Instruct-v0.1',   // Mixture of experts: $0.0025
];

// 🔥 PREMIUM TIER ($0.005-$0.05) - High-end models
const PREMIUM_MODELS = [
  'gpt-4',                       // OpenAI flagship: $0.03
  'claude-3-opus-20240229',      // Claude flagship: $0.015
  'gpt-4-turbo',                 // OpenAI enhanced: $0.01
  'claude-3-5-sonnet-20241022',  // Claude 3.5: $0.003
];

// 💰 ALL AVAILABLE MODELS (Complete Cost Spectrum)
const ALL_COMPREHENSIVE_MODELS = [
  ...ULTRA_CHEAP_MODELS,
  ...MIDDLE_TIER_MODELS,
  ...PREMIUM_MODELS
];

// 🎯 COMPREHENSIVE PROMPT TYPES
const COMPREHENSIVE_PROMPTS = {
  business_analysis: (domain: string) => 
    `Analyze the business intelligence value of ${domain}. Provide insights on:
1. Primary business model and revenue streams
2. Key technology stack and competitive advantages  
3. Market position and growth trajectory
4. Strategic partnerships and ecosystem
5. Future opportunities and risks
Focus on actionable business intelligence for investment and partnership decisions.`,

  technical_assessment: (domain: string) =>
    `Conduct a comprehensive technical assessment of ${domain}:
1. Technology stack and architecture patterns
2. Development practices and engineering culture
3. Open source contributions and technical leadership
4. API design and developer experience
5. Technical innovation and research capabilities
Provide technical due diligence insights for technology partnerships.`,

  brand_memory_analysis: (domain: string) =>
    `Analyze the brand memory and recognition patterns for ${domain}:
1. Brand recall strength and market positioning
2. Historical brand evolution and major transitions
3. Consumer sentiment and brand associations
4. Competitive brand differentiation
5. Brand vulnerability and crisis resilience
Focus on measuring AI and human memory decay patterns for this brand.`,

  market_intelligence: (domain: string) =>
    `Provide comprehensive market intelligence for ${domain}:
1. Industry landscape and competitive positioning
2. Market share analysis and growth trajectories
3. Strategic threats and opportunities
4. Regulatory environment and compliance status
5. Macroeconomic factors affecting business
Generate insights for strategic planning and market entry decisions.`
};

// Model selection strategies for comprehensive analysis
function selectModelsForDomain(joltData: JoltData): string[] {
  if (joltData.jolt) {
    // 🔥 JOLT DOMAINS: Expensive comprehensive analysis for benchmarking
    const baseModels = 2; // Always use 2 base models
    const joltModels = joltData.additional_prompts || 0; // Additional models for JOLT domains
    
    const totalModels = baseModels + joltModels;
    
    // Distribute across ALL tiers for comprehensive analysis
    const selectedModels: string[] = [];
    
    // Include premium models for JOLT domains (this is where we spend money)
    selectedModels.push(...PREMIUM_MODELS.slice(0, Math.max(1, Math.floor(totalModels * 0.4))));
    
    // Add middle tier for quality
    selectedModels.push(...MIDDLE_TIER_MODELS.slice(0, Math.max(1, Math.floor(totalModels * 0.4))));
    
    // Always include some ultra-cheap for cost balance
    selectedModels.push(...ULTRA_CHEAP_MODELS.slice(0, Math.max(1, Math.floor(totalModels * 0.2))));
    
    // Ensure we don't exceed available models and return exact count needed
    const uniqueModels = [...new Set(selectedModels)];
    return uniqueModels.slice(0, totalModels);
  } else {
    // 💰 REGULAR DOMAINS: Cheap coverage only
    return [ULTRA_CHEAP_MODELS[Math.floor(Math.random() * ULTRA_CHEAP_MODELS.length)]];
  }
}

function selectPromptsForDomain(joltData: JoltData): string[] {
  if (joltData.jolt) {
    // 🔬 JOLT domains get comprehensive prompts for benchmarking
    const basePrompts = ['business_analysis', 'technical_assessment'];
    const joltPrompts = ['brand_memory_analysis', 'market_intelligence'];
    return [...basePrompts, ...joltPrompts.slice(0, joltData.additional_prompts || 1)];
  } else {
    // 📊 Regular domains get basic coverage
    return ['business_analysis'];
  }
}

function selectOptimalModel(): string {
  // For backward compatibility - select from ultra-cheap tier
  return ULTRA_CHEAP_MODELS[Math.floor(Math.random() * ULTRA_CHEAP_MODELS.length)];
}

// ============================================================================
// PREMIUM DOMAINS - DYNAMIC JOLT INTEGRATION
// ============================================================================
// JOLT domains are now loaded dynamically from industry-intelligence service

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Dual API key clients (copied from raw-capture-runner architecture)  
const openaiClients = [
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY_2 })
].filter(client => client.apiKey);

const anthropicClients = [
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),  
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY_2 })
].filter(client => client.apiKey);

function getOpenAIClient(): OpenAI {
  return openaiClients[Math.floor(Math.random() * openaiClients.length)];
}

function getAnthropicClient(): Anthropic {
  return anthropicClients[Math.floor(Math.random() * anthropicClients.length)];
}

// Other API clients
const deepseekClient = axios.create({
  baseURL: 'https://api.deepseek.com/v1',
  headers: {
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const togetherClient = axios.create({
  baseURL: 'https://api.together.xyz/v1',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const mistralClient = axios.create({
  baseURL: 'https://api.mistral.ai/v1',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const googleClient = axios.create({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  headers: {
    'Content-Type': 'application/json'
  }
});

const grokClient = axios.create({
  baseURL: 'https://api.x.ai/v1',
  headers: {
    'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Real LLM API call function (ported from raw-capture-runner)
async function callLLM(model: string, prompt: string, domain: string): Promise<{
  response: string;
  tokenUsage: any;
  cost: number;
  latency: number;
}> {
  const startTime = Date.now();
  
  try {
    if (model.includes('gpt')) {
      const selectedOpenAI = getOpenAIClient();
      const completion = await selectedOpenAI.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const latency = Date.now() - startTime;
      const usage = completion.usage || {};
      
      const promptTokens = (usage as any)?.prompt_tokens || 0;
      const completionTokens = (usage as any)?.completion_tokens || 0;
      
      let cost = 0;
      if (model === 'gpt-4o-mini') {
        cost = promptTokens * 0.0000015 + completionTokens * 0.000002;
      } else if (model === 'gpt-3.5-turbo') {
        cost = promptTokens * 0.000001 + completionTokens * 0.000002;
      } else {
        cost = promptTokens * 0.0000015 + completionTokens * 0.000002; // Default fallback
      }
      
      return {
        response: completion.choices[0]?.message?.content || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('claude')) {
      const selectedAnthropic = getAnthropicClient();
      const message = await selectedAnthropic.messages.create({
        model: model,
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const latency = Date.now() - startTime;
      const usage = message.usage || {};
      
      const inputTokens = (usage as any)?.input_tokens || 0;
      const outputTokens = (usage as any)?.output_tokens || 0;
      
      let cost = 0;
      if (model.includes('haiku')) {
        cost = inputTokens * 0.00000025 + outputTokens * 0.00000125; // Claude 3 Haiku champion!
      } else {
        cost = inputTokens * 0.000003 + outputTokens * 0.000015; // Default Claude pricing
      }
      
      return {
        response: message.content[0]?.type === 'text' ? message.content[0].text : 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('deepseek')) {
      const response = await deepseekClient.post('/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const latency = Date.now() - startTime;
      const usage = (response.data as any).usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      
      const cost = promptTokens * 0.000002 + completionTokens * 0.000006; // DeepSeek ultra-cheap
      
      return {
        response: (response.data as any).choices[0]?.message?.content || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('meta-llama') || model.includes('Meta-Llama')) {
      const response = await togetherClient.post('/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const latency = Date.now() - startTime;
      const usage = (response.data as any).usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      
      const cost = promptTokens * 0.0000008 + completionTokens * 0.000001; // Ultra-budget Together AI
      
      return {
        response: (response.data as any).choices[0]?.message?.content || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('mistral')) {
      const response = await mistralClient.post('/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const latency = Date.now() - startTime;
      const usage = (response.data as any).usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      
      const cost = promptTokens * 0.000002 + completionTokens * 0.000006; // Mistral Small pricing
      
      return {
        response: (response.data as any).choices[0]?.message?.content || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('gemini')) {
      const response = await googleClient.post(`/models/${model}:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      });
      
      const latency = Date.now() - startTime;
      const usage = (response.data as any).usageMetadata || {};
      const promptTokens = usage.promptTokenCount || 0;
      const completionTokens = usage.candidatesTokenCount || 0;
      
      const cost = promptTokens * 0.00000025 + completionTokens * 0.000001; // Gemini Flash pricing
      
      return {
        response: (response.data as any).candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else if (model.includes('grok')) {
      const response = await grokClient.post('/chat/completions', {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      });
      
      const latency = Date.now() - startTime;
      const usage = (response.data as any).usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      
      const cost = promptTokens * 0.000005 + completionTokens * 0.000015; // Grok pricing estimate
      
      return {
        response: (response.data as any).choices[0]?.message?.content || 'No response',
        tokenUsage: usage,
        cost: cost,
        latency: latency
      };
      
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
    
  } catch (error) {
    console.error(`❌ LLM API error for ${model}:`, error);
    throw error;
  }
}

// ============================================================================
// 🎯 DOMAIN CURATION SERVICE - DYNAMIC DISCOVERY
// ============================================================================
// Purpose: Replace hardcoded PREMIUM_DOMAINS with intelligent domain discovery
// Strategy: Find competitors, trending domains, crisis-adjacent domains

const DOMAIN_CURATION_URL = process.env.DOMAIN_CURATION_URL || 'http://localhost:3005';

class DomainCurationService {
  private domainCache: string[] = [];
  private lastCacheUpdate: number = 0;
  private cacheValidityMs: number = 3600000; // 1 hour

  async getCuratedDomains(): Promise<string[]> {
    // Check cache first
    if (this.domainCache.length > 0 && Date.now() - this.lastCacheUpdate < this.cacheValidityMs) {
      return this.domainCache;
    }

    try {
      // Try to fetch from domain curation service
      const response = await axios.get(`${DOMAIN_CURATION_URL}/api/curated-domains`);
      const curatedDomains = (response.data as any).domains || [];
      
      if (curatedDomains.length > 0) {
        this.domainCache = curatedDomains;
        this.lastCacheUpdate = Date.now();
        console.log(`✅ Loaded ${curatedDomains.length} curated domains from curation service`);
        return curatedDomains;
      }
    } catch (error) {
      console.warn('⚠️  Domain curation service unavailable, using fallback list');
    }

    // Fallback to strategic seed domains if service unavailable
    const fallbackDomains = [
      // 🏥 BIOTECH/PHARMACEUTICALS - High-value targets
      'moderna.com', 'pfizer.com', 'johnson.com', 'merck.com', 'novartis.com',
      
      // 📱 AI/TECH - Core intelligence targets  
      'openai.com', 'anthropic.com', 'deepmind.com', 'huggingface.co',
      
      // 🏢 MEGACORPS - Benchmark standards
      'microsoft.com', 'google.com', 'amazon.com', 'apple.com',
      
      // 🛡️ DEFENSE/AEROSPACE - Strategic importance
      'lockheedmartin.com', 'boeing.com', 'northropgrumman.com',
      
      // ⚡ ENERGY/CLIMATE - Market disruption
      'tesla.com', 'nextera.com', 'enphase.com'
    ];
    
    this.domainCache = fallbackDomains;
    this.lastCacheUpdate = Date.now();
    console.log(`✅ Using fallback domain list: ${fallbackDomains.length} strategic domains`);
    return fallbackDomains;
  }

  async findCompetitors(domain: string): Promise<string[]> {
    try {
      const response = await axios.get(`${DOMAIN_CURATION_URL}/api/competitors/${domain}`);
      return (response.data as any).competitors || [];
    } catch (error) {
      console.warn(`⚠️  Failed to find competitors for ${domain}`);
      return [];
    }
  }

  clearCache(): void {
    this.domainCache = [];
    this.lastCacheUpdate = 0;
  }
}

const domainCurationService = new DomainCurationService();

// ============================================================================
// 🎯 PHASE 1: COMPETITOR DISCOVERY SERVICE  
// ============================================================================
// Purpose: 3x domain coverage by finding LLM-suggested competitors
// Strategy: Round-robin LLMs, track which models give best suggestions

class CompetitorDiscoveryService {
  private availableModels = [
    'gpt-4o-mini',           // Ultra cheap OpenAI
    'claude-3-haiku-20240307', // Ultra cheap Anthropic  
    'deepseek-chat',         // Ultra cheap specialized
    'grok-beta',              // Grok for business intelligence
  ];

  async discoverCompetitors(sourceDomain: string): Promise<{
    competitors: string[];
    suggestedBy: string;
    cost: number;
  }> {
    // Round-robin model selection for A/B testing
    const model = this.availableModels[Math.floor(Math.random() * this.availableModels.length)];
    
    const prompt = `List exactly 4 direct competitors of ${sourceDomain}. 
Requirements:
- Only include actual domain names (e.g., example.com)
- Focus on similar-sized companies in the same industry
- One domain per line, no explanations
- Only list domains that actually exist`;

    try {
      const result = await callLLM(model, prompt, sourceDomain);
      const competitors = this.parseCompetitorDomains(result.response);
      
      // Store discovery metadata for performance tracking
      await this.recordDiscovery(sourceDomain, competitors, model, result.cost);
      
      return {
        competitors: competitors.slice(0, 4), // Ensure max 4
        suggestedBy: model,
        cost: result.cost
      };
      
    } catch (error) {
      console.error(`❌ Competitor discovery failed for ${sourceDomain} with ${model}:`, error);
      return { competitors: [], suggestedBy: model, cost: 0 };
    }
  }

  private parseCompetitorDomains(response: string): string[] {
    return response
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line.includes('.'))
      .map(line => {
        // Extract domain from various formats
        const match = line.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
        return match ? match[1] : null;
      })
      .filter((domain): domain is string => Boolean(domain))
      .filter(domain => domain.length > 3);
  }

  private async recordDiscovery(sourceDomain: string, competitors: string[], model: string, cost: number): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO competitor_discoveries (
          source_domain, competitors, suggested_by_model, 
          discovery_cost, discovered_at, competitor_count
        ) VALUES ($1, $2, $3, $4, NOW(), $5)
        ON CONFLICT (source_domain, suggested_by_model) 
        DO UPDATE SET 
          competitors = EXCLUDED.competitors,
          discovery_cost = EXCLUDED.discovery_cost,
          discovered_at = EXCLUDED.discovered_at,
          competitor_count = EXCLUDED.competitor_count
      `, [sourceDomain, JSON.stringify(competitors), model, cost, competitors.length]);
    } catch (error) {
      // Table might not exist yet - graceful fallback
      console.log(`📊 Competitor discovery tracking: ${sourceDomain} → ${competitors.length} competitors via ${model}`);
    }
  }

  async expandAllDomains(): Promise<{
    processed: number;
    newCompetitors: number;
    totalCost: number;
    modelPerformance: Record<string, number>;
  }> {
    const existingDomains = await pool.query(`
      SELECT DISTINCT domain FROM domains 
      WHERE status IN ('completed', 'pending')
      ORDER BY created_at DESC
    `);

    let processed = 0;
    let newCompetitors = 0;
    let totalCost = 0;
    const modelPerformance: Record<string, number> = {};

    for (const { domain } of existingDomains.rows) {
      try {
        const discovery = await this.discoverCompetitors(domain);
        processed++;
        totalCost += discovery.cost;
        
        // Track model performance
        modelPerformance[discovery.suggestedBy] = (modelPerformance[discovery.suggestedBy] || 0) + discovery.competitors.length;

        // Add new competitors to processing queue
        for (const competitor of discovery.competitors) {
          try {
            const result = await pool.query(`
              INSERT INTO domains (domain, status, created_at, discovery_source, source_domain) 
              VALUES ($1, 'pending', NOW(), 'competitor_discovery', $2)
              ON CONFLICT (domain) DO NOTHING
              RETURNING id
            `, [competitor, domain]);

            if (result.rows.length > 0) {
              newCompetitors++;
              console.log(`✅ New competitor: ${competitor} (from ${domain} via ${discovery.suggestedBy})`);
            }
          } catch (insertError) {
            // Column might not exist - fallback to basic insert
            try {
              const result = await pool.query(`
                INSERT INTO domains (domain, status, created_at) 
                VALUES ($1, 'pending', NOW())
                ON CONFLICT (domain) DO NOTHING
                RETURNING id
              `, [competitor]);

              if (result.rows.length > 0) {
                newCompetitors++;
                console.log(`✅ New competitor: ${competitor} (from ${domain})`);
              }
            } catch (fallbackError) {
              console.warn(`⚠️  Failed to add competitor: ${competitor}`);
            }
          }
        }

        // Brief pause between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Failed to process ${domain}:`, error);
      }
    }

    return { processed, newCompetitors, totalCost, modelPerformance };
  }
}

// ============================================================================
// 🔥 PHASE 2: JOLT CRISIS DISCOVERY SERVICE
// ============================================================================
// Purpose: Find emerging crisis events for new JOLT benchmarks
// Strategy: Multi-LLM crisis detection with severity scoring

class JOLTDiscoveryService {
  private crisisModels = [
    'gpt-4',                    // Premium for complex analysis
    'claude-3-sonnet-20240229', // Premium reasoning
    'grok-beta',                // X/Twitter integration for real-time
    'claude-3-5-sonnet-20241022' // Latest Claude for current events
  ];

  private crisisQueries = {
    leadership_change: (domain: string) => 
      `Has ${domain} experienced any major CEO changes, founder departures, or executive scandals in the last 18 months? If yes, provide: 1) What happened 2) When 3) Impact severity (low/medium/high/critical). If no major changes, respond with "NO_EVENT".`,
    
    rebranding_activity: (domain: string) =>
      `Is ${domain} planning or has recently completed any major rebrand, name changes, or corporate restructuring in the last 2 years? If yes, provide: 1) What changed 2) When 3) Market reception (low/medium/high/critical). If no rebranding, respond with "NO_EVENT".`,
    
    crisis_events: (domain: string) =>
      `What major scandals, controversies, or business crises has ${domain} faced in the last 2 years? If any, provide: 1) Nature of crisis 2) Timeline 3) Business impact (low/medium/high/critical). If no major crises, respond with "NO_EVENT".`,
    
    acquisition_activity: (domain: string) =>
      `Has ${domain} been acquired, merged, or made major acquisitions in the last 2 years that might affect brand recognition? If yes, provide: 1) Transaction details 2) Date 3) Brand confusion risk (low/medium/high/critical). If no major M&A, respond with "NO_EVENT".`
  };

  async scanForCrisisEvents(domain: string): Promise<{
    events: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      discoveredBy: string;
    }>;
    cost: number;
  }> {
    const events = [];
    let totalCost = 0;

    for (const [queryType, promptGenerator] of Object.entries(this.crisisQueries)) {
      const model = this.crisisModels[Math.floor(Math.random() * this.crisisModels.length)];
      const prompt = promptGenerator(domain);

      try {
        const result = await callLLM(model, prompt, domain);
        totalCost += result.cost;

        const analysis = this.analyzeCrisisResponse(result.response);
        
        if (analysis.hasEvent) {
          events.push({
            type: queryType,
            severity: analysis.severity,
            description: analysis.description,
            discoveredBy: model
          });

          console.log(`🔥 CRISIS DETECTED: ${domain} - ${queryType} (${analysis.severity}) via ${model}`);
        }

        // Brief pause between crisis queries
        await new Promise(resolve => setTimeout(resolve, 800));

      } catch (error) {
        console.error(`❌ Crisis scan failed for ${domain} (${queryType}) with ${model}:`, error);
      }
    }

    return { events, cost: totalCost };
  }

  private analyzeCrisisResponse(response: string): {
    hasEvent: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  } {
    const cleanResponse = response.trim().toUpperCase();
    
    if (cleanResponse.includes('NO_EVENT') || cleanResponse.includes('NO MAJOR') || response.length < 20) {
      return { hasEvent: false, severity: 'low', description: '' };
    }

    // Severity detection based on keywords
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (cleanResponse.includes('CRITICAL') || cleanResponse.includes('COLLAPSE') || cleanResponse.includes('BANKRUPTCY')) {
      severity = 'critical';
    } else if (cleanResponse.includes('HIGH') || cleanResponse.includes('SCANDAL') || cleanResponse.includes('FRAUD')) {
      severity = 'high';
    } else if (cleanResponse.includes('MEDIUM') || cleanResponse.includes('CONTROVERSY') || cleanResponse.includes('DEPARTURE')) {
      severity = 'medium';
    }

    return {
      hasEvent: true,
      severity,
      description: response.substring(0, 500) // Truncate for storage
    };
  }

  async discoverEmergingJOLTEvents(): Promise<{
    scannedDomains: number;
    potentialJOLTEvents: number;
    newJOLTDomains: string[];
    totalCost: number;
    modelPerformance: Record<string, number>;
  }> {
    const domains = await pool.query(`
      SELECT DISTINCT domain FROM domains 
      WHERE status = 'completed'
      ORDER BY last_processed_at DESC
      LIMIT 50
    `);

    let scannedDomains = 0;
    let potentialJOLTEvents = 0;
    const newJOLTDomains: string[] = [];
    let totalCost = 0;
    const modelPerformance: Record<string, number> = {};

    for (const { domain } of domains.rows) {
      try {
        const crisisResult = await this.scanForCrisisEvents(domain);
        scannedDomains++;
        totalCost += crisisResult.cost;

        if (crisisResult.events.length > 0) {
          potentialJOLTEvents += crisisResult.events.length;

          // Check if this should become a JOLT domain
          const hasCriticalEvent = crisisResult.events.some(e => e.severity === 'critical');
          const hasMultipleEvents = crisisResult.events.length >= 2;

          if (hasCriticalEvent || hasMultipleEvents) {
            newJOLTDomains.push(domain);
            
            // Add to JOLT system
            await this.promoteToJOLTDomain(domain, crisisResult.events);
          }

          // Track model performance
          crisisResult.events.forEach(event => {
            modelPerformance[event.discoveredBy] = (modelPerformance[event.discoveredBy] || 0) + 1;
          });

          // Record crisis events
          await this.recordCrisisEvents(domain, crisisResult.events);
        }

        // Pause between domain scans
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Crisis discovery failed for ${domain}:`, error);
      }
    }

    return {
      scannedDomains,
      potentialJOLTEvents,
      newJOLTDomains,
      totalCost,
      modelPerformance
    };
  }

  private async promoteToJOLTDomain(domain: string, events: any[]): Promise<void> {
    const primaryEvent = events.find(e => e.severity === 'critical') || events[0];
    
    try {
      await pool.query(`
        UPDATE domains 
        SET is_jolt = TRUE, 
            jolt_type = $2, 
            jolt_severity = $3,
            jolt_additional_prompts = $4
        WHERE domain = $1
      `, [
        domain, 
        primaryEvent.type,
        primaryEvent.severity,
        primaryEvent.severity === 'critical' ? 4 : primaryEvent.severity === 'high' ? 3 : 2
      ]);
      
      console.log(`🔥 PROMOTED TO JOLT: ${domain} (${primaryEvent.severity} ${primaryEvent.type})`);
    } catch (error) {
      console.log(`🔥 JOLT CANDIDATE: ${domain} - schema not ready for JOLT promotion`);
    }
  }

  private async recordCrisisEvents(domain: string, events: any[]): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO crisis_discoveries (
          domain, events, discovered_at, event_count
        ) VALUES ($1, $2, NOW(), $3)
        ON CONFLICT (domain) 
        DO UPDATE SET 
          events = EXCLUDED.events,
          discovered_at = EXCLUDED.discovered_at,
          event_count = EXCLUDED.event_count
      `, [domain, JSON.stringify(events), events.length]);
    } catch (error) {
      console.log(`📊 Crisis tracking: ${domain} → ${events.length} events`);
    }
  }
}

const competitorDiscoveryService = new CompetitorDiscoveryService();
const joltDiscoveryService = new JOLTDiscoveryService();

class SophisticatedRunner {
  private domains: string[];
  private joltDomainCount: number = 0;
  
  constructor() {
    this.domains = []; // Will be populated by initializeWithCuratedDomains
    this.initializeWithCuratedDomains();
  }

  private async initializeWithCuratedDomains(): Promise<void> {
    try {
      // Load curated domains from domain curation service
      const curatedDomains = await domainCurationService.getCuratedDomains();
      
      // Load JOLT domains from industry-intelligence service
      const joltDomains = await joltService.getJoltDomainList();
      
      // Add JOLT domains to the beginning (priority), then curated domains
      const combinedDomains = [...joltDomains, ...curatedDomains];
      
      // Remove duplicates while preserving order
      this.domains = [...new Set(combinedDomains)];
      this.joltDomainCount = joltDomains.length;
      
      console.log(`✅ Sophisticated Runner initialized with ${this.domains.length} domains`);
      console.log(`🔬 Including ${this.joltDomainCount} JOLT benchmark domains`);
      console.log(`🎯 Including ${curatedDomains.length} curated domains from discovery service`);
    } catch (error) {
      console.warn('⚠️  Failed to load domains from services, using JOLT domains only');
      
      // Fallback to just JOLT domains if everything fails
      try {
        const joltDomains = await joltService.getJoltDomainList();
        this.domains = joltDomains;
        this.joltDomainCount = joltDomains.length;
        console.log(`✅ Sophisticated Runner initialized with ${this.domains.length} JOLT domains only`);
      } catch (joltError) {
        console.error('❌ Failed to load any domains:', joltError);
        this.domains = [];
      }
    }
  }

  // 🔬 JOLT-ENHANCED SEED DOMAINS (Backwards Compatible)
  async seedDomains(): Promise<void> {
    console.log('🌱 Seeding premium domains with jolt metadata...');
    let inserted = 0;
    let skipped = 0;
    let joltInserted = 0;
    
    for (const domain of this.domains) {
      try {
        // Check if this domain has jolt metadata
        const joltData = await joltService.getJoltData(domain);
        const isJoltDomain = joltData.jolt;
        
        if (isJoltDomain) {
          // For jolt domains, try to add to a jolt_metadata table if it exists
          // But fall back gracefully to standard insertion if table doesn't exist
          try {
            // Try advanced insertion with jolt metadata (if schema supports it)
            const result = await pool.query(`
              INSERT INTO domains (domain, status, created_at, jolt, jolt_type, jolt_date, jolt_description, paired_domain, jolt_severity) 
              VALUES ($1, 'pending', NOW(), $2, $3, $4, $5, $6, $7)
              ON CONFLICT (domain) DO UPDATE SET
                jolt = EXCLUDED.jolt,
                jolt_type = EXCLUDED.jolt_type,
                jolt_date = EXCLUDED.jolt_date,
                jolt_description = EXCLUDED.jolt_description,
                paired_domain = EXCLUDED.paired_domain,
                jolt_severity = EXCLUDED.jolt_severity
              RETURNING id
            `, [
              domain, 
              joltData.jolt, 
              joltData.type, 
              joltData.date, 
              joltData.description, 
              joltData.paired_domain, 
              joltData.severity
            ]);
            
            if (result.rows.length > 0) {
              inserted++;
              joltInserted++;
              console.log(`🔬 Jolt domain inserted: ${domain} (${joltData.type})`);
            } else {
              skipped++;
            }
          } catch (joltError) {
            // If jolt columns don't exist, fall back to standard insertion
            console.log(`⚠️  Jolt columns not found, falling back to standard insertion for: ${domain}`);
            
            const result = await pool.query(`
              INSERT INTO domains (domain, status, created_at) 
              VALUES ($1, 'pending', NOW())
              ON CONFLICT (domain) DO NOTHING
              RETURNING id
            `, [domain]);
            
            if (result.rows.length > 0) {
              inserted++;
              console.log(`✅ Standard insertion (jolt fallback): ${domain}`);
            } else {
              skipped++;
            }
          }
        } else {
          // Standard domain insertion (non-jolt)
          const result = await pool.query(`
            INSERT INTO domains (domain, status, created_at) 
            VALUES ($1, 'pending', NOW())
            ON CONFLICT (domain) DO NOTHING
            RETURNING id
          `, [domain]);
          
          if (result.rows.length > 0) {
            inserted++;
          } else {
            skipped++;
          }
        }
      } catch (error) {
        // Skip duplicates or errors
        skipped++;
        console.log(`⚠️  Skipped domain due to error: ${domain}`);
      }
    }
    
    console.log(`✅ Seeded ${inserted} domains (${joltInserted} jolt domains)`);
    console.log(`🔬 Jolt domains provide ground truth benchmarks for brand transition analysis`);
  }

  async processNextBatch(): Promise<void> {
    try {
      // Query pending domains using exact same logic as raw-capture-runner - NO processor_id filtering
      const result = await pool.query(`
        SELECT id, domain FROM domains 
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        console.log('✅ No pending domains available');
        return;
      }

      const { id, domain } = result.rows[0];
      console.log(`🎯 Processing: ${domain} (${SERVICE_ID})`);

      // Mark as processing - same as raw-capture-runner
      await pool.query(
        'UPDATE domains SET status = $1, last_processed_at = NOW() WHERE id = $2',
        ['processing', id]
      );

      // 🔬 Get JOLT data for intelligent processing strategy
      const joltData = await joltService.getJoltData(domain);
      
      // 🎯 Select models and prompts based on JOLT status
      const selectedModels = selectModelsForDomain(joltData);
      const selectedPrompts = selectPromptsForDomain(joltData);
      
      console.log(`📊 ${domain} analysis plan: ${selectedModels.length} models × ${selectedPrompts.length} prompts = ${selectedModels.length * selectedPrompts.length} total API calls`);
      
      if (joltData.jolt) {
        console.log(`🔥 JOLT BENCHMARK: ${domain} - Comprehensive analysis with premium models`);
      } else {
        console.log(`💰 COVERAGE: ${domain} - Basic analysis with ultra-cheap models`);
      }

      // 🚀 Process all model-prompt combinations
      for (const promptType of selectedPrompts) {
        for (const model of selectedModels) {
          try {
            const prompt = COMPREHENSIVE_PROMPTS[promptType as keyof typeof COMPREHENSIVE_PROMPTS](domain);
            
            // Make real LLM API call
            const llmResult = await callLLM(model, prompt, domain);
            
            // Store response using EXACT same schema as raw-capture-runner - NO processor_id
            await pool.query(`
              INSERT INTO responses (
                domain_id, model, prompt_type, interpolated_prompt, 
                raw_response, token_count, prompt_tokens, completion_tokens,
                token_usage, total_cost_usd, latency_ms, captured_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            `, [
              id, model, promptType, prompt, llmResult.response,
              (llmResult.tokenUsage.total_tokens || llmResult.tokenUsage.prompt_tokens + llmResult.tokenUsage.completion_tokens || 0),
              (llmResult.tokenUsage.prompt_tokens || llmResult.tokenUsage.input_tokens || 0),
              (llmResult.tokenUsage.completion_tokens || llmResult.tokenUsage.output_tokens || 0),
              JSON.stringify(llmResult.tokenUsage), llmResult.cost, llmResult.latency
            ]);

            console.log(`✅ ${model} ${promptType} completed for ${domain} ($${llmResult.cost.toFixed(6)})`);
            
            // Brief pause between API calls to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (modelError: any) {
            console.error(`❌ ${model} ${promptType} failed for ${domain}:`, modelError.message);
            
            // Log error but continue with other models
            await pool.query(`
              INSERT INTO processing_logs (domain_id, event_type, details)
              VALUES ($1, $2, $3)
            `, [id, 'model_error', { 
              model, 
              prompt_type: promptType, 
              error: modelError.message,
              domain: domain
            }]);
          }
        }
      }

      // Mark as completed - same as raw-capture-runner
      await pool.query(
        'UPDATE domains SET status = $1, last_processed_at = NOW() WHERE id = $2',
        ['completed', id]
      );

      console.log(`✅ Completed comprehensive processing: ${domain} (${SERVICE_ID})`);
      
    } catch (error) {
      console.error('❌ Processing error:', error);
      
      // Reset failed domains for retry - same as raw-capture-runner
      try {
        await pool.query(
          'UPDATE domains SET status = $1 WHERE status = $2',
          ['pending', 'processing']
        );
      } catch (resetError) {
        console.error('❌ Failed to reset domain status:', resetError);
      }
    }
  }

  async getStatus(): Promise<any> {
    try {
      // Status query without processor_id - all domains visible to both services
      const statusResult = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM domains 
        GROUP BY status
      `);

      // Responses without processor_id filtering  
      const costResult = await pool.query(`
        SELECT 
          COUNT(*) as total_responses,
          SUM(total_cost_usd) as total_cost,
          AVG(total_cost_usd) as avg_cost,
          AVG(latency_ms) as avg_latency,
          COUNT(DISTINCT model) as models_used
        FROM responses 
        WHERE prompt_type = 'business_intelligence'
      `);

      return {
        service: 'sophisticated-runner',
        service_id: SERVICE_ID,
        mode: SERVICE_MODE,
        strategy: 'Real LLM Processing - Cheap + Middle Tier',
        status_breakdown: statusResult.rows,
        performance_metrics: costResult.rows[0] || {},
        model_tiers: {
          ultra_cheap: ULTRA_CHEAP_MODELS,
          middle_tier: MIDDLE_TIER_MODELS,
          expensive_tier: 'Not implemented yet'
        },
        parallel_to: 'raw-capture-runner',
        database_schema: 'Same as raw-capture-runner - no processor_id'
      };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  // 🚀 Main processing loop (FIXED: NO INFINITE MONEY BURNING!)
  public async startProcessing(): Promise<void> {
    console.log('🚀 Starting sophisticated LLM processing loop...');
    
    const processLoop = async (): Promise<void> => {
      try {
        await this.processNextBatch();
        
        // 🔍 Check if more domains remain BEFORE scheduling next iteration
        const pendingCheck = await pool.query(`SELECT COUNT(*) as count FROM domains WHERE status = 'pending'`);
        const pendingCount = parseInt(pendingCheck.rows[0].count);
        
        if (pendingCount > 0) {
          console.log(`🔄 ${pendingCount} domains remaining - continuing processing...`);
          setTimeout(processLoop, 10000); // Continue processing
        } else {
          console.log('🎉 ALL DOMAINS PROCESSED! No more pending domains - STOPPING INFINITE LOOP!');
          console.log('💰 Sophisticated processing complete - no more API costs will be incurred');
          console.log('🏁 Service will remain running for API endpoints, but no more LLM processing');
          // NO MORE setTimeout - STOP THE LOOP!
        }
        
      } catch (error) {
        console.error('❌ Processing loop error:', error);
        
        // Even on error, check if we should continue
        try {
          const pendingCheck = await pool.query(`SELECT COUNT(*) as count FROM domains WHERE status = 'pending'`);
          const pendingCount = parseInt(pendingCheck.rows[0].count);
          
          if (pendingCount > 0) {
            console.log(`🔄 Error occurred but ${pendingCount} domains remain - retrying in 10 seconds...`);
            setTimeout(processLoop, 10000);
          } else {
            console.log('🛑 No pending domains found after error - STOPPING LOOP');
          }
        } catch (checkError) {
          console.error('❌ Failed to check pending domains after error:', checkError);
          console.log('🛑 STOPPING LOOP due to database check failure');
        }
      }
    };
    
    // Start the (now finite) processing loop
    processLoop();
  }
}

// Express API for health checks and monitoring
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.json({
    service: 'sophisticated-runner',
    status: 'running',
    mode: SERVICE_MODE,
    service_id: SERVICE_ID,
    strategy: 'Real LLM Processing - Cost Optimized',
    parallel_to: 'raw-capture-runner',
    message: 'Sophisticated runner with real LLM API calls - no processor_id dependencies',
    database_compatibility: 'Full compatibility with raw-capture-runner schema'
  });
});

app.get('/status', async (req, res) => {
  const runner = new SophisticatedRunner();
  const status = await runner.getStatus();
  res.json(status);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service_id: 'sophisticated_v1_comprehensive',
    database_schema: 'Compatible with raw-capture-runner',
    api_keys_configured: {
      openai: openaiClients.length,
      anthropic: anthropicClients.length,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      together: !!process.env.TOGETHER_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      grok: !!process.env.XAI_API_KEY
    }
  });
});

// 🎯 DOMAIN MANAGEMENT ENDPOINTS
app.post('/add-domains', async (req, res) => {
  try {
    const { domains } = req.body;
    
    if (!Array.isArray(domains)) {
      return res.status(400).json({ error: 'domains must be an array' });
    }

    let inserted = 0;
    for (const domain of domains) {
      try {
        const result = await pool.query(`
          INSERT INTO domains (domain, status, created_at) 
          VALUES ($1, 'pending', NOW())
          ON CONFLICT (domain) DO NOTHING
          RETURNING id
        `, [domain]);
        
        if (result.rows.length > 0) {
          inserted++;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to insert domain: ${domain}`);
      }
    }

    res.json({
      success: true,
      message: `Added ${inserted} new domains for processing`,
      total_submitted: domains.length,
      newly_inserted: inserted
    });
    
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/refresh-domains', async (req, res) => {
  try {
    // Clear domain curation cache to force refresh
    domainCurationService.clearCache();
    
    // Re-initialize with fresh domains
    const runner = new SophisticatedRunner();
    
    res.json({
      success: true,
      message: 'Domain list refreshed from curation service'
    });
    
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================================
// 🎯 PHASE 1 & 2 ENDPOINTS - COMPETITOR & CRISIS DISCOVERY
// ============================================================================

// PHASE 1: Competitor Discovery
app.post('/discover-competitors', async (req, res) => {
  try {
    console.log('🚀 Starting Phase 1: Competitor Discovery...');
    
    const result = await competitorDiscoveryService.expandAllDomains();
    
    res.json({
      success: true,
      phase: 'Phase 1 - Competitor Discovery',
      results: {
        domains_processed: result.processed,
        new_competitors_found: result.newCompetitors,
        coverage_multiplier: `${Math.round((result.newCompetitors / result.processed) * 10) / 10}x`,
        total_cost: `$${result.totalCost.toFixed(4)}`,
        model_performance: result.modelPerformance
      },
      message: `🎉 Phase 1 Complete! Found ${result.newCompetitors} new competitors from ${result.processed} domains`,
      next_step: 'Run /discover-crises for Phase 2 JOLT discovery'
    });
    
  } catch (error) {
    console.error('❌ Phase 1 failed:', error);
    res.status(500).json({ 
      success: false,
      phase: 'Phase 1 - Competitor Discovery',
      error: (error as Error).message 
    });
  }
});

// PHASE 2: Crisis Discovery for JOLT Events
app.post('/discover-crises', async (req, res) => {
  try {
    console.log('🔥 Starting Phase 2: JOLT Crisis Discovery...');
    
    const result = await joltDiscoveryService.discoverEmergingJOLTEvents();
    
    res.json({
      success: true,
      phase: 'Phase 2 - JOLT Crisis Discovery',
      results: {
        domains_scanned: result.scannedDomains,
        crisis_events_found: result.potentialJOLTEvents,
        new_jolt_domains: result.newJOLTDomains,
        jolt_expansion: `${result.newJOLTDomains.length} new JOLT benchmarks`,
        total_cost: `$${result.totalCost.toFixed(4)}`,
        model_performance: result.modelPerformance
      },
      crisis_domains: result.newJOLTDomains,
      message: `🔥 Phase 2 Complete! Discovered ${result.potentialJOLTEvents} crisis events, promoted ${result.newJOLTDomains.length} domains to JOLT status`,
      note: 'New JOLT domains will get premium model analysis automatically'
    });
    
  } catch (error) {
    console.error('❌ Phase 2 failed:', error);
    res.status(500).json({ 
      success: false,
      phase: 'Phase 2 - JOLT Crisis Discovery',
      error: (error as Error).message 
    });
  }
});

// Test single domain competitor discovery
app.get('/test-competitor/:domain', async (req, res) => {
  try {
    const domain = req.params.domain;
    const result = await competitorDiscoveryService.discoverCompetitors(domain);
    
    res.json({
      source_domain: domain,
      competitors: result.competitors,
      suggested_by: result.suggestedBy,
      cost: `$${result.cost.toFixed(6)}`,
      test_mode: true
    });
    
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Test single domain crisis scanning
app.get('/test-crisis/:domain', async (req, res) => {
  try {
    const domain = req.params.domain;
    const result = await joltDiscoveryService.scanForCrisisEvents(domain);
    
    res.json({
      domain: domain,
      crisis_events: result.events,
      total_cost: `$${result.cost.toFixed(6)}`,
      jolt_potential: result.events.length > 0 ? 'HIGH' : 'LOW',
      test_mode: true
    });
    
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Combined Phase 1 + 2 Discovery Pipeline
app.post('/full-discovery-pipeline', async (req, res) => {
  try {
    console.log('🚀 Starting Full Discovery Pipeline (Phase 1 + 2)...');
    
    // Phase 1: Competitor Discovery
    console.log('📈 Phase 1: Expanding domain coverage...');
    const competitorResult = await competitorDiscoveryService.expandAllDomains();
    
    // Brief pause between phases
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Phase 2: Crisis Discovery  
    console.log('🔥 Phase 2: Scanning for JOLT events...');
    const crisisResult = await joltDiscoveryService.discoverEmergingJOLTEvents();
    
    const totalCost = competitorResult.totalCost + crisisResult.totalCost;
    
    res.json({
      success: true,
      pipeline: 'Full Discovery Pipeline (Phase 1 + 2)',
      phase_1_results: {
        new_competitors: competitorResult.newCompetitors,
        coverage_expansion: `${Math.round((competitorResult.newCompetitors / competitorResult.processed) * 10) / 10}x`,
        cost: `$${competitorResult.totalCost.toFixed(4)}`
      },
      phase_2_results: {
        crisis_events: crisisResult.potentialJOLTEvents,
        new_jolt_domains: crisisResult.newJOLTDomains.length,
        cost: `$${crisisResult.totalCost.toFixed(4)}`
      },
      summary: {
        total_cost: `$${totalCost.toFixed(4)}`,
        domain_expansion: `${competitorResult.newCompetitors} new competitors`,
        jolt_expansion: `${crisisResult.newJOLTDomains.length} new JOLT benchmarks`,
        processing_queue: 'Updated with new domains for comprehensive analysis'
      },
      message: `🎉 Full pipeline complete! Expanded coverage by ${competitorResult.newCompetitors} domains and discovered ${crisisResult.potentialJOLTEvents} crisis events`,
      recommendation: 'Your sophisticated-runner will now process the expanded domain list with intelligent JOLT benchmarking'
    });
    
  } catch (error) {
    console.error('❌ Full discovery pipeline failed:', error);
    res.status(500).json({ 
      success: false,
      pipeline: 'Full Discovery Pipeline',
      error: (error as Error).message 
    });
  }
});

// ============================================================================
// 🔧 DATABASE SCHEMA MANAGEMENT - JOLT & DISCOVERY TABLES
// ============================================================================

// JOLT MIGRATION ENDPOINT - Add JOLT metadata support to production database
app.post('/migrate-jolt', async (req, res) => {
  try {
    console.log('🔧 Running JOLT + Discovery metadata migration...');
    
    // Run the migration SQL
    await pool.query(`
      BEGIN;
      
      -- Add JOLT metadata to domains table (all optional, defaults safe)
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS is_jolt BOOLEAN DEFAULT FALSE;
      
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS jolt_type TEXT;
      
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS jolt_severity TEXT 
      CHECK (jolt_severity IS NULL OR jolt_severity IN ('low', 'medium', 'high', 'critical'));
      
      ALTER TABLE domains 
      ADD COLUMN IF NOT EXISTS jolt_additional_prompts INTEGER DEFAULT 0;
      
      -- Add discovery tracking columns  
      ALTER TABLE domains
      ADD COLUMN IF NOT EXISTS discovery_source TEXT;
      
      ALTER TABLE domains
      ADD COLUMN IF NOT EXISTS source_domain TEXT;
      
      -- Add cost tracking to responses table (optional)
      ALTER TABLE responses
      ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,6);
      
      -- Create discovery tracking tables
      CREATE TABLE IF NOT EXISTS competitor_discoveries (
        id SERIAL PRIMARY KEY,
        source_domain TEXT NOT NULL,
        competitors JSONB NOT NULL,
        suggested_by_model TEXT NOT NULL,
        discovery_cost DECIMAL(10,6) NOT NULL,
        discovered_at TIMESTAMP DEFAULT NOW(),
        competitor_count INTEGER NOT NULL,
        UNIQUE(source_domain, suggested_by_model)
      );
      
      CREATE TABLE IF NOT EXISTS crisis_discoveries (
        id SERIAL PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        events JSONB NOT NULL,
        discovered_at TIMESTAMP DEFAULT NOW(),
        event_count INTEGER NOT NULL
      );
      
      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_domains_jolt ON domains(is_jolt) WHERE is_jolt = TRUE;
      CREATE INDEX IF NOT EXISTS idx_domains_discovery ON domains(discovery_source);
      CREATE INDEX IF NOT EXISTS idx_competitor_discoveries_domain ON competitor_discoveries(source_domain);
      CREATE INDEX IF NOT EXISTS idx_crisis_discoveries_domain ON crisis_discoveries(domain);
      
      COMMIT;
    `);
    
    // Insert key JOLT domains using our embedded JOLT system
    const joltDomains = Object.entries(LOCAL_JOLT_FALLBACK).map(([domain, data]) => ({
      domain,
      type: data.type,
      severity: data.severity,
      prompts: data.additional_prompts,
      description: data.description
    }));
    
    let joltSeeded = 0;
    for (const jolt of joltDomains) {
      try {
        const result = await pool.query(`
          INSERT INTO domains (domain, is_jolt, jolt_type, jolt_severity, jolt_additional_prompts)
          VALUES ($1, TRUE, $2, $3, $4)
          ON CONFLICT (domain) DO UPDATE SET
            is_jolt = TRUE,
            jolt_type = EXCLUDED.jolt_type,
            jolt_severity = EXCLUDED.jolt_severity,
            jolt_additional_prompts = EXCLUDED.jolt_additional_prompts
          RETURNING (xmax = 0) AS inserted
        `, [jolt.domain, jolt.type, jolt.severity, jolt.prompts]);
        
        if (result.rows[0].inserted) joltSeeded++;
      } catch (insertError) {
        console.warn(`⚠️  Failed to seed JOLT domain: ${jolt.domain}`);
      }
    }
    
    res.json({
      success: true,
      message: '🎉 JOLT + Discovery metadata migration complete!',
      changes: [
        'Added JOLT columns to domains table',
        'Added discovery tracking columns to domains table',
        'Added cost tracking to responses table',
        'Created competitor_discoveries table',
        'Created crisis_discoveries table',
        'Created performance indexes'
      ],
      jolt_domains_seeded: joltSeeded,
      total_jolt_domains: joltDomains.length,
      note: 'All changes are optional - existing data unchanged',
      ready_for: 'Phase 1 & 2 Discovery Services'
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Discovery Performance Analytics
app.get('/discovery/performance', async (req, res) => {
  try {
    // Get competitor discovery performance
    const competitorPerf = await pool.query(`
      SELECT 
        suggested_by_model,
        COUNT(*) as discovery_count,
        SUM(competitor_count) as total_competitors,
        AVG(competitor_count) as avg_competitors_per_discovery,
        SUM(discovery_cost) as total_cost,
        AVG(discovery_cost) as avg_cost_per_discovery
      FROM competitor_discoveries 
      GROUP BY suggested_by_model
      ORDER BY total_competitors DESC
    `);

    // Get crisis discovery performance  
    const crisisPerf = await pool.query(`
      SELECT 
        COUNT(*) as domains_scanned,
        SUM(event_count) as total_events,
        AVG(event_count) as avg_events_per_domain
      FROM crisis_discoveries
    `);

    res.json({
      competitor_discovery: {
        by_model: competitorPerf.rows,
        summary: competitorPerf.rows.length > 0 ? {
          best_model: competitorPerf.rows[0]?.suggested_by_model,
          total_discoveries: competitorPerf.rows.reduce((sum, row) => sum + parseInt(row.discovery_count), 0),
          total_competitors_found: competitorPerf.rows.reduce((sum, row) => sum + parseInt(row.total_competitors), 0)
        } : null
      },
      crisis_discovery: {
        summary: crisisPerf.rows[0] || {},
        performance_note: 'Crisis discovery tracks emerging JOLT events for benchmark expansion'
      },
      message: 'Discovery performance analytics - track which LLMs perform best'
    });

  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Main execution
async function main() {
  try {
    console.log('🔍 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected');

    const runner = new SophisticatedRunner();
    await runner.seedDomains();

    // Start real LLM processing loop
    await runner.startProcessing();

    app.listen(port, () => {
      console.log(`🌐 Sophisticated Runner running on port ${port}`);
      console.log('🎯 Ready to prove equivalence!');
    });

  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 