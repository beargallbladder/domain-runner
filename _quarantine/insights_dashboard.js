#!/usr/bin/env node

const fs = require('fs');
const TimeSeriesAnalyzer = require('./time_series_analyzer');

/**
 * LLMPageRank Insights Dashboard Generator
 * 
 * Creates comprehensive visual dashboards and strategic intelligence reports
 */

class InsightsDashboard {
    constructor() {
        this.analyzer = new TimeSeriesAnalyzer();
        this.dashboardData = null;
    }

    /**
     * Generate HTML dashboard with charts and insights
     */
    generateHTMLDashboard(data) {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLMPageRank Intelligence Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .header h1 {
            color: #2c3e50;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            color: #7f8c8d;
            font-size: 1.2em;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: rgba(255, 255, 255, 0.95);
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 10px;
        }
        
        .stat-label {
            color: #7f8c8d;
            font-size: 1.1em;
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .chart-container {
            background: rgba(255, 255, 255, 0.95);
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .chart-title {
            font-size: 1.3em;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .insights-section {
            background: rgba(255, 255, 255, 0.95);
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .insights-title {
            font-size: 1.8em;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .insight-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
            border-left: 4px solid #3498db;
        }
        
        .insight-card.high {
            border-left-color: #e74c3c;
        }
        
        .insight-card.medium {
            border-left-color: #f39c12;
        }
        
        .insight-card.critical {
            border-left-color: #8e44ad;
        }
        
        .insight-type {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .insight-text {
            color: #5a6c7d;
            line-height: 1.5;
        }
        
        .recommendations {
            background: rgba(255, 255, 255, 0.95);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .recommendation-card {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
            border-left: 4px solid #27ae60;
        }
        
        .recommendation-card.high {
            background: #ffeaa7;
            border-left-color: #fdcb6e;
        }
        
        .recommendation-card.critical {
            background: #fab1a0;
            border-left-color: #e17055;
        }
        
        .domain-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        
        .domain-tag {
            background: #3498db;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        
        .timestamp {
            text-align: center;
            color: #7f8c8d;
            margin-top: 30px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 LLMPageRank Intelligence Dashboard</h1>
            <p class="subtitle">AI Memory & Competitive Intelligence Analysis</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${data.summary.totalDomains}</div>
                <div class="stat-label">Total Domains</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.summary.averageScore.toFixed(1)}</div>
                <div class="stat-label">Average Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.summary.risingDomains}</div>
                <div class="stat-label">Rising Domains</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.summary.fallingDomains}</div>
                <div class="stat-label">Declining Domains</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.summary.volatileDomains}</div>
                <div class="stat-label">Volatile Domains</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.summary.stableDomains}</div>
                <div class="stat-label">Stable Domains</div>
            </div>
        </div>
        
        <div class="charts-grid">
            <div class="chart-container">
                <h3 class="chart-title">Top 10 AI Memory Leaders</h3>
                <canvas id="topDomainsChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h3 class="chart-title">Trend Distribution</h3>
                <canvas id="trendChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h3 class="chart-title">Score Distribution</h3>
                <canvas id="scoreChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h3 class="chart-title">Rising Stars Performance</h3>
                <canvas id="risingChart"></canvas>
            </div>
        </div>
        
        <div class="insights-section">
            <h2 class="insights-title">🔍 Strategic Insights</h2>
            ${data.insights.map(insight => `
                <div class="insight-card ${insight.strategic_value.toLowerCase()}">
                    <div class="insight-type">${insight.title}</div>
                    <div class="insight-text">${insight.insight}</div>
                </div>
            `).join('')}
        </div>
        
        <div class="recommendations">
            <h2 class="insights-title">💡 Strategic Recommendations</h2>
            ${data.recommendations.map(rec => `
                <div class="recommendation-card ${rec.priority.toLowerCase()}">
                    <div class="insight-type">[${rec.priority}] ${rec.title}</div>
                    <div class="insight-text">${rec.rationale}</div>
                    <div class="insight-text"><strong>Action:</strong> ${rec.action}</div>
                    <div class="domain-list">
                        ${rec.domains.map(domain => `<span class="domain-tag">${domain}</span>`).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="timestamp">
            Generated on ${new Date(data.timestamp).toLocaleString()}
        </div>
    </div>
    
    <script>
        // Chart.js configuration
        Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        Chart.defaults.color = '#2c3e50';
        
        // Top Domains Chart
        const topDomainsCtx = document.getElementById('topDomainsChart').getContext('2d');
        new Chart(topDomainsCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(data.topDomains.slice(0, 10).map(d => d.domain))},
                datasets: [{
                    label: 'AI Memory Score',
                    data: ${JSON.stringify(data.topDomains.slice(0, 10).map(d => d.score))},
                    backgroundColor: 'rgba(52, 152, 219, 0.8)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
        
        // Trend Distribution Chart
        const trendCtx = document.getElementById('trendChart').getContext('2d');
        new Chart(trendCtx, {
            type: 'doughnut',
            data: {
                labels: ['Rising', 'Falling', 'Volatile', 'Stable'],
                datasets: [{
                    data: [
                        ${data.summary.risingDomains},
                        ${data.summary.fallingDomains},
                        ${data.summary.volatileDomains},
                        ${data.summary.stableDomains}
                    ],
                    backgroundColor: [
                        '#27ae60',
                        '#e74c3c',
                        '#f39c12',
                        '#3498db'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
        
        // Score Distribution Chart
        const scoreCtx = document.getElementById('scoreChart').getContext('2d');
        const scoreRanges = {
            'Excellent (90-100)': 0,
            'Good (80-89)': 0,
            'Average (70-79)': 0,
            'Below Average (60-69)': 0,
            'Poor (0-59)': 0
        };
        
        ${JSON.stringify(data.topDomains)}.forEach(domain => {
            if (domain.score >= 90) scoreRanges['Excellent (90-100)']++;
            else if (domain.score >= 80) scoreRanges['Good (80-89)']++;
            else if (domain.score >= 70) scoreRanges['Average (70-79)']++;
            else if (domain.score >= 60) scoreRanges['Below Average (60-69)']++;
            else scoreRanges['Poor (0-59)']++;
        });
        
        new Chart(scoreCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(scoreRanges),
                datasets: [{
                    label: 'Number of Domains',
                    data: Object.values(scoreRanges),
                    backgroundColor: [
                        '#27ae60',
                        '#2ecc71',
                        '#f39c12',
                        '#e67e22',
                        '#e74c3c'
                    ]
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Rising Stars Chart
        const risingCtx = document.getElementById('risingChart').getContext('2d');
        const risingData = ${JSON.stringify(data.trends.rising.slice(0, 8))};
        
        new Chart(risingCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Rising Stars',
                    data: risingData.map(d => ({
                        x: d.score,
                        y: d.trend,
                        label: d.domain
                    })),
                    backgroundColor: 'rgba(46, 204, 113, 0.8)',
                    borderColor: 'rgba(39, 174, 96, 1)',
                    pointRadius: 8
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'AI Memory Score'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Trend (%)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return risingData[context.dataIndex].domain + 
                                       ': Score ' + context.parsed.x + 
                                       ', Trend +' + context.parsed.y + '%';
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
        
        return html;
    }

    /**
     * Generate comprehensive analysis report
     */
    async generateAnalysisReport() {
        console.log('🚀 Generating comprehensive analysis report...\n');
        
        // Run the analysis
        const data = await this.analyzer.runAnalysis();
        this.dashboardData = data;
        
        // Generate HTML dashboard
        const html = this.generateHTMLDashboard(data);
        
        // Save dashboard
        await fs.promises.writeFile('llmpagerank_dashboard.html', html);
        console.log('📊 Dashboard saved to llmpagerank_dashboard.html');
        
        return {
            dashboard: 'llmpagerank_dashboard.html',
            data: data
        };
    }
}

// Main execution
async function main() {
    const dashboard = new InsightsDashboard();
    const result = await dashboard.generateAnalysisReport();
    
    console.log('\n🎉 Complete intelligence package generated!');
    console.log(`📊 Dashboard: ${result.dashboard}`);
    console.log(`📈 Data File: time_series_analysis.json`);
    
    return result;
}

// Export for use as module
module.exports = InsightsDashboard;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
} 