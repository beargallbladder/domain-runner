#!/usr/bin/env node

/**
 * AI Memory Arbitrage Swarm Orchestrator
 * Coordinates specialized agents to continuously find and validate arbitrage opportunities
 */

const { Pool } = require('pg');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

// Validate environment
if (!process.env.DATABASE_URL) {
    console.error('Missing required environment variable: DATABASE_URL');
    process.exit(1);
}

// Database connection
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false },
    max: 20
});

// Agent definitions
const ARBITRAGE_AGENTS = {
    CONSENSUS_MONITOR: {
        name: 'ConsensusMonitor',
        schedule: '*/15 * * * *', // Every 15 minutes
        task: async () => await monitorModelConsensus()
    },
    VELOCITY_TRACKER: {
        name: 'VelocityTracker', 
        schedule: '0 * * * *', // Every hour
        task: async () => await trackMemoryVelocity()
    },
    CLIFF_DETECTOR: {
        name: 'CliffDetector',
        schedule: '*/30 * * * *', // Every 30 minutes
        task: async () => await detectMemoryCliffs()
    },
    ARBITRAGE_SCANNER: {
        name: 'ArbitrageScanner',
        schedule: '0 */6 * * *', // Every 6 hours
        task: async () => await scanForArbitrage()
    },
    FRICTION_ANALYZER: {
        name: 'FrictionAnalyzer',
        schedule: '0 0 * * *', // Daily
        task: async () => await analyzeFrictionForces()
    }
};

// Agent coordination state
const swarmState = {
    active: false,
    agents: {},
    metrics: {
        consensusDivergences: 0,
        velocityChanges: 0,
        cliffsDetected: 0,
        opportunitiesFound: 0,
        totalROI: 0
    }
};

/**
 * Monitor model consensus and detect divergences
 */
async function monitorModelConsensus() {
    console.log('🤝 ConsensusMonitor: Analyzing model agreement patterns...');
    
    try {
        // Find recent domains with multiple model responses
        const domainsQuery = `
            SELECT DISTINCT d.domain
            FROM domains d
            JOIN domain_responses dr ON dr.domain_id = d.id
            WHERE dr.created_at > NOW() - INTERVAL '24 hours'
            GROUP BY d.domain
            HAVING COUNT(DISTINCT dr.model) >= 3
            LIMIT 50
        `;
        
        const { rows: domains } = await pool.query(domainsQuery);
        
        for (const { domain } of domains) {
            // Get all model scores for this domain
            const scoresQuery = `
                SELECT 
                    model,
                    CAST(SUBSTRING(response FROM '\\d+') AS FLOAT) as score
                FROM domain_responses dr
                JOIN domains d ON d.id = dr.domain_id
                WHERE d.domain = $1
                    AND prompt_type = 'memory_analysis'
                    AND created_at > NOW() - INTERVAL '7 days'
                ORDER BY created_at DESC
            `;
            
            const { rows: scores } = await pool.query(scoresQuery, [domain]);
            
            if (scores.length >= 3) {
                // Calculate consensus metrics
                const scoreValues = scores.map(s => s.score);
                const mean = scoreValues.reduce((a, b) => a + b) / scoreValues.length;
                const stdDev = Math.sqrt(
                    scoreValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / scoreValues.length
                );
                
                const consensusScore = 1 - (stdDev / 50); // Normalized
                
                // Find outliers
                const outliers = scores.filter(s => Math.abs(s.score - mean) > stdDev * 1.5);
                
                if (outliers.length > 0 || consensusScore < 0.7) {
                    // Store divergence event
                    await pool.query(`
                        INSERT INTO model_divergence_analysis 
                        (domain, analysis_date, model_count, consensus_score, 
                         standard_deviation, score_range, outlier_models)
                        VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
                        ON CONFLICT (domain, analysis_date) DO UPDATE
                        SET consensus_score = $3, standard_deviation = $4
                    `, [
                        domain,
                        scores.length,
                        consensusScore,
                        stdDev,
                        Math.max(...scoreValues) - Math.min(...scoreValues),
                        JSON.stringify(outliers)
                    ]);
                    
                    swarmState.metrics.consensusDivergences++;
                    
                    console.log(`  ⚠️  Divergence found: ${domain} (consensus: ${(consensusScore * 100).toFixed(1)}%)`);
                }
            }
        }
        
        console.log(`  ✅ Analyzed ${domains.length} domains, found ${swarmState.metrics.consensusDivergences} divergences`);
        
    } catch (error) {
        console.error('  ❌ ConsensusMonitor error:', error.message);
    }
}

/**
 * Track memory update velocity for domains
 */
async function trackMemoryVelocity() {
    console.log('⚡ VelocityTracker: Calculating memory update speeds...');
    
    try {
        // Get domains that need velocity updates
        const domainsQuery = `
            SELECT DISTINCT d.domain
            FROM domains d
            JOIN domain_responses dr ON dr.domain_id = d.id
            WHERE dr.created_at > NOW() - INTERVAL '30 days'
                AND NOT EXISTS (
                    SELECT 1 FROM domain_memory_velocity dmv
                    WHERE dmv.domain = d.domain
                        AND dmv.last_calculated > NOW() - INTERVAL '24 hours'
                )
            LIMIT 100
        `;
        
        const { rows: domains } = await pool.query(domainsQuery);
        let velocityChanges = 0;
        
        for (const { domain } of domains) {
            // Call the velocity calculation function
            const result = await pool.query(
                'SELECT * FROM calculate_memory_velocity($1, $2)',
                [domain, 30]
            );
            
            if (result.rows[0]) {
                const { velocity, tier } = result.rows[0];
                
                // Check for significant velocity changes
                const prevQuery = `
                    SELECT velocity_score, velocity_tier
                    FROM domain_memory_velocity
                    WHERE domain = $1
                    ORDER BY last_calculated DESC
                    LIMIT 1 OFFSET 1
                `;
                
                const { rows: prevRows } = await pool.query(prevQuery, [domain]);
                
                if (prevRows[0] && prevRows[0].velocity_tier !== tier) {
                    velocityChanges++;
                    console.log(`  🔄 Velocity change: ${domain} (${prevRows[0].velocity_tier} → ${tier})`);
                }
            }
        }
        
        swarmState.metrics.velocityChanges += velocityChanges;
        console.log(`  ✅ Updated velocity for ${domains.length} domains, ${velocityChanges} tier changes`);
        
    } catch (error) {
        console.error('  ❌ VelocityTracker error:', error.message);
    }
}

/**
 * Detect memory cliff events
 */
async function detectMemoryCliffs() {
    console.log('📉 CliffDetector: Searching for dramatic memory changes...');
    
    try {
        const cliffsQuery = `
            WITH score_changes AS (
                SELECT 
                    d.domain,
                    dr.model,
                    dr.created_at,
                    CAST(SUBSTRING(dr.response FROM '\\d+') AS FLOAT) as score,
                    LAG(CAST(SUBSTRING(dr.response FROM '\\d+') AS FLOAT)) 
                        OVER (PARTITION BY d.domain, dr.model ORDER BY dr.created_at) as prev_score,
                    LAG(dr.created_at) 
                        OVER (PARTITION BY d.domain, dr.model ORDER BY dr.created_at) as prev_date
                FROM domain_responses dr
                JOIN domains d ON d.id = dr.domain_id
                WHERE dr.prompt_type = 'memory_analysis'
                    AND dr.created_at > NOW() - INTERVAL '48 hours'
            )
            SELECT 
                domain,
                model,
                created_at,
                score,
                prev_score,
                prev_date,
                ABS(score - prev_score) as cliff_size
            FROM score_changes
            WHERE prev_score IS NOT NULL
                AND ABS(score - prev_score) > 20
                AND created_at > NOW() - INTERVAL '24 hours'
        `;
        
        const { rows: cliffs } = await pool.query(cliffsQuery);
        
        for (const cliff of cliffs) {
            // Store cliff event
            await pool.query(`
                INSERT INTO memory_cliff_events
                (domain, model, cliff_date, score_before, score_after, cliff_size, cliff_direction)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                cliff.domain,
                cliff.model,
                cliff.created_at,
                cliff.prev_score,
                cliff.score,
                cliff.cliff_size,
                cliff.score > cliff.prev_score ? 'UP' : 'DOWN'
            ]);
            
            console.log(`  🚨 Memory cliff: ${cliff.domain} (${cliff.model}): ${cliff.prev_score} → ${cliff.score}`);
        }
        
        swarmState.metrics.cliffsDetected += cliffs.length;
        console.log(`  ✅ Detected ${cliffs.length} memory cliffs`);
        
    } catch (error) {
        console.error('  ❌ CliffDetector error:', error.message);
    }
}

/**
 * Scan for arbitrage opportunities
 */
async function scanForArbitrage() {
    console.log('💰 ArbitrageScanner: Identifying profit opportunities...');
    
    try {
        // Run Python arbitrage detector
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        await execAsync('python3 arbitrage_detection_system.py');
        
        // Read results
        const fs = require('fs').promises;
        const results = JSON.parse(await fs.readFile('arbitrage_opportunities.json', 'utf8'));
        
        const newOpportunities = results.opportunities.filter(opp => opp.roi_estimate > 2);
        
        console.log(`  ✅ Found ${newOpportunities.length} high-ROI opportunities`);
        
        // Store top opportunities
        for (const opp of newOpportunities.slice(0, 20)) {
            await pool.query(`
                INSERT INTO arbitrage_opportunities
                (domain, gap_score, velocity, persistence, market_size, 
                 risk_score, roi_estimate, confidence, strategy)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                opp.domain,
                opp.gap_score,
                opp.velocity,
                opp.persistence,
                opp.market_size,
                opp.risk_score,
                opp.roi_estimate,
                opp.confidence,
                opp.strategy
            ]);
        }
        
        swarmState.metrics.opportunitiesFound += newOpportunities.length;
        swarmState.metrics.totalROI += newOpportunities.reduce((sum, opp) => sum + opp.roi_estimate, 0);
        
        // Alert on exceptional opportunities
        const exceptional = newOpportunities.filter(opp => opp.roi_estimate > 5);
        if (exceptional.length > 0) {
            console.log('\n🎯 EXCEPTIONAL OPPORTUNITIES DETECTED:');
            exceptional.forEach(opp => {
                console.log(`   ${opp.domain}: ${opp.roi_estimate.toFixed(1)}x ROI (${opp.strategy})`);
            });
        }
        
    } catch (error) {
        console.error('  ❌ ArbitrageScanner error:', error.message);
    }
}

/**
 * Analyze institutional friction forces
 */
async function analyzeFrictionForces() {
    console.log('🏛️ FrictionAnalyzer: Measuring institutional forces...');
    
    try {
        // Analyze top domains by category
        const domainsQuery = `
            SELECT DISTINCT 
                d.domain,
                dc.category,
                COUNT(dr.id) as response_count
            FROM domains d
            LEFT JOIN domain_categories dc ON dc.domain = d.domain
            JOIN domain_responses dr ON dr.domain_id = d.id
            WHERE dr.created_at > NOW() - INTERVAL '30 days'
            GROUP BY d.domain, dc.category
            HAVING COUNT(dr.id) > 10
            LIMIT 200
        `;
        
        const { rows: domains } = await pool.query(domainsQuery);
        
        for (const { domain, category } of domains) {
            // Calculate friction forces
            const forces = await calculateFrictionForces(domain, category);
            
            // Store forces
            await pool.query(`
                INSERT INTO institutional_friction_scores
                (domain, content_volume_force, regulation_force, 
                 liability_force, institutional_bias_force)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                domain,
                forces.contentVolume,
                forces.regulation,
                forces.liability,
                forces.institutionalBias
            ]);
        }
        
        console.log(`  ✅ Analyzed friction forces for ${domains.length} domains`);
        
    } catch (error) {
        console.error('  ❌ FrictionAnalyzer error:', error.message);
    }
}

/**
 * Calculate friction forces for a domain
 */
async function calculateFrictionForces(domain, category) {
    const forces = {
        contentVolume: 0,
        regulation: 0,
        liability: 0,
        institutionalBias: 0
    };
    
    // Content volume force (based on response length)
    const volumeQuery = `
        SELECT AVG(LENGTH(response)) as avg_length
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE d.domain = $1
    `;
    
    const { rows: [volume] } = await pool.query(volumeQuery, [domain]);
    forces.contentVolume = Math.min((volume.avg_length / 10000) * 100, 100);
    
    // Regulation force (based on category and keywords)
    const regulatedCategories = ['FINTECH', 'HEALTHCARE', 'PHARMA', 'INSURANCE'];
    if (regulatedCategories.includes(category)) {
        forces.regulation = 70;
    }
    
    const regQuery = `
        SELECT COUNT(*) as reg_mentions
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE d.domain = $1
            AND (response ILIKE '%regulat%' OR response ILIKE '%complian%')
    `;
    
    const { rows: [reg] } = await pool.query(regQuery, [domain]);
    forces.regulation = Math.min(forces.regulation + (reg.reg_mentions * 5), 100);
    
    // Liability force
    const liabilityQuery = `
        SELECT COUNT(*) as liability_mentions
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE d.domain = $1
            AND (response ILIKE '%lawsuit%' OR response ILIKE '%legal%' 
                 OR response ILIKE '%liability%' OR response ILIKE '%risk%')
    `;
    
    const { rows: [liability] } = await pool.query(liabilityQuery, [domain]);
    forces.liability = Math.min(liability.liability_mentions * 10, 100);
    
    // Institutional bias (based on domain age and market position)
    const biasQuery = `
        SELECT market_position
        FROM domain_categories
        WHERE domain = $1
    `;
    
    const { rows: biasRows } = await pool.query(biasQuery, [domain]);
    if (biasRows[0]) {
        const positionScores = {
            'DOMINANT': 90,
            'STRONG': 70,
            'COMPETITIVE': 50,
            'AVERAGE': 30,
            'WEAK': 10
        };
        forces.institutionalBias = positionScores[biasRows[0].market_position] || 50;
    }
    
    return forces;
}

/**
 * Initialize the arbitrage swarm
 */
async function initializeSwarm() {
    console.log('🐝 Initializing AI Memory Arbitrage Swarm...');
    
    // Apply schema evolution
    try {
        const schemaSQL = require('fs').readFileSync('schema_evolution_manager.sql', 'utf8');
        // Note: In production, run this separately with proper migration tools
        console.log('  📊 Schema evolution ready (run separately in production)');
    } catch (error) {
        console.log('  ⚠️  Schema file not found, using existing schema');
    }
    
    // Schedule agents
    for (const [key, agent] of Object.entries(ARBITRAGE_AGENTS)) {
        const job = cron.schedule(agent.schedule, agent.task, {
            scheduled: false
        });
        
        swarmState.agents[key] = {
            ...agent,
            job,
            lastRun: null,
            runCount: 0
        };
        
        console.log(`  ✅ ${agent.name} scheduled: ${agent.schedule}`);
    }
    
    swarmState.active = true;
    console.log('\n🚀 Arbitrage swarm initialized and ready!');
}

/**
 * Start the swarm
 */
async function startSwarm() {
    if (!swarmState.active) {
        await initializeSwarm();
    }
    
    console.log('\n▶️  Starting arbitrage swarm agents...');
    
    for (const agent of Object.values(swarmState.agents)) {
        agent.job.start();
        console.log(`  ▶️  ${agent.name} started`);
    }
    
    // Run initial scans
    console.log('\n🔍 Running initial analysis...');
    await monitorModelConsensus();
    await trackMemoryVelocity();
    
    // Status monitoring
    setInterval(() => {
        console.log('\n📊 Swarm Status:');
        console.log(`  Consensus Divergences: ${swarmState.metrics.consensusDivergences}`);
        console.log(`  Velocity Changes: ${swarmState.metrics.velocityChanges}`);
        console.log(`  Memory Cliffs: ${swarmState.metrics.cliffsDetected}`);
        console.log(`  Opportunities Found: ${swarmState.metrics.opportunitiesFound}`);
        console.log(`  Total ROI Potential: ${swarmState.metrics.totalROI.toFixed(1)}x`);
    }, 300000); // Every 5 minutes
}

/**
 * Graceful shutdown
 */
async function shutdown() {
    console.log('\n🛑 Shutting down arbitrage swarm...');
    
    for (const agent of Object.values(swarmState.agents)) {
        agent.job.stop();
        console.log(`  ⏹️  ${agent.name} stopped`);
    }
    
    await pool.end();
    console.log('✅ Arbitrage swarm shutdown complete');
    process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the swarm
if (require.main === module) {
    startSwarm().catch(console.error);
}

module.exports = {
    initializeSwarm,
    startSwarm,
    shutdown,
    swarmState
};