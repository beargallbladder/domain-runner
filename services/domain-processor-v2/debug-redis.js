// Debug script to check Redis environment variables
console.log('=== Redis Environment Debug ===');
console.log('REDIS_URL:', process.env.REDIS_URL || 'NOT SET');
console.log('REDIS_HOST:', process.env.REDIS_HOST || 'NOT SET');
console.log('REDIS_PORT:', process.env.REDIS_PORT || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

// Test Redis connection
const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('\n=== Testing Redis Connections ===');
  
  // Test 1: Using REDIS_URL if available
  if (process.env.REDIS_URL) {
    console.log('\nTest 1: Connecting with REDIS_URL...');
    try {
      const redis1 = new Redis(process.env.REDIS_URL);
      await redis1.ping();
      console.log('✅ SUCCESS: Connected using REDIS_URL');
      await redis1.quit();
    } catch (error) {
      console.log('❌ FAILED: Could not connect using REDIS_URL');
      console.log('Error:', error.message);
    }
  }
  
  // Test 2: Using localhost
  console.log('\nTest 2: Connecting to localhost:6379...');
  try {
    const redis2 = new Redis({ host: 'localhost', port: 6379 });
    await redis2.ping();
    console.log('✅ SUCCESS: Connected to localhost');
    await redis2.quit();
  } catch (error) {
    console.log('❌ FAILED: Could not connect to localhost');
    console.log('Error:', error.message);
  }
  
  // Test 3: Parsing REDIS_URL manually
  if (process.env.REDIS_URL) {
    console.log('\nTest 3: Parsing REDIS_URL manually...');
    try {
      const url = new URL(process.env.REDIS_URL);
      console.log('Parsed host:', url.hostname);
      console.log('Parsed port:', url.port);
      console.log('Parsed password:', url.password ? 'SET' : 'NOT SET');
    } catch (error) {
      console.log('❌ FAILED: Could not parse REDIS_URL');
      console.log('Error:', error.message);
    }
  }
}

testRedisConnection().then(() => {
  console.log('\n=== Debug Complete ===');
  process.exit(0);
}).catch(err => {
  console.error('Debug script error:', err);
  process.exit(1);
});