#!/usr/bin/env node

const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db';

async function monitorCrawlProgress() {
    console.log('🚀 REAL-TIME TENSOR LLM CRAWL MONITOR');
    console.log('=====================================');
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    const startTime = Date.now();
    let lastProcessedCount = 0;
    let consecutiveChecks = 0;
    
    async function getStats() {
        try {
            // Get current domain status
            const statusQuery = await pool.query(`
                SELECT status, COUNT(*) as count 
                FROM domains 
                GROUP BY status
            `);
            
            const stats = {};
            statusQuery.rows.forEach(row => {
                stats[row.status] = parseInt(row.count);
            });
            
            // Get recent processing activity
            const recentQuery = await pool.query(`
                SELECT COUNT(*) as recent_count
                FROM domain_responses 
                WHERE created_at > NOW() - INTERVAL '5 minutes'
            `);
            
            const recentProcessed = parseInt(recentQuery.rows[0].recent_count);
            
            // Get processing rate
            const rateQuery = await pool.query(`
                SELECT COUNT(*) as last_minute
                FROM domain_responses 
                WHERE created_at > NOW() - INTERVAL '1 minute'
            `);
            
            const lastMinuteProcessed = parseInt(rateQuery.rows[0].last_minute);
            
            return {
                ...stats,
                recentProcessed,
                lastMinuteProcessed,
                totalProcessed: (stats.completed || 0)
            };
            
        } catch (error) {
            console.error('❌ Error getting stats:', error.message);
            return null;
        }
    }
    
    async function identifyOptimizations(stats, timeDiff) {
        const optimizations = [];
        const rate = stats.lastMinuteProcessed || 0;
        
        console.log(`\n🔍 OPTIMIZATION ANALYSIS:`);
        
        // Processing rate analysis
        if (rate < 2) {
            optimizations.push({
                area: 'Processing Rate',
                issue: `Low rate: ${rate} domains/min`,
                recommendation: 'Increase batch size or concurrent workers',
                priority: 'HIGH'
            });
        } else if (rate > 10) {
            optimizations.push({
                area: 'Processing Rate', 
                issue: `High rate: ${rate} domains/min`,
                recommendation: 'Monitor for API rate limits and memory usage',
                priority: 'MEDIUM'
            });
        }
        
        // Queue analysis
        const pending = stats.pending || 0;
        const processing = stats.processing || 0;
        
        if (pending > 3000 && processing < 10) {
            optimizations.push({
                area: 'Queue Management',
                issue: `Large queue (${pending}) with low concurrency (${processing})`,
                recommendation: 'Increase concurrent processing workers',
                priority: 'HIGH'
            });
        }
        
        // Memory and resource optimization
        if (rate > 0) {
            const estimatedCompletion = Math.ceil(pending / rate);
            optimizations.push({
                area: 'Time Estimation',
                issue: `ETA: ${estimatedCompletion} minutes for ${pending} domains`,
                recommendation: 'Consider parallel processing or tiered execution',
                priority: estimatedCompletion > 120 ? 'HIGH' : 'MEDIUM'
            });
        }
        
        // Tensor processing optimization
        optimizations.push({
            area: 'Tensor Processing',
            issue: 'Standard processing without SIMD optimization',
            recommendation: 'Implement vectorized tensor operations for 3-5x speedup',
            priority: 'HIGH'
        });
        
        // Memory management
        optimizations.push({
            area: 'Memory Management',
            issue: 'No real-time memory monitoring',
            recommendation: 'Add memory circuit breakers and garbage collection',
            priority: 'MEDIUM'
        });
        
        // Drift detection
        optimizations.push({
            area: 'Drift Detection',
            issue: 'No real-time drift monitoring',
            recommendation: 'Implement continuous drift detection for data quality',
            priority: 'MEDIUM'
        });
        
        return optimizations;
    }
    
    console.log('⏰ Starting monitoring... (Ctrl+C to stop)');
    
    const monitorInterval = setInterval(async () => {
        const stats = await getStats();
        
        if (!stats) {
            consecutiveChecks++;
            if (consecutiveChecks > 3) {
                console.log('❌ Multiple failures, stopping monitor');
                clearInterval(monitorInterval);
                await pool.end();
                return;
            }
            return;
        }
        
        consecutiveChecks = 0;
        const timeDiff = (Date.now() - startTime) / 1000;
        const processedSinceStart = stats.totalProcessed - lastProcessedCount;
        const avgRate = processedSinceStart / (timeDiff / 60);
        
        console.log(`\n📊 CRAWL STATUS (${new Date().toLocaleTimeString()})`);
        console.log(`   ⏳ Pending: ${stats.pending || 0}`);
        console.log(`   🔄 Processing: ${stats.processing || 0}`);
        console.log(`   ✅ Completed: ${stats.completed || 0}`);
        console.log(`   📈 Last minute: ${stats.lastMinuteProcessed || 0} domains`);
        console.log(`   ⚡ Average rate: ${avgRate.toFixed(2)} domains/min`);
        
        // Identify optimizations
        const optimizations = await identifyOptimizations(stats, timeDiff);
        
        // Show top 3 optimizations
        const topOptimizations = optimizations
            .sort((a, b) => a.priority === 'HIGH' ? -1 : 1)
            .slice(0, 3);
            
        topOptimizations.forEach((opt, i) => {
            const emoji = opt.priority === 'HIGH' ? '🔴' : '🟡';
            console.log(`   ${emoji} ${opt.area}: ${opt.recommendation}`);
        });
        
        // Progress estimation
        if (stats.pending > 0 && avgRate > 0) {
            const etaMinutes = Math.ceil(stats.pending / avgRate);
            const etaHours = Math.floor(etaMinutes / 60);
            const etaRemainingMinutes = etaMinutes % 60;
            
            if (etaHours > 0) {
                console.log(`   🎯 ETA: ${etaHours}h ${etaRemainingMinutes}m`);
            } else {
                console.log(`   🎯 ETA: ${etaMinutes}m`);
            }
        }
        
        lastProcessedCount = stats.totalProcessed;
        
    }, 30000); // Check every 30 seconds
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping monitor...');
        clearInterval(monitorInterval);
        await pool.end();
        process.exit(0);
    });
}

monitorCrawlProgress().catch(console.error);