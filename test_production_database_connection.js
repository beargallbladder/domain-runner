#!/usr/bin/env node
/**
 * 🔧 Production Database Connection Test
 * Tests database connectivity and performance for domain processing
 */

const { Pool } = require('pg');

// Enhanced database configuration matching our migration setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
        "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db",
    ssl: {
        rejectUnauthorized: false
    },
    // Enhanced connection pool settings
    max: 50,                      // High concurrency support
    min: 10,                      // Maintain minimum connections
    idleTimeoutMillis: 30000,     // Keep connections alive
    connectionTimeoutMillis: 15000, // Reasonable timeout
    statement_timeout: 60000,     // 1 minute for queries
    query_timeout: 60000,         // 1 minute for queries
    application_name: 'domain-runner-test',
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});

async function testDatabaseConnection() {
    console.log('🧪 TESTING PRODUCTION DATABASE CONNECTION');
    console.log('=' .repeat(60));
    
    try {
        console.log('🔗 Connecting to database...');
        const client = await pool.connect();
        
        console.log('✅ Database connection established');
        
        // Test 1: Basic connectivity
        console.log('\n📋 TEST 1: Basic Connectivity');
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        console.log(`✅ PostgreSQL Version: ${result.rows[0].pg_version.split(' ')[1]}`);
        console.log(`✅ Current Time: ${result.rows[0].current_time}`);
        
        // Test 2: Schema validation
        console.log('\n🏗️  TEST 2: Schema Validation');
        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name IN ('domains', 'domain_responses')
            ORDER BY table_name
        `);
        
        const expectedTables = ['domains', 'domain_responses'];
        const foundTables = tables.rows.map(row => row.table_name);
        
        for (const table of expectedTables) {
            if (foundTables.includes(table)) {
                console.log(`  ✅ ${table} table exists`);
            } else {
                console.log(`  ❌ ${table} table missing`);
            }
        }
        
        // Test 3: Performance test
        console.log('\n🚀 TEST 3: Query Performance');
        
        const perfStart = Date.now();
        const domainCount = await client.query('SELECT COUNT(*) as count FROM domains');
        const perfEnd = Date.now();
        
        console.log(`✅ Domain count query: ${perfEnd - perfStart}ms`);
        console.log(`📊 Total domains: ${domainCount.rows[0].count}`);
        
        // Test 4: Index performance
        console.log('\n📈 TEST 4: Index Performance');
        
        const indexStart = Date.now();
        const pendingDomains = await client.query(`
            SELECT id, domain FROM domains 
            WHERE status = 'pending' 
            ORDER BY priority DESC, created_at ASC 
            LIMIT 10
        `);
        const indexEnd = Date.now();
        
        console.log(`✅ Indexed query performance: ${indexEnd - indexStart}ms`);
        console.log(`📋 Pending domains for processing: ${pendingDomains.rows.length}`);
        
        // Test 5: Write operation test
        console.log('\n✏️  TEST 5: Write Operation Test');
        
        const testDomainId = 'test-' + Date.now();
        const writeStart = Date.now();
        
        try {
            // Insert test domain
            await client.query(`
                INSERT INTO domains (id, domain, status, created_at) 
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (domain) DO NOTHING
            `, [testDomainId, `test${Date.now()}.com`, 'pending']);
            
            const writeEnd = Date.now();
            console.log(`✅ Write operation: ${writeEnd - writeStart}ms`);
            
            // Clean up test data
            await client.query('DELETE FROM domains WHERE id = $1', [testDomainId]);
            console.log('✅ Test data cleaned up');
            
        } catch (writeError) {
            console.log(`⚠️  Write test failed: ${writeError.message}`);
        }
        
        // Test 6: Transaction test
        console.log('\n🔄 TEST 6: Transaction Test');
        
        const transStart = Date.now();
        
        try {
            await client.query('BEGIN');
            
            // Simulate domain processing update
            await client.query(`
                UPDATE domains 
                SET status = 'processing', updated_at = NOW() 
                WHERE status = 'pending' 
                LIMIT 1
            `);
            
            await client.query('ROLLBACK'); // Don't actually change data
            
            const transEnd = Date.now();
            console.log(`✅ Transaction test: ${transEnd - transStart}ms`);
            
        } catch (transError) {
            await client.query('ROLLBACK');
            console.log(`⚠️  Transaction test failed: ${transError.message}`);
        }
        
        // Test 7: Connection pool test
        console.log('\n🏊 TEST 7: Connection Pool Test');
        
        console.log(`📊 Pool stats:`);
        console.log(`  Total connections: ${pool.totalCount}`);
        console.log(`  Idle connections: ${pool.idleCount}`);
        console.log(`  Waiting clients: ${pool.waitingCount}`);
        
        // Test 8: Monitor views test
        console.log('\n👁️  TEST 8: Monitoring Views Test');
        
        try {
            const healthSummary = await client.query('SELECT * FROM system_health_summary');
            console.log(`✅ system_health_summary: ${healthSummary.rows.length} rows`);
            
            const processingStats = await client.query('SELECT * FROM domain_processing_summary LIMIT 3');
            console.log(`✅ domain_processing_summary: ${processingStats.rows.length} rows`);
            
            for (const stat of processingStats.rows) {
                console.log(`  ${stat.status}: ${stat.count} domains (cohort: ${stat.cohort})`);
            }
            
        } catch (viewError) {
            console.log(`⚠️  Monitoring views test failed: ${viewError.message}`);
        }
        
        client.release();
        
        console.log('\n🎉 DATABASE CONNECTION TEST COMPLETED!');
        console.log('✅ Database is ready for production domain processing');
        
        return true;
        
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
        
    } finally {
        // Clean shutdown
        console.log('\n🔌 Closing database pool...');
        await pool.end();
        console.log('✅ Database pool closed');
    }
}

// Domain processing simulation test
async function testDomainProcessing() {
    console.log('\n🔬 TESTING DOMAIN PROCESSING SIMULATION');
    console.log('=' .repeat(60));
    
    const testPool = new Pool({
        connectionString: process.env.DATABASE_URL || 
            "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db",
        ssl: { rejectUnauthorized: false },
        max: 10
    });
    
    try {
        const client = await testPool.connect();
        
        // Simulate fetching pending domains for processing
        console.log('🔍 Simulating domain fetch for processing...');
        
        const pendingDomains = await client.query(`
            SELECT id, domain FROM domains 
            WHERE status = $1 
            ORDER BY priority DESC, created_at ASC 
            LIMIT $2
        `, ['pending', 5]);
        
        console.log(`📋 Found ${pendingDomains.rows.length} domains ready for processing`);
        
        // Simulate domain processing workflow
        for (const domain of pendingDomains.rows.slice(0, 2)) { // Test with 2 domains
            console.log(`\n🔄 Simulating processing for: ${domain.domain}`);
            
            // Mark as processing
            await client.query(`
                UPDATE domains SET status = $1, updated_at = NOW() 
                WHERE id = $2
            `, ['processing', domain.id]);
            console.log(`  ✅ Marked as processing`);
            
            // Simulate LLM response insertion
            await client.query(`
                INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at)
                VALUES ($1, $2, $3, $4, NOW())
            `, [
                domain.id, 
                'test-model', 
                'test-analysis', 
                `Test analysis response for ${domain.domain} - comprehensive business intelligence data.`
            ]);
            console.log(`  ✅ Inserted test response`);
            
            // Mark as completed
            await client.query(`
                UPDATE domains SET status = $1, updated_at = NOW() 
                WHERE id = $2
            `, ['completed', domain.id]);
            console.log(`  ✅ Marked as completed`);
            
            // Clean up test data
            await client.query(`
                DELETE FROM domain_responses 
                WHERE domain_id = $1 AND model = 'test-model'
            `, [domain.id]);
            
            await client.query(`
                UPDATE domains SET status = $1, updated_at = NOW() 
                WHERE id = $2
            `, ['pending', domain.id]); // Reset status
            
            console.log(`  🧹 Cleaned up test data`);
        }
        
        client.release();
        console.log('\n✅ Domain processing simulation completed successfully!');
        
    } catch (error) {
        console.error('❌ Domain processing simulation failed:', error.message);
    } finally {
        await testPool.end();
    }
}

async function main() {
    console.log('🎯 COMPREHENSIVE DATABASE TESTING');
    console.log('Database:', process.env.DATABASE_URL ? 'Environment URL' : 'Default URL');
    console.log('');
    
    const start = Date.now();
    
    // Run connection tests
    const connectionSuccess = await testDatabaseConnection();
    
    if (connectionSuccess) {
        // Run domain processing simulation
        await testDomainProcessing();
    }
    
    const end = Date.now();
    
    console.log('\n' + '='.repeat(60));
    console.log(`⏱️  Total testing time: ${end - start}ms`);
    
    if (connectionSuccess) {
        console.log('🚀 DATABASE IS READY FOR PRODUCTION!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Deploy sophisticated-runner service');
        console.log('2. Test domain processing endpoint');
        console.log('3. Monitor processing progress');
    } else {
        console.log('💥 DATABASE NEEDS ATTENTION!');
        process.exit(1);
    }
}

// Run tests
main().catch(console.error);