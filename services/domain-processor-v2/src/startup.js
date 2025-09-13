#!/usr/bin/env node
/**
 * Startup wrapper to ensure proper environment configuration
 */

// Log environment for debugging
console.log('Starting Domain Processor v2...');
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  REDIS_URL: process.env.REDIS_URL ? 'Set (hidden)' : 'Not set',
  DATABASE_URL: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set'
});

// Ensure Redis URL is properly formatted
if (process.env.REDIS_URL) {
  // Some Redis providers include auth in the URL, ensure it's properly formatted
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    // If it's just host:port, convert to URL format
    process.env.REDIS_URL = `redis://${redisUrl}`;
    console.log('Converted Redis config to URL format');
  }
  console.log('Redis URL format:', process.env.REDIS_URL.split('@')[1] || 'localhost');
}

// Load the main application
try {
  require('./index.js');
} catch (error) {
  console.error('Failed to start application:', error);
  process.exit(1);
}