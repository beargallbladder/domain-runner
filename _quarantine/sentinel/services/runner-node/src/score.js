#!/usr/bin/env node
/**
 * Calculate MemoryScore and ConsensusScore from crawl results
 */
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import readline from 'readline';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('in', {
    describe: 'Input crawl.jsonl file',
    type: 'string',
    required: true
  })
  .option('out', {
    describe: 'Output score.json file',
    type: 'string',
    required: true
  })
  .option('algorithm', {
    describe: 'Scoring algorithm',
    type: 'string',
    default: 'weighted_average',
    choices: ['weighted_average', 'median', 'harmonic_mean']
  })
  .help()
  .argv;

class Scorer {
  constructor() {
    this.brandData = new Map();
    this.modelScores = new Map();
  }
  
  async loadCrawlData(crawlFile) {
    const fileStream = createReadStream(crawlFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);
        
        if (entry.status === 'success' && entry.response) {
          // Store response by brand and model
          const key = `${entry.brand}|${entry.model}`;
          
          if (!this.brandData.has(entry.brand)) {
            this.brandData.set(entry.brand, {
              name: entry.brand,
              domain: entry.domain,
              responses: []
            });
          }
          
          this.brandData.get(entry.brand).responses.push({
            model: entry.model,
            provider: entry.provider,
            response: entry.response,
            response_time_ms: entry.response_time_ms
          });
        }
      } catch (error) {
        // Skip malformed lines
      }
    }
    
    console.log(`Loaded data for ${this.brandData.size} brands`);
  }
  
  calculateMemoryScore(responses) {
    // Memory score based on response quality indicators
    const scores = responses.map(r => {
      let score = 0;
      const response = r.response.toLowerCase();
      
      // Length indicator (longer responses suggest more knowledge)
      const wordCount = response.split(/\s+/).length;
      if (wordCount > 200) score += 0.3;
      else if (wordCount > 100) score += 0.2;
      else if (wordCount > 50) score += 0.1;
      
      // Specificity indicators
      if (response.includes('founded in')) score += 0.1;
      if (response.includes('headquarter')) score += 0.1;
      if (response.includes('product') || response.includes('service')) score += 0.1;
      if (response.includes('ceo') || response.includes('founder')) score += 0.1;
      if (response.includes('revenue') || response.includes('employee')) score += 0.1;
      
      // Confidence indicators (absence of uncertainty)
      if (!response.includes("i don't know")) score += 0.1;
      if (!response.includes('not sure')) score += 0.1;
      
      return Math.min(score, 1.0);
    });
    
    // Return average score
    return scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;
  }
  
  calculateConsensusScore(responses) {
    if (responses.length < 2) return 0;
    
    // Extract key facts from each response
    const factSets = responses.map(r => this.extractFacts(r.response));
    
    // Calculate overlap between fact sets
    const allFacts = new Set();
    factSets.forEach(facts => facts.forEach(f => allFacts.add(f)));
    
    if (allFacts.size === 0) return 0;
    
    // Count how many models mention each fact
    const factCounts = new Map();
    allFacts.forEach(fact => {
      let count = 0;
      factSets.forEach(facts => {
        if (facts.has(fact)) count++;
      });
      factCounts.set(fact, count);
    });
    
    // Consensus score is ratio of commonly mentioned facts
    const commonFacts = Array.from(factCounts.values()).filter(c => c > 1).length;
    return commonFacts / allFacts.size;
  }
  
  extractFacts(response) {
    const facts = new Set();
    const text = response.toLowerCase();
    
    // Extract years
    const years = text.match(/\b(19|20)\d{2}\b/g);
    if (years) years.forEach(y => facts.add(`year:${y}`));
    
    // Extract locations
    const locations = text.match(/\b(headquartered?|based|located) in ([^,.]+)/gi);
    if (locations) locations.forEach(l => facts.add(`location:${l.trim()}`));
    
    // Extract product/service mentions
    const products = text.match(/\b(products?|services?|offers?|provides?) ([^,.]+)/gi);
    if (products) products.forEach(p => facts.add(`product:${p.trim()}`));
    
    // Extract industry/sector
    const industries = text.match(/\b(industry|sector|business|company) ([^,.]+)/gi);
    if (industries) industries.forEach(i => facts.add(`industry:${i.trim()}`));
    
    return facts;
  }
  
  calculateVolatility(responses) {
    // Measure how much responses vary across models
    const scores = responses.map(r => this.calculateMemoryScore([r]));
    
    if (scores.length < 2) return 0;
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    return Math.sqrt(variance);
  }
  
  async generateScores() {
    const scores = {
      generated_at: new Date().toISOString(),
      algorithm: argv.algorithm,
      brands: [],
      summary: {
        total_brands: 0,
        avg_memory_score: 0,
        avg_consensus_score: 0,
        avg_volatility: 0
      }
    };
    
    for (const [brand, data] of this.brandData) {
      const brandScore = {
        name: brand,
        domain: data.domain,
        memory_score: this.calculateMemoryScore(data.responses),
        consensus_score: this.calculateConsensusScore(data.responses),
        volatility: this.calculateVolatility(data.responses),
        model_count: data.responses.length,
        avg_response_time_ms: data.responses.reduce((sum, r) => sum + r.response_time_ms, 0) / data.responses.length
      };
      
      scores.brands.push(brandScore);
    }
    
    // Calculate summary
    scores.summary.total_brands = scores.brands.length;
    
    if (scores.brands.length > 0) {
      scores.summary.avg_memory_score = scores.brands.reduce((sum, b) => sum + b.memory_score, 0) / scores.brands.length;
      scores.summary.avg_consensus_score = scores.brands.reduce((sum, b) => sum + b.consensus_score, 0) / scores.brands.length;
      scores.summary.avg_volatility = scores.brands.reduce((sum, b) => sum + b.volatility, 0) / scores.brands.length;
    }
    
    // Sort by memory score
    scores.brands.sort((a, b) => b.memory_score - a.memory_score);
    
    return scores;
  }
  
  async run() {
    try {
      // Load crawl data
      await this.loadCrawlData(argv.in);
      
      // Calculate scores
      const scores = await this.generateScores();
      
      // Write output
      await fs.mkdir(path.dirname(argv.out), { recursive: true });
      await fs.writeFile(argv.out, JSON.stringify(scores, null, 2));
      
      console.log('\n📊 Scoring Complete:');
      console.log(`   - Brands scored: ${scores.summary.total_brands}`);
      console.log(`   - Avg Memory Score: ${scores.summary.avg_memory_score.toFixed(3)}`);
      console.log(`   - Avg Consensus Score: ${scores.summary.avg_consensus_score.toFixed(3)}`);
      console.log(`   - Avg Volatility: ${scores.summary.avg_volatility.toFixed(3)}`);
      console.log(`   - Output: ${argv.out}`);
      
    } catch (error) {
      console.error('❌ Scoring error:', error.message);
      process.exit(1);
    }
  }
}

// Run scorer
const scorer = new Scorer();
scorer.run();