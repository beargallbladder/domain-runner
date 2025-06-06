import * as dotenv from 'dotenv';
import { saveDomain, saveResponse, getDomains, cleanup } from './db';
import http from 'http';

dotenv.config();

const PORT = process.env.PORT || 10000;

async function processDomain(domain: string) {
  try {
    console.log(`Processing domain: ${domain}`);
    
    await saveDomain(domain);
    console.log(`✅ Domain saved: ${domain}`);
    
    // Example response capture - we'll replace this with real LLM calls later
    await saveResponse({
      domain_id: 1, // This should be the actual domain ID from the database
      model_name: 'test-model',
      prompt_type: 'what-is',
      raw_response: 'Test response',
      token_count: 100
    });
    console.log(`✅ Test response saved for domain: ${domain}`);
    
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