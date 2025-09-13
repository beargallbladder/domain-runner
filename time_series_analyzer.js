#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

/**
 * LLMPageRank Time Series Intelligence System
 * 
 * This system ingests domain intelligence data and creates:
 * 1. Time series analysis of domain performance
 * 2. Competitive intelligence insights
 * 3. Market trend predictions
 * 4. Anomaly detection
 * 5. Strategic recommendations
 */

class TimeSeriesAnalyzer {
    constructor() {
        this.apiBase = 'https://llm-pagerank-public-api.onrender.com';
        this.data = {
            domains: [],
            timeSeries: {},
            insights: [],
            alerts: [],
            trends: {}
        };
        this.thresholds = {
            significantChange: 5.0,  // 5% change threshold
            volatilityAlert: 10.0,   // 10% volatility alert
            riskThreshold: 70.0      // Below 70 score = high risk
        };
    }

    /**
     * Fetch current domain rankings
     */
    async fetchDomainRankings(limit = 100) {
        try {
            const response = await fetch(`${this.apiBase}/api/rankings?limit=${limit}`);
            const data = await response.json();
            
            console.log(`📊 Fetched ${data.domains.length} domains from ${data.totalDomains} total`);
            
            this.data.domains = data.domains;
            return data;
        } catch (error) {
            console.error('❌ Error fetching rankings:', error.message);
            return null;
        }
    }

    /**
     * Fetch time series data for specific domains
     */
    async fetchTimeSeriesData(domain) {
        try {
            const response = await fetch(`${this.apiBase}/api/time-series/${domain}`);
            const data = await response.json();
            
            this.data.timeSeries[domain] = data;
            return data;
        } catch (error) {
            console.error(`❌ Error fetching time series for ${domain}:`, error.message);
            return null;
        }
    }

    /**
     * Analyze domain performance trends
     */
    analyzeTrends() {
        const trends = {
            rising: [],
            falling: [],
            volatile: [],
            stable: []
        };

        this.data.domains.forEach(domain => {
            const trend = parseFloat(domain.trend.replace('%', ''));
            
            if (Math.abs(trend) >= this.thresholds.significantChange) {
                if (trend > 0) {
                    trends.rising.push({
                        domain: domain.domain,
                        score: domain.score,
                        trend: trend,
                        momentum: this.calculateMomentum(domain)
                    });
                } else {
                    trends.falling.push({
                        domain: domain.domain,
                        score: domain.score,
                        trend: trend,
                        riskLevel: this.calculateRiskLevel(domain)
                    });
                }
            }

            if (Math.abs(trend) >= this.thresholds.volatilityAlert) {
                trends.volatile.push({
                    domain: domain.domain,
                    score: domain.score,
                    trend: trend,
                    volatility: Math.abs(trend)
                });
            }

            if (Math.abs(trend) < 2.0) {
                trends.stable.push({
                    domain: domain.domain,
                    score: domain.score,
                    trend: trend,
                    stability: this.calculateStability(domain)
                });
            }
        });

        // Sort by significance
        trends.rising.sort((a, b) => b.trend - a.trend);
        trends.falling.sort((a, b) => a.trend - b.trend);
        trends.volatile.sort((a, b) => b.volatility - a.volatility);
        trends.stable.sort((a, b) => b.score - a.score);

        this.data.trends = trends;
        return trends;
    }

    /**
     * Calculate momentum score
     */
    calculateMomentum(domain) {
        const trend = parseFloat(domain.trend.replace('%', ''));
        const modelConsensus = domain.modelsPositive / (domain.modelsPositive + domain.modelsNeutral + domain.modelsNegative);
        return (trend * modelConsensus * domain.score) / 100;
    }

    /**
     * Calculate risk level
     */
    calculateRiskLevel(domain) {
        const trend = parseFloat(domain.trend.replace('%', ''));
        const score = domain.score;
        
        if (score < this.thresholds.riskThreshold && trend < -5) {
            return 'CRITICAL';
        } else if (score < 75 && trend < -3) {
            return 'HIGH';
        } else if (trend < -2) {
            return 'MEDIUM';
        }
        return 'LOW';
    }

    /**
     * Calculate stability score
     */
    calculateStability(domain) {
        const modelConsensus = domain.modelsPositive / (domain.modelsPositive + domain.modelsNeutral + domain.modelsNegative);
        return modelConsensus * domain.score;
    }

    /**
     * Generate competitive intelligence insights
     */
    generateInsights() {
        const insights = [];
        const trends = this.data.trends;

        // Market Leaders Analysis
        const topPerformers = this.data.domains
            .filter(d => d.score > 80)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        insights.push({
            type: 'MARKET_LEADERS',
            title: 'AI Memory Market Leaders',
            data: topPerformers,
            insight: `${topPerformers.length} domains maintain AI memory scores above 80. ${topPerformers[0].domain} leads with ${topPerformers[0].score} score.`,
            strategic_value: 'HIGH'
        });

        // Rising Stars
        if (trends.rising.length > 0) {
            const topRising = trends.rising.slice(0, 5);
            insights.push({
                type: 'RISING_STARS',
                title: 'Emerging AI Memory Champions',
                data: topRising,
                insight: `${trends.rising.length} domains showing significant upward momentum. ${topRising[0].domain} leads with +${topRising[0].trend}% growth.`,
                strategic_value: 'HIGH'
            });
        }

        // Risk Alerts
        const criticalRisk = trends.falling.filter(d => this.calculateRiskLevel({
            score: d.score,
            trend: `${d.trend}%`
        }) === 'CRITICAL');

        if (criticalRisk.length > 0) {
            insights.push({
                type: 'CRITICAL_ALERTS',
                title: 'AI Memory Crisis Domains',
                data: criticalRisk,
                insight: `${criticalRisk.length} domains in critical AI memory decline. Immediate attention required.`,
                strategic_value: 'CRITICAL'
            });
        }

        // Volatility Analysis
        if (trends.volatile.length > 0) {
            const topVolatile = trends.volatile.slice(0, 5);
            insights.push({
                type: 'VOLATILITY_WATCH',
                title: 'AI Memory Volatility Alerts',
                data: topVolatile,
                insight: `${trends.volatile.length} domains showing high AI memory volatility. Market uncertainty detected.`,
                strategic_value: 'MEDIUM'
            });
        }

        // Stability Champions
        const topStable = trends.stable
            .filter(d => d.score > 75)
            .slice(0, 10);

        if (topStable.length > 0) {
            insights.push({
                type: 'STABILITY_CHAMPIONS',
                title: 'AI Memory Stability Leaders',
                data: topStable,
                insight: `${topStable.length} domains demonstrate consistent AI memory performance. Benchmark candidates.`,
                strategic_value: 'MEDIUM'
            });
        }

        this.data.insights = insights;
        return insights;
    }

    /**
     * Generate strategic recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const trends = this.data.trends;

        // Investment Opportunities
        const investmentTargets = trends.rising
            .filter(d => d.score > 70 && d.trend > 5)
            .slice(0, 5);

        if (investmentTargets.length > 0) {
            recommendations.push({
                type: 'INVESTMENT_OPPORTUNITY',
                priority: 'HIGH',
                title: 'AI Memory Investment Targets',
                domains: investmentTargets.map(d => d.domain),
                rationale: 'High-scoring domains with strong upward momentum indicate growing AI memory presence',
                action: 'Consider strategic partnerships or competitive analysis'
            });
        }

        // Competitive Threats
        const threats = trends.rising
            .filter(d => d.trend > 8)
            .slice(0, 3);

        if (threats.length > 0) {
            recommendations.push({
                type: 'COMPETITIVE_THREAT',
                priority: 'HIGH',
                title: 'Emerging AI Memory Competitors',
                domains: threats.map(d => d.domain),
                rationale: 'Rapid AI memory score growth indicates potential market disruption',
                action: 'Monitor closely and prepare defensive strategies'
            });
        }

        // Recovery Opportunities
        const recoveryTargets = trends.falling
            .filter(d => d.score > 65 && d.trend > -10)
            .slice(0, 5);

        if (recoveryTargets.length > 0) {
            recommendations.push({
                type: 'RECOVERY_OPPORTUNITY',
                priority: 'MEDIUM',
                title: 'AI Memory Recovery Candidates',
                domains: recoveryTargets.map(d => d.domain),
                rationale: 'Declining but still viable domains may offer acquisition opportunities',
                action: 'Evaluate for potential partnerships or acquisitions'
            });
        }

        return recommendations;
    }

    /**
     * Export time series data for frontend
     */
    exportTimeSeriesData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalDomains: this.data.domains.length,
                averageScore: this.data.domains.reduce((sum, d) => sum + d.score, 0) / this.data.domains.length,
                risingDomains: this.data.trends.rising.length,
                fallingDomains: this.data.trends.falling.length,
                volatileDomains: this.data.trends.volatile.length,
                stableDomains: this.data.trends.stable.length
            },
            trends: this.data.trends,
            insights: this.data.insights,
            recommendations: this.generateRecommendations(),
            topDomains: this.data.domains.slice(0, 20),
            alerts: this.data.alerts
        };

        return exportData;
    }

    /**
     * Save analysis to file
     */
    async saveAnalysis(filename = 'time_series_analysis.json') {
        const analysis = this.exportTimeSeriesData();
        
        try {
            await fs.promises.writeFile(filename, JSON.stringify(analysis, null, 2));
            console.log(`💾 Analysis saved to ${filename}`);
            return filename;
        } catch (error) {
            console.error('❌ Error saving analysis:', error.message);
            return null;
        }
    }

    /**
     * Generate executive summary
     */
    generateExecutiveSummary() {
        const summary = this.exportTimeSeriesData();
        
        console.log('\n🎯 LLMPageRank Intelligence Summary');
        console.log('=====================================');
        console.log(`📊 Total Domains Analyzed: ${summary.summary.totalDomains}`);
        console.log(`📈 Average AI Memory Score: ${summary.summary.averageScore.toFixed(1)}`);
        console.log(`🚀 Rising Domains: ${summary.summary.risingDomains}`);
        console.log(`📉 Declining Domains: ${summary.summary.fallingDomains}`);
        console.log(`⚡ Volatile Domains: ${summary.summary.volatileDomains}`);
        console.log(`🎯 Stable Domains: ${summary.summary.stableDomains}`);
        
        console.log('\n🔍 Key Insights:');
        summary.insights.forEach((insight, i) => {
            console.log(`${i + 1}. ${insight.title}: ${insight.insight}`);
        });
        
        console.log('\n💡 Strategic Recommendations:');
        summary.recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. [${rec.priority}] ${rec.title}: ${rec.action}`);
        });
        
        return summary;
    }

    /**
     * Run complete analysis
     */
    async runAnalysis() {
        console.log('🚀 Starting LLMPageRank Time Series Analysis...\n');
        
        // Fetch data
        await this.fetchDomainRankings(200);
        
        // Analyze trends
        this.analyzeTrends();
        
        // Generate insights
        this.generateInsights();
        
        // Save analysis
        await this.saveAnalysis();
        
        // Generate summary
        const summary = this.generateExecutiveSummary();
        
        console.log('\n✅ Analysis complete!');
        return summary;
    }
}

// Main execution
async function main() {
    const analyzer = new TimeSeriesAnalyzer();
    await analyzer.runAnalysis();
}

// Export for use as module
module.exports = TimeSeriesAnalyzer;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
} 