import { Pool } from 'pg';
import { Logger } from 'winston';

export interface MarketPositionPrediction {
  current_position: number;
  predicted_positions: Array<{
    timeframe: string;
    position: number;
    confidence: number;
    change_percentage: number;
  }>;
  trend_direction: 'rising' | 'declining' | 'stable' | 'volatile';
  momentum_score: number;
  competitive_pressure: number;
  market_share_projection: number;
  risk_factors: string[];
  opportunities: string[];
  threats: string[];
  strategic_recommendations: string[];
  position_volatility: number;
  peer_comparison: Array<{
    competitor: string;
    current_position: number;
    predicted_position: number;
    threat_level: number;
  }>;
}

export class MarketPositionPredictor {
  private pool: Pool;
  private logger: Logger;

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  async generatePredictions(
    domain: string, 
    historicalData: any, 
    config: any,
    joltAdjustments?: any
  ): Promise<MarketPositionPrediction> {
    try {
      this.logger.info('🎯 Generating market position predictions', { domain });

      // Get current market position
      const currentPosition = await this.getCurrentMarketPosition(domain);
      
      // Analyze historical trends
      const trendAnalysis = await this.analyzeTrends(historicalData);
      
      // Calculate momentum and competitive dynamics
      const momentum = await this.calculateMomentum(domain, historicalData);
      const competitivePressure = await this.assessCompetitivePressure(domain);
      
      // Generate multi-timeframe predictions
      const predictions = await this.generateTimeframePredictions(
        domain,
        currentPosition,
        trendAnalysis,
        momentum,
        config
      );

      // Apply JOLT adjustments if available
      if (joltAdjustments) {
        predictions.forEach(pred => {
          pred.confidence *= joltAdjustments.confidence_modifier || 1.0;
          pred.position += joltAdjustments.position_adjustment || 0;
        });
      }

      // Assess risks and opportunities
      const riskAssessment = await this.assessRisksAndOpportunities(domain, predictions);
      
      // Generate peer comparison
      const peerComparison = await this.generatePeerComparison(domain, predictions);
      
      // Strategic recommendations
      const recommendations = await this.generateStrategicRecommendations(
        domain,
        predictions,
        riskAssessment,
        momentum
      );

      const result: MarketPositionPrediction = {
        current_position: currentPosition,
        predicted_positions: predictions,
        trend_direction: this.determineTrendDirection(predictions),
        momentum_score: momentum,
        competitive_pressure: competitivePressure,
        market_share_projection: this.calculateMarketShareProjection(predictions),
        risk_factors: riskAssessment.risks,
        opportunities: riskAssessment.opportunities,
        threats: riskAssessment.threats,
        strategic_recommendations: recommendations,
        position_volatility: this.calculateVolatility(predictions),
        peer_comparison: peerComparison
      };

      this.logger.info('✅ Market position predictions generated', { 
        domain,
        currentPosition,
        trendDirection: result.trend_direction,
        momentumScore: result.momentum_score
      });

      return result;

    } catch (error) {
      this.logger.error('Market position prediction failed', { 
        error: error.message, 
        domain 
      });
      throw new Error(`Market position prediction failed: ${error.message}`);
    }
  }

  async getQuickPositionUpdate(domain: string): Promise<any> {
    try {
      // Get lightweight position update for real-time streaming
      const query = `
        SELECT 
          AVG(CASE 
            WHEN dr.response LIKE '%#1%' THEN 1
            WHEN dr.response LIKE '%#2%' THEN 2
            WHEN dr.response LIKE '%#3%' THEN 3
            WHEN dr.response LIKE '%#4%' THEN 4
            WHEN dr.response LIKE '%#5%' THEN 5
            ELSE 10
          END) as estimated_position,
          COUNT(*) as response_count,
          MAX(dr.created_at) as last_update
        FROM domain_responses dr
        JOIN domains d ON dr.domain_id = d.id
        WHERE d.domain = $1
          AND dr.created_at > NOW() - INTERVAL '24 hours'
      `;
      
      const result = await this.pool.query(query, [domain]);
      
      if (result.rows.length === 0) {
        return {
          estimated_position: null,
          confidence: 0,
          last_update: null,
          trend: 'unknown'
        };
      }

      const row = result.rows[0];
      return {
        estimated_position: Math.round(row.estimated_position || 10),
        confidence: Math.min(row.response_count * 0.1, 1.0),
        last_update: row.last_update,
        trend: 'stable' // Quick approximation
      };

    } catch (error) {
      this.logger.error('Quick position update failed', { error: error.message, domain });
      return { estimated_position: null, confidence: 0, last_update: null, trend: 'unknown' };
    }
  }

  private async getCurrentMarketPosition(domain: string): Promise<number> {
    // Analyze recent LLM responses to determine current market position
    const query = `
      SELECT 
        dr.response,
        dr.model,
        dr.created_at
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.domain = $1
        AND dr.created_at > NOW() - INTERVAL '30 days'
      ORDER BY dr.created_at DESC
      LIMIT 50
    `;
    
    const result = await this.pool.query(query, [domain]);
    
    if (result.rows.length === 0) {
      return 10; // Default position if no data
    }

    // Extract position information from LLM responses
    const positions = result.rows.map(row => this.extractPositionFromResponse(row.response));
    const validPositions = positions.filter(pos => pos > 0 && pos <= 20);
    
    if (validPositions.length === 0) {
      return 10;
    }

    // Calculate weighted average (more recent responses have higher weight)
    const weightedSum = validPositions.reduce((sum, pos, index) => {
      const weight = Math.exp(-index * 0.1); // Exponential decay
      return sum + (pos * weight);
    }, 0);
    
    const weightSum = validPositions.reduce((sum, _, index) => {
      return sum + Math.exp(-index * 0.1);
    }, 0);

    return Math.round(weightedSum / weightSum);
  }

  private extractPositionFromResponse(response: string): number {
    // Extract ranking position from LLM response text
    const patterns = [
      /#(\d+)/g,
      /rank\s*(\d+)/gi,
      /position\s*(\d+)/gi,
      /(\d+)(?:st|nd|rd|th)\s+place/gi
    ];

    for (const pattern of patterns) {
      const matches = response.match(pattern);
      if (matches) {
        const numbers = matches.map(match => {
          const num = parseInt(match.replace(/\D/g, ''));
          return isNaN(num) ? 0 : num;
        }).filter(num => num > 0 && num <= 20);
        
        if (numbers.length > 0) {
          return Math.min(...numbers); // Return the best (lowest) position found
        }
      }
    }

    return 0; // No position found
  }

  private async analyzeTrends(historicalData: any): Promise<any> {
    // Analyze historical trend patterns
    const responses = historicalData.responses || [];
    
    if (responses.length < 3) {
      return { trend: 'insufficient_data', slope: 0, r_squared: 0 };
    }

    // Extract positions over time
    const dataPoints = responses.map((response, index) => ({
      x: index,
      y: this.extractPositionFromResponse(response.response),
      timestamp: new Date(response.created_at).getTime()
    })).filter(point => point.y > 0);

    if (dataPoints.length < 3) {
      return { trend: 'insufficient_data', slope: 0, r_squared: 0 };
    }

    // Calculate linear regression
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0);
    const sumXY = dataPoints.reduce((sum, point) => sum + (point.x * point.y), 0);
    const sumXX = dataPoints.reduce((sum, point) => sum + (point.x * point.x), 0);
    const sumYY = dataPoints.reduce((sum, point) => sum + (point.y * point.y), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssRes = dataPoints.reduce((sum, point) => {
      const predicted = slope * point.x + intercept;
      return sum + Math.pow(point.y - predicted, 2);
    }, 0);
    const ssTot = dataPoints.reduce((sum, point) => {
      return sum + Math.pow(point.y - meanY, 2);
    }, 0);
    const rSquared = 1 - (ssRes / ssTot);

    let trendDirection = 'stable';
    if (Math.abs(slope) > 0.1) {
      trendDirection = slope > 0 ? 'declining' : 'improving'; // Lower position number = better
    }

    return {
      trend: trendDirection,
      slope,
      r_squared: rSquared,
      intercept,
      data_points: dataPoints.length
    };
  }

  private async calculateMomentum(domain: string, historicalData: any): Promise<number> {
    // Calculate momentum based on recent position changes
    const responses = historicalData.responses || [];
    
    if (responses.length < 5) {
      return 0; // No momentum with insufficient data
    }

    // Get positions from last 30 days vs previous 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentResponses = responses.filter(r => 
      new Date(r.created_at) > thirtyDaysAgo
    );
    const previousResponses = responses.filter(r => 
      new Date(r.created_at) > sixtyDaysAgo && new Date(r.created_at) <= thirtyDaysAgo
    );

    if (recentResponses.length === 0 || previousResponses.length === 0) {
      return 0;
    }

    const recentAvgPosition = this.calculateAveragePosition(recentResponses);
    const previousAvgPosition = this.calculateAveragePosition(previousResponses);

    // Momentum is the rate of change (negative because lower position is better)
    const momentum = (previousAvgPosition - recentAvgPosition) / 30; // Change per day

    // Normalize to -1 to 1 scale
    return Math.max(-1, Math.min(1, momentum));
  }

  private calculateAveragePosition(responses: any[]): number {
    const positions = responses.map(r => this.extractPositionFromResponse(r.response))
      .filter(pos => pos > 0 && pos <= 20);
    
    if (positions.length === 0) return 10;
    
    return positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
  }

  private async assessCompetitivePressure(domain: string): Promise<number> {
    // Assess competitive pressure based on category saturation and competitor strength
    const query = `
      SELECT 
        d.cohort,
        COUNT(*) as competitor_count,
        AVG(CASE 
          WHEN dr.response LIKE '%#1%' THEN 1
          WHEN dr.response LIKE '%#2%' THEN 2
          WHEN dr.response LIKE '%#3%' THEN 3
          WHEN dr.response LIKE '%#4%' THEN 4
          WHEN dr.response LIKE '%#5%' THEN 5
          ELSE 10
        END) as avg_position
      FROM domains d
      LEFT JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.cohort IN (
        SELECT DISTINCT cohort FROM domains WHERE domain = $1
      )
      AND d.domain != $1
      GROUP BY d.cohort
    `;
    
    const result = await this.pool.query(query, [domain]);
    
    if (result.rows.length === 0) {
      return 0.5; // Medium pressure if no data
    }

    const row = result.rows[0];
    const competitorCount = row.competitor_count || 0;
    const avgCompetitorPosition = row.avg_position || 10;

    // Higher competitor count and better competitor positions = higher pressure
    const densityPressure = Math.min(competitorCount / 20, 1); // Normalize to 0-1
    const qualityPressure = Math.max(0, (10 - avgCompetitorPosition) / 10); // Better positions = higher pressure

    return (densityPressure + qualityPressure) / 2;
  }

  private async generateTimeframePredictions(
    domain: string,
    currentPosition: number,
    trendAnalysis: any,
    momentum: number,
    config: any
  ): Promise<Array<{ timeframe: string; position: number; confidence: number; change_percentage: number; }>> {
    const timeframes = [
      { name: '1week', days: 7 },
      { name: '1month', days: 30 },
      { name: '3months', days: 90 },
      { name: '6months', days: 180 },
      { name: '1year', days: 365 }
    ];

    const predictions = [];

    for (const timeframe of timeframes) {
      // Apply trend and momentum to predict future position
      let predictedPosition = currentPosition;
      
      // Apply trend
      if (trendAnalysis.trend !== 'insufficient_data') {
        const trendImpact = trendAnalysis.slope * (timeframe.days / 30); // Monthly rate
        predictedPosition += trendImpact;
      }
      
      // Apply momentum
      const momentumImpact = momentum * (timeframe.days / 30);
      predictedPosition -= momentumImpact; // Negative because lower position is better
      
      // Add volatility based on timeframe
      const volatility = Math.log(timeframe.days / 7) * 0.5; // Increase uncertainty over time
      predictedPosition += (Math.random() - 0.5) * volatility;
      
      // Bound the position
      predictedPosition = Math.max(1, Math.min(20, Math.round(predictedPosition)));
      
      // Calculate confidence (decreases over time)
      let confidence = Math.max(0.1, 0.9 - (timeframe.days / 365) * 0.6);
      if (trendAnalysis.r_squared) {
        confidence *= trendAnalysis.r_squared;
      }
      
      // Calculate change percentage
      const changePercentage = ((currentPosition - predictedPosition) / currentPosition) * 100;
      
      predictions.push({
        timeframe: timeframe.name,
        position: predictedPosition,
        confidence: Math.round(confidence * 100) / 100,
        change_percentage: Math.round(changePercentage * 100) / 100
      });
    }

    return predictions;
  }

  private determineTrendDirection(predictions: any[]): 'rising' | 'declining' | 'stable' | 'volatile' {
    if (predictions.length < 2) return 'stable';
    
    const firstPosition = predictions[0].position;
    const lastPosition = predictions[predictions.length - 1].position;
    const totalChange = firstPosition - lastPosition; // Negative because lower position is better
    
    // Calculate volatility
    const changes = [];
    for (let i = 1; i < predictions.length; i++) {
      changes.push(predictions[i-1].position - predictions[i].position);
    }
    
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length;
    const volatility = Math.sqrt(variance);
    
    if (volatility > 1.5) return 'volatile';
    if (Math.abs(totalChange) < 1) return 'stable';
    return totalChange > 0 ? 'rising' : 'declining';
  }

  private calculateMarketShareProjection(predictions: any[]): number {
    // Simple approximation: higher position (lower number) = higher market share
    const avgPredictedPosition = predictions.reduce((sum, pred) => sum + pred.position, 0) / predictions.length;
    return Math.max(0, Math.min(100, (20 - avgPredictedPosition) / 20 * 100));
  }

  private calculateVolatility(predictions: any[]): number {
    if (predictions.length < 2) return 0;
    
    const positions = predictions.map(p => p.position);
    const mean = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - mean, 2), 0) / positions.length;
    
    return Math.sqrt(variance);
  }

  private async assessRisksAndOpportunities(domain: string, predictions: any[]): Promise<any> {
    // Assess risks and opportunities based on predictions and market context
    const risks = [];
    const opportunities = [];
    const threats = [];

    // Analyze prediction trends
    const isImproving = predictions.some(p => p.change_percentage > 10);
    const isDeclining = predictions.some(p => p.change_percentage < -10);
    const highVolatility = this.calculateVolatility(predictions) > 2;

    if (isDeclining) {
      risks.push('Predicted market position decline');
      threats.push('Competitive pressure increasing');
    }

    if (isImproving) {
      opportunities.push('Strong upward momentum in market position');
    }

    if (highVolatility) {
      risks.push('High position volatility indicates market uncertainty');
    }

    // Check for low confidence predictions
    const lowConfidencePredictions = predictions.filter(p => p.confidence < 0.5);
    if (lowConfidencePredictions.length > 0) {
      risks.push('Low confidence in long-term predictions');
    }

    return { risks, opportunities, threats };
  }

  private async generatePeerComparison(domain: string, predictions: any[]): Promise<any[]> {
    // Get competitor data for peer comparison
    const query = `
      SELECT 
        d.domain,
        AVG(CASE 
          WHEN dr.response LIKE '%#1%' THEN 1
          WHEN dr.response LIKE '%#2%' THEN 2
          WHEN dr.response LIKE '%#3%' THEN 3
          WHEN dr.response LIKE '%#4%' THEN 4
          WHEN dr.response LIKE '%#5%' THEN 5
          ELSE 10
        END) as current_position
      FROM domains d
      LEFT JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.cohort IN (
        SELECT DISTINCT cohort FROM domains WHERE domain = $1
      )
      AND d.domain != $1
      AND dr.created_at > NOW() - INTERVAL '30 days'
      GROUP BY d.domain
      HAVING COUNT(dr.id) > 5
      ORDER BY current_position ASC
      LIMIT 10
    `;
    
    const result = await this.pool.query(query, [domain]);
    
    return result.rows.map(row => ({
      competitor: row.domain,
      current_position: Math.round(row.current_position),
      predicted_position: Math.round(row.current_position), // Simplified prediction
      threat_level: row.current_position < 5 ? 0.8 : 0.4 // High threat if top 5
    }));
  }

  private async generateStrategicRecommendations(
    domain: string,
    predictions: any[],
    riskAssessment: any,
    momentum: number
  ): Promise<string[]> {
    const recommendations = [];

    // Momentum-based recommendations
    if (momentum > 0.1) {
      recommendations.push('Capitalize on positive momentum with increased marketing investment');
    } else if (momentum < -0.1) {
      recommendations.push('Address declining momentum with competitive analysis and strategy revision');
    }

    // Prediction-based recommendations
    const futureDecline = predictions.some(p => p.change_percentage < -15);
    if (futureDecline) {
      recommendations.push('Implement defensive strategies to prevent predicted position decline');
    }

    const futureGrowth = predictions.some(p => p.change_percentage > 15);
    if (futureGrowth) {
      recommendations.push('Prepare scaling strategies to support predicted growth');
    }

    // Risk-based recommendations
    if (riskAssessment.risks.length > 2) {
      recommendations.push('Develop risk mitigation strategies for identified market threats');
    }

    if (riskAssessment.opportunities.length > 0) {
      recommendations.push('Invest in identified market opportunities for competitive advantage');
    }

    // Default recommendations if none specific
    if (recommendations.length === 0) {
      recommendations.push('Maintain current strategy while monitoring market dynamics');
    }

    return recommendations;
  }
}