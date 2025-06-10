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

// 🔥 LOCAL JOLT FALLBACK - Key Crisis Domains for Immediate Testing
const LOCAL_JOLT_FALLBACK = {
  'tesla.com': {
    jolt: true,
    type: 'leadership_crisis',
    severity: 'critical',
    additional_prompts: 3,
    description: 'Ongoing CEO volatility and brand reputation challenges'
  },
  'apple.com': {
    jolt: true,
    type: 'leadership_change',
    severity: 'critical',
    additional_prompts: 4,
    description: 'Steve Jobs death transition crisis - major brand vulnerability period'
  },
  'meta.com': {
    jolt: true,
    type: 'brand_transition',
    severity: 'high',
    additional_prompts: 2,
    description: 'Facebook to Meta rebrand - massive corporate identity shift'
  },
  'facebook.com': {
    jolt: true,
    type: 'brand_transition',
    severity: 'high',
    additional_prompts: 2,
    description: 'Facebook to Meta rebrand - legacy domain analysis'
  },
  'twitter.com': {
    jolt: true,
    type: 'brand_transition',
    severity: 'critical',
    additional_prompts: 3,
    description: 'Twitter to X rebrand - complete brand destruction case'
  }
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

    try {
      const response = await axios.get(`${INDUSTRY_INTELLIGENCE_URL}/jolt/check/${domain}`, {
        timeout: 5000
      });

      if (response.data && typeof response.data === 'object' && 'success' in response.data && response.data.success) {
        const responseData = response.data as any;
        const joltData: JoltData = {
          jolt: responseData.data.is_jolt,
          additional_prompts: responseData.data.additional_prompts,
          ...responseData.data.metadata
        };
        
        this.joltCache.set(domain, joltData);
        this.lastCacheUpdate = Date.now();
        
        if (joltData.jolt) {
          console.log(`⚡ JOLT detected for ${domain}: ${joltData.additional_prompts} additional prompts (${joltData.severity} severity)`);
        }
        
        return joltData;
      }
    } catch (error) {
      console.warn(`⚠️  Industry-intelligence unavailable for ${domain}, checking local fallback...`);
    }

    // 🔥 LOCAL FALLBACK: Check if domain is in local JOLT dataset
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
      console.log(`🔥 LOCAL JOLT FALLBACK: ${domain} - ${joltData.additional_prompts} additional prompts (${joltData.severity} severity)`);
      
      return joltData;
    }

    // Final fallback: not a JOLT domain
    const fallbackData: JoltData = { jolt: false, additional_prompts: 0 };
    this.joltCache.set(domain, fallbackData);
    return fallbackData;
  }

  async getJoltDomainList(): Promise<string[]> {
    try {
      const response = await axios.get(`${INDUSTRY_INTELLIGENCE_URL}/jolt/domains`, {
        timeout: 5000
      });

      if (response.data && typeof response.data === 'object' && 'success' in response.data && response.data.success) {
        const responseData = response.data as any;
        return responseData.data.domains;
      }
    } catch (error) {
      console.warn('⚠️  Industry-intelligence unavailable, using local JOLT fallback domains');
    }

    // 🔥 Return local JOLT fallback domains when service is unavailable
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

// 100+ Premium Domains for Business Intelligence Analysis 
const PREMIUM_DOMAINS = [
  // 🏥 BIOTECH/PHARMACEUTICALS ($4T+ market cap) - MAJOR GAP!
  'moderna.com', 'pfizer.com', 'johnson.com', 'merck.com', 'novartis.com', 
  'gsk.com', 'sanofi.com', 'abbvie.com', 'amgen.com', 'gilead.com',
  'biogen.com', 'regeneron.com', 'vertex.com', 'ginkgobioworks.com', 'benchling.com',
  
  // 🛡️ AEROSPACE/DEFENSE ($800B+ market cap) - COMPLETELY MISSING!
  'lockheedmartin.com', 'boeing.com', 'northropgrumman.com', 'raytheon.com', 
  'generaldynamics.com', 'airbus.com', 'rolls-royce.com', 'safran-group.com',
  'embraer.com', 'bombardier.com', 'prattwhitney.com', 'aerovironment.com',
  
  // ⚡ ENERGY/CLIMATE TECH ($2T+ market cap) - MAJOR GAP!
  'exxonmobil.com', 'chevron.com', 'shell.com', 'bp.com', 'totalenergies.com',
  'conocophillips.com', 'nextera.com', 'enphase.com', 'solaredge.com', 'firstsolar.com',
  'vestas.com', 'orsted.com', 'ge.com', 'siemens-energy.com', 'climeworks.com',
  
  // 📱 SEMICONDUCTORS/HARDWARE (Expand $500B sector) - MISSING KEY PLAYERS!
  'tsmc.com', 'asml.com', 'applied-materials.com', 'lam-research.com', 'kla.com',
  'synopsys.com', 'cadence.com', 'ansys.com', 'keysight.com', 'teradyne.com',
  'groq.com', 'graphcore.ai', 'cerebras.ai', 'sambanova.ai', 'd-wave.com',
  
  // 📞 TELECOM/COMMUNICATIONS ($1.5T+ missing)
  'verizon.com', 'att.com', 't-mobile.com', 'comcast.com', 'charter.com',
  'ericsson.com', 'nokia.com', 'cisco.com', 'juniper.net', 'arista.com',
  
  // 🌾 FOOD/AGRICULTURE ($1T+ missing)
  'cargill.com', 'adm.com', 'bunge.com', 'tyson.com', 'nestle.com',
  'unilever.com', 'pepsico.com', 'mondelez.com', 'kellogg.com', 'generalmills.com',
  'indigo.ag', 'plenty.ag', 'aerofarms.com', 'boweryfarming.com', 'appharvest.com',
  
  // 🏭 MANUFACTURING/INDUSTRIAL ($2T+ missing)
  '3m.com', 'honeywell.com', 'emerson.com', 'rockwellautomation.com', 'eaton.com',
  'parker.com', 'danaher.com', 'illinois-tool.com', 'stanley-black-decker.com', 'dover.com',
  
  // 🌍 INTERNATIONAL GIANTS (Fix US bias)
  'tencent.com', 'xiaomi.com', 'byd.com', 'meituan.com', 'bytedance.com',
  'kuaishou.com', 'bilibili.com', 'netease.com', 'sina.com', 'sohu.com',
  
  // ✈️ TRAVEL/HOSPITALITY ($800B missing)
  'marriott.com', 'hilton.com', 'ihg.com', 'hyatt.com', 'accor.com',
  'carnival.com', 'royal-caribbean.com', 'norwegian.com', 'delta.com', 'united.com',
  'american.com', 'southwest.com', 'jetblue.com', 'alaska.com',
  
  // 🛍️ RETAIL/CONSUMER (Beyond e-commerce platforms)
  'costco.com', 'homedepot.com', 'lowes.com', 'macys.com', 'nordstrom.com',
  'tjx.com', 'ross.com', 'gap.com', 'under-armour.com', 'lululemon.com',
  'patagonia.com', 'rei.com', 'dicks.com', 'footlocker.com'
];

class SophisticatedRunner {
  private domains: string[];
  private joltDomainCount: number = 0;
  
  constructor() {
    this.domains = PREMIUM_DOMAINS;
    this.initializeWithJoltDomains();
  }

  private async initializeWithJoltDomains(): Promise<void> {
    try {
      // Load JOLT domains from industry-intelligence service
      const joltDomains = await joltService.getJoltDomainList();
      
      // Add JOLT domains to the beginning (priority)
      const combinedDomains = [...joltDomains, ...this.domains];
      
      // Remove duplicates while preserving order
      this.domains = [...new Set(combinedDomains)];
      this.joltDomainCount = joltDomains.length;
      
      console.log(`✅ Sophisticated Runner initialized with ${this.domains.length} domains`);
      console.log(`🔬 Including ${this.joltDomainCount} JOLT benchmark domains`);
    } catch (error) {
      console.warn('⚠️  Failed to load JOLT domains, using standard domains only');
      console.log(`✅ Sophisticated Runner initialized with ${this.domains.length} domains`);
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
    service_id: SERVICE_ID,
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

// 🔬 JOLT ANALYSIS ENDPOINTS
app.get('/jolt', async (req, res) => {
  try {
    // Get JOLT domains from industry-intelligence service
    const joltDomains = await joltService.getJoltDomainList();
    
    // Try to get jolt data from database if schema supports it
    let databaseJoltData = [];
    try {
      const result = await pool.query(`
        SELECT domain, jolt, jolt_type, jolt_date, jolt_description, paired_domain, jolt_severity
        FROM domains 
        WHERE jolt = true
      `);
      databaseJoltData = result.rows;
    } catch (error) {
      // Schema doesn't support jolt columns yet
      databaseJoltData = [];
    }
    
    res.json({
      jolt_feature: 'Ground Truth Benchmarking for Brand Transitions',
      total_jolt_domains: joltDomains.length,
      jolt_domains: joltDomains,
      database_jolt_data: databaseJoltData,
      schema_support: databaseJoltData.length > 0 ? 'full' : 'fallback',
      analysis_capabilities: {
        brand_transition_tracking: 'Monitor AI memory decay during corporate rebrands',
        comparative_analysis: 'Compare before/after domains for transition effectiveness',
        benchmark_metrics: 'Ground truth data for academic research',
        predictive_modeling: 'Training data for brand transition success prediction'
      }
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/jolt/transitions', async (req, res) => {
  try {
    // Get transition data from industry-intelligence service
    const joltDomains = await joltService.getJoltDomainList();
    const transitions = [];
    
    // Get detailed data for each JOLT domain
    for (const domain of joltDomains) {
      try {
        const joltData = await joltService.getJoltData(domain);
        if (joltData.type === 'brand_transition' && joltData.paired_domain) {
          transitions.push({
            old_brand: domain,
            new_brand: joltData.paired_domain,
            transition_date: joltData.date,
            description: joltData.description,
            severity: joltData.severity
          });
        }
      } catch (error) {
        // Skip this domain if we can't get its data
        continue;
      }
    }
    
    res.json({
      total_transitions: transitions.length,
      transitions: transitions,
      analysis_note: 'These represent confirmed major brand transitions for ground truth benchmarking'
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 🔧 DATABASE SCHEMA MIGRATION HELPER
app.post('/migrate/jolt-schema', async (req, res) => {
  try {
    console.log('🔧 Attempting to add jolt columns to domains table...');
    
    // Try to add jolt columns (will fail gracefully if they already exist)
    const migrations = [
      'ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt BOOLEAN DEFAULT FALSE',
      'ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_type VARCHAR(50)',
      'ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_date DATE',
      'ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_description TEXT',
      'ALTER TABLE domains ADD COLUMN IF NOT EXISTS paired_domain VARCHAR(255)',
      'ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_severity VARCHAR(20)'
    ];
    
    const results = [];
    for (const migration of migrations) {
      try {
        await pool.query(migration);
        results.push({ sql: migration, status: 'success' });
      } catch (error) {
        results.push({ sql: migration, status: 'failed', error: (error as Error).message });
      }
    }
    
    console.log('✅ Jolt schema migration completed');
    
    res.json({
      message: 'Jolt schema migration completed',
      results: results,
      next_step: 'Re-run seedDomains to populate jolt metadata'
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