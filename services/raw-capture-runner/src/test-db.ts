import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testDatabase() {
  console.log('Starting database test...');
  
  try {
    // Test connection
    console.log('Testing connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Test domain insertion
    console.log('\nTesting domain insertion...');
    const testDomain = 'test.example.com';
    const insertResult = await pool.query(
      'INSERT INTO domains (domain) VALUES ($1) RETURNING *',
      [testDomain]
    );
    console.log('✅ Domain inserted:', insertResult.rows[0]);

    // Test domain retrieval
    console.log('\nTesting domain retrieval...');
    const selectResult = await pool.query(
      'SELECT * FROM domains ORDER BY created_at DESC LIMIT 1'
    );
    console.log('✅ Retrieved domain:', selectResult.rows[0]);

    // Test response insertion
    console.log('\nTesting response insertion...');
    const responseResult = await pool.query(
      `INSERT INTO responses 
       (domain_id, model_name, prompt_type, raw_response, token_count) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        selectResult.rows[0].id,
        'test-model',
        'test-prompt',
        'This is a test response',
        100
      ]
    );
    console.log('✅ Response inserted:', responseResult.rows[0]);

    // Test response retrieval
    console.log('\nTesting response retrieval...');
    const getResponseResult = await pool.query(
      `SELECT r.*, d.domain 
       FROM responses r 
       JOIN domains d ON r.domain_id = d.id 
       ORDER BY r.created_at DESC 
       LIMIT 1`
    );
    console.log('✅ Retrieved response with domain:', getResponseResult.rows[0]);

  } catch (error) {
    console.error('❌ Error during database test:', error);
  } finally {
    await pool.end();
    console.log('\nTest complete, connection closed.');
  }
}

// Run the test
testDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 