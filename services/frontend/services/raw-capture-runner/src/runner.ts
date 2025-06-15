import * as dotenv from 'dotenv';
import { saveDomain, saveResponse, getDomains, cleanup } from './db';
import { getOpenAIResponse } from './services/openai';
import { TRIAD_001_PROMPTS } from './prompts';
import http from 'http';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 10000;
const DELAY_BETWEEN_CALLS = 1000; // 1 second delay between API calls

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function processDomain(domain: string) {
  try {
    console.log(`Processing domain: ${domain}`);
    
    // Save domain and get its ID
    const domainId = await saveDomain(domain);
    console.log(`✅ Domain saved: ${domain} (ID: ${domainId})`);
    
    // Process each prompt
    for (const prompt of TRIAD_001_PROMPTS) {
      try {
        // Get response from OpenAI
        const llmResponse = await getOpenAIResponse(domain, prompt);
        
        // Save the response
        await saveResponse({
          domain_id: domainId,
          model_name: 'gpt-3.5-turbo',
          prompt_type: prompt.id,
          raw_response: llmResponse.raw_response,
          token_count: llmResponse.token_count
        });
        
        console.log(`✅ Response saved for ${domain} - ${prompt.id}`);
        
        // Rate limiting delay
        await sleep(DELAY_BETWEEN_CALLS);
      } catch (error) {
        console.error(`❌ Error processing prompt ${prompt.id} for ${domain}:`, error);
        // Continue with next prompt even if one fails
      }
    }
    
  } catch (error) {
    console.error(`❌ Error processing domain ${domain}:`, error);
  }
}

async function main() {
  try {
    console.log('Fetching domains from database...');
    const domains = await getDomains();
    console.log(`Found ${domains.length} domains to process`);
    
    for (const domain of domains) {
      await processDomain(domain.domain);
      console.log(`Completed processing: ${domain.domain}\n`);
    }
  } catch (error) {
    console.error('❌ Error in main:', error);
  } finally {
    await cleanup();
    console.log('Database connection closed.');
  }
}

// Create HTTP server to keep the service running
const server = http.createServer((req, res) => {
  const status = {
    service: 'Raw Capture Runner',
    status: 'running',
    timestamp: new Date().toISOString()
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(status, null, 2));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Starting domain processing...\n');
  main().catch(console.error);
}); 