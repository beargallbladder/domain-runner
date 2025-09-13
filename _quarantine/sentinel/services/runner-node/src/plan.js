#!/usr/bin/env node
/**
 * Plan the crawl execution based on targets and models
 */
import fs from 'fs/promises';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('spec', {
    describe: 'Path to spec file',
    type: 'string',
    required: true
  })
  .option('targets', {
    describe: 'Path to targets.json',
    type: 'string',
    required: true
  })
  .option('models', {
    describe: 'Path to models.json',
    type: 'string',
    required: true
  })
  .option('out', {
    describe: 'Output plan file',
    type: 'string',
    required: true
  })
  .help()
  .argv;

async function loadJSON(filepath) {
  const content = await fs.readFile(filepath, 'utf-8');
  return JSON.parse(content);
}

async function createPlan() {
  try {
    // Load inputs
    const targets = await loadJSON(argv.targets);
    const models = await loadJSON(argv.models);
    
    // Create execution plan
    const plan = {
      created_at: new Date().toISOString(),
      spec_file: argv.spec,
      total_brands: targets.brands.length,
      total_models: models.models.length,
      total_queries: targets.brands.length * models.models.length * (targets.prompt_templates?.length || 1),
      execution_batches: [],
      parameters: {
        timeout_ms: 30000,
        retry_count: 2,
        batch_size: 10,
        parallel_workers: 4
      }
    };
    
    // Create batches for execution
    let batchId = 0;
    let currentBatch = [];
    
    for (const brand of targets.brands) {
      for (const model of models.models) {
        for (const template of (targets.prompt_templates || ["What do you know about {brand}?"])) {
          const query = {
            batch_id: batchId,
            brand: brand.name,
            domain: brand.domain,
            model: model.model,
            provider: model.provider,
            endpoint: model.endpoint,
            prompt: template.replace('{brand}', brand.name),
            max_tokens: model.max_tokens || 500,
            temperature: model.temperature || 0.7
          };
          
          currentBatch.push(query);
          
          // Create new batch when size limit reached
          if (currentBatch.length >= plan.parameters.batch_size) {
            plan.execution_batches.push({
              batch_id: batchId++,
              queries: [...currentBatch]
            });
            currentBatch = [];
          }
        }
      }
    }
    
    // Add remaining queries
    if (currentBatch.length > 0) {
      plan.execution_batches.push({
        batch_id: batchId,
        queries: currentBatch
      });
    }
    
    // Write plan
    await fs.mkdir(path.dirname(argv.out), { recursive: true });
    await fs.writeFile(argv.out, JSON.stringify(plan, null, 2));
    
    console.log(`✅ Created execution plan:`);
    console.log(`   - Brands: ${plan.total_brands}`);
    console.log(`   - Models: ${plan.total_models}`);
    console.log(`   - Total queries: ${plan.total_queries}`);
    console.log(`   - Batches: ${plan.execution_batches.length}`);
    console.log(`   - Output: ${argv.out}`);
    
  } catch (error) {
    console.error('❌ Error creating plan:', error.message);
    process.exit(1);
  }
}

createPlan();