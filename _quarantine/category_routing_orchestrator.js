#!/usr/bin/env node

/**
 * Category-Aware Routing Orchestrator
 * Routes queries to the best LLM based on category expertise
 * Tracks and updates LLM performance grades over time
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
require('dotenv').config();

// Validate environment
if (!process.env.DATABASE_URL) {
    console.error('Missing required environment variable: DATABASE_URL');
    process.exit(1);
}

// Database connection
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
});

// LLM routing configuration
class CategoryRouter {
    constructor() {
        this.routingMap = {};
        this.modelProfiles = {};
        this.categoryCache = new Map();
        this.performanceTracking = new Map();
        
        // Implement cache size limits
        this.maxCacheSize = 1000;
        this.maxPerformanceEntries = 5000;
    }
    
    async initialize() {
        // Load latest grading data
        try {
            const gradesData = await fs.readFile('llm_category_grades.json', 'utf8');
            const grades = JSON.parse(gradesData);
            
            this.routingMap = grades.routing_recommendations || {};
            this.modelProfiles = grades.model_profiles || {};
            
            console.log('✅ Loaded routing map for', Object.keys(this.routingMap).length, 'categories');
        } catch (error) {
            console.log('⚠️  No existing grades found, will generate on first run');
        }
    }
    
    /**
     * Determine best model for a domain/query
     */
    async routeQuery(domain, queryType = 'memory_analysis') {
        // Check cache first
        const cacheKey = `${domain}-${queryType}`;
        if (this.categoryCache.has(cacheKey)) {
            return this.categoryCache.get(cacheKey);
        }
        
        // Categorize the domain
        const category = await this.categorizeDomain(domain);
        
        // Get routing recommendation
        const routing = this.routingMap[category] || this.routingMap['OTHER'];
        
        if (!routing) {
            // Fallback to round-robin if no routing data
            return this.getFallbackModel();
        }
        
        // Select model based on query type and performance
        let selectedModel;
        
        if (queryType === 'memory_analysis') {
            // Use primary model for memory tasks
            selectedModel = routing.primary_model;
        } else if (queryType === 'sentiment_analysis') {
            // Use consensus models for sentiment
            selectedModel = routing.consensus_models?.[0] || routing.primary_model;
        } else {
            // For other queries, load balance among good models
            const goodModels = [routing.primary_model, ...routing.fallback_models];
            selectedModel = goodModels[Math.floor(Math.random() * goodModels.length)];
        }
        
        // Cache the result with size limit
        if (this.categoryCache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.categoryCache.keys().next().value;
            this.categoryCache.delete(firstKey);
        }
        
        this.categoryCache.set(cacheKey, {
            model: selectedModel,
            category: category,
            trust_score: routing.primary_trust,
            grade: routing.primary_grade
        });
        
        return {
            model: selectedModel,
            category: category,
            trust_score: routing.primary_trust,
            grade: routing.primary_grade,
            reasoning: `Selected ${selectedModel} for ${category} (Grade: ${routing.primary_grade})`
        };
    }
    
    /**
     * Categorize a domain
     */
    async categorizeDomain(domain) {
        const domainLower = domain.toLowerCase();
        
        // Check database for existing category
        const query = `
            SELECT category_name 
            FROM domain_categories 
            WHERE domain = $1
            LIMIT 1
        `;
        
        const result = await pool.query(query, [domain]);
        if (result.rows.length > 0) {
            return result.rows[0].category_name;
        }
        
        // Pattern matching for categories
        const patterns = {
            'TECH_GIANTS': ['google', 'microsoft', 'apple', 'amazon', 'meta', 'netflix'],
            'AI_ML': ['ai', 'ml', 'neural', 'openai', 'anthropic', 'hugging'],
            'FINTECH': ['pay', 'bank', 'finance', 'stripe', 'square', 'coin'],
            'FASHION': ['fashion', 'wear', 'cloth', 'nike', 'adidas', 'style'],
            'ECOMMERCE': ['shop', 'store', 'buy', 'market', 'amazon', 'ebay'],
            'MEDIA': ['news', 'media', 'tv', 'stream', 'video', 'netflix'],
            'HEALTHCARE': ['health', 'med', 'pharma', 'care', 'hospital'],
            'GAMING': ['game', 'play', 'xbox', 'nintendo', 'steam', 'epic']
        };
        
        for (const [category, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => domainLower.includes(keyword))) {
                return category;
            }
        }
        
        return 'OTHER';
    }
    
    /**
     * Track model performance for continuous improvement
     */
    async trackPerformance(domain, model, score, responseTime) {
        const category = await this.categorizeDomain(domain);
        const key = `${model}-${category}`;
        
        if (!this.performanceTracking.has(key)) {
            this.performanceTracking.set(key, {
                totalRequests: 0,
                totalScore: 0,
                totalTime: 0,
                failures: 0
            });
        }
        
        const stats = this.performanceTracking.get(key);
        stats.totalRequests++;
        stats.totalScore += score;
        stats.totalTime += responseTime;
        
        // Prevent unbounded growth
        if (this.performanceTracking.size > this.maxPerformanceEntries) {
            // Remove oldest 10% of entries
            const entriesToRemove = Math.floor(this.performanceTracking.size * 0.1);
            const keys = Array.from(this.performanceTracking.keys());
            for (let i = 0; i < entriesToRemove; i++) {
                this.performanceTracking.delete(keys[i]);
            }
        }
        
        // Update database with performance metrics
        await this.updatePerformanceMetrics(model, category, stats);
    }
    
    /**
     * Get performance report
     */
    async getPerformanceReport() {
        const report = {
            routingEfficiency: {},
            modelUtilization: {},
            categoryPerformance: {},
            recommendations: []
        };
        
        // Calculate routing efficiency
        for (const [key, stats] of this.performanceTracking.entries()) {
            const [model, category] = key.split('-');
            
            const avgScore = stats.totalScore / stats.totalRequests;
            const avgTime = stats.totalTime / stats.totalRequests;
            const successRate = (stats.totalRequests - stats.failures) / stats.totalRequests;
            
            if (!report.modelUtilization[model]) {
                report.modelUtilization[model] = {
                    totalRequests: 0,
                    categories: []
                };
            }
            
            report.modelUtilization[model].totalRequests += stats.totalRequests;
            report.modelUtilization[model].categories.push(category);
            
            if (!report.categoryPerformance[category]) {
                report.categoryPerformance[category] = [];
            }
            
            report.categoryPerformance[category].push({
                model: model,
                avgScore: avgScore,
                avgTime: avgTime,
                successRate: successRate,
                requests: stats.totalRequests
            });
        }
        
        // Generate recommendations
        for (const [category, performances] of Object.entries(report.categoryPerformance)) {
            performances.sort((a, b) => b.avgScore - a.avgScore);
            
            const current = this.routingMap[category]?.primary_model;
            const best = performances[0]?.model;
            
            if (current !== best && performances[0]?.requests > 100) {
                report.recommendations.push({
                    category: category,
                    current_model: current,
                    recommended_model: best,
                    improvement: performances[0].avgScore - (performances.find(p => p.model === current)?.avgScore || 0),
                    confidence: performances[0].requests / 100
                });
            }
        }
        
        return report;
    }
    
    /**
     * Update routing based on performance
     */
    async updateRouting() {
        console.log('🔄 Updating routing based on performance data...');
        
        // Run Python grading system
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
            await execAsync('python3 llm_category_grading_system.py');
            await this.initialize(); // Reload new grades
            
            console.log('✅ Routing updated successfully');
        } catch (error) {
            console.error('❌ Failed to update routing:', error.message);
        }
    }
    
    /**
     * Get fallback model
     */
    getFallbackModel() {
        const models = ['openai', 'mistral', 'deepseek'];
        return {
            model: models[Math.floor(Math.random() * models.length)],
            category: 'UNKNOWN',
            trust_score: 0.5,
            grade: 'C',
            reasoning: 'No routing data available, using fallback'
        };
    }
    
    async updatePerformanceMetrics(model, category, stats) {
        // This would update a performance tracking table
        // For now, just log
        if (stats.totalRequests % 100 === 0) {
            console.log(`📊 ${model} @ ${category}: ${stats.totalRequests} requests, avg score: ${(stats.totalScore/stats.totalRequests).toFixed(1)}`);
        }
    }
}

// Usage example
async function demonstrateRouting() {
    const router = new CategoryRouter();
    await router.initialize();
    
    console.log('\n🔀 Category-Aware Routing Demo\n');
    
    // Test domains
    const testDomains = [
        'google.com',
        'nike.com', 
        'openai.com',
        'stripe.com',
        'netflix.com',
        'moderna.com',
        'steam.com',
        'harvard.edu'
    ];
    
    for (const domain of testDomains) {
        const routing = await router.routeQuery(domain);
        console.log(`${domain}:`);
        console.log(`  → Model: ${routing.model}`);
        console.log(`  → Category: ${routing.category}`);
        console.log(`  → Trust: ${(routing.trust_score * 100).toFixed(1)}%`);
        console.log(`  → Grade: ${routing.grade}`);
        console.log();
    }
    
    // Performance tracking example
    console.log('\n📊 Simulating performance tracking...\n');
    
    // Simulate some requests
    for (let i = 0; i < 20; i++) {
        const domain = testDomains[Math.floor(Math.random() * testDomains.length)];
        const routing = await router.routeQuery(domain);
        
        // Simulate performance
        const score = Math.random() * 100;
        const responseTime = Math.random() * 1000 + 200;
        
        await router.trackPerformance(domain, routing.model, score, responseTime);
    }
    
    // Get performance report
    const report = await router.getPerformanceReport();
    console.log('\n📈 Performance Report:');
    console.log('Model Utilization:', report.modelUtilization);
    
    if (report.recommendations.length > 0) {
        console.log('\n💡 Routing Recommendations:');
        for (const rec of report.recommendations) {
            console.log(`  - ${rec.category}: Switch from ${rec.current_model} to ${rec.recommended_model}`);
            console.log(`    Expected improvement: +${rec.improvement.toFixed(1)} points`);
        }
    }
}

// Smart query router for production use
class SmartQueryRouter {
    constructor(router) {
        this.router = router;
        this.queryHistory = new Map();
    }
    
    /**
     * Route a query with context awareness
     */
    async routeWithContext(query, options = {}) {
        const {
            domain = null,
            category = null,
            previousModel = null,
            requireConsensus = false,
            avoidModels = []
        } = options;
        
        // If domain provided, use standard routing
        if (domain) {
            const routing = await this.router.routeQuery(domain);
            
            // Apply constraints
            if (avoidModels.includes(routing.model)) {
                // Use fallback
                const alternatives = routing.fallback_models || [];
                routing.model = alternatives.find(m => !avoidModels.includes(m)) || 'openai';
            }
            
            return routing;
        }
        
        // If category provided, use category routing
        if (category && this.router.routingMap[category]) {
            const routing = this.router.routingMap[category];
            
            if (requireConsensus && routing.consensus_models?.length > 0) {
                // Return all consensus models for multi-model validation
                return {
                    models: routing.consensus_models,
                    category: category,
                    strategy: 'consensus',
                    reasoning: `Using ${routing.consensus_models.length} models for consensus on ${category}`
                };
            }
            
            return {
                model: routing.primary_model,
                category: category,
                trust_score: routing.primary_trust,
                grade: routing.primary_grade,
                reasoning: `Category-based routing for ${category}`
            };
        }
        
        // Fallback to load balancing
        return this.router.getFallbackModel();
    }
    
    /**
     * Get best model for a specific use case
     */
    async getBestModelForUseCase(useCase) {
        const useCaseMap = {
            'brand_memory': {
                categories: ['TECH_GIANTS', 'FASHION', 'MEDIA'],
                preference: 'high_memory_score'
            },
            'technical_analysis': {
                categories: ['AI_ML', 'TECH_GIANTS', 'ENTERPRISE'],
                preference: 'consistency'
            },
            'financial_data': {
                categories: ['FINTECH', 'CRYPTO'],
                preference: 'coverage'
            },
            'consumer_sentiment': {
                categories: ['ECOMMERCE', 'FASHION', 'FOOD_DELIVERY'],
                preference: 'recall_strength'
            }
        };
        
        const config = useCaseMap[useCase] || useCaseMap['brand_memory'];
        
        // Find best model across specified categories
        let bestModel = null;
        let bestScore = 0;
        
        for (const category of config.categories) {
            const routing = this.router.routingMap[category];
            if (routing && routing.primary_trust > bestScore) {
                bestScore = routing.primary_trust;
                bestModel = routing.primary_model;
            }
        }
        
        return {
            model: bestModel || 'openai',
            useCase: useCase,
            confidence: bestScore,
            reasoning: `Optimized for ${useCase} across ${config.categories.join(', ')}`
        };
    }
}

// Export for use in other modules
module.exports = {
    CategoryRouter,
    SmartQueryRouter,
    demonstrateRouting
};

// Run demo if executed directly
if (require.main === module) {
    demonstrateRouting()
        .then(() => process.exit(0))
        .catch(console.error);
}