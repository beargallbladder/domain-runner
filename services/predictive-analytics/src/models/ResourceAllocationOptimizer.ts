import { Pool } from 'pg';
import { Logger } from 'winston';

export interface ResourceAllocation {
  allocation_id: string;
  total_budget: number;
  recommendations: Array<{
    category: string;
    allocation_percentage: number;
    amount: number;
    rationale: string;
    expected_roi: number;
    risk_level: string;
    priority: number;
    timeframe: string;
    success_metrics: string[];
  }>;
  optimization_strategy: string;
  expected_outcomes: string[];
  risk_assessment: string;
  timeline: string;
  performance_metrics: string[];
  scenario_analysis: {
    conservative: any;
    moderate: any;
    aggressive: any;
  };
  competitive_considerations: {
    defensive_allocation: number;
    offensive_allocation: number;
    innovation_allocation: number;
  };
}

export class ResourceAllocationOptimizer {
  private pool: Pool;
  private logger: Logger;
  private allocationCategories = {
    // Defensive strategies
    market_defense: {
      weight: 0.3,
      roi_range: [0.8, 1.2],
      risk: 'low',
      timeframe: '3-6 months'
    },
    competitive_response: {
      weight: 0.2,
      roi_range: [0.9, 1.4],
      risk: 'medium',
      timeframe: '1-3 months'
    },
    brand_protection: {
      weight: 0.15,
      roi_range: [0.7, 1.1],
      risk: 'low',
      timeframe: '6-12 months'
    },
    
    // Offensive strategies
    market_expansion: {
      weight: 0.25,
      roi_range: [1.2, 2.0],
      risk: 'high',
      timeframe: '6-18 months'
    },
    innovation_investment: {
      weight: 0.2,
      roi_range: [1.0, 3.0],
      risk: 'high',
      timeframe: '12-24 months'
    },
    acquisition_opportunities: {
      weight: 0.15,
      roi_range: [1.1, 2.5],
      risk: 'medium',
      timeframe: '6-12 months'
    },
    
    // Operational efficiency
    process_optimization: {
      weight: 0.1,
      roi_range: [1.3, 1.8],
      risk: 'low',
      timeframe: '3-9 months'
    },
    technology_upgrade: {
      weight: 0.15,
      roi_range: [1.1, 1.6],
      risk: 'medium',
      timeframe: '6-18 months'
    },
    talent_acquisition: {
      weight: 0.1,
      roi_range: [1.2, 2.0],
      risk: 'medium',
      timeframe: '3-12 months'
    }
  };

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  async optimizeAllocation(
    domain: string,
    competitiveLandscape: any,
    growthOpportunities: any,
    config: any
  ): Promise<ResourceAllocation> {
    try {
      this.logger.info('💰 Optimizing resource allocation', { domain, budget: config.budget });

      const allocationId = `allocation_${domain}_${Date.now()}`;
      const totalBudget = config.budget;
      const objectives = config.objectives || ['growth', 'defense', 'innovation'];
      const riskTolerance = config.riskTolerance || 'medium';
      const timeframe = config.timeframe || '12months';

      // Analyze current market position and competitive pressure
      const marketPosition = await this.analyzeMarketPosition(domain);
      const competitivePressure = await this.assessCompetitivePressure(domain);
      const growthPotential = await this.evaluateGrowthPotential(domain);

      // Determine optimal allocation strategy
      const strategy = this.determineOptimizationStrategy(
        marketPosition,
        competitivePressure,
        growthPotential,
        objectives,
        riskTolerance
      );

      // Generate allocation recommendations
      const recommendations = await this.generateAllocationRecommendations(
        domain,
        totalBudget,
        strategy,
        marketPosition,
        competitivePressure,
        config
      );

      // Perform scenario analysis
      const scenarioAnalysis = this.performScenarioAnalysis(recommendations, totalBudget);

      // Calculate competitive considerations
      const competitiveConsiderations = this.calculateCompetitiveAllocations(
        recommendations,
        competitivePressure
      );

      // Generate expected outcomes and metrics
      const expectedOutcomes = this.generateExpectedOutcomes(recommendations, strategy);
      const performanceMetrics = this.definePerformanceMetrics(recommendations);

      const result: ResourceAllocation = {
        allocation_id: allocationId,
        total_budget: totalBudget,
        recommendations,
        optimization_strategy: strategy,
        expected_outcomes: expectedOutcomes,
        risk_assessment: this.assessAllocationRisk(recommendations, riskTolerance),
        timeline: timeframe,
        performance_metrics: performanceMetrics,
        scenario_analysis: scenarioAnalysis,
        competitive_considerations: competitiveConsiderations
      };

      this.logger.info('✅ Resource allocation optimization completed', {
        domain,
        strategy,
        totalRecommendations: recommendations.length,
        expectedROI: this.calculateWeightedROI(recommendations)
      });

      return result;

    } catch (error) {
      this.logger.error('Resource allocation optimization failed', { 
        error: error.message, 
        domain 
      });
      throw new Error(`Resource allocation optimization failed: ${error.message}`);
    }
  }

  private async analyzeMarketPosition(domain: string): Promise<any> {
    const query = `
      SELECT 
        AVG(CASE 
          WHEN dr.response LIKE '%#1%' THEN 1
          WHEN dr.response LIKE '%#2%' THEN 2
          WHEN dr.response LIKE '%#3%' THEN 3
          WHEN dr.response LIKE '%#4%' THEN 4
          WHEN dr.response LIKE '%#5%' THEN 5
          ELSE 10
        END) as avg_position,
        COUNT(dr.id) as mention_count,
        COUNT(CASE WHEN dr.response ILIKE '%leader%' OR dr.response ILIKE '%leading%' THEN 1 END) as leadership_mentions,
        COUNT(CASE WHEN dr.response ILIKE '%strong%' OR dr.response ILIKE '%dominant%' THEN 1 END) as strength_mentions
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.domain = $1
        AND dr.created_at > NOW() - INTERVAL '30 days'
    `;

    const result = await this.pool.query(query, [domain]);
    const row = result.rows[0];

    return {
      average_position: row.avg_position || 10,
      mention_frequency: row.mention_count || 0,
      leadership_score: (row.leadership_mentions || 0) / Math.max(1, row.mention_count || 1),
      strength_score: (row.strength_mentions || 0) / Math.max(1, row.mention_count || 1),
      market_strength: this.calculateMarketStrength(row.avg_position, row.mention_count)
    };
  }

  private async assessCompetitivePressure(domain: string): Promise<any> {
    const query = `
      WITH competitor_data AS (
        SELECT 
          d.domain as competitor,
          AVG(CASE 
            WHEN dr.response LIKE '%#1%' THEN 1
            WHEN dr.response LIKE '%#2%' THEN 2
            WHEN dr.response LIKE '%#3%' THEN 3
            WHEN dr.response LIKE '%#4%' THEN 4
            WHEN dr.response LIKE '%#5%' THEN 5
            ELSE 10
          END) as avg_position,
          COUNT(dr.id) as mention_count
        FROM domains d
        JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE d.cohort IN (
          SELECT DISTINCT cohort FROM domains WHERE domain = $1
        )
        AND d.domain != $1
        AND dr.created_at > NOW() - INTERVAL '30 days'
        GROUP BY d.domain
        HAVING COUNT(dr.id) > 5
      )
      SELECT 
        COUNT(*) as competitor_count,
        AVG(avg_position) as avg_competitor_position,
        COUNT(CASE WHEN avg_position < 5 THEN 1 END) as strong_competitors,
        MAX(mention_count) as max_competitor_mentions
      FROM competitor_data
    `;

    const result = await this.pool.query(query, [domain]);
    const row = result.rows[0];

    return {
      competitor_count: row.competitor_count || 0,
      average_competitor_position: row.avg_competitor_position || 10,
      strong_competitors: row.strong_competitors || 0,
      max_competitor_activity: row.max_competitor_mentions || 0,
      pressure_level: this.calculatePressureLevel(row)
    };
  }

  private async evaluateGrowthPotential(domain: string): Promise<any> {
    // Simplified growth potential evaluation
    const marketPosition = await this.analyzeMarketPosition(domain);
    
    return {
      market_expansion_potential: marketPosition.average_position > 5 ? 0.8 : 0.6,
      innovation_opportunity: 0.7, // Placeholder
      acquisition_targets: 0.5, // Placeholder
      technology_advancement: 0.6 // Placeholder
    };
  }

  private determineOptimizationStrategy(
    marketPosition: any,
    competitivePressure: any,
    growthPotential: any,
    objectives: string[],
    riskTolerance: string
  ): string {
    const isMarketLeader = marketPosition.average_position <= 3;
    const highPressure = competitivePressure.pressure_level > 0.7;
    const highGrowthPotential = growthPotential.market_expansion_potential > 0.6;

    if (isMarketLeader && !highPressure) {
      return 'aggressive_growth';
    } else if (isMarketLeader && highPressure) {
      return 'defensive_leadership';
    } else if (!isMarketLeader && highGrowthPotential) {
      return 'competitive_catch_up';
    } else if (highPressure) {
      return 'market_defense';
    } else {
      return 'balanced_growth';
    }
  }

  private async generateAllocationRecommendations(
    domain: string,
    totalBudget: number,
    strategy: string,
    marketPosition: any,
    competitivePressure: any,
    config: any
  ): Promise<Array<any>> {
    const recommendations = [];
    const strategyWeights = this.getStrategyWeights(strategy);

    // Generate recommendations for each category
    for (const [category, categoryConfig] of Object.entries(this.allocationCategories)) {
      const weight = strategyWeights[category] || categoryConfig.weight;
      const adjustedWeight = this.adjustWeightForContext(
        weight,
        category,
        marketPosition,
        competitivePressure
      );

      if (adjustedWeight > 0.05) { // Only include if allocation is meaningful
        const amount = Math.round(totalBudget * adjustedWeight);
        const expectedROI = this.calculateExpectedROI(category, marketPosition, competitivePressure);

        recommendations.push({
          category: this.formatCategoryName(category),
          allocation_percentage: Math.round(adjustedWeight * 100),
          amount,
          rationale: this.generateRationale(category, strategy, marketPosition, competitivePressure),
          expected_roi: expectedROI,
          risk_level: categoryConfig.risk,
          priority: this.calculatePriority(category, strategy, adjustedWeight),
          timeframe: categoryConfig.timeframe,
          success_metrics: this.getSuccessMetrics(category)
        });
      }
    }

    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);

    // Normalize allocations to ensure they sum to 100%
    const totalAllocation = recommendations.reduce((sum, rec) => sum + rec.allocation_percentage, 0);
    if (totalAllocation !== 100) {
      recommendations.forEach(rec => {
        rec.allocation_percentage = Math.round((rec.allocation_percentage / totalAllocation) * 100);
        rec.amount = Math.round(totalBudget * (rec.allocation_percentage / 100));
      });
    }

    return recommendations;
  }

  private getStrategyWeights(strategy: string): Record<string, number> {
    const strategies: Record<string, Record<string, number>> = {
      aggressive_growth: {
        market_expansion: 0.35,
        innovation_investment: 0.25,
        acquisition_opportunities: 0.20,
        technology_upgrade: 0.15,
        market_defense: 0.05
      },
      defensive_leadership: {
        market_defense: 0.30,
        competitive_response: 0.25,
        brand_protection: 0.20,
        process_optimization: 0.15,
        innovation_investment: 0.10
      },
      competitive_catch_up: {
        competitive_response: 0.30,
        innovation_investment: 0.25,
        market_expansion: 0.20,
        technology_upgrade: 0.15,
        talent_acquisition: 0.10
      },
      market_defense: {
        market_defense: 0.35,
        competitive_response: 0.25,
        brand_protection: 0.20,
        process_optimization: 0.15,
        technology_upgrade: 0.05
      },
      balanced_growth: {
        market_expansion: 0.25,
        innovation_investment: 0.20,
        market_defense: 0.20,
        technology_upgrade: 0.15,
        competitive_response: 0.10,
        process_optimization: 0.10
      }
    };

    return strategies[strategy] || strategies.balanced_growth;
  }

  private adjustWeightForContext(
    baseWeight: number,
    category: string,
    marketPosition: any,
    competitivePressure: any
  ): number {
    let adjustedWeight = baseWeight;

    // Adjust based on market position
    if (marketPosition.average_position <= 3) {
      // Market leader adjustments
      if (category.includes('defense') || category.includes('protection')) {
        adjustedWeight *= 0.8; // Less defensive needed
      } else if (category.includes('expansion') || category.includes('innovation')) {
        adjustedWeight *= 1.2; // More growth focus
      }
    } else if (marketPosition.average_position > 7) {
      // Trailing position adjustments
      if (category.includes('response') || category.includes('expansion')) {
        adjustedWeight *= 1.3; // More aggressive needed
      }
    }

    // Adjust based on competitive pressure
    if (competitivePressure.pressure_level > 0.7) {
      if (category.includes('defense') || category.includes('response')) {
        adjustedWeight *= 1.4; // Higher defensive allocation
      } else if (category.includes('expansion')) {
        adjustedWeight *= 0.8; // Less expansion in high pressure
      }
    }

    return Math.min(0.5, Math.max(0, adjustedWeight)); // Cap at 50% for any single category
  }

  private calculateExpectedROI(
    category: string,
    marketPosition: any,
    competitivePressure: any
  ): number {
    const categoryConfig = this.allocationCategories[category as keyof typeof this.allocationCategories];
    const [minROI, maxROI] = categoryConfig.roi_range;

    // Adjust ROI based on context
    let roiMultiplier = 1.0;

    if (marketPosition.average_position <= 3) {
      roiMultiplier += 0.1; // Leader premium
    } else if (marketPosition.average_position > 7) {
      roiMultiplier -= 0.1; // Trailing penalty
    }

    if (competitivePressure.pressure_level > 0.7) {
      roiMultiplier -= 0.05; // High pressure reduces efficiency
    }

    const avgROI = (minROI + maxROI) / 2;
    return Math.round((avgROI * roiMultiplier) * 100) / 100;
  }

  private generateRationale(
    category: string,
    strategy: string,
    marketPosition: any,
    competitivePressure: any
  ): string {
    const rationales: Record<string, string> = {
      market_defense: `Protect current market position (avg rank: ${Math.round(marketPosition.average_position)}) against competitive pressure`,
      competitive_response: `Counter competitive threats with ${competitivePressure.strong_competitors} strong competitors identified`,
      brand_protection: `Maintain brand strength and market positioning in competitive environment`,
      market_expansion: `Capitalize on growth opportunities with current market strength`,
      innovation_investment: `Drive future growth through innovation and technology advancement`,
      acquisition_opportunities: `Strategic acquisitions to strengthen market position and capabilities`,
      process_optimization: `Improve operational efficiency and cost management`,
      technology_upgrade: `Modernize technology stack for competitive advantage`,
      talent_acquisition: `Attract top talent to support growth and competitive positioning`
    };

    return rationales[category] || `Strategic investment in ${category} aligned with ${strategy} strategy`;
  }

  private calculatePriority(category: string, strategy: string, weight: number): number {
    // Priority score from 1-10 based on strategy alignment and weight
    const strategyPriorities: Record<string, Record<string, number>> = {
      aggressive_growth: {
        market_expansion: 10,
        innovation_investment: 9,
        acquisition_opportunities: 8,
        technology_upgrade: 7,
        talent_acquisition: 6
      },
      defensive_leadership: {
        market_defense: 10,
        competitive_response: 9,
        brand_protection: 8,
        process_optimization: 7,
        innovation_investment: 6
      }
    };

    const basePriority = strategyPriorities[strategy]?.[category] || 5;
    const weightBonus = Math.round(weight * 20); // Weight contributes 0-10 points
    
    return Math.min(10, basePriority + weightBonus);
  }

  private getSuccessMetrics(category: string): string[] {
    const metrics: Record<string, string[]> = {
      market_defense: ['Market share retention', 'Competitive displacement prevention', 'Brand sentiment scores'],
      competitive_response: ['Response time to competitive moves', 'Market position maintenance', 'Customer retention rate'],
      brand_protection: ['Brand awareness scores', 'Sentiment analysis', 'Share of voice'],
      market_expansion: ['New market penetration', 'Revenue growth rate', 'Customer acquisition cost'],
      innovation_investment: ['New product launches', 'Patent applications', 'Innovation pipeline value'],
      acquisition_opportunities: ['Deal completion rate', 'Integration success', 'Synergy realization'],
      process_optimization: ['Operational efficiency gains', 'Cost reduction achieved', 'Process cycle time'],
      technology_upgrade: ['System performance improvements', 'User adoption rates', 'Technical debt reduction'],
      talent_acquisition: ['Key hire success rate', 'Time to productivity', 'Retention of new hires']
    };

    return metrics[category] || ['ROI achievement', 'Milestone completion', 'Stakeholder satisfaction'];
  }

  private performScenarioAnalysis(recommendations: any[], totalBudget: number): any {
    // Conservative scenario: Reduce high-risk allocations
    const conservative = recommendations.map(rec => ({
      ...rec,
      allocation_percentage: rec.risk_level === 'high' ? 
        Math.round(rec.allocation_percentage * 0.7) : rec.allocation_percentage,
      expected_roi: rec.expected_roi * 0.9
    }));

    // Moderate scenario: Current recommendations
    const moderate = [...recommendations];

    // Aggressive scenario: Increase growth allocations
    const aggressive = recommendations.map(rec => ({
      ...rec,
      allocation_percentage: (rec.category.includes('expansion') || rec.category.includes('innovation')) ? 
        Math.round(rec.allocation_percentage * 1.3) : rec.allocation_percentage,
      expected_roi: rec.expected_roi * 1.1
    }));

    return { conservative, moderate, aggressive };
  }

  private calculateCompetitiveAllocations(recommendations: any[], competitivePressure: any): any {
    const totalAllocation = 100;
    
    const defensiveCategories = ['market_defense', 'competitive_response', 'brand_protection'];
    const offensiveCategories = ['market_expansion', 'acquisition_opportunities'];
    const innovationCategories = ['innovation_investment', 'technology_upgrade'];

    const defensiveAllocation = recommendations
      .filter(rec => defensiveCategories.some(cat => rec.category.toLowerCase().includes(cat.replace('_', ' '))))
      .reduce((sum, rec) => sum + rec.allocation_percentage, 0);

    const offensiveAllocation = recommendations
      .filter(rec => offensiveCategories.some(cat => rec.category.toLowerCase().includes(cat.replace('_', ' '))))
      .reduce((sum, rec) => sum + rec.allocation_percentage, 0);

    const innovationAllocation = recommendations
      .filter(rec => innovationCategories.some(cat => rec.category.toLowerCase().includes(cat.replace('_', ' '))))
      .reduce((sum, rec) => sum + rec.allocation_percentage, 0);

    return {
      defensive_allocation: defensiveAllocation,
      offensive_allocation: offensiveAllocation,
      innovation_allocation: innovationAllocation
    };
  }

  private generateExpectedOutcomes(recommendations: any[], strategy: string): string[] {
    const outcomes = [];
    
    const totalExpectedROI = this.calculateWeightedROI(recommendations);
    outcomes.push(`Expected overall ROI of ${(totalExpectedROI * 100).toFixed(1)}%`);

    const highPriorityRecs = recommendations.filter(rec => rec.priority >= 8);
    if (highPriorityRecs.length > 0) {
      outcomes.push(`${highPriorityRecs.length} high-priority initiatives for immediate impact`);
    }

    const riskProfile = this.calculateRiskProfile(recommendations);
    outcomes.push(`${riskProfile} risk profile aligned with strategy`);

    outcomes.push(`Strategic alignment with ${strategy.replace('_', ' ')} approach`);

    return outcomes;
  }

  private definePerformanceMetrics(recommendations: any[]): string[] {
    const metrics = [
      'Overall portfolio ROI',
      'Budget utilization efficiency',
      'Strategic objective achievement',
      'Risk-adjusted returns'
    ];

    // Add category-specific metrics
    const uniqueCategories = [...new Set(recommendations.map(rec => rec.category))];
    uniqueCategories.forEach(category => {
      metrics.push(`${category} performance indicators`);
    });

    return metrics;
  }

  private assessAllocationRisk(recommendations: any[], riskTolerance: string): string {
    const riskLevels = recommendations.reduce((acc, rec) => {
      acc[rec.risk_level] = (acc[rec.risk_level] || 0) + rec.allocation_percentage;
      return acc;
    }, {} as Record<string, number>);

    const highRiskAllocation = riskLevels.high || 0;
    const mediumRiskAllocation = riskLevels.medium || 0;
    const lowRiskAllocation = riskLevels.low || 0;

    if (highRiskAllocation > 40) {
      return `High risk portfolio (${highRiskAllocation}% high-risk allocations) - requires strong risk management`;
    } else if (highRiskAllocation + mediumRiskAllocation > 60) {
      return `Moderate risk portfolio - balanced approach with managed risk exposure`;
    } else {
      return `Conservative portfolio - low risk exposure with steady returns expected`;
    }
  }

  private calculateWeightedROI(recommendations: any[]): number {
    const totalWeight = recommendations.reduce((sum, rec) => sum + rec.allocation_percentage, 0);
    const weightedROI = recommendations.reduce((sum, rec) => 
      sum + (rec.expected_roi * rec.allocation_percentage), 0);
    
    return totalWeight > 0 ? weightedROI / totalWeight : 0;
  }

  private calculateMarketStrength(avgPosition: number, mentionCount: number): string {
    if (avgPosition <= 3 && mentionCount > 20) return 'strong';
    if (avgPosition <= 5 && mentionCount > 10) return 'moderate';
    return 'weak';
  }

  private calculatePressureLevel(competitorData: any): number {
    const competitorCount = competitorData.competitor_count || 0;
    const strongCompetitors = competitorData.strong_competitors || 0;
    const avgPosition = competitorData.avg_competitor_position || 10;

    const densityPressure = Math.min(competitorCount / 10, 1);
    const qualityPressure = strongCompetitors / Math.max(1, competitorCount);
    const positionPressure = Math.max(0, (8 - avgPosition) / 8);

    return (densityPressure + qualityPressure + positionPressure) / 3;
  }

  private calculateRiskProfile(recommendations: any[]): string {
    const avgRisk = recommendations.reduce((sum, rec) => {
      const riskScore = rec.risk_level === 'high' ? 3 : rec.risk_level === 'medium' ? 2 : 1;
      return sum + (riskScore * rec.allocation_percentage);
    }, 0) / 100;

    if (avgRisk > 2.3) return 'High';
    if (avgRisk > 1.7) return 'Moderate';
    return 'Conservative';
  }

  private formatCategoryName(category: string): string {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}