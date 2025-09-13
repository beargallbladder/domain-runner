import { Pool } from 'pg';
import { Logger } from 'winston';

export interface BrandTrajectory {
  current_position: number;
  predicted_positions: Array<{
    timeframe: string;
    position: number;
    confidence: number;
    factors: string[];
  }>;
  trajectory_type: 'rising' | 'declining' | 'stable' | 'volatile';
  momentum_score: number;
  inflection_points: Array<{
    date: string;
    event: string;
    impact: number;
  }>;
  growth_rate: number;
  volatility_index: number;
  trend_analysis: {
    short_term: string;
    medium_term: string;
    long_term: string;
  };
  competitive_context: {
    relative_performance: string;
    market_position_trend: string;
    peer_comparison: Array<{
      competitor: string;
      trajectory_comparison: string;
    }>;
  };
  risk_assessment: {
    trajectory_sustainability: number;
    reversal_probability: number;
    acceleration_potential: number;
  };
}

export class BrandTrajectoryAnalyzer {
  private pool: Pool;
  private logger: Logger;

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  async analyzeTrajectory(
    domain: string,
    timeSeriesData: any,
    config: any
  ): Promise<BrandTrajectory> {
    try {
      this.logger.info('📈 Analyzing brand trajectory', { domain });

      // Get comprehensive time series data
      const trajectoryData = await this.getTrajectoryData(domain);
      
      // Calculate current position and momentum
      const currentPosition = await this.getCurrentPosition(domain);
      const momentumScore = await this.calculateMomentumScore(trajectoryData);
      
      // Analyze trajectory patterns
      const trajectoryType = await this.determineTrajectoryType(trajectoryData);
      const volatilityIndex = this.calculateVolatilityIndex(trajectoryData);
      const growthRate = this.calculateGrowthRate(trajectoryData);
      
      // Detect inflection points
      const inflectionPoints = await this.detectInflectionPoints(trajectoryData);
      
      // Generate predictions
      const predictedPositions = await this.generateTrajectoryPredictions(
        domain,
        trajectoryData,
        momentumScore,
        config
      );
      
      // Analyze trends across timeframes
      const trendAnalysis = this.analyzeTrends(trajectoryData, predictedPositions);
      
      // Competitive context analysis
      const competitiveContext = await this.analyzeCompetitiveContext(domain, trajectoryData);
      
      // Risk assessment
      const riskAssessment = this.assessTrajectoryRisks(
        trajectoryData,
        predictedPositions,
        volatilityIndex
      );

      const result: BrandTrajectory = {
        current_position: currentPosition,
        predicted_positions: predictedPositions,
        trajectory_type: trajectoryType,
        momentum_score: momentumScore,
        inflection_points: inflectionPoints,
        growth_rate: growthRate,
        volatility_index: volatilityIndex,
        trend_analysis: trendAnalysis,
        competitive_context: competitiveContext,
        risk_assessment: riskAssessment
      };

      this.logger.info('✅ Brand trajectory analysis completed', {
        domain,
        trajectoryType,
        momentumScore,
        currentPosition
      });

      return result;

    } catch (error) {
      this.logger.error('Brand trajectory analysis failed', { 
        error: error.message, 
        domain 
      });
      throw new Error(`Brand trajectory analysis failed: ${error.message}`);
    }
  }

  async getCurrentMomentum(domain: string): Promise<number> {
    try {
      // Get quick momentum calculation for real-time monitoring
      const query = `
        WITH recent_positions AS (
          SELECT 
            CASE 
              WHEN dr.response LIKE '%#1%' THEN 1
              WHEN dr.response LIKE '%#2%' THEN 2
              WHEN dr.response LIKE '%#3%' THEN 3
              WHEN dr.response LIKE '%#4%' THEN 4
              WHEN dr.response LIKE '%#5%' THEN 5
              ELSE 10
            END as position,
            dr.created_at,
            ROW_NUMBER() OVER (ORDER BY dr.created_at DESC) as rn
          FROM domain_responses dr
          JOIN domains d ON dr.domain_id = d.id
          WHERE d.domain = $1
            AND dr.created_at > NOW() - INTERVAL '14 days'
        )
        SELECT 
          AVG(CASE WHEN rn <= 5 THEN position END) as recent_avg,
          AVG(CASE WHEN rn > 5 AND rn <= 10 THEN position END) as previous_avg
        FROM recent_positions
      `;
      
      const result = await this.pool.query(query, [domain]);
      
      if (result.rows.length === 0 || !result.rows[0].recent_avg || !result.rows[0].previous_avg) {
        return 0;
      }

      const recentAvg = result.rows[0].recent_avg;
      const previousAvg = result.rows[0].previous_avg;
      
      // Calculate momentum (negative because lower position is better)
      const momentum = (previousAvg - recentAvg) / previousAvg;
      
      // Normalize to -1 to 1 scale
      return Math.max(-1, Math.min(1, momentum * 2));

    } catch (error) {
      this.logger.error('Current momentum calculation failed', { error: error.message, domain });
      return 0;
    }
  }

  private async getTrajectoryData(domain: string): Promise<any> {
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
        END as extracted_position
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.domain = $1
        AND dr.created_at > NOW() - INTERVAL '90 days'
      ORDER BY dr.created_at ASC
    `;
    
    const result = await this.pool.query(query, [domain]);
    
    // Group by day and calculate daily averages
    const dailyData = new Map<string, number[]>();
    
    result.rows.forEach(row => {
      if (row.extracted_position) {
        const date = new Date(row.created_at).toISOString().split('T')[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, []);
        }
        dailyData.get(date)!.push(row.extracted_position);
      }
    });
    
    // Calculate daily averages
    const timeSeriesPoints = Array.from(dailyData.entries()).map(([date, positions]) => ({
      date,
      position: positions.reduce((sum, pos) => sum + pos, 0) / positions.length,
      count: positions.length
    })).filter(point => point.count >= 2); // Require at least 2 data points per day
    
    return {
      raw_data: result.rows,
      time_series: timeSeriesPoints,
      data_quality: timeSeriesPoints.length > 10 ? 'good' : timeSeriesPoints.length > 5 ? 'fair' : 'poor'
    };
  }

  private async getCurrentPosition(domain: string): Promise<number> {
    const query = `
      SELECT 
        AVG(CASE 
          WHEN dr.response LIKE '%#1%' THEN 1
          WHEN dr.response LIKE '%#2%' THEN 2
          WHEN dr.response LIKE '%#3%' THEN 3
          WHEN dr.response LIKE '%#4%' THEN 4
          WHEN dr.response LIKE '%#5%' THEN 5
          ELSE 10
        END) as avg_position
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.domain = $1
        AND dr.created_at > NOW() - INTERVAL '7 days'
    `;
    
    const result = await this.pool.query(query, [domain]);
    return Math.round(result.rows[0]?.avg_position || 10);
  }

  private async calculateMomentumScore(trajectoryData: any): Promise<number> {
    const timeSeries = trajectoryData.time_series;
    
    if (timeSeries.length < 7) {
      return 0; // Insufficient data
    }
    
    // Calculate momentum using recent vs historical averages
    const recentDays = 7;
    const recentPoints = timeSeries.slice(-recentDays);
    const historicalPoints = timeSeries.slice(0, -recentDays);
    
    if (historicalPoints.length === 0) {
      return 0;
    }
    
    const recentAvg = recentPoints.reduce((sum, point) => sum + point.position, 0) / recentPoints.length;
    const historicalAvg = historicalPoints.reduce((sum, point) => sum + point.position, 0) / historicalPoints.length;
    
    // Calculate momentum (negative because lower position is better)
    const momentum = (historicalAvg - recentAvg) / historicalAvg;
    
    // Apply exponential smoothing for trend detection
    let smoothedMomentum = 0;
    const alpha = 0.3; // Smoothing factor
    
    for (let i = 1; i < timeSeries.length; i++) {
      const change = timeSeries[i-1].position - timeSeries[i].position;
      smoothedMomentum = alpha * change + (1 - alpha) * smoothedMomentum;
    }
    
    // Combine immediate momentum with smoothed trend
    const combinedMomentum = 0.7 * momentum + 0.3 * (smoothedMomentum / 5);
    
    // Normalize to -1 to 1 scale
    return Math.max(-1, Math.min(1, combinedMomentum * 3));
  }

  private async determineTrajectoryType(trajectoryData: any): Promise<'rising' | 'declining' | 'stable' | 'volatile'> {
    const timeSeries = trajectoryData.time_series;
    
    if (timeSeries.length < 5) {
      return 'stable';
    }
    
    // Calculate linear regression
    const n = timeSeries.length;
    const x = timeSeries.map((_, index) => index);
    const y = timeSeries.map(point => point.position);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, index) => sum + val * y[index], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate volatility
    const meanY = sumY / n;
    const variance = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0) / n;
    const volatility = Math.sqrt(variance);
    
    // Determine trajectory type
    if (volatility > 2.5) {
      return 'volatile';
    }
    
    if (Math.abs(slope) < 0.05) {
      return 'stable';
    }
    
    return slope > 0 ? 'declining' : 'rising'; // Positive slope = declining position (worse)
  }

  private calculateVolatilityIndex(trajectoryData: any): number {
    const timeSeries = trajectoryData.time_series;
    
    if (timeSeries.length < 3) {
      return 0;
    }
    
    // Calculate standard deviation of positions
    const positions = timeSeries.map(point => point.position);
    const mean = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - mean, 2), 0) / positions.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate change volatility
    const changes = [];
    for (let i = 1; i < positions.length; i++) {
      changes.push(Math.abs(positions[i] - positions[i-1]));
    }
    
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    
    // Combine position volatility and change volatility
    const volatilityIndex = (stdDev + avgChange) / 2;
    
    // Normalize to 0-1 scale (higher = more volatile)
    return Math.min(1, volatilityIndex / 5);
  }

  private calculateGrowthRate(trajectoryData: any): number {
    const timeSeries = trajectoryData.time_series;
    
    if (timeSeries.length < 2) {
      return 0;
    }
    
    const firstPosition = timeSeries[0].position;
    const lastPosition = timeSeries[timeSeries.length - 1].position;
    const days = timeSeries.length;
    
    // Calculate daily growth rate (negative because lower position is better)
    const totalChange = firstPosition - lastPosition;
    const dailyGrowthRate = totalChange / days;
    
    // Convert to percentage
    return (dailyGrowthRate / firstPosition) * 100;
  }

  private async detectInflectionPoints(trajectoryData: any): Promise<Array<{ date: string; event: string; impact: number; }>> {
    const timeSeries = trajectoryData.time_series;
    const inflectionPoints = [];
    
    if (timeSeries.length < 10) {
      return inflectionPoints;
    }
    
    // Look for significant changes in trend
    for (let i = 3; i < timeSeries.length - 3; i++) {
      const beforeTrend = this.calculateLocalTrend(timeSeries.slice(i-3, i));
      const afterTrend = this.calculateLocalTrend(timeSeries.slice(i, i+3));
      
      const trendChange = Math.abs(beforeTrend - afterTrend);
      
      if (trendChange > 0.5) { // Significant trend change threshold
        const positionChange = timeSeries[i-1].position - timeSeries[i+1].position;
        
        inflectionPoints.push({
          date: timeSeries[i].date,
          event: trendChange > 1.5 ? 'Major trend reversal' : 
                 positionChange > 0 ? 'Position improvement acceleration' : 
                 'Position decline acceleration',
          impact: Math.min(1, trendChange / 2)
        });
      }
    }
    
    // Limit to most significant inflection points
    return inflectionPoints
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5);
  }

  private calculateLocalTrend(points: any[]): number {
    if (points.length < 2) return 0;
    
    const firstPos = points[0].position;
    const lastPos = points[points.length - 1].position;
    
    return (lastPos - firstPos) / points.length;
  }

  private async generateTrajectoryPredictions(
    domain: string,
    trajectoryData: any,
    momentumScore: number,
    config: any
  ): Promise<Array<{ timeframe: string; position: number; confidence: number; factors: string[]; }>> {
    const timeSeries = trajectoryData.time_series;
    const currentPosition = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].position : 10;
    
    const timeframes = [
      { name: '1week', days: 7 },
      { name: '1month', days: 30 },
      { name: '3months', days: 90 },
      { name: '6months', days: 180 },
      { name: '1year', days: 365 }
    ];
    
    const predictions = [];
    
    for (const timeframe of timeframes) {
      let predictedPosition = currentPosition;
      const factors = [];
      
      // Apply momentum
      const momentumImpact = momentumScore * (timeframe.days / 30) * 0.5;
      predictedPosition -= momentumImpact; // Negative because lower position is better
      
      if (Math.abs(momentumImpact) > 0.1) {
        factors.push(momentumImpact > 0 ? 'Positive momentum' : 'Negative momentum');
      }
      
      // Apply trend from linear regression
      if (timeSeries.length >= 5) {
        const trendSlope = this.calculateTrendSlope(timeSeries);
        const trendImpact = trendSlope * (timeframe.days / 30);
        predictedPosition += trendImpact;
        
        if (Math.abs(trendImpact) > 0.2) {
          factors.push(trendSlope > 0 ? 'Declining trend' : 'Improving trend');
        }
      }
      
      // Add volatility uncertainty
      const volatility = this.calculateVolatilityIndex(trajectoryData);
      const volatilityImpact = volatility * Math.log(timeframe.days / 7) * (Math.random() - 0.5);
      predictedPosition += volatilityImpact;
      
      if (volatility > 0.3) {
        factors.push('High volatility');
      }
      
      // Regression to mean for long-term predictions
      if (timeframe.days > 90) {
        const marketMean = 8; // Assume market average position
        const regressionFactor = Math.min(0.3, (timeframe.days - 90) / 365);
        predictedPosition = predictedPosition * (1 - regressionFactor) + marketMean * regressionFactor;
        factors.push('Market mean regression');
      }
      
      // Bound the prediction
      predictedPosition = Math.max(1, Math.min(20, Math.round(predictedPosition)));
      
      // Calculate confidence (decreases over time and with higher volatility)
      let confidence = Math.max(0.1, 0.9 - (timeframe.days / 365) * 0.5 - volatility * 0.3);
      
      // Adjust confidence based on data quality
      if (trajectoryData.data_quality === 'poor') {
        confidence *= 0.6;
      } else if (trajectoryData.data_quality === 'fair') {
        confidence *= 0.8;
      }
      
      predictions.push({
        timeframe: timeframe.name,
        position: predictedPosition,
        confidence: Math.round(confidence * 100) / 100,
        factors: factors.length > 0 ? factors : ['Stable trajectory']
      });
    }
    
    return predictions;
  }

  private calculateTrendSlope(timeSeries: any[]): number {
    const n = timeSeries.length;
    const x = timeSeries.map((_, index) => index);
    const y = timeSeries.map(point => point.position);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, index) => sum + val * y[index], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private analyzeTrends(trajectoryData: any, predictedPositions: any[]): any {
    const timeSeries = trajectoryData.time_series;
    
    // Short-term trend (last 7 days)
    const recentPoints = timeSeries.slice(-7);
    const shortTermTrend = recentPoints.length >= 3 ? 
      this.calculateLocalTrend(recentPoints) > 0 ? 'declining' : 'improving' : 'stable';
    
    // Medium-term trend (next 3 months prediction)
    const threeMonthPrediction = predictedPositions.find(p => p.timeframe === '3months');
    const currentPosition = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].position : 10;
    const mediumTermChange = threeMonthPrediction ? 
      (currentPosition - threeMonthPrediction.position) / currentPosition : 0;
    
    const mediumTermTrend = Math.abs(mediumTermChange) < 0.1 ? 'stable' :
      mediumTermChange > 0 ? 'improving' : 'declining';
    
    // Long-term trend (1 year prediction)
    const oneYearPrediction = predictedPositions.find(p => p.timeframe === '1year');
    const longTermChange = oneYearPrediction ? 
      (currentPosition - oneYearPrediction.position) / currentPosition : 0;
    
    const longTermTrend = Math.abs(longTermChange) < 0.15 ? 'stable' :
      longTermChange > 0 ? 'improving' : 'declining';
    
    return {
      short_term: shortTermTrend,
      medium_term: mediumTermTrend,
      long_term: longTermTrend
    };
  }

  private async analyzeCompetitiveContext(domain: string, trajectoryData: any): Promise<any> {
    // Get competitor trajectory data for comparison
    const query = `
      WITH competitor_positions AS (
        SELECT 
          d.domain,
          AVG(CASE 
            WHEN dr.response LIKE '%#1%' THEN 1
            WHEN dr.response LIKE '%#2%' THEN 2
            WHEN dr.response LIKE '%#3%' THEN 3
            WHEN dr.response LIKE '%#4%' THEN 4
            WHEN dr.response LIKE '%#5%' THEN 5
            ELSE 10
          END) as avg_position,
          COUNT(dr.id) as response_count
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
        domain,
        avg_position,
        response_count
      FROM competitor_positions
      ORDER BY avg_position ASC
      LIMIT 5
    `;
    
    const result = await this.pool.query(query, [domain]);
    const currentPosition = trajectoryData.time_series.length > 0 ? 
      trajectoryData.time_series[trajectoryData.time_series.length - 1].position : 10;
    
    // Analyze relative performance
    const betterCompetitors = result.rows.filter(row => row.avg_position < currentPosition).length;
    const totalCompetitors = result.rows.length;
    
    const relativePerformance = totalCompetitors === 0 ? 'unknown' :
      betterCompetitors === 0 ? 'leading' :
      betterCompetitors / totalCompetitors < 0.3 ? 'strong' :
      betterCompetitors / totalCompetitors < 0.7 ? 'competitive' : 'trailing';
    
    // Determine market position trend
    const momentum = await this.calculateMomentumScore(trajectoryData);
    const marketPositionTrend = momentum > 0.2 ? 'improving' :
      momentum < -0.2 ? 'declining' : 'stable';
    
    // Generate peer comparisons
    const peerComparison = result.rows.map(row => ({
      competitor: row.domain,
      trajectory_comparison: row.avg_position < currentPosition ? 'outperforming' : 'underperforming'
    }));
    
    return {
      relative_performance: relativePerformance,
      market_position_trend: marketPositionTrend,
      peer_comparison: peerComparison
    };
  }

  private assessTrajectoryRisks(trajectoryData: any, predictedPositions: any[], volatilityIndex: number): any {
    // Assess sustainability of current trajectory
    const momentum = this.calculateMomentumScore(trajectoryData);
    const trajectorySustainability = Math.max(0, 1 - volatilityIndex - Math.abs(momentum) * 0.5);
    
    // Calculate reversal probability
    const currentTrend = predictedPositions.length > 0 ? 
      predictedPositions[0].position - (trajectoryData.time_series.length > 0 ? 
        trajectoryData.time_series[trajectoryData.time_series.length - 1].position : 10) : 0;
    
    const reversalProbability = Math.min(0.8, volatilityIndex + Math.abs(currentTrend) * 0.1);
    
    // Assess acceleration potential
    const accelerationPotential = Math.max(0, Math.abs(momentum) - volatilityIndex * 0.5);
    
    return {
      trajectory_sustainability: Math.round(trajectorySustainability * 100) / 100,
      reversal_probability: Math.round(reversalProbability * 100) / 100,
      acceleration_potential: Math.round(accelerationPotential * 100) / 100
    };
  }
}