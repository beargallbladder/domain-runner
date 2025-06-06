import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const TEST_DOMAINS = [
  'microsoft.com',
  'apple.com',
  'amazon.com',
  'google.com',
  'meta.com'
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function seedDomains() {
  console.log('Starting domain seeding...');
  
  try {
    // Check if we already have domains
    const existingCount = await pool.query('SELECT COUNT(*) FROM domains');
    if (parseInt(existingCount.rows[0].count) > 0) {
      console.log('Database already has domains, skipping seeding.');
      return;
    }

    // Insert domains
    for (const domain of TEST_DOMAINS) {
      const result = await pool.query(
        'INSERT INTO domains (domain) VALUES ($1) ON CONFLICT (domain) DO NOTHING RETURNING *',
        [domain]
      );
      if (result.rows.length > 0) {
        console.log(`✅ Added domain: ${domain}`);
      } else {
        console.log(`ℹ️ Domain already exists: ${domain}`);
      }
    }

    // Verify domains
    const allDomains = await pool.query('SELECT * FROM domains ORDER BY created_at DESC');
    console.log('\nCurrent domains in database:');
    allDomains.rows.forEach(row => {
      console.log(`- ${row.domain} (ID: ${row.id}, Created: ${row.created_at})`);
    });

  } catch (error) {
    console.error('❌ Error seeding domains:', error);
    throw error; // Re-throw to ensure process fails if seeding fails
  } finally {
    await pool.end();
    console.log('\nSeeding complete.');
  }
}

// Run the seeding
seedDomains().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 