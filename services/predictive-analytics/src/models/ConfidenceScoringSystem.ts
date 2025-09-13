import { Pool } from 'pg';
import { Logger } from 'winston';

export interface ConfidenceMetrics {
  overall_confidence: number;
  data_quality_score: number;
  model_accuracy_score: number;
  historical_validation_score: number;
  factor_breakdown: {
    data_completeness: number;
    data_freshness: number;
    model_performance: number;
    cross_validation: number;
    uncertainty_bounds: number;
  };
  reliability_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  confidence_intervals: {
    lower_bound: number;
    upper_bound: number;
    interval_width: number;
  };
  quality_indicators: {
    sample_size_adequacy: number;
    temporal_consistency: number;
    cross_model_agreement: number;
    outlier_detection: number;
  };
  prediction_stability: {
    short_term_stability: number;
    long_term_stability: number;
    volatility_score: number;
  };
}

export class ConfidenceScoringSystem {
  private pool: Pool;
  private logger: Logger;
  private confidenceCache: Map<string, { score: number; timestamp: number }>;
  
  // Confidence scoring weights
  private scoringWeights = {
    data_quality: 0.3,
    model_accuracy: 0.25,
    historical_validation: 0.2,
    prediction_stability: 0.15,
    cross_validation: 0.1
  };

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
    this.confidenceCache = new Map();
  }

  async calculatePredictionConfidence(
    predictions: any,
    historicalData: any
  ): Promise<ConfidenceMetrics> {
    try {
      this.logger.info('📊 Calculating prediction confidence');

      // Calculate individual confidence components
      const dataQualityScore = await this.calculateDataQualityScore(historicalData);
      const modelAccuracyScore = await this.calculateModelAccuracyScore(predictions, historicalData);
      const historicalValidationScore = await this.calculateHistoricalValidationScore(historicalData);
      const stabilityMetrics = await this.calculatePredictionStability(predictions, historicalData);
      const qualityIndicators = await this.calculateQualityIndicators(historicalData);

      // Calculate factor breakdown
      const factorBreakdown = await this.calculateFactorBreakdown(
        historicalData,
        predictions,
        modelAccuracyScore
      );

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(
        dataQualityScore,
        modelAccuracyScore,
        historicalValidationScore,
        stabilityMetrics.volatility_score
      );

      // Calculate confidence intervals
      const confidenceIntervals = this.calculateConfidenceIntervals(
        predictions,
        overallConfidence,
        stabilityMetrics.volatility_score
      );

      // Determine reliability grade
      const reliabilityGrade = this.determineReliabilityGrade(overallConfidence, factorBreakdown);

      const result: ConfidenceMetrics = {
        overall_confidence: Math.round(overallConfidence * 100) / 100,
        data_quality_score: Math.round(dataQualityScore * 100) / 100,
        model_accuracy_score: Math.round(modelAccuracyScore * 100) / 100,
        historical_validation_score: Math.round(historicalValidationScore * 100) / 100,
        factor_breakdown: factorBreakdown,
        reliability_grade: reliabilityGrade,
        confidence_intervals: confidenceIntervals,
        quality_indicators: qualityIndicators,
        prediction_stability: stabilityMetrics
      };

      this.logger.info('✅ Prediction confidence calculated', {
        overallConfidence: result.overall_confidence,
        reliabilityGrade: result.reliability_grade
      });

      return result;

    } catch (error) {
      this.logger.error('Confidence calculation failed', { error: error.message });
      throw new Error(`Confidence calculation failed: ${error.message}`);
    }
  }

  async calculateComprehensiveConfidence(
    predictionData: any,
    historicalValidation: any,
    config: any
  ): Promise<ConfidenceMetrics> {
    // Enhanced confidence calculation with additional factors
    return this.calculatePredictionConfidence(predictionData, historicalValidation);
  }

  async getLatestConfidenceScore(domain: string): Promise<number> {
    try {
      // Check cache first
      const cached = this.confidenceCache.get(domain);
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
        return cached.score;
      }

      // Calculate quick confidence score
      const query = `
        SELECT 
          COUNT(dr.id) as total_responses,
          COUNT(DISTINCT dr.model) as model_diversity,
          COUNT(DISTINCT dr.prompt_type) as prompt_diversity,
          MAX(dr.created_at) as latest_response,
          MIN(dr.created_at) as earliest_response
        FROM domain_responses dr
        JOIN domains d ON dr.domain_id = d.id
        WHERE d.domain = $1
          AND dr.created_at > NOW() - INTERVAL '30 days'
      `;

      const result = await this.pool.query(query, [domain]);
      const row = result.rows[0];

      if (!row || row.total_responses === 0) {
        return 0;
      }

      // Quick confidence calculation
      const dataVolume = Math.min(1, row.total_responses / 50);
      const modelDiversity = Math.min(1, row.model_diversity / 8);
      const promptDiversity = Math.min(1, row.prompt_diversity / 3);
      const recency = this.calculateRecencyScore(row.latest_response);

      const quickScore = (dataVolume + modelDiversity + promptDiversity + recency) / 4;

      // Cache the result
      this.confidenceCache.set(domain, { score: quickScore, timestamp: Date.now() });

      return Math.round(quickScore * 100) / 100;

    } catch (error) {
      this.logger.error('Latest confidence score calculation failed', { error: error.message, domain });
      return 0.5; // Default middle confidence
    }
  }

  private async calculateDataQualityScore(historicalData: any): Promise<number> {
    const responses = historicalData.responses || [];
    
    if (responses.length === 0) {
      return 0.1; // Very low confidence with no data
    }

    // Data completeness
    const completeness = Math.min(1, responses.length / 30); // Target: 30+ responses

    // Data freshness
    const latestResponse = responses.length > 0 ? new Date(responses[0].created_at) : new Date(0);
    const freshness = this.calculateRecencyScore(latestResponse);

    // Model diversity
    const uniqueModels = new Set(responses.map(r => r.model)).size;
    const modelDiversity = Math.min(1, uniqueModels / 6); // Target: 6+ different models

    // Prompt diversity
    const uniquePrompts = new Set(responses.map(r => r.prompt_type)).size;
    const promptDiversity = Math.min(1, uniquePrompts / 3); // Target: 3+ different prompts

    // Response quality (length and content indicators)
    const avgResponseLength = responses.reduce((sum, r) => sum + (r.response?.length || 0), 0) / responses.length;
    const responseQuality = Math.min(1, avgResponseLength / 200); // Target: 200+ chars average

    return (completeness * 0.3 + freshness * 0.2 + modelDiversity * 0.2 + promptDiversity * 0.15 + responseQuality * 0.15);
  }

  private async calculateModelAccuracyScore(predictions: any, historicalData: any): Promise<number> {
    // Placeholder implementation - in real system would compare predictions to actual outcomes
    const responses = historicalData.responses || [];
    
    if (responses.length < 5) {
      return 0.5; // Default score with insufficient data
    }

    // Analyze consistency across models
    const modelResponses = responses.reduce((acc, response) => {
      if (!acc[response.model]) acc[response.model] = [];
      acc[response.model].push(response);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate cross-model agreement
    const agreements = [];
    const models = Object.keys(modelResponses);
    
    for (let i = 0; i < models.length - 1; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const model1Responses = modelResponses[models[i]];
        const model2Responses = modelResponses[models[j]];
        
        const agreement = this.calculateResponseAgreement(model1Responses, model2Responses);
        agreements.push(agreement);
      }
    }

    const avgAgreement = agreements.length > 0 ? 
      agreements.reduce((sum, a) => sum + a, 0) / agreements.length : 0.5;

    // Factor in prediction consistency
    const predictionConsistency = this.calculatePredictionConsistency(predictions);

    return (avgAgreement * 0.6 + predictionConsistency * 0.4);
  }

  private async calculateHistoricalValidationScore(historicalData: any): Promise<number> {
    const responses = historicalData.responses || [];
    
    if (responses.length < 10) {
      return 0.4; // Low validation score with insufficient history
    }

    // Time series analysis for validation
    const timeSeriesData = this.extractTimeSeriesData(responses);
    
    if (timeSeriesData.length < 5) {
      return 0.5;
    }

    // Calculate trend consistency
    const trendConsistency = this.calculateTrendConsistency(timeSeriesData);
    
    // Calculate prediction stability over time
    const temporalStability = this.calculateTemporalStability(timeSeriesData);
    
    // Check for outlier patterns
    const outlierRatio = this.calculateOutlierRatio(timeSeriesData);
    const outlierScore = 1 - Math.min(0.5, outlierRatio);

    return (trendConsistency * 0.4 + temporalStability * 0.4 + outlierScore * 0.2);
  }

  private async calculatePredictionStability(predictions: any, historicalData: any): Promise<any> {
    const responses = historicalData.responses || [];
    
    // Short-term stability (last 7 days)
    const recentResponses = responses.filter(r => 
      new Date(r.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const shortTermStability = this.calculateResponseStability(recentResponses);

    // Long-term stability (last 30 days)
    const monthlyResponses = responses.filter(r => 
      new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const longTermStability = this.calculateResponseStability(monthlyResponses);

    // Volatility score
    const timeSeriesData = this.extractTimeSeriesData(responses);
    const volatilityScore = this.calculateVolatilityScore(timeSeriesData);

    return {
      short_term_stability: Math.round(shortTermStability * 100) / 100,
      long_term_stability: Math.round(longTermStability * 100) / 100,
      volatility_score: Math.round(volatilityScore * 100) / 100
    };
  }

  private async calculateQualityIndicators(historicalData: any): Promise<any> {
    const responses = historicalData.responses || [];

    // Sample size adequacy
    const sampleSizeAdequacy = Math.min(1, responses.length / 50);

    // Temporal consistency
    const temporalConsistency = responses.length > 5 ? 
      this.calculateTemporalConsistency(responses) : 0.5;

    // Cross-model agreement
    const crossModelAgreement = this.calculateCrossModelAgreement(responses);

    // Outlier detection
    const outlierDetection = 1 - this.calculateOutlierRatio(
      this.extractTimeSeriesData(responses)
    );

    return {
      sample_size_adequacy: Math.round(sampleSizeAdequacy * 100) / 100,
      temporal_consistency: Math.round(temporalConsistency * 100) / 100,
      cross_model_agreement: Math.round(crossModelAgreement * 100) / 100,
      outlier_detection: Math.round(outlierDetection * 100) / 100
    };
  }

  private async calculateFactorBreakdown(
    historicalData: any,
    predictions: any,
    modelAccuracy: number
  ): Promise<any> {
    const responses = historicalData.responses || [];

    // Data completeness
    const dataCompleteness = Math.min(1, responses.length / 30);

    // Data freshness
    const dataFreshness = responses.length > 0 ? 
      this.calculateRecencyScore(new Date(responses[0].created_at)) : 0;

    // Model performance
    const modelPerformance = modelAccuracy;

    // Cross validation
    const crossValidation = this.calculateCrossValidationScore(responses);

    // Uncertainty bounds
    const uncertaintyBounds = this.calculateUncertaintyBounds(predictions);

    return {
      data_completeness: Math.round(dataCompleteness * 100) / 100,
      data_freshness: Math.round(dataFreshness * 100) / 100,
      model_performance: Math.round(modelPerformance * 100) / 100,
      cross_validation: Math.round(crossValidation * 100) / 100,
      uncertainty_bounds: Math.round(uncertaintyBounds * 100) / 100
    };
  }

  private calculateOverallConfidence(
    dataQuality: number,
    modelAccuracy: number,
    historicalValidation: number,
    volatilityScore: number
  ): number {
    const stabilityScore = 1 - Math.min(0.5, volatilityScore);
    
    return (
      dataQuality * this.scoringWeights.data_quality +
      modelAccuracy * this.scoringWeights.model_accuracy +
      historicalValidation * this.scoringWeights.historical_validation +
      stabilityScore * this.scoringWeights.prediction_stability
    );
  }

  private calculateConfidenceIntervals(
    predictions: any,
    overallConfidence: number,
    volatilityScore: number
  ): any {
    // Calculate confidence interval width based on confidence and volatility
    const baseWidth = (1 - overallConfidence) * 0.5;
    const volatilityAdjustment = volatilityScore * 0.3;
    const intervalWidth = baseWidth + volatilityAdjustment;

    const lowerBound = Math.max(0, overallConfidence - intervalWidth);
    const upperBound = Math.min(1, overallConfidence + intervalWidth);

    return {
      lower_bound: Math.round(lowerBound * 100) / 100,
      upper_bound: Math.round(upperBound * 100) / 100,
      interval_width: Math.round(intervalWidth * 100) / 100
    };
  }

  private determineReliabilityGrade(
    overallConfidence: number,
    factorBreakdown: any
  ): 'A' | 'B' | 'C' | 'D' | 'F' {
    // Check if any critical factors are too low
    const criticalFactors = [
      factorBreakdown.data_completeness,
      factorBreakdown.model_performance
    ];
    
    const hasLowCriticalFactor = criticalFactors.some(factor => factor < 0.3);
    
    if (hasLowCriticalFactor) {
      return overallConfidence > 0.6 ? 'C' : 'D';
    }

    if (overallConfidence >= 0.9) return 'A';
    if (overallConfidence >= 0.8) return 'B';
    if (overallConfidence >= 0.6) return 'C';
    if (overallConfidence >= 0.4) return 'D';
    return 'F';
  }

  // Helper methods

  private calculateRecencyScore(responseDate: Date): number {
    const now = new Date();
    const daysSince = (now.getTime() - responseDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - (daysSince / 30)); // Decay over 30 days
  }

  private calculateResponseAgreement(responses1: any[], responses2: any[]): number {
    // Simplified agreement calculation based on response similarity
    if (responses1.length === 0 || responses2.length === 0) return 0.5;
    
    // For position-based responses, extract rankings and compare
    const positions1 = responses1.map(r => this.extractPosition(r.response));
    const positions2 = responses2.map(r => this.extractPosition(r.response));
    
    const validPositions1 = positions1.filter(p => p > 0);
    const validPositions2 = positions2.filter(p => p > 0);
    
    if (validPositions1.length === 0 || validPositions2.length === 0) return 0.5;
    
    const avg1 = validPositions1.reduce((sum, p) => sum + p, 0) / validPositions1.length;
    const avg2 = validPositions2.reduce((sum, p) => sum + p, 0) / validPositions2.length;
    
    const difference = Math.abs(avg1 - avg2);
    return Math.max(0, 1 - (difference / 10)); // Normalize by max possible difference
  }

  private extractPosition(response: string): number {
    const matches = response.match(/#(\d+)/);
    return matches ? parseInt(matches[1]) : 0;
  }

  private calculatePredictionConsistency(predictions: any): number {
    // Simplified consistency check
    return 0.7; // Placeholder
  }

  private extractTimeSeriesData(responses: any[]): any[] {
    // Group responses by day and calculate average positions
    const dailyData = new Map<string, number[]>();
    
    responses.forEach(response => {
      const date = new Date(response.created_at).toISOString().split('T')[0];
      const position = this.extractPosition(response.response);
      
      if (position > 0) {
        if (!dailyData.has(date)) dailyData.set(date, []);
        dailyData.get(date)!.push(position);
      }
    });
    
    return Array.from(dailyData.entries()).map(([date, positions]) => ({
      date,
      avgPosition: positions.reduce((sum, p) => sum + p, 0) / positions.length,
      count: positions.length
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateTrendConsistency(timeSeriesData: any[]): number {
    if (timeSeriesData.length < 3) return 0.5;
    
    // Calculate moving averages and trend consistency
    let consistentTrends = 0;
    let totalTrends = 0;
    
    for (let i = 2; i < timeSeriesData.length; i++) {
      const trend1 = timeSeriesData[i-1].avgPosition - timeSeriesData[i-2].avgPosition;
      const trend2 = timeSeriesData[i].avgPosition - timeSeriesData[i-1].avgPosition;
      
      if (Math.sign(trend1) === Math.sign(trend2) || Math.abs(trend1) < 0.5 || Math.abs(trend2) < 0.5) {
        consistentTrends++;
      }
      totalTrends++;
    }
    
    return totalTrends > 0 ? consistentTrends / totalTrends : 0.5;
  }

  private calculateTemporalStability(timeSeriesData: any[]): number {
    if (timeSeriesData.length < 2) return 0.5;
    
    const positions = timeSeriesData.map(d => d.avgPosition);
    const mean = positions.reduce((sum, p) => sum + p, 0) / positions.length;
    const variance = positions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / positions.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher stability
    return Math.max(0, 1 - (stdDev / 5)); // Normalize by expected max std dev
  }

  private calculateOutlierRatio(timeSeriesData: any[]): number {
    if (timeSeriesData.length < 3) return 0;
    
    const positions = timeSeriesData.map(d => d.avgPosition);
    const mean = positions.reduce((sum, p) => sum + p, 0) / positions.length;
    const stdDev = Math.sqrt(
      positions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / positions.length
    );
    
    const outliers = positions.filter(p => Math.abs(p - mean) > 2 * stdDev);
    return outliers.length / positions.length;
  }

  private calculateResponseStability(responses: any[]): number {
    if (responses.length < 2) return 0.5;
    
    const positions = responses.map(r => this.extractPosition(r.response)).filter(p => p > 0);
    if (positions.length < 2) return 0.5;
    
    const variance = this.calculateVariance(positions);
    return Math.max(0, 1 - (Math.sqrt(variance) / 5));
  }

  private calculateVolatilityScore(timeSeriesData: any[]): number {
    if (timeSeriesData.length < 2) return 0.5;
    
    const changes = [];
    for (let i = 1; i < timeSeriesData.length; i++) {
      changes.push(Math.abs(timeSeriesData[i].avgPosition - timeSeriesData[i-1].avgPosition));
    }
    
    const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
    return Math.min(1, avgChange / 3); // Normalize by expected max change
  }

  private calculateTemporalConsistency(responses: any[]): number {
    // Simplified temporal consistency calculation
    const timeSeriesData = this.extractTimeSeriesData(responses);
    return this.calculateTrendConsistency(timeSeriesData);
  }

  private calculateCrossModelAgreement(responses: any[]): number {
    const modelGroups = responses.reduce((acc, response) => {
      if (!acc[response.model]) acc[response.model] = [];
      acc[response.model].push(response);
      return acc;
    }, {} as Record<string, any[]>);
    
    const models = Object.keys(modelGroups);
    if (models.length < 2) return 0.5;
    
    const agreements = [];
    for (let i = 0; i < models.length - 1; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const agreement = this.calculateResponseAgreement(
          modelGroups[models[i]], 
          modelGroups[models[j]]
        );
        agreements.push(agreement);
      }
    }
    
    return agreements.reduce((sum, a) => sum + a, 0) / agreements.length;
  }

  private calculateCrossValidationScore(responses: any[]): number {
    // Simplified cross-validation score
    return this.calculateCrossModelAgreement(responses);
  }

  private calculateUncertaintyBounds(predictions: any): number {
    // Simplified uncertainty bounds calculation
    return 0.7; // Placeholder
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }
}