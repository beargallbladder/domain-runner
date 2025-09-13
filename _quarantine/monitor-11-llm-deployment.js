#!/usr/bin/env node
/**
 * CONTINUOUS 11 LLM MONITORING SCRIPT
 * This will actively monitor the deployment and ensure all 11 LLMs are working
 * It will alert you IMMEDIATELY if any provider fails
 */

import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const RENDER_URL = 'https://domain-runner.onrender.com';
const REQUIRED_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq'];
const DEPLOYMENT_WAIT_TIME = 300000; // 5 minutes
const CHECK_INTERVAL = 30000; // 30 seconds
const ALERT_THRESHOLD = 3; // Alert after 3 consecutive failures

// Track provider status over time
const providerHistory = new Map();
const failureCount = new Map();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function alert(message) {
  console.log('\x07'); // System beep
  log(`🚨 ALERT: ${message}`, 'red');
  log(`🚨 ${message} 🚨`, 'bright');
  
  // Try to send a system notification (macOS)
  try {
    execAsync(`osascript -e 'display notification "${message}" with title "LLM TENSOR FAILURE" sound name "Basso"'`);
  } catch (error) {
    // Ignore if not on macOS
  }
}

async function checkDeploymentStatus() {
  try {
    const response = await fetch(`${RENDER_URL}/health`, { timeout: 10000 });
    if (response.ok) {
      const data = await response.json();
      return {
        deployed: true,
        version: data.version || 'unknown',
        uptime: data.uptime || 0
      };
    }
  } catch (error) {
    return { deployed: false, error: error.message };
  }
  return { deployed: false };
}

async function testAllProviders() {
  log('Testing all 11 LLM providers...', 'cyan');
  
  try {
    // First try the test-all-keys endpoint
    const testResponse = await fetch(`${RENDER_URL}/test-all-keys`, { timeout: 120000 });
    
    if (testResponse.ok) {
      const results = await testResponse.json();
      return analyzeTestResults(results);
    } else {
      log('test-all-keys endpoint not available, using fallback', 'yellow');
      return await fallbackTest();
    }
  } catch (error) {
    log(`Test error: ${error.message}`, 'red');
    return { working: [], failed: REQUIRED_PROVIDERS, error: error.message };
  }
}

function analyzeTestResults(results) {
  const working = [];
  const failed = [];
  const details = {};
  
  REQUIRED_PROVIDERS.forEach(provider => {
    if (results.providers && results.providers[provider]) {
      const providerData = results.providers[provider];
      
      if (providerData.working) {
        working.push(provider);
        details[provider] = { status: 'working', response: providerData.response };
      } else {
        failed.push(provider);
        details[provider] = { 
          status: 'failed', 
          error: providerData.error,
          configured: providerData.configured,
          keyCount: providerData.keyCount
        };
      }
    } else {
      failed.push(provider);
      details[provider] = { status: 'missing', error: 'Not in response' };
    }
  });
  
  return { working, failed, details, summary: results.summary };
}

async function fallbackTest() {
  // Test by actually processing a domain
  log('Running fallback test with domain processing...', 'yellow');
  
  try {
    const response = await fetch(`${RENDER_URL}/process-pending-domains`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 1 }),
      timeout: 60000
    });
    
    if (response.ok) {
      // Wait a bit then check database
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Query would go here - for now just return unknown
      return {
        working: [],
        failed: [],
        details: {},
        error: 'Fallback test - check database manually'
      };
    }
  } catch (error) {
    return { working: [], failed: REQUIRED_PROVIDERS, error: error.message };
  }
}

function displayResults(results) {
  console.clear();
  console.log('='.repeat(80));
  log('🧠 11 LLM TENSOR SYNCHRONIZATION MONITOR', 'bright');
  console.log('='.repeat(80));
  
  const timestamp = new Date().toISOString();
  log(`Last Check: ${timestamp}`, 'blue');
  console.log('');
  
  // Display provider status
  console.log('📊 PROVIDER STATUS:');
  console.log('-'.repeat(40));
  
  REQUIRED_PROVIDERS.forEach((provider, index) => {
    const num = String(index + 1).padStart(2, ' ');
    const isWorking = results.working.includes(provider);
    const status = isWorking ? '✅' : '❌';
    const color = isWorking ? 'green' : 'red';
    const detail = results.details?.[provider];
    
    let message = `${num}. ${status} ${provider.padEnd(12)}`;
    
    if (detail) {
      if (detail.error) {
        message += ` - ${detail.error.substring(0, 50)}`;
      } else if (detail.response) {
        message += ` - OK`;
      }
    }
    
    log(message, color);
  });
  
  console.log('');
  console.log('📈 SUMMARY:');
  console.log('-'.repeat(40));
  log(`Working: ${results.working.length}/11 (${(results.working.length/11*100).toFixed(1)}%)`, 
      results.working.length === 11 ? 'green' : 'yellow');
  log(`Failed: ${results.failed.length}/11`, results.failed.length > 0 ? 'red' : 'green');
  
  if (results.working.length === 11) {
    console.log('');
    log('🎉 TENSOR SYNCHRONIZATION ACHIEVED! ALL 11 LLMS WORKING!', 'green');
    log('🎉 TENSOR SYNCHRONIZATION ACHIEVED! ALL 11 LLMS WORKING!', 'bright');
    log('🎉 TENSOR SYNCHRONIZATION ACHIEVED! ALL 11 LLMS WORKING!', 'green');
  }
  
  // Show history
  console.log('');
  console.log('📜 RECENT HISTORY:');
  console.log('-'.repeat(40));
  const history = Array.from(providerHistory.entries()).slice(-5);
  history.forEach(([time, data]) => {
    const workingCount = data.working.length;
    const color = workingCount === 11 ? 'green' : workingCount >= 8 ? 'yellow' : 'red';
    log(`${time}: ${workingCount}/11 working`, color);
  });
  
  console.log('='.repeat(80));
}

function checkForFailures(results) {
  results.failed.forEach(provider => {
    const currentCount = (failureCount.get(provider) || 0) + 1;
    failureCount.set(provider, currentCount);
    
    if (currentCount >= ALERT_THRESHOLD) {
      alert(`${provider} has failed ${currentCount} times consecutively!`);
    }
  });
  
  // Reset count for working providers
  results.working.forEach(provider => {
    failureCount.set(provider, 0);
  });
  
  // Critical alert if less than 8 working
  if (results.working.length < 8) {
    alert(`CRITICAL: Only ${results.working.length}/11 LLMs working! Tensor integrity compromised!`);
  }
}

async function monitorDeployment() {
  log('🚀 Starting deployment monitoring...', 'bright');
  log(`Waiting ${DEPLOYMENT_WAIT_TIME/1000} seconds for deployment to complete...`, 'yellow');
  
  // Initial wait for deployment
  let deploymentReady = false;
  const startTime = Date.now();
  
  while (!deploymentReady && (Date.now() - startTime < DEPLOYMENT_WAIT_TIME)) {
    const status = await checkDeploymentStatus();
    
    if (status.deployed && status.uptime > 30) {
      deploymentReady = true;
      log(`✅ Deployment ready! Version: ${status.version}`, 'green');
    } else {
      log(`⏳ Waiting for deployment... (${Math.round((Date.now() - startTime)/1000)}s)`, 'yellow');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  if (!deploymentReady) {
    alert('Deployment not ready after 5 minutes!');
  }
  
  // Start continuous monitoring
  log('🔍 Starting continuous monitoring...', 'bright');
  
  while (true) {
    const results = await testAllProviders();
    const timeKey = new Date().toTimeString().split(' ')[0];
    
    providerHistory.set(timeKey, results);
    checkForFailures(results);
    displayResults(results);
    
    if (results.working.length === 11) {
      log('✅ All systems operational - checking again in 30 seconds', 'green');
    } else {
      log(`⚠️  ${results.failed.length} providers failing - checking again in 30 seconds`, 'yellow');
    }
    
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n👋 Monitoring stopped', 'yellow');
  process.exit(0);
});

// Main execution
async function main() {
  console.clear();
  log('🧠 11 LLM TENSOR SYNCHRONIZATION MONITOR', 'bright');
  log('This will actively monitor all 11 LLM providers', 'cyan');
  log('You will be ALERTED if any provider fails', 'yellow');
  log('Press Ctrl+C to stop monitoring', 'blue');
  console.log('');
  
  await monitorDeployment();
}

main().catch(error => {
  alert(`Monitor crashed: ${error.message}`);
  process.exit(1);
});