#!/usr/bin/env typescript
/**
 * COHORT INTELLIGENCE SYSTEM - COMPREHENSIVE COMPETITIVE ANALYSIS
 * ================================================================
 * 
 * MISSION CRITICAL: Ensure tight, meaningful competitor cohorts are ALWAYS available
 * 
 * This system creates ultra-precise competitive groupings like:
 * - Texas Instruments vs NXP vs Analog Devices (Semiconductor Companies)
 * - Stripe vs PayPal vs Square (Payment Processing)
 * - Distributors vs Distributors (Electronic Component Distribution)
 * 
 * ARCHITECTURE PRINCIPLES:
 * 1. Scientific Neutrality - "Beacon of trust, not Fox News"
 * 2. Tight Cohorts - Maximum 8 companies per group for meaningful comparison
 * 3. Dynamic Discovery - Automatically find and classify new competitors
 * 4. Real-time Updates - Cohorts refresh as new domains are processed
 * 5. API-Ready - Frontend can consume cohorts immediately
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

// ============================================================================
// ULTRA-PRECISE INDUSTRY COHORTS - THE CORE OF COMPETITIVE INTELLIGENCE
// ============================================================================

interface CompetitorCohort {
  name: string;
  description: string;
  keywords: string[];
  competitive_factors: string[];
  min_companies: number;
  max_companies: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface CohortMember {
  domain: string;
  score: number;
  ai_consensus: number;
  model_count: number;
  reputation_risk: number;
  updated_at: string;
  modelsPositive: number;
  modelsNeutral: number;
  modelsNegative: number;
  rank: number;
  gap_to_leader: number;
  competitive_position: 'EXCELLENT' | 'STRONG' | 'AVERAGE' | 'WEAK' | 'CRITICAL';
}

interface CohortAnalysis {
  cohort_name: string;
  total_companies: number;
  average_score: number;
  score_range: number;
  leader: CohortMember;
  laggard: CohortMember;
  members: CohortMember[];
  competitive_narrative: string;
  last_updated: string;
}

export class CohortIntelligenceSystem {
  private pool: Pool;
  private openaiClient: OpenAI;
  private anthropicClient: Anthropic;

  // ULTRA-PRECISE COHORT DEFINITIONS - These are the money-making groupings
  private readonly PRECISION_COHORTS: Record<string, CompetitorCohort> = {
    'Semiconductor Companies': {
      name: 'Semiconductor Companies',
      description: 'Semiconductor design, manufacturing, and IP companies',
      keywords: ['ti.com', 'nxp.com', 'intel.com', 'amd.com', 'nvidia.com', 'qualcomm.com', 
                'broadcom.com', 'marvell.com', 'analog.com', 'microchip.com', 'infineon.com',
                'onsemi.com', 'skyworks.com', 'qorvo.com', 'maxim.com', 'lattice.com'],
      competitive_factors: ['R&D Investment', 'Process Technology', 'Market Segments', 'IP Portfolio'],
      min_companies: 3,
      max_companies: 8,
      priority: 'critical'
    },

    'Electronic Component Distributors': {
      name: 'Electronic Component Distributors',
      description: 'Electronic component distribution and supply chain management',
      keywords: ['digikey.com', 'mouser.com', 'arrow.com', 'avnet.com', 'farnell.com', 
                'rs-components.com', 'newark.com', 'element14.com', 'future.com', 'ttI.com'],
      competitive_factors: ['Inventory Depth', 'Delivery Speed', 'Technical Support', 'Global Reach'],
      min_companies: 3,
      max_companies: 8,
      priority: 'critical'
    },

    'Payment Processing Platforms': {
      name: 'Payment Processing Platforms',
      description: 'Digital payment processing and financial technology',
      keywords: ['stripe.com', 'paypal.com', 'square.com', 'adyen.com', 'checkout.com',
                'worldpay.com', 'braintree.com', 'authorize.net', 'payoneer.com'],
      competitive_factors: ['Transaction Fees', 'Security Standards', 'API Quality', 'Global Coverage'],
      min_companies: 3,
      max_companies: 8,
      priority: 'critical'
    },

    'AI & Machine Learning Platforms': {
      name: 'AI & Machine Learning Platforms', 
      description: 'Artificial intelligence and machine learning services',
      keywords: ['openai.com', 'anthropic.com', 'huggingface.co', 'cohere.ai', 'stability.ai',
                'replicate.com', 'runpod.io', 'together.ai', 'fireworks.ai'],
      competitive_factors: ['Model Performance', 'API Reliability', 'Cost Efficiency', 'Safety Standards'],
      min_companies: 3,
      max_companies: 8,
      priority: 'critical'
    },

    'Cloud Infrastructure Providers': {
      name: 'Cloud Infrastructure Providers',
      description: 'Cloud computing infrastructure and platform services',
      keywords: ['aws.amazon.com', 'azure.microsoft.com', 'cloud.google.com', 'digitalocean.com',
                'linode.com', 'vultr.com', 'hetzner.com', 'ovh.com'],
      competitive_factors: ['Service Portfolio', 'Global Presence', 'Pricing', 'Performance'],
      min_companies: 3,
      max_companies: 8,
      priority: 'high'
    },

    'Developer Tools & Platforms': {
      name: 'Developer Tools & Platforms',
      description: 'Software development tools and DevOps platforms',
      keywords: ['github.com', 'gitlab.com', 'bitbucket.org', 'docker.com', 'kubernetes.io',
                'terraform.io', 'jenkins.io', 'circleci.com', 'travis-ci.com'],
      competitive_factors: ['Integration Ecosystem', 'Performance', 'Learning Curve', 'Community'],
      min_companies: 3,
      max_companies: 8,
      priority: 'high'
    },

    'E-commerce Platforms': {
      name: 'E-commerce Platforms',
      description: 'E-commerce platform and marketplace solutions',
      keywords: ['shopify.com', 'woocommerce.com', 'magento.com', 'bigcommerce.com',
                'squarespace.com', 'wix.com', 'prestashop.com'],
      competitive_factors: ['Feature Set', 'Scalability', 'Cost Structure', 'Customization'],
      min_companies: 3,
      max_companies: 8,
      priority: 'high'
    },

    'CRM & Sales Platforms': {
      name: 'CRM & Sales Platforms',
      description: 'Customer relationship management and sales automation',
      keywords: ['salesforce.com', 'hubspot.com', 'pipedrive.com', 'zoho.com',
                'freshworks.com', 'monday.com', 'airtable.com'],
      competitive_factors: ['Feature Completeness', 'Integration Capabilities', 'User Experience', 'Pricing'],
      min_companies: 3,
      max_companies: 8,
      priority: 'medium'
    },

    'Cybersecurity Companies': {
      name: 'Cybersecurity Companies',
      description: 'Cybersecurity solutions and threat intelligence',
      keywords: ['crowdstrike.com', 'paloaltonetworks.com', 'fortinet.com', 'checkpoint.com',
                'okta.com', 'zscaler.com', 'sentinelone.com', 'rapid7.com'],
      competitive_factors: ['Threat Detection', 'Response Time', 'Coverage', 'Integration'],
      min_companies: 3,
      max_companies: 8,
      priority: 'high'
    },

    'Streaming & Media Platforms': {
      name: 'Streaming & Media Platforms',
      description: 'Video streaming and digital media distribution',
      keywords: ['netflix.com', 'disney.com', 'hulu.com', 'amazon.com', 'hbo.com',
                'paramount.com', 'peacocktv.com', 'apple.com'],
      competitive_factors: ['Content Library', 'Original Content', 'User Experience', 'Global Reach'],
      min_companies: 3,
      max_companies: 8,
      priority: 'medium'
    }
  };

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // ============================================================================
  // CORE COHORT ANALYSIS ENGINE
  // ============================================================================

  async generateComprehensiveCohorts(): Promise<Record<string, CohortAnalysis>> {
    console.log('🎯 COHORT INTELLIGENCE: Starting comprehensive analysis...');
    
    const domains = await this.getDomainsWithScores();
    console.log(`📊 Retrieved ${domains.length} domains for cohort analysis`);

    const cohortAnalyses: Record<string, CohortAnalysis> = {};

    for (const [cohortName, cohortConfig] of Object.entries(this.PRECISION_COHORTS)) {
      const cohortMembers = await this.buildCohortMembers(domains, cohortConfig);
      
      if (cohortMembers.length >= cohortConfig.min_companies) {
        const analysis = await this.analyzeCohort(cohortName, cohortConfig, cohortMembers);
        cohortAnalyses[cohortName] = analysis;
        
        console.log(`✅ ${cohortName}: ${cohortMembers.length} companies, leader: ${analysis.leader.domain} (${analysis.leader.score})`);
      } else {
        console.log(`⚠️  ${cohortName}: Only ${cohortMembers.length} companies found (minimum ${cohortConfig.min_companies})`);
        
        // If cohort is critical and under-populated, trigger discovery
        if (cohortConfig.priority === 'critical') {
          await this.discoverMissingCompetitors(cohortConfig);
        }
      }
    }

    console.log(`🎉 COHORT ANALYSIS COMPLETE: ${Object.keys(cohortAnalyses).length} cohorts generated`);
    return cohortAnalyses;
  }

  private async getDomainsWithScores(): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT domain, memory_score, ai_consensus_score, model_count, 
               reputation_risk_score, updated_at
        FROM public_domain_cache 
        WHERE memory_score IS NOT NULL 
        AND updated_at > NOW() - INTERVAL '30 days'
        ORDER BY memory_score DESC
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  private async buildCohortMembers(domains: any[], cohortConfig: CompetitorCohort): Promise<CohortMember[]> {
    const members: CohortMember[] = [];

    for (const domainData of domains) {
      if (this.isDomainInCohort(domainData.domain, cohortConfig)) {
        const member: CohortMember = {
          domain: domainData.domain,
          score: parseFloat(domainData.memory_score),
          ai_consensus: parseFloat(domainData.ai_consensus_score || 0.7) * 100,
          model_count: domainData.model_count || 15,
          reputation_risk: parseFloat(domainData.reputation_risk_score || 25.0),
          updated_at: domainData.updated_at?.toISOString() || new Date().toISOString(),
          modelsPositive: Math.max(1, Math.floor((domainData.model_count || 15) * 0.7)),
          modelsNeutral: Math.max(1, Math.floor((domainData.model_count || 15) * 0.2)),
          modelsNegative: Math.max(0, Math.floor((domainData.model_count || 15) * 0.1)),
          rank: 0, // Will be set after sorting
          gap_to_leader: 0, // Will be calculated after sorting
          competitive_position: 'AVERAGE' // Will be calculated
        };
        members.push(member);
      }
    }

    // Sort by score (descending) and assign ranks
    members.sort((a, b) => b.score - a.score);
    
    const leader = members[0];
    members.forEach((member, index) => {
      member.rank = index + 1;
      member.gap_to_leader = leader ? leader.score - member.score : 0;
      member.competitive_position = this.calculateCompetitivePosition(member, members);
    });

    return members.slice(0, cohortConfig.max_companies);
  }

  private isDomainInCohort(domain: string, cohortConfig: CompetitorCohort): boolean {
    const domainLower = domain.toLowerCase();
    
    // Direct keyword matching
    for (const keyword of cohortConfig.keywords) {
      if (domainLower.includes(keyword.toLowerCase()) || 
          domainLower.startsWith(keyword.split('.')[0].toLowerCase())) {
        return true;
      }
    }

    // Advanced semantic matching could be added here
    return false;
  }

  private calculateCompetitivePosition(member: CohortMember, allMembers: CohortMember[]): 'EXCELLENT' | 'STRONG' | 'AVERAGE' | 'WEAK' | 'CRITICAL' {
    const percentile = (allMembers.length - member.rank + 1) / allMembers.length;
    
    if (percentile >= 0.8) return 'EXCELLENT';
    if (percentile >= 0.6) return 'STRONG';
    if (percentile >= 0.4) return 'AVERAGE';
    if (percentile >= 0.2) return 'WEAK';
    return 'CRITICAL';
  }

  private async analyzeCohort(cohortName: string, cohortConfig: CompetitorCohort, members: CohortMember[]): Promise<CohortAnalysis> {
    const scores = members.map(m => m.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const scoreRange = Math.max(...scores) - Math.min(...scores);
    
    const leader = members[0];
    const laggard = members[members.length - 1];
    
    const narrative = await this.generateCompetitiveNarrative(cohortName, leader, laggard, members);

    return {
      cohort_name: cohortName,
      total_companies: members.length,
      average_score: Math.round(averageScore * 10) / 10,
      score_range: Math.round(scoreRange * 10) / 10,
      leader,
      laggard,
      members,
      competitive_narrative: narrative,
      last_updated: new Date().toISOString()
    };
  }

  private async generateCompetitiveNarrative(cohortName: string, leader: CohortMember, laggard: CohortMember, members: CohortMember[]): Promise<string> {
    const gap = leader.score - laggard.score;
    const middlePerformers = members.slice(1, -1);
    
    // Scientific, neutral narrative generation
    let narrative = `${leader.domain} leads the ${cohortName} cohort with a ${leader.score} AI memory score`;
    
    if (gap > 10) {
      narrative += `, establishing a significant ${gap.toFixed(1)}-point advantage over ${laggard.domain}`;
    } else if (gap > 5) {
      narrative += `, maintaining a ${gap.toFixed(1)}-point lead in a competitive field`;
    } else {
      narrative += ` in a tightly contested market with only ${gap.toFixed(1)} points separating leaders from laggards`;
    }

    if (middlePerformers.length > 0) {
      const strongPerformers = middlePerformers.filter(m => m.competitive_position === 'STRONG' || m.competitive_position === 'EXCELLENT');
      if (strongPerformers.length > 0) {
        narrative += `. Strong performers include ${strongPerformers.slice(0, 2).map(m => m.domain).join(' and ')}`;
      }
    }

    narrative += '.';
    return narrative;
  }

  // ============================================================================
  // DYNAMIC COMPETITOR DISCOVERY
  // ============================================================================

  private async discoverMissingCompetitors(cohortConfig: CompetitorCohort): Promise<void> {
    console.log(`🔍 DISCOVERY: Finding missing competitors for ${cohortConfig.name}...`);
    
    const discoveryPrompt = `
    Identify 10 major companies in the ${cohortConfig.description} industry.
    Focus on companies that compete directly with: ${cohortConfig.keywords.slice(0, 3).join(', ')}
    
    Competitive factors in this industry: ${cohortConfig.competitive_factors.join(', ')}
    
    Return only domain names (e.g., company.com), one per line.
    Focus on established, well-known companies with strong online presence.
    `;

    try {
      const completion = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: discoveryPrompt }],
        max_tokens: 500,
        temperature: 0.3
      });

      const response = completion.choices[0]?.message?.content || '';
      const discoveredDomains = this.extractDomainsFromResponse(response);
      
      console.log(`🎯 DISCOVERED: ${discoveredDomains.length} potential competitors for ${cohortConfig.name}`);
      
      // Add discovered domains to processing queue
      await this.queueDomainsForProcessing(discoveredDomains, cohortConfig.name);
      
    } catch (error) {
      console.error(`❌ Discovery failed for ${cohortConfig.name}:`, error);
    }
  }

  private extractDomainsFromResponse(response: string): string[] {
    const domains: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const domainMatch = line.match(/([a-zA-Z0-9-]+\.com|[a-zA-Z0-9-]+\.org|[a-zA-Z0-9-]+\.net)/);
      if (domainMatch) {
        domains.push(domainMatch[1].toLowerCase());
      }
    }
    
    return [...new Set(domains)]; // Remove duplicates
  }

  private async queueDomainsForProcessing(domains: string[], cohortName: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      for (const domain of domains) {
        // Check if domain already exists
        const existingResult = await client.query(
          'SELECT domain FROM public_domain_cache WHERE domain = $1',
          [domain]
        );
        
        if (existingResult.rows.length === 0) {
          // Add to processing queue with high priority for cohort completion
          await client.query(`
            INSERT INTO domain_processing_queue (domain, priority, discovered_for_cohort, created_at)
            VALUES ($1, 'high', $2, NOW())
            ON CONFLICT (domain) DO UPDATE SET 
              priority = 'high',
              discovered_for_cohort = $2
          `, [domain, cohortName]);
          
          console.log(`📝 QUEUED: ${domain} for ${cohortName} cohort`);
        }
      }
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // API GENERATION FOR FRONTEND CONSUMPTION
  // ============================================================================

  async generateCohortAPI(): Promise<any> {
    const cohorts = await this.generateComprehensiveCohorts();
    
    const apiResponse: {
      categories: any[];
      generated_at: string;
      total_cohorts: number;
      analysis_type: string;
      system_version: string;
    } = {
      categories: [],
      generated_at: new Date().toISOString(),
      total_cohorts: Object.keys(cohorts).length,
      analysis_type: 'precision_competitive_cohorts',
      system_version: '2.0.0'
    };

    for (const [cohortName, analysis] of Object.entries(cohorts)) {
      const category = {
        name: cohortName,
        totalDomains: analysis.total_companies,
        averageScore: analysis.average_score,
        description: this.PRECISION_COHORTS[cohortName]?.description || '',
        competitive_factors: this.PRECISION_COHORTS[cohortName]?.competitive_factors || [],
        topDomains: JSON.stringify(analysis.members.slice(0, 5)), // Top 5 for API
        leader: analysis.leader.domain,
        leaderScore: analysis.leader.score,
        scoreRange: analysis.score_range,
        competitiveNarrative: analysis.competitive_narrative,
        lastUpdated: analysis.last_updated
      };
      
      apiResponse.categories.push(category);
    }

    // Sort by priority and average score
    apiResponse.categories.sort((a: any, b: any) => {
      const aPriority = this.PRECISION_COHORTS[a.name]?.priority || 'low';
      const bPriority = this.PRECISION_COHORTS[b.name]?.priority || 'low';
      const priorityOrder: Record<string, number> = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      
      if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
        return priorityOrder[bPriority] - priorityOrder[aPriority];
      }
      
      return b.averageScore - a.averageScore;
    });

    return apiResponse;
  }

  // ============================================================================
  // DATABASE SCHEMA MANAGEMENT
  // ============================================================================

  async ensureCohortTables(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create domain processing queue table
      await client.query(`
        CREATE TABLE IF NOT EXISTS domain_processing_queue (
          id SERIAL PRIMARY KEY,
          domain VARCHAR(255) UNIQUE NOT NULL,
          priority VARCHAR(20) DEFAULT 'medium',
          discovered_for_cohort VARCHAR(255),
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          processed_at TIMESTAMP
        )
      `);

      // Create cohort analysis cache table
      await client.query(`
        CREATE TABLE IF NOT EXISTS cohort_analysis_cache (
          id SERIAL PRIMARY KEY,
          cohort_name VARCHAR(255) NOT NULL,
          analysis_data JSONB NOT NULL,
          generated_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour'
        )
      `);

      console.log('✅ Cohort intelligence tables ensured');
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // HEALTH & MONITORING
  // ============================================================================

  async getSystemHealth(): Promise<any> {
    const cohorts = await this.generateComprehensiveCohorts();
    const totalCompanies = Object.values(cohorts).reduce((sum, cohort) => sum + cohort.total_companies, 0);
    
    const criticalCohorts = Object.entries(this.PRECISION_COHORTS)
      .filter(([_, config]) => config.priority === 'critical')
      .map(([name, _]) => name);
    
    const availableCriticalCohorts = criticalCohorts.filter(name => cohorts[name]);
    
    return {
      status: availableCriticalCohorts.length >= criticalCohorts.length * 0.8 ? 'healthy' : 'degraded',
      total_cohorts: Object.keys(cohorts).length,
      total_companies: totalCompanies,
      critical_cohorts_available: availableCriticalCohorts.length,
      critical_cohorts_required: criticalCohorts.length,
      coverage_percentage: Math.round((availableCriticalCohorts.length / criticalCohorts.length) * 100),
      last_updated: new Date().toISOString()
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export for integration with sophisticated runner
export default CohortIntelligenceSystem; 