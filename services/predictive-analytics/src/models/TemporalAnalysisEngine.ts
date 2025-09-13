import { Pool } from 'pg';
import { Logger } from 'winston';

export interface TemporalAnalysis {
  short_term: PredictionResult;
  medium_term: PredictionResult;
  long_term: PredictionResult;
  scenario_modeling: {
    optimistic: PredictionResult;
    realistic: PredictionResult;
    pessimistic: PredictionResult;
  };
  uncertainty_bands: Array<{
    timeframe: string;
    lower_bound: number;
    expected: number;
    upper_bound: number;
    confidence_interval: number;
  }>;
  temporal_patterns: string[];
  seasonality_factors: string[];
  trend_acceleration: {
    current_velocity: number;
    acceleration_rate: number;
    momentum_sustainability: number;
  };
  risk_evolution: {
    emerging_risks: string[];
    diminishing_risks: string[];
    persistent_risks: string[];
  };
}

interface PredictionResult {
  timeframe: string;
  predicted_position: number;
  confidence: number;
  key_factors: string[];
  probability_distribution: Array<{
    position: number;
    probability: number;
  }>;
  critical_assumptions: string[];
}

export class TemporalAnalysisEngine {
  private pool: Pool;
  private logger: Logger;
  private timeHorizons = {
    short_term: { days: 30, weight: 1.0 },
    medium_term: { days: 180, weight: 0.8 },
    long_term: { days: 730, weight: 0.6 }
  };

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  async performAnalysis(
    domain: string,
    multiTimeframeData: any,
    config: any
  ): Promise<TemporalAnalysis> {
    try {
      this.logger.info('⏰ Performing temporal analysis', { domain });

      // Get comprehensive historical data across multiple timeframes
      const historicalData = await this.getMultiTimeframeHistoricalData(domain);
      
      // Analyze temporal patterns and trends
      const temporalPatterns = await this.identifyTemporalPatterns(historicalData);
      const seasonalityFactors = await this.analyzeSeasonality(historicalData);
      
      // Generate predictions for different time horizons
      const shortTermPrediction = await this.generateTimeframePrediction(
        domain, 
        historicalData, 
        'short_term', 
        config
      );
      
      const mediumTermPrediction = await this.generateTimeframePrediction(
        domain, 
        historicalData, 
        'medium_term', 
        config
      );
      
      const longTermPrediction = await this.generateTimeframePrediction(
        domain, 
        historicalData, 
        'long_term', 
        config
      );

      // Perform scenario modeling
      const scenarioModeling = await this.performScenarioModeling(
        domain,
        historicalData,
        [shortTermPrediction, mediumTermPrediction, longTermPrediction]
      );

      // Calculate uncertainty bands
      const uncertaintyBands = await this.calculateUncertaintyBands(
        domain,
        [shortTermPrediction, mediumTermPrediction, longTermPrediction],
        historicalData
      );

      // Analyze trend acceleration
      const trendAcceleration = await this.analyzeTrendAcceleration(historicalData);

      // Assess risk evolution over time
      const riskEvolution = await this.assessRiskEvolution(domain, historicalData);

      const result: TemporalAnalysis = {
        short_term: shortTermPrediction,
        medium_term: mediumTermPrediction,
        long_term: longTermPrediction,
        scenario_modeling: scenarioModeling,
        uncertainty_bands: uncertaintyBands,
        temporal_patterns: temporalPatterns,
        seasonality_factors: seasonalityFactors,
        trend_acceleration: trendAcceleration,
        risk_evolution: riskEvolution
      };

      this.logger.info('✅ Temporal analysis completed', {
        domain,
        temporalPatterns: temporalPatterns.length,
        shortTermConfidence: shortTermPrediction.confidence,
        longTermConfidence: longTermPrediction.confidence
      });

      return result;

    } catch (error) {
      this.logger.error('Temporal analysis failed', { error: error.message, domain });
      throw new Error(`Temporal analysis failed: ${error.message}`);
    }
  }

  private async getMultiTimeframeHistoricalData(domain: string): Promise<any> {
    const query = `
      SELECT 
        dr.response,
        dr.model,
        dr.prompt_type,
        dr.created_at,
        CASE 
          WHEN dr.response LIKE '%#1%' THEN 1
          WHEN dr.response LIKE '%#2%' THEN 2
          WHEN dr.response LIKE '%#3%' THEN 3
          WHEN dr.response LIKE '%#4%' THEN 4
          WHEN dr.response LIKE '%#5%' THEN 5
          WHEN dr.response LIKE '%#6%' THEN 6
          WHEN dr.response LIKE '%#7%' THEN 7
          WHEN dr.response LIKE '%#8%' THEN 8
          WHEN dr.response LIKE '%#9%' THEN 9
          WHEN dr.response LIKE '%#10%' THEN 10
          ELSE NULL
        END as extracted_position,
        EXTRACT(DOW FROM dr.created_at) as day_of_week,
        EXTRACT(MONTH FROM dr.created_at) as month,
        EXTRACT(QUARTER FROM dr.created_at) as quarter
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.domain = $1
        AND dr.created_at > NOW() - INTERVAL '365 days'
      ORDER BY dr.created_at ASC
    `;

    const result = await this.pool.query(query, [domain]);
    
    // Group data by different time periods
    const dailyData = new Map<string, any[]>();
    const weeklyData = new Map<string, any[]>();
    const monthlyData = new Map<string, any[]>();

    result.rows.forEach(row => {
      if (row.extracted_position) {
        const date = new Date(row.created_at);
        
        // Daily grouping
        const dayKey = date.toISOString().split('T')[0];
        if (!dailyData.has(dayKey)) dailyData.set(dayKey, []);
        dailyData.get(dayKey)!.push(row);

        // Weekly grouping
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        if (!weeklyData.has(weekKey)) weeklyData.set(weekKey, []);
        weeklyData.get(weekKey)!.push(row);

        // Monthly grouping
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData.has(monthKey)) monthlyData.set(monthKey, []);
        monthlyData.get(monthKey)!.push(row);
      }
    });

    return {
      raw_data: result.rows.filter(row => row.extracted_position),
      daily_aggregated: this.aggregateTimeSeriesData(dailyData),
      weekly_aggregated: this.aggregateTimeSeriesData(weeklyData),
      monthly_aggregated: this.aggregateTimeSeriesData(monthlyData),
      total_data_points: result.rows.filter(row => row.extracted_position).length
    };
  }

  private aggregateTimeSeriesData(timeGroupedData: Map<string, any[]>): any[] {
    return Array.from(timeGroupedData.entries()).map(([timeKey, dataPoints]) => {
      const positions = dataPoints.map(dp => dp.extracted_position);
      const avgPosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
      const minPosition = Math.min(...positions);
      const maxPosition = Math.max(...positions);
      
      return {
        time_period: timeKey,
        avg_position: avgPosition,
        min_position: minPosition,
        max_position: maxPosition,
        data_points: dataPoints.length,
        position_variance: this.calculateVariance(positions),
        models: [...new Set(dataPoints.map(dp => dp.model))],
        prompts: [...new Set(dataPoints.map(dp => dp.prompt_type))]
      };
    }).sort((a, b) => a.time_period.localeCompare(b.time_period));
  }

  private async identifyTemporalPatterns(historicalData: any): Promise<string[]> {
    const patterns = [];
    const dailyData = historicalData.daily_aggregated;
    const weeklyData = historicalData.weekly_aggregated;

    if (dailyData.length < 7) {
      return ['Insufficient data for pattern analysis'];
    }

    // Trend analysis
    const trendSlope = this.calculateTrendSlope(dailyData);
    if (Math.abs(trendSlope) > 0.1) {
      patterns.push(trendSlope > 0 ? 'Declining long-term trend' : 'Improving long-term trend');
    } else {
      patterns.push('Stable long-term trend');
    }

    // Volatility analysis
    const volatility = this.calculateVolatility(dailyData);
    if (volatility > 1.5) {
      patterns.push('High volatility pattern');
    } else if (volatility < 0.5) {
      patterns.push('Low volatility pattern');
    }

    // Cyclical patterns
    const cyclicalPattern = this.detectCyclicalPatterns(weeklyData);
    if (cyclicalPattern) {
      patterns.push(cyclicalPattern);
    }

    // Momentum patterns
    const momentumPattern = this.analyzeMomentumPatterns(dailyData);
    if (momentumPattern) {
      patterns.push(momentumPattern);
    }

    // Recovery/decline patterns
    const recoveryPattern = this.detectRecoveryPatterns(dailyData);
    if (recoveryPattern) {
      patterns.push(recoveryPattern);
    }

    return patterns.length > 0 ? patterns : ['Standard market dynamics observed'];
  }

  private async analyzeSeasonality(historicalData: any): Promise<string[]> {
    const seasonalFactors = [];
    const monthlyData = historicalData.monthly_aggregated;

    if (monthlyData.length < 6) {
      return ['Insufficient data for seasonality analysis'];
    }

    // Month-over-month analysis
    const monthlyChanges = new Map<number, number[]>();
    
    monthlyData.forEach((monthData, index) => {
      if (index > 0) {
        const prevMonth = monthlyData[index - 1];
        const change = monthData.avg_position - prevMonth.avg_position;
        const month = parseInt(monthData.time_period.split('-')[1]);
        
        if (!monthlyChanges.has(month)) monthlyChanges.set(month, []);
        monthlyChanges.get(month)!.push(change);
      }
    });

    // Identify seasonal patterns
    monthlyChanges.forEach((changes, month) => {
      const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
      const monthName = new Date(2024, month - 1, 1).toLocaleString('default', { month: 'long' });
      
      if (avgChange > 0.5) {
        seasonalFactors.push(`Seasonal decline typically in ${monthName}`);
      } else if (avgChange < -0.5) {
        seasonalFactors.push(`Seasonal improvement typically in ${monthName}`);
      }
    });

    // Quarter analysis
    const quarterlyPattern = this.analyzeQuarterlyPatterns(monthlyData);
    if (quarterlyPattern) {
      seasonalFactors.push(quarterlyPattern);
    }

    return seasonalFactors.length > 0 ? seasonalFactors : ['No significant seasonal patterns detected'];
  }

  private async generateTimeframePrediction(
    domain: string,
    historicalData: any,
    timeframe: 'short_term' | 'medium_term' | 'long_term',
    config: any
  ): Promise<PredictionResult> {
    const timeConfig = this.timeHorizons[timeframe];
    const dailyData = historicalData.daily_aggregated;
    
    if (dailyData.length === 0) {
      return this.getDefaultPrediction(timeframe);
    }

    const currentPosition = dailyData[dailyData.length - 1].avg_position;
    
    // Calculate trend and momentum
    const trendSlope = this.calculateTrendSlope(dailyData.slice(-30)); // Last 30 days
    const momentum = this.calculateMomentum(dailyData.slice(-14)); // Last 14 days
    const volatility = this.calculateVolatility(dailyData.slice(-30));

    // Project future position
    let predictedPosition = currentPosition;
    
    // Apply trend
    const trendImpact = trendSlope * (timeConfig.days / 30);
    predictedPosition += trendImpact;

    // Apply momentum with decay
    const momentumDecay = Math.exp(-timeConfig.days / 60); // 60-day decay
    const momentumImpact = momentum * momentumDecay;
    predictedPosition += momentumImpact;

    // Add uncertainty based on timeframe
    const uncertaintyFactor = 1 + (timeConfig.days / 365) * 0.5;
    const uncertainty = volatility * uncertaintyFactor * (Math.random() - 0.5);
    predictedPosition += uncertainty;

    // Apply regression to mean for long-term predictions
    if (timeframe === 'long_term') {
      const marketMean = 8; // Assume market average
      const regressionFactor = 0.3;
      predictedPosition = predictedPosition * (1 - regressionFactor) + marketMean * regressionFactor;
    }

    // Bound the prediction
    predictedPosition = Math.max(1, Math.min(20, Math.round(predictedPosition * 10) / 10));

    // Calculate confidence
    const confidence = this.calculatePredictionConfidence(
      timeframe,
      historicalData.total_data_points,
      volatility,
      trendSlope
    );

    // Generate key factors
    const keyFactors = this.generateKeyFactors(trendSlope, momentum, volatility, timeframe);

    // Generate probability distribution
    const probabilityDistribution = this.generateProbabilityDistribution(
      predictedPosition,
      volatility,
      timeframe
    );

    // Generate critical assumptions
    const criticalAssumptions = this.generateCriticalAssumptions(timeframe, trendSlope, momentum);

    return {
      timeframe: `${timeConfig.days} days`,
      predicted_position: predictedPosition,
      confidence: Math.round(confidence * 100) / 100,
      key_factors: keyFactors,
      probability_distribution: probabilityDistribution,
      critical_assumptions: criticalAssumptions
    };
  }

  private async performScenarioModeling(
    domain: string,
    historicalData: any,
    basePredictions: PredictionResult[]
  ): Promise<any> {
    const dailyData = historicalData.daily_aggregated;
    const currentPosition = dailyData.length > 0 ? dailyData[dailyData.length - 1].avg_position : 10;

    // Optimistic scenario: Better performance than trend suggests
    const optimistic = basePredictions.map(pred => ({
      ...pred,
      predicted_position: Math.max(1, pred.predicted_position - 1.5),
      confidence: pred.confidence * 0.8,
      key_factors: [...pred.key_factors, 'Favorable market conditions', 'Strong execution']
    }));

    // Realistic scenario: Base predictions
    const realistic = basePredictions;

    // Pessimistic scenario: Worse performance than trend suggests
    const pessimistic = basePredictions.map(pred => ({
      ...pred,
      predicted_position: Math.min(20, pred.predicted_position + 2),
      confidence: pred.confidence * 0.7,
      key_factors: [...pred.key_factors, 'Market headwinds', 'Competitive pressure']
    }));

    return {
      optimistic: optimistic[1], // Medium-term for scenarios
      realistic: realistic[1],
      pessimistic: pessimistic[1]
    };
  }

  private async calculateUncertaintyBands(
    domain: string,
    predictions: PredictionResult[],
    historicalData: any
  ): Promise<Array<any>> {
    const volatility = this.calculateVolatility(historicalData.daily_aggregated);
    
    return predictions.map(pred => {
      const timeframeDays = parseInt(pred.timeframe.split(' ')[0]);
      const uncertaintyWidth = volatility * Math.sqrt(timeframeDays / 30) * 1.96; // 95% CI
      
      return {
        timeframe: pred.timeframe,
        lower_bound: Math.max(1, Math.round((pred.predicted_position - uncertaintyWidth) * 10) / 10),
        expected: pred.predicted_position,
        upper_bound: Math.min(20, Math.round((pred.predicted_position + uncertaintyWidth) * 10) / 10),
        confidence_interval: Math.round(pred.confidence * 100)
      };
    });
  }

  private async analyzeTrendAcceleration(historicalData: any): Promise<any> {
    const dailyData = historicalData.daily_aggregated;
    
    if (dailyData.length < 14) {
      return {
        current_velocity: 0,
        acceleration_rate: 0,
        momentum_sustainability: 0.5
      };
    }

    // Calculate velocity (recent trend)
    const recentTrend = this.calculateTrendSlope(dailyData.slice(-7));
    const previousTrend = this.calculateTrendSlope(dailyData.slice(-14, -7));
    
    // Calculate acceleration
    const acceleration = recentTrend - previousTrend;
    
    // Calculate momentum sustainability
    const volatility = this.calculateVolatility(dailyData.slice(-30));
    const sustainability = Math.max(0, 1 - volatility * 2);

    return {
      current_velocity: Math.round(recentTrend * 100) / 100,
      acceleration_rate: Math.round(acceleration * 100) / 100,
      momentum_sustainability: Math.round(sustainability * 100) / 100
    };
  }

  private async assessRiskEvolution(domain: string, historicalData: any): Promise<any> {
    const emergingRisks = [];
    const diminishingRisks = [];
    const persistentRisks = [];

    const dailyData = historicalData.daily_aggregated;
    const volatility = this.calculateVolatility(dailyData);
    const trend = this.calculateTrendSlope(dailyData);

    // Assess different risk categories
    if (volatility > 1.5) {
      emergingRisks.push('Increasing market volatility');
    } else if (volatility < 0.5) {
      diminishingRisks.push('Market volatility stabilizing');
    } else {
      persistentRisks.push('Moderate market volatility');
    }

    if (trend > 0.2) {
      emergingRisks.push('Position decline acceleration');
    } else if (trend < -0.2) {
      diminishingRisks.push('Position improvement momentum');
    }

    // Add competitive risks based on recent patterns
    const recentVolatility = this.calculateVolatility(dailyData.slice(-14));
    if (recentVolatility > volatility * 1.3) {
      emergingRisks.push('Recent competitive pressure increase');
    }

    return {
      emerging_risks: emergingRisks.length > 0 ? emergingRisks : ['No new risks identified'],
      diminishing_risks: diminishingRisks.length > 0 ? diminishingRisks : ['No risks diminishing'],
      persistent_risks: persistentRisks.length > 0 ? persistentRisks : ['Standard market risks']
    };
  }

  // Helper methods

  private calculateTrendSlope(data: any[]): number {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const x = data.map((_, index) => index);
    const y = data.map(d => d.avg_position);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, index) => sum + val * y[index], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateMomentum(data: any[]): number {
    if (data.length < 4) return 0;
    
    const recentHalf = data.slice(-Math.ceil(data.length / 2));
    const earlierHalf = data.slice(0, Math.floor(data.length / 2));
    
    const recentAvg = recentHalf.reduce((sum, d) => sum + d.avg_position, 0) / recentHalf.length;
    const earlierAvg = earlierHalf.reduce((sum, d) => sum + d.avg_position, 0) / earlierHalf.length;
    
    return earlierAvg - recentAvg; // Negative because lower position is better
  }

  private calculateVolatility(data: any[]): number {
    if (data.length < 2) return 0;
    
    const positions = data.map(d => d.avg_position);
    const mean = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - mean, 2), 0) / positions.length;
    
    return Math.sqrt(variance);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private detectCyclicalPatterns(weeklyData: any[]): string | null {
    if (weeklyData.length < 8) return null;
    
    // Simple cyclical pattern detection
    const changes = [];
    for (let i = 1; i < weeklyData.length; i++) {
      changes.push(weeklyData[i].avg_position - weeklyData[i-1].avg_position);
    }
    
    const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
    const changeVariance = this.calculateVariance(changes);
    
    if (changeVariance > 1.0 && Math.abs(avgChange) < 0.2) {
      return 'Cyclical pattern detected with regular fluctuations';
    }
    
    return null;
  }

  private analyzeMomentumPatterns(dailyData: any[]): string | null {
    if (dailyData.length < 14) return null;
    
    const momentum = this.calculateMomentum(dailyData);
    const recentMomentum = this.calculateMomentum(dailyData.slice(-7));
    
    if (Math.abs(momentum) > 0.5) {
      if (momentum > 0) {
        return 'Strong positive momentum pattern';
      } else {
        return 'Strong negative momentum pattern';
      }
    }
    
    if (Math.abs(recentMomentum - momentum) > 0.3) {
      return 'Momentum shift pattern detected';
    }
    
    return null;
  }

  private detectRecoveryPatterns(dailyData: any[]): string | null {
    if (dailyData.length < 21) return null;
    
    // Look for V-shaped or U-shaped recovery patterns
    const positions = dailyData.map(d => d.avg_position);
    const firstThird = positions.slice(0, Math.floor(positions.length / 3));
    const middleThird = positions.slice(Math.floor(positions.length / 3), Math.floor(positions.length * 2 / 3));
    const lastThird = positions.slice(Math.floor(positions.length * 2 / 3));
    
    const firstAvg = firstThird.reduce((sum, p) => sum + p, 0) / firstThird.length;
    const middleAvg = middleThird.reduce((sum, p) => sum + p, 0) / middleThird.length;
    const lastAvg = lastThird.reduce((sum, p) => sum + p, 0) / lastThird.length;
    
    // V-shaped recovery (decline then improvement)
    if (middleAvg > firstAvg + 1 && lastAvg < middleAvg - 1) {
      return 'V-shaped recovery pattern';
    }
    
    // Gradual decline pattern
    if (firstAvg < middleAvg && middleAvg < lastAvg) {
      return 'Gradual decline pattern';
    }
    
    // Gradual improvement pattern
    if (firstAvg > middleAvg && middleAvg > lastAvg) {
      return 'Gradual improvement pattern';
    }
    
    return null;
  }

  private analyzeQuarterlyPatterns(monthlyData: any[]): string | null {
    if (monthlyData.length < 12) return null;
    
    // Group by quarters and analyze patterns
    const quarters = new Map<number, number[]>();
    
    monthlyData.forEach(monthData => {
      const month = parseInt(monthData.time_period.split('-')[1]);
      const quarter = Math.ceil(month / 3);
      
      if (!quarters.has(quarter)) quarters.set(quarter, []);
      quarters.get(quarter)!.push(monthData.avg_position);
    });
    
    // Analyze quarterly averages
    const quarterlyAvgs = new Map<number, number>();
    quarters.forEach((positions, quarter) => {
      const avg = positions.reduce((sum, p) => sum + p, 0) / positions.length;
      quarterlyAvgs.set(quarter, avg);
    });
    
    if (quarterlyAvgs.size >= 4) {
      const q1 = quarterlyAvgs.get(1) || 0;
      const q4 = quarterlyAvgs.get(4) || 0;
      
      if (q4 < q1 - 1) {
        return 'Year-end improvement pattern';
      } else if (q4 > q1 + 1) {
        return 'Year-end decline pattern';
      }
    }
    
    return null;
  }

  private calculatePredictionConfidence(
    timeframe: string,
    dataPoints: number,
    volatility: number,
    trendStrength: number
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Adjust for data availability
    confidence += Math.min(0.3, dataPoints / 100);
    
    // Adjust for volatility (higher volatility = lower confidence)
    confidence -= Math.min(0.2, volatility / 3);
    
    // Adjust for trend strength (stronger trends = higher confidence)
    confidence += Math.min(0.2, Math.abs(trendStrength));
    
    // Adjust for timeframe (shorter = higher confidence)
    const timeframeDays = parseInt(timeframe.split(' ')[0]);
    confidence -= Math.min(0.3, timeframeDays / 365);
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private generateKeyFactors(
    trendSlope: number,
    momentum: number,
    volatility: number,
    timeframe: string
  ): string[] {
    const factors = [];
    
    if (Math.abs(trendSlope) > 0.1) {
      factors.push(trendSlope > 0 ? 'Declining trend impact' : 'Improving trend momentum');
    }
    
    if (Math.abs(momentum) > 0.3) {
      factors.push(momentum > 0 ? 'Positive momentum effect' : 'Negative momentum drag');
    }
    
    if (volatility > 1.0) {
      factors.push('High market volatility');
    } else if (volatility < 0.5) {
      factors.push('Stable market conditions');
    }
    
    if (timeframe.includes('730')) {
      factors.push('Market mean regression effect');
    }
    
    return factors.length > 0 ? factors : ['Standard market dynamics'];
  }

  private generateProbabilityDistribution(
    predictedPosition: number,
    volatility: number,
    timeframe: string
  ): Array<{ position: number; probability: number; }> {
    const distribution = [];
    const stdDev = volatility * 1.5; // Adjust standard deviation
    
    for (let pos = 1; pos <= 20; pos++) {
      // Normal distribution around predicted position
      const distance = Math.abs(pos - predictedPosition);
      const probability = Math.exp(-Math.pow(distance, 2) / (2 * Math.pow(stdDev, 2)));
      
      if (probability > 0.01) { // Only include meaningful probabilities
        distribution.push({
          position: pos,
          probability: Math.round(probability * 100) / 100
        });
      }
    }
    
    // Normalize probabilities
    const totalProb = distribution.reduce((sum, d) => sum + d.probability, 0);
    distribution.forEach(d => {
      d.probability = Math.round((d.probability / totalProb) * 100) / 100;
    });
    
    return distribution.sort((a, b) => b.probability - a.probability).slice(0, 10);
  }

  private generateCriticalAssumptions(
    timeframe: string,
    trendSlope: number,
    momentum: number
  ): string[] {
    const assumptions = [];
    
    assumptions.push('Market conditions remain relatively stable');
    assumptions.push('No major competitive disruptions occur');
    
    if (Math.abs(trendSlope) > 0.1) {
      assumptions.push('Current trend patterns continue');
    }
    
    if (Math.abs(momentum) > 0.3) {
      assumptions.push('Current momentum is sustainable');
    }
    
    if (timeframe.includes('730')) {
      assumptions.push('Long-term market dynamics follow historical patterns');
      assumptions.push('No paradigm shifts in the industry');
    }
    
    return assumptions;
  }

  private getDefaultPrediction(timeframe: string): PredictionResult {
    return {
      timeframe: this.timeHorizons[timeframe].days + ' days',
      predicted_position: 10,
      confidence: 0.1,
      key_factors: ['Insufficient historical data'],
      probability_distribution: [{ position: 10, probability: 1.0 }],
      critical_assumptions: ['Requires more data for accurate prediction']
    };
  }
}