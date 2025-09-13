#!/usr/bin/env node

/**
 * 🎯 COHORT INTELLIGENCE SERVICE
 * =============================
 * 
 * Purpose: AI-powered category discovery and competitor intelligence
 * Architecture: Modular, testable, extends existing sophisticated-runner
 * 
 * Key Features:
 * 1. Category Discovery: Identify business categories for each domain
 * 2. Competitor Discovery: Find relevant competitors per category
 * 3. Cohort Generation: Create competitive cohorts for rankings
 * 4. Premium Strategy: Hide top 4 positions, show 5-10+
 * 
 * Integration: Works with existing sophisticated-runner and database
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection (same as sophisticated-runner)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// ============================================================================
// 🎯 CATEGORY DISCOVERY ENGINE
// ============================================================================

interface CategoryDiscovery {
  domain: string;
  categories: {
    name: string;
    confidence: number;
    keywords: string[];
    competitors: string[];
  }[];
}

class CategoryDiscoveryEngine {
  
  async discoverCategories(domain: string): Promise<CategoryDiscovery> {
    console.log(`🔍 Discovering categories for: ${domain}`);
    
    try {
      const prompt = `Analyze "${domain}" and identify business categories it competes in. Return JSON:
{
  "categories": [
    {
      "name": "Cloud Infrastructure",
      "confidence": 0.95,
      "keywords": ["cloud", "infrastructure"],
      "competitors": ["aws.amazon.com", "cloud.google.com"]
    }
  ]
}`;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a business intelligence analyst.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const analysis = JSON.parse(response.data.choices[0].message.content);
      await this.storeCategoriesInDatabase(domain, analysis.categories);
      
      return {
        domain,
        categories: analysis.categories
      };
      
    } catch (error) {
      console.error(`❌ Category discovery failed for ${domain}:`, error);
      return {
        domain,
        categories: []
      };
    }
  }
  
  private async storeCategoriesInDatabase(domain: string, categories: Array<{name: string, confidence: number, keywords: string[]}>) {
    for (const category of categories) {
      try {
        await pool.query(`
          INSERT INTO domain_categories (domain, category_name, confidence_score, keywords)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (domain, category_name) 
          DO UPDATE SET 
            confidence_score = EXCLUDED.confidence_score,
            keywords = EXCLUDED.keywords,
            discovered_at = NOW()
        `, [
          domain,
          category.name,
          category.confidence,
          JSON.stringify(category.keywords)
        ]);
        
        console.log(`✅ Stored category: ${category.name} for ${domain}`);
      } catch (error) {
        console.error(`❌ Failed to store category ${category.name}:`, error);
      }
    }
  }
}

// ============================================================================
// 🏆 COMPETITOR DISCOVERY ENGINE
// ============================================================================

class CompetitorDiscoveryEngine {
  
  async discoverCompetitors(domain: string, category: string): Promise<string[]> {
    console.log(`🔍 Discovering competitors for ${domain} in ${category}`);
    
    try {
      const prompt = `Find the top 10 direct competitors for "${domain}" specifically in the "${category}" category.

Return only domain names (e.g., "competitor.com") as a JSON array:
["competitor1.com", "competitor2.com", "competitor3.com"]

Focus on:
1. Direct competitors in the ${category} space
2. Similar company size and market position
3. Companies that compete for the same customers
4. Well-known, established players

Exclude:
- The original domain itself
- Generic domains
- Non-competitive domains`;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a competitive intelligence analyst. Return only valid domain names in JSON array format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const competitors = JSON.parse(response.data.choices[0].message.content);
      
      // Store competitor relationships
      await this.storeCompetitorsInDatabase(domain, category, competitors);
      
      return competitors;
      
    } catch (error) {
      console.error(`❌ Competitor discovery failed for ${domain} in ${category}:`, error);
      return [];
    }
  }
  
  private async storeCompetitorsInDatabase(domain: string, category: string, competitors: string[]) {
    for (const competitor of competitors) {
      try {
        await pool.query(`
          INSERT INTO category_competitors (domain, category_name, competitor_domain, relevance_score, source)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (domain, category_name, competitor_domain)
          DO UPDATE SET 
            relevance_score = EXCLUDED.relevance_score,
            discovered_at = NOW()
        `, [
          domain,
          category,
          competitor,
          0.8, // Default relevance score
          'llm'
        ]);
        
        console.log(`✅ Stored competitor: ${competitor} for ${domain} in ${category}`);
      } catch (error) {
        console.error(`❌ Failed to store competitor ${competitor}:`, error);
      }
    }
  }
}

// ============================================================================
// 🎯 COHORT RANKING ENGINE
// ============================================================================

class CohortRankingEngine {
  
  async generateCohortRankings(category: string): Promise<any> {
    console.log(`🏆 Generating cohort rankings for: ${category}`);
    
    try {
      const result = await pool.query(`
        SELECT DISTINCT dc.domain, pdc.memory_score
        FROM domain_categories dc
        JOIN public_domain_cache pdc ON dc.domain = pdc.domain
        WHERE dc.category_name = $1
        AND pdc.memory_score IS NOT NULL
        ORDER BY pdc.memory_score DESC
      `, [category]);
      
      const rankings = result.rows.map((row: any, index: number) => ({
        position: index + 1,
        domain: row.domain,
        score: parseFloat(row.memory_score),
        trend: 'stable',
        premium_required: index < 4 // Hide top 4 positions
      }));
      
      await this.storeRankingsInDatabase(category, rankings);
      
      return {
        category,
        updated_at: new Date().toISOString(),
        rankings: rankings.map((r: any) => ({
          ...r,
          hidden: r.premium_required
        }))
      };
      
    } catch (error) {
      console.error(`❌ Cohort ranking failed for ${category}:`, error);
      return { category, rankings: [] };
    }
  }
  
  private async storeRankingsInDatabase(category: string, rankings: Array<{position: number, domain: string, score: number, trend: string, premium_required: boolean}>) {
    const today = new Date().toISOString().split('T')[0];
    
    for (const ranking of rankings) {
      try {
        await pool.query(`
          INSERT INTO cohort_rankings (category_name, domain, position, score, trend, ranking_date, premium_required)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (category_name, domain, ranking_date)
          DO UPDATE SET 
            position = EXCLUDED.position,
            score = EXCLUDED.score,
            trend = EXCLUDED.trend,
            premium_required = EXCLUDED.premium_required
        `, [
          category,
          ranking.domain,
          ranking.position,
          ranking.score,
          ranking.trend,
          today,
          ranking.premium_required
        ]);
      } catch (error) {
        console.error(`❌ Failed to store ranking for ${ranking.domain}:`, error);
      }
    }
  }
}

// ============================================================================
// 🚀 API ENDPOINTS
// ============================================================================

const categoryEngine = new CategoryDiscoveryEngine();
const competitorEngine = new CompetitorDiscoveryEngine();
const rankingEngine = new CohortRankingEngine();

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'cohort-intelligence-service',
    status: 'healthy',
    version: '1.0.0',
    features: [
      'Category Discovery',
      'Competitor Intelligence', 
      'Cohort Rankings',
      'Premium Strategy'
    ]
  });
});

// Discover categories for a domain
app.post('/api/discover-categories', async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    const result = await categoryEngine.discoverCategories(domain);
    res.json(result);
    
  } catch (error) {
    console.error('Category discovery error:', error);
    res.status(500).json({ error: 'Category discovery failed' });
  }
});

// Discover competitors for domain in category
app.post('/api/discover-competitors', async (req: Request, res: Response) => {
  try {
    const { domain, category } = req.body;
    
    if (!domain || !category) {
      return res.status(400).json({ error: 'Domain and category are required' });
    }
    
    const competitors = await competitorEngine.discoverCompetitors(domain, category);
    res.json({ domain, category, competitors });
    
  } catch (error) {
    console.error('Competitor discovery error:', error);
    res.status(500).json({ error: 'Competitor discovery failed' });
  }
});

// Get cohort rankings for category
app.get('/api/cohort-rankings/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const rankings = await rankingEngine.generateCohortRankings(category);
    res.json(rankings);
    
  } catch (error) {
    console.error('Cohort ranking error:', error);
    res.status(500).json({ error: 'Cohort ranking failed' });
  }
});

// Get all categories for a domain
app.get('/api/domain/:domain/categories', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    
    const result = await pool.query(`
      SELECT dc.category_name, dc.confidence_score, cr.position, cr.score
      FROM domain_categories dc
      LEFT JOIN cohort_rankings cr ON dc.domain = cr.domain AND dc.category_name = cr.category_name
      WHERE dc.domain = $1
      ORDER BY dc.confidence_score DESC
    `, [domain]);
    
    res.json({
      domain,
      categories: result.rows.map((row: any) => ({
        name: row.category_name,
        confidence: row.confidence_score,
        position: row.position,
        score: row.score
      }))
    });
    
  } catch (error) {
    console.error('Domain categories error:', error);
    res.status(500).json({ error: 'Failed to get domain categories' });
  }
});

// ============================================================================
// 🗄️ DATABASE INITIALIZATION
// ============================================================================

async function initializeDatabase() {
  try {
    console.log('🗄️ Initializing cohort intelligence database schema...');
    
    // Create domain_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS domain_categories (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        category_name VARCHAR(255) NOT NULL,
        confidence_score FLOAT NOT NULL,
        keywords JSONB,
        discovered_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(domain, category_name)
      )
    `);
    
    // Create category_competitors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS category_competitors (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) NOT NULL,
        category_name VARCHAR(255) NOT NULL,
        competitor_domain VARCHAR(255) NOT NULL,
        relevance_score FLOAT NOT NULL,
        source VARCHAR(50) NOT NULL,
        discovered_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(domain, category_name, competitor_domain)
      )
    `);
    
    // Create cohort_rankings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cohort_rankings (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        position INTEGER NOT NULL,
        score FLOAT NOT NULL,
        trend VARCHAR(10) DEFAULT 'stable',
        ranking_date DATE NOT NULL,
        premium_required BOOLEAN DEFAULT FALSE,
        UNIQUE(category_name, domain, ranking_date)
      )
    `);
    
    console.log('✅ Database schema initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// ============================================================================
// 🚀 SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🎯 Cohort Intelligence Service running on port ${PORT}`);
      console.log(`🔍 Category Discovery: Ready`);
      console.log(`🏆 Competitor Intelligence: Ready`);
      console.log(`📊 Cohort Rankings: Ready`);
      console.log(`💎 Premium Strategy: Active`);
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer(); 