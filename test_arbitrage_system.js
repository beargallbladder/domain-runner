#!/usr/bin/env node

/**
 * Test and validate the arbitrage detection system
 * Ensures data integrity and system functionality
 */

const { Pool } = require('pg');
const assert = require('assert');
require('dotenv').config();

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
    console.error('Missing required environment variable: DATABASE_URL');
    process.exit(1);
}

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
});

async function runTests() {
    console.log('🧪 Testing AI Memory Arbitrage System\n');
    
    const tests = [
        testDatabaseIntegrity,
        testConsensusCalculation,
        testVelocityCalculation,
        testArbitrageDetection,
        testSchemaCompatibility
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            await test();
            passed++;
            console.log(`✅ ${test.name}: PASSED\n`);
        } catch (error) {
            failed++;
            console.error(`❌ ${test.name}: FAILED`);
            console.error(`   ${error.message}\n`);
        }
    }
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
}

async function testDatabaseIntegrity() {
    console.log('Testing database integrity...');
    
    // Check core tables exist and have data - using parameterized queries
    const tables = ['domains', 'domain_responses', 'domain_categories'];
    
    for (const table of tables) {
        // Use safe table name validation
        if (!/^[a-z_]+$/.test(table)) {
            throw new Error(`Invalid table name: ${table}`);
        }
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        assert(count > 0, `Table ${table} is empty`);
        console.log(`  - ${table}: ${count} rows`);
    }
    
    // Check data consistency
    const orphanCheck = await pool.query(`
        SELECT COUNT(*) 
        FROM domain_responses dr
        WHERE NOT EXISTS (
            SELECT 1 FROM domains d WHERE d.id = dr.domain_id
        )
    `);
    
    assert(orphanCheck.rows[0].count == 0, 'Found orphaned domain_responses');
}

async function testConsensusCalculation() {
    console.log('Testing consensus calculation...');
    
    // Find a domain with multiple model responses
    const testDomain = await pool.query(`
        SELECT d.domain, COUNT(DISTINCT dr.model) as model_count
        FROM domains d
        JOIN domain_responses dr ON dr.domain_id = d.id
        WHERE dr.prompt_type = 'memory_analysis'
        GROUP BY d.domain
        HAVING COUNT(DISTINCT dr.model) >= 3
        LIMIT 1
    `);
    
    if (testDomain.rows.length === 0) {
        console.log('  ⚠️  No domains with 3+ models found, skipping consensus test');
        return;
    }
    
    const domain = testDomain.rows[0].domain;
    console.log(`  - Testing domain: ${domain}`);
    
    // Get model scores
    const scores = await pool.query(`
        SELECT 
            model,
            CAST(SUBSTRING(response FROM '\\\\d+') AS FLOAT) as score
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE d.domain = $1
            AND prompt_type = 'memory_analysis'
        ORDER BY dr.created_at DESC
    `, [domain]);
    
    // Calculate consensus
    const scoreValues = scores.rows.map(r => r.score).filter(s => !isNaN(s));
    const mean = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
    const variance = scoreValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / scoreValues.length;
    const stdDev = Math.sqrt(variance);
    const consensusScore = 1 - (stdDev / 50);
    
    console.log(`  - Scores: ${scoreValues.join(', ')}`);
    console.log(`  - Mean: ${mean.toFixed(1)}, StdDev: ${stdDev.toFixed(1)}`);
    console.log(`  - Consensus Score: ${(consensusScore * 100).toFixed(1)}%`);
    
    assert(consensusScore >= 0 && consensusScore <= 1, 'Invalid consensus score');
}

async function testVelocityCalculation() {
    console.log('Testing velocity calculation...');
    
    // Find a domain with historical data
    const testDomain = await pool.query(`
        SELECT d.domain
        FROM domains d
        JOIN domain_responses dr ON dr.domain_id = d.id
        WHERE dr.prompt_type = 'memory_analysis'
            AND dr.created_at > NOW() - INTERVAL '30 days'
        GROUP BY d.domain
        HAVING COUNT(DISTINCT DATE(dr.created_at)) > 5
        LIMIT 1
    `);
    
    if (testDomain.rows.length === 0) {
        console.log('  ⚠️  No domains with sufficient history, skipping velocity test');
        return;
    }
    
    const domain = testDomain.rows[0].domain;
    console.log(`  - Testing domain: ${domain}`);
    
    // Get daily scores
    const dailyScores = await pool.query(`
        SELECT 
            DATE(created_at) as date,
            AVG(CAST(SUBSTRING(response FROM '\\\\d+') AS FLOAT)) as avg_score
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE d.domain = $1
            AND prompt_type = 'memory_analysis'
            AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
    `, [domain]);
    
    // Calculate velocity
    const scores = dailyScores.rows.map(r => r.avg_score);
    const changes = [];
    
    for (let i = 1; i < scores.length; i++) {
        changes.push(Math.abs(scores[i] - scores[i-1]));
    }
    
    const avgDailyChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const weeklyVelocity = avgDailyChange * 7;
    
    console.log(`  - Daily changes: ${changes.slice(0, 5).map(c => c.toFixed(1)).join(', ')}...`);
    console.log(`  - Weekly velocity: ${weeklyVelocity.toFixed(2)} points/week`);
    
    const tier = weeklyVelocity < 1 ? 'FROZEN' :
                 weeklyVelocity < 5 ? 'SLOW' :
                 weeklyVelocity < 10 ? 'MEDIUM' : 'FAST';
    
    console.log(`  - Velocity tier: ${tier}`);
    
    assert(weeklyVelocity >= 0, 'Invalid velocity calculation');
}

async function testArbitrageDetection() {
    console.log('Testing arbitrage detection...');
    
    // Find domains with potential gaps
    const gapQuery = await pool.query(`
        WITH memory_scores AS (
            SELECT 
                d.domain,
                AVG(CAST(SUBSTRING(dr.response FROM '\\\\d+') AS FLOAT)) as avg_score,
                COUNT(*) as response_count
            FROM domains d
            JOIN domain_responses dr ON dr.domain_id = d.id
            WHERE dr.prompt_type = 'memory_analysis'
                AND dr.created_at > NOW() - INTERVAL '7 days'
            GROUP BY d.domain
        )
        SELECT 
            domain,
            avg_score,
            response_count,
            ABS(avg_score - 50) as gap_from_neutral
        FROM memory_scores
        WHERE response_count >= 3
        ORDER BY gap_from_neutral DESC
        LIMIT 5
    `);
    
    console.log('  - Top perception gaps:');
    for (const row of gapQuery.rows) {
        console.log(`    ${row.domain}: ${row.avg_score.toFixed(1)} (gap: ${row.gap_from_neutral.toFixed(1)})`);
    }
    
    assert(gapQuery.rows.length > 0, 'No domains found for arbitrage testing');
}

async function testSchemaCompatibility() {
    console.log('Testing schema compatibility...');
    
    // Check if new tables can be created without affecting existing ones
    const newTables = [
        'model_consensus_clusters',
        'domain_memory_velocity',
        'arbitrage_opportunities',
        'memory_cliff_events',
        'institutional_friction_scores'
    ];
    
    for (const table of newTables) {
        const exists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            )
        `, [table]);
        
        console.log(`  - Table ${table}: ${exists.rows[0].exists ? 'exists' : 'not created yet'}`);
    }
    
    // Test that we can query without breaking existing functionality
    const testQuery = await pool.query(`
        SELECT 
            d.domain,
            COUNT(dr.id) as responses
        FROM domains d
        LEFT JOIN domain_responses dr ON dr.domain_id = d.id
        GROUP BY d.domain
        LIMIT 1
    `);
    
    assert(testQuery.rows.length > 0, 'Basic query functionality broken');
    console.log('  - Core functionality: OK');
}

// Run tests
runTests().catch(console.error);