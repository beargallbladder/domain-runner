import { Pool } from 'pg';
import { Logger } from 'winston';
import * as fs from 'fs';
import * as path from 'path';

export interface JOLTAdjustments {
  confidence_modifier: number;
  position_adjustment: number;
  volatility_factor: number;
  memory_decay_rate: number;
  brand_transition_impact: number;
}

export interface JOLTContext {
  is_jolt_domain: boolean;
  jolt_type?: string;
  jolt_severity?: string;
  baseline_memory_score?: number;
  transition_date?: string;
  paired_domain?: string;
  market_context?: string;
  ai_behavior_pattern?: string;
  additional_prompts?: number;
}

export class JOLTBenchmarkIntegrator {
  private pool: Pool;
  private logger: Logger;
  private joltBenchmarks: any;

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
    this.loadJOLTBenchmarks();
  }

  private loadJOLTBenchmarks(): void {
    try {
      const benchmarkPath = path.join(__dirname, '../../../industry-intelligence/config/jolt-benchmarks.json');
      if (fs.existsSync(benchmarkPath)) {
        this.joltBenchmarks = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
        this.logger.info('📊 JOLT benchmarks loaded', { 
          totalCases: this.joltBenchmarks.total_cases,
          version: this.joltBenchmarks.version
        });
      } else {
        this.logger.warn('JOLT benchmarks file not found, using fallback data');
        this.joltBenchmarks = this.getFallbackJOLTData();
      }
    } catch (error) {
      this.logger.error('Failed to load JOLT benchmarks', { error: error.message });
      this.joltBenchmarks = this.getFallbackJOLTData();
    }
  }

  async getJOLTAdjustments(domain: string): Promise<JOLTAdjustments | null> {
    try {
      const joltCase = this.joltBenchmarks.jolt_cases?.[domain];
      
      if (!joltCase) {
        return null; // Not a JOLT case
      }

      const metadata = joltCase.metadata || {};
      const severity = metadata.severity || 'medium';
      const joltType = metadata.type || 'unknown';

      // Calculate adjustments based on JOLT characteristics
      const adjustments: JOLTAdjustments = {
        confidence_modifier: this.calculateConfidenceModifier(severity, joltType),
        position_adjustment: this.calculatePositionAdjustment(metadata),
        volatility_factor: this.calculateVolatilityFactor(severity, joltType),
        memory_decay_rate: this.calculateMemoryDecayRate(metadata),
        brand_transition_impact: this.calculateBrandTransitionImpact(metadata)
      };

      this.logger.debug('JOLT adjustments calculated', { domain, adjustments });
      return adjustments;

    } catch (error) {
      this.logger.error('Failed to get JOLT adjustments', { error: error.message, domain });
      return null;
    }
  }

  async getThreatContext(domain: string, threats: any[]): Promise<Record<string, any>> {
    try {
      const joltCase = this.joltBenchmarks.jolt_cases?.[domain];
      const context: Record<string, any> = {};

      if (!joltCase) {
        return context;
      }

      const metadata = joltCase.metadata || {};

      // Enhance threats with JOLT historical context
      threats.forEach(threat => {
        context[threat.threat_id] = {
          historical_precedent: this.getHistoricalPrecedent(metadata.type, threat.threat_type),
          jolt_severity_factor: this.getSeverityFactor(metadata.severity),
          transition_timeline: metadata.date ? this.calculateTimeSinceTransition(metadata.date) : null,
          ai_confusion_pattern: metadata.ai_behavior_pattern || null,
          market_context_influence: metadata.market_context || null
        };
      });

      return context;

    } catch (error) {
      this.logger.error('Failed to get threat context', { error: error.message, domain });
      return {};
    }
  }

  async getTrajectoryInsights(domain: string, trajectory: any): Promise<any> {
    try {
      const joltCase = this.joltBenchmarks.jolt_cases?.[domain];
      
      if (!joltCase) {
        return null;
      }

      const metadata = joltCase.metadata || {};
      
      return {
        jolt_transition_impact: {
          type: metadata.type,
          date: metadata.date,
          expected_duration: this.getExpectedRecoveryDuration(metadata.type),
          volatility_period: this.getVolatilityPeriod(metadata.severity),
          market_memory_factor: this.getMarketMemoryFactor(metadata.type)
        },
        historical_pattern: {
          typical_trajectory: this.getTypicalJOLTTrajectory(metadata.type),
          recovery_indicators: this.getRecoveryIndicators(metadata.type),
          risk_factors: this.getJOLTRiskFactors(metadata.type)
        },
        ai_behavior_insights: {
          confusion_pattern: metadata.ai_behavior_pattern,
          baseline_memory_score: metadata.baseline_memory_score,
          expected_accuracy_impact: this.calculateAccuracyImpact(metadata.severity)
        }
      };

    } catch (error) {
      this.logger.error('Failed to get trajectory insights', { error: error.message, domain });
      return null;
    }
  }

  async getDisruptionPatterns(category: string, disruptions: any[]): Promise<Record<string, any>> {
    try {
      const patterns: Record<string, any> = {};

      // Find JOLT cases in the same category/industry
      const relatedJOLTCases = Object.entries(this.joltBenchmarks.jolt_cases || {})
        .filter(([_, caseData]: [string, any]) => {
          const metadata = caseData.metadata || {};
          return metadata.industry === category || metadata.type?.includes(category);
        });

      disruptions.forEach(disruption => {
        const relevantCases = relatedJOLTCases.filter(([_, caseData]: [string, any]) => {
          const metadata = caseData.metadata || {};
          return this.isRelevantToDisruption(metadata, disruption);
        });

        if (relevantCases.length > 0) {
          patterns[disruption.disruption_id] = {
            historical_cases: relevantCases.map(([domain, caseData]) => ({
              domain,
              type: caseData.metadata?.type,
              date: caseData.metadata?.date,
              severity: caseData.metadata?.severity,
              market_context: caseData.metadata?.market_context
            })),
            pattern_frequency: this.calculatePatternFrequency(relevantCases, disruption.disruption_type),
            success_rate: this.calculateSuccessRate(relevantCases),
            typical_timeline: this.getTypicalDisruptionTimeline(disruption.disruption_type),
            warning_indicators: this.getDisruptionWarningIndicators(disruption.disruption_type)
          };
        }
      });

      return patterns;

    } catch (error) {
      this.logger.error('Failed to get disruption patterns', { error: error.message, category });
      return {};
    }
  }

  async getInvestmentInsights(domain: string, allocation: any): Promise<any> {
    try {
      const joltCase = this.joltBenchmarks.jolt_cases?.[domain];
      
      if (!joltCase) {
        return null;
      }

      const metadata = joltCase.metadata || {};
      
      return {
        jolt_investment_strategy: {
          risk_adjustment: this.calculateJOLTRiskAdjustment(metadata.severity),
          recovery_timeline: this.getRecoveryInvestmentTimeline(metadata.type),
          priority_areas: this.getJOLTInvestmentPriorities(metadata.type, metadata.severity),
          defensive_measures: this.getDefensiveInvestmentMeasures(metadata.type)
        },
        historical_investment_patterns: {
          successful_strategies: this.getSuccessfulJOLTStrategies(metadata.type),
          failed_approaches: this.getFailedJOLTApproaches(metadata.type),
          roi_expectations: this.getJOLTROIExpectations(metadata.severity)
        },
        market_context_considerations: {
          market_sentiment_impact: metadata.market_context,
          industry_specific_factors: this.getIndustryFactors(metadata.industry),
          timing_considerations: this.getTimingConsiderations(metadata.date)
        }
      };

    } catch (error) {
      this.logger.error('Failed to get investment insights', { error: error.message, domain });
      return null;
    }
  }

  async getTemporalPatterns(domain: string, temporalAnalysis: any): Promise<any> {
    try {
      const joltCase = this.joltBenchmarks.jolt_cases?.[domain];
      
      if (!joltCase) {
        return null;
      }

      const metadata = joltCase.metadata || {};
      
      return {
        jolt_temporal_effects: {
          short_term_confusion: this.getShortTermConfusionPattern(metadata.type),
          medium_term_stabilization: this.getMediumTermStabilization(metadata.type),
          long_term_memory_formation: this.getLongTermMemoryFormation(metadata.type),
          ai_learning_curve: this.getAILearningCurve(metadata.severity)
        },
        transition_phases: {
          immediate_impact: this.getImmediateImpactDuration(metadata.type),
          adaptation_period: this.getAdaptationPeriod(metadata.type),
          stabilization_phase: this.getStabilizationPhase(metadata.type),
          new_normal_establishment: this.getNewNormalTimeline(metadata.type)
        },
        prediction_reliability: {
          short_term_accuracy: this.getShortTermAccuracy(metadata.severity),
          medium_term_accuracy: this.getMediumTermAccuracy(metadata.severity),
          long_term_accuracy: this.getLongTermAccuracy(metadata.severity),
          uncertainty_factors: this.getUncertaintyFactors(metadata.type)
        }
      };

    } catch (error) {
      this.logger.error('Failed to get temporal patterns', { error: error.message, domain });
      return null;
    }
  }

  // Helper methods for calculations

  private calculateConfidenceModifier(severity: string, joltType: string): number {
    const severityMultipliers = { critical: 0.6, high: 0.7, medium: 0.8, low: 0.9 };
    const typeMultipliers = {
      brand_transition: 0.7,
      corporate_restructure: 0.8,
      ceo_death_transition: 0.6,
      fraud_collapse: 0.5,
      acquisition_integration: 0.8
    };
    
    return (severityMultipliers[severity as keyof typeof severityMultipliers] || 0.8) *
           (typeMultipliers[joltType as keyof typeof typeMultipliers] || 0.8);
  }

  private calculatePositionAdjustment(metadata: any): number {
    // Adjust position based on JOLT severity and type
    const severityAdjustments = { critical: 2, high: 1, medium: 0.5, low: 0 };
    return severityAdjustments[metadata.severity as keyof typeof severityAdjustments] || 0;
  }

  private calculateVolatilityFactor(severity: string, joltType: string): number {
    const baseVolatility = { critical: 1.8, high: 1.5, medium: 1.2, low: 1.0 };
    return baseVolatility[severity as keyof typeof baseVolatility] || 1.0;
  }

  private calculateMemoryDecayRate(metadata: any): number {
    const timeSinceTransition = metadata.date ? this.calculateTimeSinceTransition(metadata.date) : 0;
    const baseDecayRate = 0.1; // 10% per year base decay
    return baseDecayRate * Math.exp(-timeSinceTransition / 365); // Exponential decay
  }

  private calculateBrandTransitionImpact(metadata: any): number {
    if (metadata.type?.includes('brand_transition') || metadata.type?.includes('rebrand')) {
      return metadata.severity === 'critical' ? 0.9 : 0.6;
    }
    return 0.1; // Minimal impact for non-brand transitions
  }

  private calculateTimeSinceTransition(transitionDate: string): number {
    const transition = new Date(transitionDate);
    const now = new Date();
    return Math.floor((now.getTime() - transition.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getHistoricalPrecedent(joltType: string, threatType: string): string {
    const precedents: Record<string, Record<string, string>> = {
      brand_transition: {
        market_share_loss: 'Facebook->Meta transition led to initial confusion but stabilized',
        competitive_displacement: 'Twitter->X created opportunity gaps for competitors'
      },
      fraud_collapse: {
        brand_erosion: 'Theranos collapse created trust issues across healthcare tech',
        market_share_loss: 'FTX collapse redistributed crypto exchange market share'
      }
    };
    
    return precedents[joltType]?.[threatType] || 'No direct historical precedent';
  }

  private getSeverityFactor(severity: string): number {
    const factors = { critical: 1.0, high: 0.8, medium: 0.6, low: 0.4 };
    return factors[severity as keyof typeof factors] || 0.5;
  }

  private isRelevantToDisruption(metadata: any, disruption: any): boolean {
    return metadata.type?.includes(disruption.disruption_type) ||
           metadata.industry === disruption.category ||
           metadata.market_context?.toLowerCase().includes(disruption.disruption_type);
  }

  private calculatePatternFrequency(cases: any[], disruptionType: string): number {
    return cases.length / (this.joltBenchmarks.total_cases || 30);
  }

  private calculateSuccessRate(cases: any[]): number {
    // Simplified success rate calculation
    const successfulTypes = ['brand_simplification', 'strategic_pivot'];
    const successful = cases.filter(([_, caseData]) => 
      successfulTypes.includes(caseData.metadata?.type)
    ).length;
    return cases.length > 0 ? successful / cases.length : 0;
  }

  private getFallbackJOLTData(): any {
    return {
      version: '2.0',
      total_cases: 30,
      jolt_cases: {
        'facebook.com': {
          metadata: {
            type: 'brand_transition',
            severity: 'critical',
            date: '2021-10-28',
            industry: 'technology',
            ai_behavior_pattern: 'High confusion between Facebook/Meta entities'
          }
        }
      }
    };
  }

  // Additional helper methods with simplified implementations
  private getExpectedRecoveryDuration(type: string): string {
    const durations: Record<string, string> = {
      brand_transition: '12-18 months',
      fraud_collapse: '36+ months',
      ceo_transition: '6-12 months',
      acquisition_integration: '18-24 months'
    };
    return durations[type] || '12-24 months';
  }

  private getVolatilityPeriod(severity: string): string {
    const periods: Record<string, string> = {
      critical: '6-12 months',
      high: '3-9 months',
      medium: '2-6 months',
      low: '1-3 months'
    };
    return periods[severity] || '3-6 months';
  }

  private getMarketMemoryFactor(type: string): number {
    const factors: Record<string, number> = {
      brand_transition: 0.3,
      fraud_collapse: 0.8,
      ceo_death_transition: 0.6,
      acquisition_integration: 0.4
    };
    return factors[type] || 0.5;
  }

  private getTypicalJOLTTrajectory(type: string): string {
    const trajectories: Record<string, string> = {
      brand_transition: 'Initial decline, gradual recovery over 12-18 months',
      fraud_collapse: 'Severe decline, minimal recovery prospects',
      ceo_transition: 'Temporary volatility, stabilization within 6-12 months'
    };
    return trajectories[type] || 'Variable trajectory based on execution';
  }

  private getRecoveryIndicators(type: string): string[] {
    const indicators: Record<string, string[]> = {
      brand_transition: ['Market acceptance of new brand', 'Reduced confusion in mentions', 'Positive sentiment recovery'],
      fraud_collapse: ['Legal resolution', 'New leadership', 'Trust rebuilding measures'],
      ceo_transition: ['Leadership stability', 'Strategic clarity', 'Market confidence']
    };
    return indicators[type] || ['Market stabilization', 'Reduced volatility', 'Clear positioning'];
  }

  private getJOLTRiskFactors(type: string): string[] {
    const riskFactors: Record<string, string[]> = {
      brand_transition: ['Consumer rejection', 'Competitor exploitation', 'Implementation failures'],
      fraud_collapse: ['Legal complications', 'Regulatory scrutiny', 'Industry reputation damage'],
      ceo_transition: ['Succession planning gaps', 'Strategic disruption', 'Talent exodus']
    };
    return riskFactors[type] || ['Market uncertainty', 'Competitive pressure', 'Stakeholder concerns'];
  }

  private calculateAccuracyImpact(severity: string): number {
    const impacts: Record<string, number> = {
      critical: -0.4,
      high: -0.3,
      medium: -0.2,
      low: -0.1
    };
    return impacts[severity] || -0.2;
  }

  private calculateJOLTRiskAdjustment(severity: string): number {
    const adjustments: Record<string, number> = {
      critical: 1.5,
      high: 1.3,
      medium: 1.1,
      low: 1.0
    };
    return adjustments[severity] || 1.1;
  }

  private getRecoveryInvestmentTimeline(type: string): string {
    return this.getExpectedRecoveryDuration(type);
  }

  private getJOLTInvestmentPriorities(type: string, severity: string): string[] {
    const priorities: Record<string, string[]> = {
      brand_transition: ['Brand communication', 'Customer retention', 'Market education'],
      fraud_collapse: ['Legal defense', 'Reputation management', 'Trust rebuilding'],
      ceo_transition: ['Leadership development', 'Strategic continuity', 'Stakeholder communication']
    };
    return priorities[type] || ['Risk mitigation', 'Strategic positioning', 'Market defense'];
  }

  private getDefensiveInvestmentMeasures(type: string): string[] {
    return ['Enhanced monitoring', 'Rapid response capabilities', 'Stakeholder communication', 'Competitive intelligence'];
  }

  private getSuccessfulJOLTStrategies(type: string): string[] {
    return ['Clear communication strategy', 'Gradual transition approach', 'Stakeholder engagement', 'Market education'];
  }

  private getFailedJOLTApproaches(type: string): string[] {
    return ['Abrupt changes', 'Poor communication', 'Ignoring stakeholder concerns', 'Inadequate preparation'];
  }

  private getJOLTROIExpectations(severity: string): string {
    const expectations: Record<string, string> = {
      critical: 'Negative ROI for 12+ months, gradual recovery',
      high: 'Negative ROI for 6-12 months, moderate recovery',
      medium: 'Neutral to slightly negative ROI for 3-6 months',
      low: 'Minimal impact on ROI'
    };
    return expectations[severity] || 'Variable ROI based on execution';
  }

  private getIndustryFactors(industry: string): string[] {
    const factors: Record<string, string[]> = {
      technology: ['Rapid innovation cycles', 'Network effects', 'Platform dynamics'],
      healthcare: ['Regulatory compliance', 'Trust factors', 'Safety considerations'],
      financial_services: ['Regulatory oversight', 'Trust requirements', 'Systemic risk']
    };
    return factors[industry] || ['Industry-specific regulations', 'Market dynamics', 'Competitive factors'];
  }

  private getTimingConsiderations(transitionDate: string): string[] {
    const daysSince = this.calculateTimeSinceTransition(transitionDate);
    if (daysSince < 365) return ['Recent transition', 'High volatility period', 'Market adaptation ongoing'];
    if (daysSince < 1095) return ['Stabilization period', 'Market memory present', 'Recovery phase'];
    return ['Historical event', 'Market memory faded', 'Normalized conditions'];
  }

  // Temporal pattern methods
  private getShortTermConfusionPattern(type: string): string {
    return 'High confusion and volatility in first 30-90 days';
  }

  private getMediumTermStabilization(type: string): string {
    return 'Gradual stabilization over 3-12 months';
  }

  private getLongTermMemoryFormation(type: string): string {
    return 'New normal establishment over 12+ months';
  }

  private getAILearningCurve(severity: string): string {
    return `AI systems adapt over ${severity === 'critical' ? '18-24' : '6-12'} months`;
  }

  private getImmediateImpactDuration(type: string): string {
    return '1-4 weeks';
  }

  private getAdaptationPeriod(type: string): string {
    return '2-6 months';
  }

  private getStabilizationPhase(type: string): string {
    return '6-18 months';
  }

  private getNewNormalTimeline(type: string): string {
    return '12-36 months';
  }

  private getShortTermAccuracy(severity: string): number {
    const accuracies: Record<string, number> = {
      critical: 0.4,
      high: 0.5,
      medium: 0.6,
      low: 0.7
    };
    return accuracies[severity] || 0.5;
  }

  private getMediumTermAccuracy(severity: string): number {
    const accuracies: Record<string, number> = {
      critical: 0.6,
      high: 0.7,
      medium: 0.8,
      low: 0.85
    };
    return accuracies[severity] || 0.7;
  }

  private getLongTermAccuracy(severity: string): number {
    const accuracies: Record<string, number> = {
      critical: 0.7,
      high: 0.8,
      medium: 0.85,
      low: 0.9
    };
    return accuracies[severity] || 0.8;
  }

  private getUncertaintyFactors(type: string): string[] {
    return ['Market response variability', 'Competitive reactions', 'External factors', 'Implementation quality'];
  }

  private getTypicalDisruptionTimeline(disruptionType: string): string {
    const timelines: Record<string, string> = {
      technology: '6-18 months',
      business_model: '12-24 months',
      market_entry: '3-12 months',
      regulatory: '12-36 months',
      consumer_behavior: '6-24 months'
    };
    return timelines[disruptionType] || '12-24 months';
  }

  private getDisruptionWarningIndicators(disruptionType: string): string[] {
    const indicators: Record<string, string[]> = {
      technology: ['R&D investment spikes', 'Patent filings', 'Talent acquisition'],
      business_model: ['Pilot programs', 'Partnership announcements', 'Revenue model tests'],
      market_entry: ['Market research activity', 'Regulatory filings', 'Hiring patterns'],
      regulatory: ['Policy proposals', 'Industry consultations', 'Lobbying activity'],
      consumer_behavior: ['Survey data changes', 'Social media trends', 'Usage pattern shifts']
    };
    return indicators[disruptionType] || ['Market signals', 'Industry chatter', 'Investment patterns'];
  }
}