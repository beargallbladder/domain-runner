#!/usr/bin/env node
/**
 * Execute crawl based on plan, querying LLMs for brand information
 */
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import pLimit from 'p-limit';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const argv = yargs(hideBin(process.argv))
  .option('plan', {
    describe: 'Path to plan.json',
    type: 'string',
    required: true
  })
  .option('out', {
    describe: 'Output JSONL file',
    type: 'string',
    required: true
  })
  .option('checkpoint', {
    describe: 'Checkpoint file for resume',
    type: 'string'
  })
  .option('resume-on-failure', {
    describe: 'Resume from checkpoint on failure',
    type: 'boolean',
    default: false
  })
  .option('parallel', {
    describe: 'Number of parallel workers',
    type: 'number',
    default: 4
  })
  .help()
  .argv;

// Initialize API clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

class Crawler {
  constructor(options) {
    this.plan = null;
    this.outputStream = null;
    this.checkpoint = new Map();
    this.limit = pLimit(options.parallel);
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0
    };
    this.rateLimits = {
      openai: { calls: 0, resetTime: Date.now() + 60000, maxPerMinute: 60 },
      anthropic: { calls: 0, resetTime: Date.now() + 60000, maxPerMinute: 50 }
    };
    this.globalTimeout = options.timeout || 600000; // 10 minutes default
    this.startTime = Date.now();
  }
  
  async loadPlan(planFile) {
    const content = await fs.readFile(planFile, 'utf-8');
    this.plan = JSON.parse(content);
  }
  
  async loadCheckpoint(checkpointFile) {
    try {
      const content = await fs.readFile(checkpointFile, 'utf-8');
      const data = JSON.parse(content);
      this.checkpoint = new Map(data.completed || []);
      console.log(`Loaded checkpoint with ${this.checkpoint.size} completed queries`);
    } catch (error) {
      // Checkpoint doesn't exist, start fresh
    }
  }
  
  async saveCheckpoint(checkpointFile) {
    const data = {
      timestamp: new Date().toISOString(),
      completed: Array.from(this.checkpoint.entries()),
      stats: this.stats
    };
    await fs.writeFile(checkpointFile, JSON.stringify(data, null, 2));
  }
  
  async checkRateLimit(provider) {
    const limit = this.rateLimits[provider];
    if (!limit) return true;
    
    // Reset counter if minute has passed
    if (Date.now() > limit.resetTime) {
      limit.calls = 0;
      limit.resetTime = Date.now() + 60000;
    }
    
    // Check if we're at limit
    if (limit.calls >= limit.maxPerMinute) {
      // Wait until reset
      const waitTime = limit.resetTime - Date.now();
      if (waitTime > 0) {
        console.log(`Rate limit reached for ${provider}, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        limit.calls = 0;
        limit.resetTime = Date.now() + 60000;
      }
    }
    
    limit.calls++;
    return true;
  }
  
  async retryWithBackoff(fn, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const baseDelay = Math.pow(2, attempt) * 1000;
          const jitter = Math.random() * 1000;
          const delay = baseDelay + jitter;
          
          console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
  
  async queryOpenAI(query) {
    const startTime = Date.now();
    
    // Check global timeout
    if (Date.now() - this.startTime > this.globalTimeout) {
      return {
        status: 'error',
        error: 'Global timeout exceeded',
        error_type: 'timeout',
        response_time_ms: Date.now() - startTime
      };
    }
    
    // Rate limiting
    await this.checkRateLimit('openai');
    
    try {
      const response = await this.retryWithBackoff(async () => {
        return await openai.chat.completions.create({
          model: query.model,
          messages: [
            { role: 'user', content: query.prompt }
          ],
          max_tokens: query.max_tokens,
          temperature: query.temperature,
          timeout: 30000 // 30 second timeout per request
        });
      });
      
      return {
        status: 'success',
        response: response.choices[0].message.content,
        usage: response.usage,
        response_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        error_type: this.classifyError(error),
        response_time_ms: Date.now() - startTime
      };
    }
  }
  
  async queryAnthropic(query) {
    const startTime = Date.now();
    
    // Check global timeout
    if (Date.now() - this.startTime > this.globalTimeout) {
      return {
        status: 'error',
        error: 'Global timeout exceeded',
        error_type: 'timeout',
        response_time_ms: Date.now() - startTime
      };
    }
    
    // Rate limiting
    await this.checkRateLimit('anthropic');
    
    try {
      const response = await this.retryWithBackoff(async () => {
        return await anthropic.messages.create({
          model: query.model,
          messages: [
            { role: 'user', content: query.prompt }
          ],
          max_tokens: query.max_tokens,
          temperature: query.temperature
        });
      });
      
      return {
        status: 'success',
        response: response.content[0].text,
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens
        },
        response_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        error_type: this.classifyError(error),
        response_time_ms: Date.now() - startTime
      };
    }
  }
  
  classifyError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('rate') || error.status === 429) return 'rate_limit';
    if (error.status === 401 || error.status === 403) return 'auth';
    if (message.includes('parse') || message.includes('json')) return 'parse';
    if (message.includes('network') || message.includes('connection')) return 'network';
    
    return 'unknown';
  }
  
  async executeQuery(query) {
    const queryId = `${query.brand}-${query.model}-${query.batch_id}`;
    
    // Skip if already completed
    if (this.checkpoint.has(queryId)) {
      this.stats.skipped++;
      return null;
    }
    
    let result;
    
    // Route to appropriate API
    if (query.provider === 'openai') {
      result = await this.queryOpenAI(query);
    } else if (query.provider === 'anthropic') {
      result = await this.queryAnthropic(query);
    } else {
      result = {
        status: 'error',
        error: `Unknown provider: ${query.provider}`,
        error_type: 'unknown'
      };
    }
    
    // Create output record
    const record = {
      timestamp: new Date().toISOString(),
      query_id: queryId,
      brand: query.brand,
      domain: query.domain,
      model: query.model,
      provider: query.provider,
      prompt: query.prompt,
      ...result
    };
    
    // Write to output
    this.outputStream.write(JSON.stringify(record) + '\n');
    
    // Update checkpoint
    this.checkpoint.set(queryId, true);
    
    // Update stats
    this.stats.total++;
    if (result.status === 'success') {
      this.stats.success++;
    } else {
      this.stats.failed++;
    }
    
    return record;
  }
  
  async run() {
    try {
      // Setup output
      await fs.mkdir(path.dirname(argv.out), { recursive: true });
      this.outputStream = createWriteStream(argv.out, { flags: 'a' });
      
      // Load plan and checkpoint
      await this.loadPlan(argv.plan);
      
      if (argv.checkpoint) {
        await this.loadCheckpoint(argv.checkpoint);
      }
      
      console.log(`Starting crawl with ${this.plan.total_queries} queries...`);
      
      // Process batches
      for (const batch of this.plan.execution_batches) {
        console.log(`Processing batch ${batch.batch_id} (${batch.queries.length} queries)...`);
        
        // Execute queries in parallel with limit
        const promises = batch.queries.map(query => 
          this.limit(() => this.executeQuery(query))
        );
        
        await Promise.all(promises);
        
        // Save checkpoint after each batch
        if (argv.checkpoint) {
          await this.saveCheckpoint(argv.checkpoint);
        }
        
        // Progress update
        console.log(`  ✓ Batch ${batch.batch_id} complete - Success: ${this.stats.success}, Failed: ${this.stats.failed}`);
      }
      
      // Final stats
      console.log('\n📊 Crawl Complete:');
      console.log(`   - Total: ${this.stats.total}`);
      console.log(`   - Success: ${this.stats.success} (${(this.stats.success/this.stats.total*100).toFixed(1)}%)`);
      console.log(`   - Failed: ${this.stats.failed} (${(this.stats.failed/this.stats.total*100).toFixed(1)}%)`);
      console.log(`   - Skipped: ${this.stats.skipped}`);
      
      // Close output stream
      this.outputStream.end();
      
    } catch (error) {
      console.error('❌ Crawl error:', error.message);
      process.exit(1);
    }
  }
}

// Run crawler
const crawler = new Crawler({
  parallel: argv.parallel
});

crawler.run();