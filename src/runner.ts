import * as dotenv from 'dotenv';
import { saveDomain, saveResponse, getDomains, cleanup } from './db';
import http from 'http';

dotenv.config();

const PORT = process.env.PORT || 10000;

async function processDomain(domain: string) {
  try {
    await saveDomain(domain);
    
    // Example response capture
    await saveResponse({
      domain_id: 1, // This should be the actual domain ID from the database
      model_name: 'test-model',
      prompt_type: 'what-is',
      raw_response: 'Test response',
      token_count: 100
    });
    
    console.log(`Processed domain: ${domain}`);
  } catch (error) {
    console.error(`Error processing domain ${domain}:`, error);
  }
}

async function main() {
  try {
    const domains = await getDomains();
    console.log(`Found ${domains.length} domains to process`);
    
    for (const domain of domains) {
      await processDomain(domain.domain);
    }
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await cleanup();
  }
}

// Create HTTP server to keep the service running
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Raw Capture Runner is running\n');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  main().catch(console.error);
}); 