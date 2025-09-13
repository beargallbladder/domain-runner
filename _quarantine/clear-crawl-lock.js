#!/usr/bin/env node

// Clear stuck crawler lock via API
const axios = require('axios');

async function clearLock() {
  // First check status
  const status = await axios.get('https://www.llmrank.io/api/crawl-status', {
    headers: { 'x-api-key': 'internal-crawl-2025' }
  });
  
  console.log('Current status:', status.data);
  
  // The lock will expire after 1 hour automatically
  if (status.data.is_running && status.data.duration_minutes > 60) {
    console.log('Lock is stale and should be auto-cleared');
  }
  
  // Try to trigger again (will clear stale lock)
  try {
    const trigger = await axios.post('https://www.llmrank.io/api/trigger-crawl', 
      { force: true },
      { headers: { 'x-api-key': 'internal-crawl-2025' }}
    );
    console.log('Trigger result:', trigger.data);
  } catch (err) {
    console.log('Trigger error:', err.response?.data || err.message);
  }
}

clearLock();