// ============================================================================
// 🎯 REALITY VALIDATION ENGINE
// ============================================================================

import { db } from './database';
import { FinancialDataSource, RegulatoryDataSource } from './data-sources/financial';
import { MarketDataSource } from './data-sources/market';
import { BusinessDataSource } from './data-sources/business';
import { 
  RealityCheck, 
  AIAssessment, 
  DivergenceAnalysis, 
  GroundTruthMetrics,
  ModelAccuracy,
  DivergenceAlert
} from './types';

export class RealityEngine {
  private financialSource: FinancialDataSource;
  private regulatorySource: RegulatoryDataSource;
  private marketSource: MarketDataSource;
  private businessSource: BusinessDataSource;

  constructor() {
    this.financialSource = new FinancialDataSource();
    this.regulatorySource = new RegulatoryDataSource();
    this.marketSource = new MarketDataSource();
    this.businessSource = new BusinessDataSource();
  }

  async performRealityCheck(domain: string): Promise<RealityCheck> {
    console.log(`🎯 Performing reality check for ${domain}...`);
    
    try {
      // Get existing AI data
      const domainData = await db.getDomainData(domain);
      if (!domainData) {
        throw new Error(`Domain ${domain} not found in AI database`);
      }

      const aiResponses = await db.getAIResponses(domainData.id);
      
      // Get ground truth data
      const groundTruth = await this.collectGroundTruth(domainData.id, domain);
      
      // Analyze AI responses
      const aiAssessment = await this.analyzeAIResponses(aiResponses);
      
      // Compare AI vs Reality
      const divergenceAnalysis = this.analyzeDivergence(aiAssessment, groundTruth);
      
      // Calculate truth score
      const truthScore = this.calculateTruthScore(aiAssessment, groundTruth, divergenceAnalysis);
      
      const realityCheck: RealityCheck = {
        domain: domain,
        domain_id: domainData.id,
        ai_assessment: aiAssessment,
        reality_metrics: groundTruth,
        divergence_analysis: divergenceAnalysis,
        truth_score: truthScore,
        confidence_level: this.calculateConfidenceLevel(groundTruth),
        last_updated: new Date()
      };

      // Store results
      await db.storeRealityCheck(realityCheck);
      await db.storeGroundTruthMetrics(groundTruth);
      
      // Generate alerts if needed
      await this.generateDivergenceAlerts(realityCheck);
      
      console.log(`✅ Reality check completed for ${domain} (truth score: ${truthScore})`);
      return realityCheck;
      
    } catch (error) {
      console.error(`❌ Reality check failed for ${domain}:`, error);
      throw error;
    }
  }

  private async collectGroundTruth(domainId: string, domain: string): Promise<GroundTruthMetrics> {
    console.log(`📊 Collecting ground truth data for ${domain}...`);
    
    // Check if we have recent data
    const existingData = await db.getGroundTruthMetrics(domainId);
    if (existingData && this.isDataFresh(existingData.calculated_at)) {
      console.log(`♻️ Using cached ground truth data for ${domain}`);
      return existingData;
    }

    // Collect fresh data from all sources
    const [financialData, regulatoryData, marketData, businessData] = await Promise.all([
      this.financialSource.getFinancialData(domain),
      this.regulatorySource.getRegulatoryData(domain),
      this.marketSource.getMarketData(domain),
      this.businessSource.getBusinessData(domain)
    ]);

    return {
      domain_id: domainId,
      financial_data: financialData,
      regulatory_data: regulatoryData,
      market_data: marketData,
      business_data: businessData,
      calculated_at: new Date(),
      data_freshness: 'fresh'
    };
  }

  private async analyzeAIResponses(responses: any[]): Promise<AIAssessment> {
    console.log(`🤖 Analyzing ${responses.length} AI responses...`);
    
    // Group responses by model
    const modelGroups = this.groupResponsesByModel(responses);
    
    // Calculate consensus
    const consensusScore = this.calculateConsensusScore(responses);
    const modelAgreement = this.calculateModelAgreement(modelGroups);
    const confidenceLevel = this.calculateAIConfidence(responses);
    
    // Extract themes and sentiment
    const dominantThemes = this.extractDominantThemes(responses);
    const sentimentDistribution = this.calculateSentimentDistribution(responses);
    const modelBreakdown = this.createModelBreakdown(modelGroups);
    
    return {
      consensus_score: consensusScore,
      model_agreement: modelAgreement,
      confidence_level: confidenceLevel,
      dominant_themes: dominantThemes,
      sentiment_distribution: sentimentDistribution,
      model_breakdown: modelBreakdown
    };
  }

  private analyzeDivergence(aiAssessment: AIAssessment, groundTruth: GroundTruthMetrics): DivergenceAnalysis {
    console.log(`📈 Analyzing AI vs Reality divergence...`);
    
    // Calculate reality score from ground truth
    const realityScore = this.calculateRealityScore(groundTruth);
    
    // Calculate divergences in different areas
    const overallDivergence = Math.abs(aiAssessment.consensus_score - realityScore);
    const financialDivergence = this.calculateFinancialDivergence(aiAssessment, groundTruth);
    const regulatoryDivergence = this.calculateRegulatoryDivergence(aiAssessment, groundTruth);
    const marketDivergence = this.calculateMarketDivergence(aiAssessment, groundTruth);
    
    // Determine divergence level
    const divergenceLevel = this.categorizeDivergenceLevel(overallDivergence);
    
    // Identify key discrepancies
    const keyDiscrepancies = this.identifyKeyDiscrepancies(aiAssessment, groundTruth);
    const riskFactors = this.identifyRiskFactors(groundTruth);
    
    return {
      overall_divergence: overallDivergence,
      financial_divergence: financialDivergence,
      regulatory_divergence: regulatoryDivergence,
      market_divergence: marketDivergence,
      divergence_level: divergenceLevel,
      key_discrepancies: keyDiscrepancies,
      risk_factors: riskFactors
    };
  }

  private calculateTruthScore(
    aiAssessment: AIAssessment, 
    groundTruth: GroundTruthMetrics, 
    divergence: DivergenceAnalysis
  ): number {
    // Start with AI consensus as baseline
    let truthScore = aiAssessment.consensus_score;
    
    // Apply reality adjustments
    const realityScore = this.calculateRealityScore(groundTruth);
    
    // Weight the scores based on confidence and data quality
    const aiWeight = aiAssessment.confidence_level * 0.3;
    const realityWeight = this.getGroundTruthReliability(groundTruth) * 0.7;
    
    truthScore = (aiAssessment.consensus_score * aiWeight + realityScore * realityWeight) / (aiWeight + realityWeight);
    
    // Apply divergence penalty
    const divergencePenalty = Math.min(divergence.overall_divergence * 0.5, 30);
    truthScore = Math.max(0, truthScore - divergencePenalty);
    
    return Math.round(truthScore * 10) / 10;
  }

  private calculateRealityScore(groundTruth: GroundTruthMetrics): number {
    let score = 50; // Base score
    
    // Financial health impact
    const financialScore = this.scoreFinancialHealth(groundTruth.financial_data);
    score += (financialScore - 50) * 0.4;
    
    // Regulatory compliance impact
    const regulatoryScore = groundTruth.regulatory_data.compliance_score;
    score += (regulatoryScore - 75) * 0.3;
    
    // Market sentiment impact
    const marketScore = groundTruth.market_data.social_sentiment * 50 + 50;
    score += (marketScore - 50) * 0.2;
    
    // Business stage impact
    const businessScore = this.scoreBusinessStage(groundTruth.business_data);
    score += (businessScore - 50) * 0.1;
    
    return Math.max(0, Math.min(100, score));
  }

  private scoreFinancialHealth(financial: any): number {
    if (financial.status === 'bankrupt' || financial.status === 'delisted') {
      return 0;
    }
    
    if (financial.status === 'private' || financial.status === 'unknown') {
      return 50;
    }
    
    let score = 60; // Base for public companies
    
    if (financial.profit_margin > 0.2) score += 20;
    else if (financial.profit_margin > 0.1) score += 10;
    else if (financial.profit_margin < 0) score -= 20;
    
    if (financial.debt_to_equity < 0.3) score += 10;
    else if (financial.debt_to_equity > 1.0) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  private scoreBusinessStage(business: any): number {
    const stageScores = {
      'defunct': 0,
      'declining': 20,
      'startup': 40,
      'growth': 70,
      'mature': 80
    };
    
    return stageScores[business.business_stage] || 50;
  }

  // Helper methods for AI analysis
  private groupResponsesByModel(responses: any[]): Record<string, any[]> {
    return responses.reduce((groups, response) => {
      const model = response.model;
      if (!groups[model]) {
        groups[model] = [];
      }
      groups[model].push(response);
      return groups;
    }, {});
  }

  private calculateConsensusScore(responses: any[]): number {
    // Extract sentiment scores from responses and average them
    // This is a simplified implementation
    const scores = responses.map(r => this.extractSentimentScore(r.raw_response));
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private extractSentimentScore(response: string): number {
    // Simple sentiment scoring based on keywords
    const positiveKeywords = ['excellent', 'great', 'successful', 'leading', 'innovative', 'strong'];
    const negativeKeywords = ['poor', 'failed', 'struggling', 'declining', 'problematic', 'weak'];
    
    const lowerResponse = response.toLowerCase();
    let score = 50; // Neutral base
    
    positiveKeywords.forEach(keyword => {
      if (lowerResponse.includes(keyword)) score += 5;
    });
    
    negativeKeywords.forEach(keyword => {
      if (lowerResponse.includes(keyword)) score -= 5;
    });
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateModelAgreement(modelGroups: Record<string, any[]>): number {
    const modelScores = Object.values(modelGroups).map(responses => 
      this.calculateConsensusScore(responses)
    );
    
    const mean = modelScores.reduce((sum, score) => sum + score, 0) / modelScores.length;
    const variance = modelScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / modelScores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Higher agreement = lower standard deviation
    return Math.max(0, 1 - (standardDeviation / 50));
  }

  private calculateAIConfidence(responses: any[]): number {
    // Calculate confidence based on response consistency and length
    const avgLength = responses.reduce((sum, r) => sum + r.raw_response.length, 0) / responses.length;
    const lengthScore = Math.min(avgLength / 1000, 1); // Normalize to 0-1
    
    return lengthScore * 0.5 + 0.5; // Baseline confidence of 0.5
  }

  private extractDominantThemes(responses: any[]): string[] {
    // Extract common themes from responses
    const allText = responses.map(r => r.raw_response).join(' ').toLowerCase();
    const commonThemes = ['innovation', 'technology', 'market', 'customer', 'growth', 'service'];
    
    return commonThemes.filter(theme => allText.includes(theme)).slice(0, 5);
  }

  private calculateSentimentDistribution(responses: any[]): Record<string, number> {
    const sentiments = responses.map(r => this.categorizeSentiment(r.raw_response));
    const distribution = { positive: 0, neutral: 0, negative: 0 };
    
    sentiments.forEach(sentiment => {
      distribution[sentiment]++;
    });
    
    const total = sentiments.length;
    return {
      positive: distribution.positive / total,
      neutral: distribution.neutral / total,
      negative: distribution.negative / total
    };
  }

  private categorizeSentiment(response: string): 'positive' | 'neutral' | 'negative' {
    const score = this.extractSentimentScore(response);
    if (score > 60) return 'positive';
    if (score < 40) return 'negative';
    return 'neutral';
  }

  private createModelBreakdown(modelGroups: Record<string, any[]>): any[] {
    return Object.entries(modelGroups).map(([model, responses]) => ({
      model: model,
      score: this.calculateConsensusScore(responses),
      confidence: this.calculateAIConfidence(responses),
      key_themes: this.extractDominantThemes(responses),
      sentiment: this.categorizeSentiment(responses[0]?.raw_response || '')
    }));
  }

  // Helper methods for divergence analysis
  private calculateFinancialDivergence(aiAssessment: AIAssessment, groundTruth: GroundTruthMetrics): number {
    const aiFinancialSentiment = this.extractFinancialSentiment(aiAssessment);
    const realityFinancialScore = this.scoreFinancialHealth(groundTruth.financial_data);
    return Math.abs(aiFinancialSentiment - realityFinancialScore);
  }

  private calculateRegulatoryDivergence(aiAssessment: AIAssessment, groundTruth: GroundTruthMetrics): number {
    // Check if AI mentions regulatory issues vs actual violations
    const aiMentionsRegulatory = aiAssessment.dominant_themes.some(theme => 
      ['compliance', 'regulation', 'legal'].includes(theme)
    );
    
    const hasRegulatoryIssues = groundTruth.regulatory_data.violations.length > 0;
    
    if (aiMentionsRegulatory === hasRegulatoryIssues) {
      return 0; // Good alignment
    }
    
    return hasRegulatoryIssues ? 30 : 15; // Higher penalty if AI misses real issues
  }

  private calculateMarketDivergence(aiAssessment: AIAssessment, groundTruth: GroundTruthMetrics): number {
    const aiMarketSentiment = aiAssessment.sentiment_distribution.positive - aiAssessment.sentiment_distribution.negative;
    const realityMarketSentiment = groundTruth.market_data.social_sentiment;
    return Math.abs(aiMarketSentiment - realityMarketSentiment) * 50;
  }

  private extractFinancialSentiment(aiAssessment: AIAssessment): number {
    // Extract financial sentiment from AI themes and responses
    const financialThemes = ['profitable', 'revenue', 'growth', 'financial', 'earnings'];
    const hasPositiveFinancial = aiAssessment.dominant_themes.some(theme => 
      financialThemes.includes(theme)
    );
    
    return hasPositiveFinancial ? 70 : 50;
  }

  private categorizeDivergenceLevel(divergence: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (divergence < 10) return 'low';
    if (divergence < 25) return 'medium';
    if (divergence < 50) return 'high';
    return 'extreme';
  }

  private identifyKeyDiscrepancies(aiAssessment: AIAssessment, groundTruth: GroundTruthMetrics): string[] {
    const discrepancies: string[] = [];
    
    // Check for major financial discrepancies
    if (groundTruth.financial_data.status === 'bankrupt' && aiAssessment.consensus_score > 50) {
      discrepancies.push('AI shows high confidence for bankrupt company');
    }
    
    // Check for regulatory blind spots
    if (groundTruth.regulatory_data.violations.length > 0 && 
        !aiAssessment.dominant_themes.includes('regulatory')) {
      discrepancies.push('AI unaware of regulatory violations');
    }
    
    // Check for market sentiment mismatch
    if (groundTruth.market_data.social_sentiment < -0.5 && 
        aiAssessment.sentiment_distribution.positive > 0.6) {
      discrepancies.push('AI positive sentiment despite negative market sentiment');
    }
    
    return discrepancies;
  }

  private identifyRiskFactors(groundTruth: GroundTruthMetrics): string[] {
    const risks: string[] = [];
    
    if (groundTruth.financial_data.status === 'delisted') {
      risks.push('Company is delisted from stock exchange');
    }
    
    if (groundTruth.regulatory_data.risk_level === 'critical') {
      risks.push('Critical regulatory compliance issues');
    }
    
    if (groundTruth.business_data.business_stage === 'declining') {
      risks.push('Business in declining stage');
    }
    
    return risks;
  }

  private calculateConfidenceLevel(groundTruth: GroundTruthMetrics): 'low' | 'medium' | 'high' {
    const reliability = this.getGroundTruthReliability(groundTruth);
    
    if (reliability > 0.8) return 'high';
    if (reliability > 0.5) return 'medium';
    return 'low';
  }

  private getGroundTruthReliability(groundTruth: GroundTruthMetrics): number {
    let reliability = 0;
    let sources = 0;
    
    // Financial data reliability
    if (groundTruth.financial_data.status !== 'unknown') {
      reliability += 0.9;
      sources++;
    }
    
    // Regulatory data reliability
    if (groundTruth.regulatory_data.violations.length > 0 || 
        groundTruth.regulatory_data.sec_filings.length > 0) {
      reliability += 0.95;
      sources++;
    } else {
      reliability += 0.7; // Absence of violations is also data
      sources++;
    }
    
    // Market data reliability
    if (groundTruth.market_data.social_sentiment !== 0) {
      reliability += 0.6;
      sources++;
    }
    
    // Business data reliability
    if (groundTruth.business_data.business_stage !== 'unknown') {
      reliability += 0.7;
      sources++;
    }
    
    return sources > 0 ? reliability / sources : 0.5;
  }

  private isDataFresh(timestamp: Date): boolean {
    const hoursSinceUpdate = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate < 24; // Consider data fresh for 24 hours
  }

  private async generateDivergenceAlerts(realityCheck: RealityCheck): Promise<void> {
    if (realityCheck.divergence_analysis.divergence_level === 'low') {
      return; // No alerts needed for low divergence
    }

    const alert: DivergenceAlert = {
      domain: realityCheck.domain,
      alert_type: this.determineAlertType(realityCheck),
      severity: this.mapDivergenceToSeverity(realityCheck.divergence_analysis.divergence_level),
      message: this.generateAlertMessage(realityCheck),
      ai_score: realityCheck.ai_assessment.consensus_score,
      reality_score: this.calculateRealityScore(realityCheck.reality_metrics),
      divergence: realityCheck.divergence_analysis.overall_divergence,
      recommended_action: this.generateRecommendedAction(realityCheck),
      created_at: new Date()
    };

    // Store alert (would implement database storage)
    console.log(`🚨 Generated divergence alert for ${realityCheck.domain}:`, alert.message);
  }

  private determineAlertType(realityCheck: RealityCheck): 'high_divergence' | 'reality_shift' | 'ai_blindspot' | 'crisis_lag' {
    if (realityCheck.reality_metrics.regulatory_data.violations.length > 0) {
      return 'ai_blindspot';
    }
    
    if (realityCheck.reality_metrics.financial_data.status === 'bankrupt') {
      return 'crisis_lag';
    }
    
    return 'high_divergence';
  }

  private mapDivergenceToSeverity(level: string): 'low' | 'medium' | 'high' | 'critical' {
    const mapping = {
      'low': 'low',
      'medium': 'medium', 
      'high': 'high',
      'extreme': 'critical'
    };
    return mapping[level] || 'medium';
  }

  private generateAlertMessage(realityCheck: RealityCheck): string {
    const aiScore = realityCheck.ai_assessment.consensus_score;
    const realityScore = this.calculateRealityScore(realityCheck.reality_metrics);
    const divergence = realityCheck.divergence_analysis.overall_divergence;
    
    return `AI shows ${aiScore}% confidence but reality indicates ${realityScore}% (${divergence.toFixed(1)} point divergence)`;
  }

  private generateRecommendedAction(realityCheck: RealityCheck): string {
    if (realityCheck.reality_metrics.regulatory_data.violations.length > 0) {
      return 'Review regulatory compliance issues that AI models may not be aware of';
    }
    
    if (realityCheck.reality_metrics.financial_data.status === 'bankrupt') {
      return 'Update AI training data to reflect company bankruptcy status';
    }
    
    return 'Investigate discrepancy between AI assessment and market reality';
  }
} 