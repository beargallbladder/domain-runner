#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Sentiment Analyzer Data Export
 * 
 * Exports comprehensive AI memory intelligence data in a format optimized
 * for ground truth correlation analysis with sentiment data
 */

class SentimentAnalyzerDataExport {
    constructor() {
        this.exportData = {
            metadata: {
                exportTimestamp: new Date().toISOString(),
                source: 'llmpagerank.com',
                version: '1.0.0',
                description: 'AI Memory Intelligence data for sentiment correlation analysis'
            },
            domains: [],
            aggregateStats: {},
            correlationFields: {},
            timeSeriesData: {}
        };
    }

    /**
     * Fetch all available data from APIs
     */
    async fetchAllData() {
        console.log('📊 Fetching comprehensive data for sentiment analyzer...');
        
        try {
            // Get rankings data
            const { stdout: rankingsData } = await execPromise('curl -s "https://llm-pagerank-public-api.onrender.com/api/rankings?limit=200"');
            const rankings = JSON.parse(rankingsData);
            
            // Get fire alarm data
            const { stdout: fireAlarmData } = await execPromise('curl -s "https://llm-pagerank-public-api.onrender.com/api/fire-alarm-dashboard"');
            const fireAlarm = JSON.parse(fireAlarmData);
            
            // Get system health
            const { stdout: healthData } = await execPromise('curl -s "https://llm-pagerank-public-api.onrender.com/health"');
            const health = JSON.parse(healthData);
            
            // Get categories if available
            let categories = { categories: [] };
            try {
                const { stdout: categoriesData } = await execPromise('curl -s "https://llm-pagerank-public-api.onrender.com/api/categories"');
                categories = JSON.parse(categoriesData);
            } catch (error) {
                console.log('⚠️ Categories endpoint not available');
            }
            
            this.rawData = {
                rankings,
                fireAlarm,
                health,
                categories
            };
            
            console.log(`✅ Fetched ${rankings.domains?.length || 0} domains for analysis`);
            return true;
        } catch (error) {
            console.error('❌ Error fetching data:', error.message);
            return false;
        }
    }

    /**
     * Process and structure data for sentiment correlation
     */
    processDataForSentimentAnalysis() {
        console.log('🔄 Processing data for sentiment correlation...');
        
        const domains = this.rawData.rankings.domains || [];
        
        // Process each domain for sentiment correlation
        this.exportData.domains = domains.map(domain => ({
            // Core identifiers
            domain: domain.domain,
            
            // AI Memory Intelligence Scores
            aiMemoryScore: domain.score,
            trend: domain.trend,
            trendNumeric: this.parseTrendToNumeric(domain.trend),
            
            // Model Consensus Data
            modelsPositive: domain.modelsPositive,
            modelsNeutral: domain.modelsNeutral,
            modelsNegative: domain.modelsNegative,
            modelConsensus: this.calculateConsensus(domain),
            
            // Data Quality Indicators
            dataFreshness: domain.dataFreshness,
            lastUpdated: domain.lastUpdated,
            
            // Risk Assessment
            riskLevel: this.calculateRiskLevel(domain),
            volatilityIndicator: Math.abs(this.parseTrendToNumeric(domain.trend)),
            
            // Sentiment Correlation Fields
            sentimentCorrelationFields: {
                domainCategory: this.categorizeDomain(domain.domain),
                brandStrength: this.calculateBrandStrength(domain),
                marketPosition: this.calculateMarketPosition(domain),
                stabilityScore: this.calculateStabilityScore(domain),
                momentumScore: this.calculateMomentumScore(domain)
            }
        }));
        
        // Calculate aggregate statistics
        this.calculateAggregateStats();
        
        // Generate correlation field descriptions
        this.generateCorrelationFieldDescriptions();
        
        console.log(`✅ Processed ${this.exportData.domains.length} domains for sentiment analysis`);
    }

    /**
     * Parse trend string to numeric value
     */
    parseTrendToNumeric(trendString) {
        if (!trendString) return 0;
        const numericValue = parseFloat(trendString.replace('%', ''));
        return isNaN(numericValue) ? 0 : numericValue;
    }

    /**
     * Calculate model consensus percentage
     */
    calculateConsensus(domain) {
        const total = domain.modelsPositive + domain.modelsNeutral + domain.modelsNegative;
        if (total === 0) return 0;
        return (domain.modelsPositive / total) * 100;
    }

    /**
     * Calculate risk level based on score and trend
     */
    calculateRiskLevel(domain) {
        const score = domain.score;
        const trend = this.parseTrendToNumeric(domain.trend);
        
        if (score < 60 && trend < -5) return 'CRITICAL';
        if (score < 70 && trend < -3) return 'HIGH';
        if (score < 80 && trend < -2) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Categorize domain by type
     */
    categorizeDomain(domainName) {
        const domain = domainName.toLowerCase();
        
        if (domain.includes('google') || domain.includes('microsoft') || domain.includes('apple') || 
            domain.includes('amazon') || domain.includes('meta') || domain.includes('netflix')) {
            return 'TECH_GIANT';
        }
        
        if (domain.includes('ai') || domain.includes('openai') || domain.includes('anthropic') || 
            domain.includes('huggingface') || domain.includes('deepmind')) {
            return 'AI_ML';
        }
        
        if (domain.includes('bank') || domain.includes('finance') || domain.includes('pay') || 
            domain.includes('crypto') || domain.includes('coin')) {
            return 'FINTECH';
        }
        
        if (domain.includes('shop') || domain.includes('commerce') || domain.includes('retail') || 
            domain.includes('store')) {
            return 'ECOMMERCE';
        }
        
        if (domain.includes('media') || domain.includes('news') || domain.includes('social') || 
            domain.includes('youtube') || domain.includes('twitter')) {
            return 'MEDIA';
        }
        
        return 'OTHER';
    }

    /**
     * Calculate brand strength indicator
     */
    calculateBrandStrength(domain) {
        const baseScore = domain.score;
        const consensus = this.calculateConsensus(domain);
        const stability = Math.max(0, 100 - Math.abs(this.parseTrendToNumeric(domain.trend)) * 10);
        
        return (baseScore * 0.5 + consensus * 0.3 + stability * 0.2);
    }

    /**
     * Calculate market position
     */
    calculateMarketPosition(domain) {
        const score = domain.score;
        
        if (score >= 90) return 'LEADER';
        if (score >= 80) return 'STRONG';
        if (score >= 70) return 'COMPETITIVE';
        if (score >= 60) return 'EMERGING';
        return 'CHALLENGER';
    }

    /**
     * Calculate stability score
     */
    calculateStabilityScore(domain) {
        const volatility = Math.abs(this.parseTrendToNumeric(domain.trend));
        return Math.max(0, 100 - (volatility * 5));
    }

    /**
     * Calculate momentum score
     */
    calculateMomentumScore(domain) {
        const trend = this.parseTrendToNumeric(domain.trend);
        const consensus = this.calculateConsensus(domain);
        
        return (trend * consensus) / 100;
    }

    /**
     * Calculate aggregate statistics
     */
    calculateAggregateStats() {
        const domains = this.exportData.domains;
        
        this.exportData.aggregateStats = {
            totalDomains: domains.length,
            averageScore: domains.reduce((sum, d) => sum + d.aiMemoryScore, 0) / domains.length,
            averageTrend: domains.reduce((sum, d) => sum + d.trendNumeric, 0) / domains.length,
            averageConsensus: domains.reduce((sum, d) => sum + d.modelConsensus, 0) / domains.length,
            
            scoreDistribution: {
                excellent: domains.filter(d => d.aiMemoryScore >= 90).length,
                good: domains.filter(d => d.aiMemoryScore >= 80 && d.aiMemoryScore < 90).length,
                average: domains.filter(d => d.aiMemoryScore >= 70 && d.aiMemoryScore < 80).length,
                poor: domains.filter(d => d.aiMemoryScore < 70).length
            },
            
            riskDistribution: {
                critical: domains.filter(d => d.riskLevel === 'CRITICAL').length,
                high: domains.filter(d => d.riskLevel === 'HIGH').length,
                medium: domains.filter(d => d.riskLevel === 'MEDIUM').length,
                low: domains.filter(d => d.riskLevel === 'LOW').length
            },
            
            categoryDistribution: domains.reduce((acc, domain) => {
                const category = domain.sentimentCorrelationFields.domainCategory;
                acc[category] = (acc[category] || 0) + 1;
                return acc;
            }, {}),
            
            trendAnalysis: {
                rising: domains.filter(d => d.trendNumeric > 2).length,
                stable: domains.filter(d => Math.abs(d.trendNumeric) <= 2).length,
                declining: domains.filter(d => d.trendNumeric < -2).length
            }
        };
    }

    /**
     * Generate correlation field descriptions for sentiment analyzer
     */
    generateCorrelationFieldDescriptions() {
        this.exportData.correlationFields = {
            primaryCorrelationTargets: {
                aiMemoryScore: {
                    description: "Primary AI memory intelligence score (0-100)",
                    correlationPotential: "HIGH",
                    expectedSentimentCorrelation: "Positive correlation with positive sentiment"
                },
                trendNumeric: {
                    description: "Trend direction and magnitude (-100 to +100)",
                    correlationPotential: "HIGH",
                    expectedSentimentCorrelation: "Strong correlation with sentiment momentum"
                },
                modelConsensus: {
                    description: "Percentage of AI models with positive assessment",
                    correlationPotential: "MEDIUM",
                    expectedSentimentCorrelation: "Moderate correlation with sentiment consistency"
                }
            },
            
            secondaryCorrelationTargets: {
                brandStrength: {
                    description: "Composite brand strength indicator",
                    correlationPotential: "HIGH",
                    expectedSentimentCorrelation: "Strong correlation with brand sentiment"
                },
                stabilityScore: {
                    description: "Volatility-adjusted stability measure",
                    correlationPotential: "MEDIUM",
                    expectedSentimentCorrelation: "Inverse correlation with sentiment volatility"
                },
                momentumScore: {
                    description: "Trend-weighted momentum indicator",
                    correlationPotential: "HIGH",
                    expectedSentimentCorrelation: "Strong correlation with sentiment momentum"
                }
            },
            
            categoricalCorrelationTargets: {
                domainCategory: {
                    description: "Business sector classification",
                    correlationPotential: "MEDIUM",
                    expectedSentimentCorrelation: "Sector-specific sentiment patterns"
                },
                marketPosition: {
                    description: "Competitive market positioning",
                    correlationPotential: "HIGH",
                    expectedSentimentCorrelation: "Position-dependent sentiment patterns"
                },
                riskLevel: {
                    description: "AI memory risk assessment",
                    correlationPotential: "HIGH",
                    expectedSentimentCorrelation: "Inverse correlation with positive sentiment"
                }
            }
        };
    }

    /**
     * Generate time series data structure
     */
    generateTimeSeriesStructure() {
        this.exportData.timeSeriesData = {
            description: "Time series data structure for longitudinal correlation analysis",
            recommendedFrequency: "daily",
            keyMetrics: [
                "aiMemoryScore",
                "trendNumeric", 
                "modelConsensus",
                "brandStrength",
                "stabilityScore"
            ],
            correlationWindows: {
                shortTerm: "7 days",
                mediumTerm: "30 days",
                longTerm: "90 days"
            },
            suggestedAnalysis: [
                "Lead-lag correlation analysis",
                "Sentiment momentum vs AI memory momentum",
                "Volatility correlation patterns",
                "Sector-specific correlation coefficients"
            ]
        };
    }

    /**
     * Export data to files
     */
    async exportData() {
        console.log('💾 Exporting data for sentiment analyzer...');
        
        // Generate time series structure
        this.generateTimeSeriesStructure();
        
        // Main export file
        await fs.promises.writeFile(
            'sentiment_analyzer_export.json', 
            JSON.stringify(this.exportData, null, 2)
        );
        
        // Simplified correlation-ready format
        const correlationData = {
            domains: this.exportData.domains.map(d => ({
                domain: d.domain,
                aiMemoryScore: d.aiMemoryScore,
                trend: d.trendNumeric,
                consensus: d.modelConsensus,
                brandStrength: d.sentimentCorrelationFields.brandStrength,
                category: d.sentimentCorrelationFields.domainCategory,
                riskLevel: d.riskLevel,
                lastUpdated: d.lastUpdated
            })),
            stats: this.exportData.aggregateStats
        };
        
        await fs.promises.writeFile(
            'correlation_ready_data.json',
            JSON.stringify(correlationData, null, 2)
        );
        
        // CSV format for easy analysis
        const csvData = this.generateCSV();
        await fs.promises.writeFile('ai_memory_data.csv', csvData);
        
        console.log('✅ Data exported successfully!');
        console.log('📁 Files created:');
        console.log('  - sentiment_analyzer_export.json (comprehensive)');
        console.log('  - correlation_ready_data.json (simplified)');
        console.log('  - ai_memory_data.csv (analysis ready)');
    }

    /**
     * Generate CSV format
     */
    generateCSV() {
        const headers = [
            'domain',
            'aiMemoryScore',
            'trend',
            'modelConsensus',
            'brandStrength',
            'category',
            'marketPosition',
            'riskLevel',
            'stabilityScore',
            'momentumScore',
            'lastUpdated'
        ];
        
        const rows = this.exportData.domains.map(d => [
            d.domain,
            d.aiMemoryScore,
            d.trendNumeric,
            d.modelConsensus,
            d.sentimentCorrelationFields.brandStrength,
            d.sentimentCorrelationFields.domainCategory,
            d.sentimentCorrelationFields.marketPosition,
            d.riskLevel,
            d.sentimentCorrelationFields.stabilityScore,
            d.sentimentCorrelationFields.momentumScore,
            d.lastUpdated
        ]);
        
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    /**
     * Generate summary report
     */
    generateSummaryReport() {
        const stats = this.exportData.aggregateStats;
        
        console.log('\n📊 Sentiment Analyzer Data Export Summary');
        console.log('==========================================');
        console.log(`📈 Total Domains: ${stats.totalDomains}`);
        console.log(`📊 Average AI Memory Score: ${stats.averageScore.toFixed(1)}`);
        console.log(`📈 Average Trend: ${stats.averageTrend.toFixed(1)}%`);
        console.log(`🤖 Average Model Consensus: ${stats.averageConsensus.toFixed(1)}%`);
        
        console.log('\n🎯 Score Distribution:');
        console.log(`  Excellent (90+): ${stats.scoreDistribution.excellent}`);
        console.log(`  Good (80-89): ${stats.scoreDistribution.good}`);
        console.log(`  Average (70-79): ${stats.scoreDistribution.average}`);
        console.log(`  Poor (<70): ${stats.scoreDistribution.poor}`);
        
        console.log('\n⚠️ Risk Distribution:');
        console.log(`  Critical: ${stats.riskDistribution.critical}`);
        console.log(`  High: ${stats.riskDistribution.high}`);
        console.log(`  Medium: ${stats.riskDistribution.medium}`);
        console.log(`  Low: ${stats.riskDistribution.low}`);
        
        console.log('\n📈 Trend Analysis:');
        console.log(`  Rising: ${stats.trendAnalysis.rising}`);
        console.log(`  Stable: ${stats.trendAnalysis.stable}`);
        console.log(`  Declining: ${stats.trendAnalysis.declining}`);
        
        console.log('\n🔗 Correlation Recommendations:');
        console.log('  1. Primary: AI Memory Score vs Overall Sentiment');
        console.log('  2. Secondary: Trend vs Sentiment Momentum');
        console.log('  3. Tertiary: Brand Strength vs Brand Sentiment');
        console.log('  4. Risk Level vs Negative Sentiment Spikes');
        
        console.log('\n✅ Data ready for sentiment correlation analysis!');
    }

    /**
     * Run complete export process
     */
    async runExport() {
        console.log('🚀 Starting Sentiment Analyzer Data Export...\n');
        
        // Fetch data
        const success = await this.fetchAllData();
        if (!success) {
            console.error('❌ Failed to fetch data');
            return;
        }
        
        // Process data
        this.processDataForSentimentAnalysis();
        
        // Export files
        await this.exportData();
        
        // Generate summary
        this.generateSummaryReport();
        
        return this.exportData;
    }
}

// Main execution
async function main() {
    const exporter = new SentimentAnalyzerDataExport();
    await exporter.runExport();
}

// Export for use as module
module.exports = SentimentAnalyzerDataExport;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
} 