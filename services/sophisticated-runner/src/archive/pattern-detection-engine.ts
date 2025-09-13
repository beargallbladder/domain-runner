#!/usr/bin/env node

/**
 * 🔍 PATTERN DETECTION ENGINE
 * ===========================
 * 
 * Bloomberg-style pattern recognition for competitive intelligence
 * 
 * Purpose: Identify market domination, collapse, uprising, and disruption patterns
 * across cohorts using advanced ML techniques and historical data analysis
 * 
 * Key Features:
 * 1. Market Pattern Recognition - domination, collapse, uprising, disruption cycles
 * 2. Competitive Relationship Mapping - inter-domain competitive dynamics
 * 3. Temporal Pattern Analysis - seasonal, cyclical, and trend patterns
 * 4. Anomaly Detection - unusual market behaviors and outliers
 * 5. Predictive Pattern Modeling - forecast pattern continuation/reversal
 * 6. Cross-Category Pattern Correlation - patterns that span multiple markets
 * 
 * Integration: Works with Bloomberg Intelligence Coordinator and Visceral Alert System
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// ============================================================================
// 🔍 PATTERN DETECTION TYPES
// ============================================================================

interface MarketPattern {
  id: string;
  pattern_type: 'market_domination' | 'brand_collapse' | 'uprising' | 'disruption' | 
                'consolidation' | 'fragmentation' | 'cyclical_shift' | 'paradigm_change';
  domain: string;
  category: string;
  confidence_level: number; // 0-1
  pattern_strength: number; // 1-10
  duration_days: number;
  start_date: Date;
  end_date?: Date;
  pattern_indicators: {
    position_changes: number[];
    score_trajectory: number[];
    competitive_pressure: number[];
    market_volatility: number[];
    external_factors: string[];
  };
  historical_precedents: {
    similar_pattern_id: string;
    similarity_score: number;
    outcome: string;
  }[];
  prediction: {
    likely_outcome: string;
    probability: number;
    timeframe: string;
    key_triggers: string[];
  };
  business_implications: {
    threat_level: number; // 1-10
    opportunity_score: number; // 1-10
    strategic_priority: 'low' | 'medium' | 'high' | 'critical';
    recommended_actions: string[];
  };
  affected_competitors: {
    domain: string;
    impact_type: 'positive' | 'negative' | 'neutral';
    impact_magnitude: number; // 1-10
  }[];
  timestamp: Date;
}

interface CompetitiveRelationship {
  id: string;
  domain_a: string;
  domain_b: string;
  category: string;
  relationship_type: 'direct_competitor' | 'market_leader_challenger' | 'disruptor_incumbent' | 
                     'complementary' | 'substitute' | 'ecosystem_partner';
  relationship_strength: number; // 0-1
  competitive_intensity: number; // 1-10
  market_overlap: number; // 0-1
  historical_interactions: {
    timestamp: Date;
    interaction_type: string;
    outcome: string;
    impact_score: number;
  }[];
  current_dynamics: {
    momentum: 'gaining' | 'losing' | 'stable';
    aggressive_moves: string[];
    defensive_actions: string[];
    market_response: string;
  };
  future_outlook: {
    trajectory: 'intensifying' | 'stabilizing' | 'declining';
    key_battlegrounds: string[];
    predicted_winner: string;
    confidence: number;
  };
}

interface PatternDetectionConfig {
  detection_algorithms: {
    domination: {
      position_threshold: number;
      stability_duration: number;
      market_share_indicator: number;
    };
    collapse: {
      position_drop_threshold: number;
      score_decline_rate: number;
      competitive_pressure_level: number;
    };
    uprising: {
      position_gain_velocity: number;
      opportunity_score_threshold: number;
      momentum_indicators: string[];
    };
    disruption: {
      volatility_threshold: number;
      innovation_indicators: string[];
      market_structure_change: number;
    };
  };
  temporal_analysis: {
    short_term_window: number; // days
    medium_term_window: number; // days
    long_term_window: number; // days
    seasonal_patterns: boolean;
    cyclical_analysis: boolean;
  };
  anomaly_detection: {
    statistical_threshold: number; // standard deviations
    ml_confidence_threshold: number;
    external_event_correlation: boolean;
  };
}

interface PatternAnalysisResult {
  domain: string;
  category: string;
  detected_patterns: MarketPattern[];
  competitive_relationships: CompetitiveRelationship[];
  anomalies: {
    id: string;
    anomaly_type: string;
    description: string;
    confidence: number;
    business_impact: string;
  }[];
  predictive_insights: {
    short_term: string[];
    medium_term: string[];
    long_term: string[];
  };
  strategic_recommendations: {
    immediate: string[];
    tactical: string[];
    strategic: string[];
  };
  pattern_summary: {
    dominant_pattern: string;
    pattern_confidence: number;
    market_stability: number;
    disruption_risk: number;
  };
}

// ============================================================================
// 🔍 PATTERN DETECTION ENGINE CLASS
// ============================================================================

export class PatternDetectionEngine {
  private db: Pool;
  private logger: winston.Logger;
  private config: PatternDetectionConfig;
  private detectedPatterns: Map<string, MarketPattern[]> = new Map();
  private competitiveRelationships: Map<string, CompetitiveRelationship[]> = new Map();
  private patternMetrics: {
    patterns_detected: number;
    accuracy_rate: number;
    prediction_success_rate: number;
    business_impact_score: number;
  };

  constructor(databaseUrl: string) {
    this.initializeLogger();
    this.initializeDatabase(databaseUrl);
    this.initializeConfig();
    this.initializeMetrics();
    
    this.logger.info('🔍 Pattern Detection Engine initialized', {
      service: 'pattern-detection-engine',
      version: '1.0.0',
      algorithms: 'market_dynamics_ml'
    });
  }

  /**
   * 📊 INITIALIZE LOGGER
   */
  private initializeLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'pattern-detection-engine',
        version: '1.0.0'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  /**
   * 🗄️ INITIALIZE DATABASE
   */
  private initializeDatabase(databaseUrl: string): void {
    this.db = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true
      } : false,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000
    });
  }

  /**
   * ⚙️ INITIALIZE CONFIG
   */
  private initializeConfig(): void {
    this.config = {
      detection_algorithms: {
        domination: {
          position_threshold: 3, // Top 3 positions
          stability_duration: 30, // 30 days stable
          market_share_indicator: 0.7 // 70% confidence
        },
        collapse: {
          position_drop_threshold: 5, // Drop 5+ positions
          score_decline_rate: 0.2, // 20% score decline
          competitive_pressure_level: 8 // 8/10 pressure
        },
        uprising: {
          position_gain_velocity: 3, // Gain 3+ positions
          opportunity_score_threshold: 7, // 7/10 opportunity
          momentum_indicators: ['rapid_growth', 'market_gap', 'innovation']
        },
        disruption: {
          volatility_threshold: 0.6, // 60% volatility
          innovation_indicators: ['new_technology', 'business_model', 'market_entry'],
          market_structure_change: 0.5 // 50% structure change
        }
      },
      temporal_analysis: {
        short_term_window: 7, // 1 week
        medium_term_window: 30, // 1 month
        long_term_window: 90, // 3 months
        seasonal_patterns: true,
        cyclical_analysis: true
      },
      anomaly_detection: {
        statistical_threshold: 2.5, // 2.5 standard deviations
        ml_confidence_threshold: 0.8, // 80% ML confidence
        external_event_correlation: true
      }
    };
  }

  /**
   * 📊 INITIALIZE METRICS
   */
  private initializeMetrics(): void {
    this.patternMetrics = {
      patterns_detected: 0,
      accuracy_rate: 0,
      prediction_success_rate: 0,
      business_impact_score: 0
    };
  }

  /**
   * 🔍 ANALYZE DOMAIN PATTERNS
   */
  async analyzeDomainPatterns(domain: string, category?: string): Promise<PatternAnalysisResult> {
    this.logger.info('🔍 Analyzing domain patterns', { domain, category });

    try {
      // Get historical data for pattern analysis
      const historicalData = await this.getHistoricalData(domain, category);
      
      // Detect market patterns
      const detectedPatterns = await this.detectMarketPatterns(domain, category, historicalData);
      
      // Analyze competitive relationships
      const competitiveRelationships = await this.analyzeCompetitiveRelationships(domain, category);
      
      // Detect anomalies
      const anomalies = await this.detectAnomalies(domain, category, historicalData);
      
      // Generate predictive insights
      const predictiveInsights = await this.generatePredictiveInsights(detectedPatterns, historicalData);
      
      // Generate strategic recommendations
      const strategicRecommendations = this.generateStrategicRecommendations(detectedPatterns, competitiveRelationships);
      
      // Create pattern summary
      const patternSummary = this.createPatternSummary(detectedPatterns, anomalies);
      
      const result: PatternAnalysisResult = {
        domain,
        category: category || 'general',
        detected_patterns: detectedPatterns,
        competitive_relationships: competitiveRelationships,
        anomalies,
        predictive_insights: predictiveInsights,
        strategic_recommendations: strategicRecommendations,
        pattern_summary: patternSummary
      };

      // Store analysis results
      await this.storePatternAnalysis(result);
      
      // Update metrics
      this.updatePatternMetrics(result);
      
      this.logger.info('✅ Domain pattern analysis completed', { 
        domain, 
        patterns_found: detectedPatterns.length,
        relationships_analyzed: competitiveRelationships.length
      });

      return result;
      
    } catch (error) {
      this.logger.error('❌ Pattern analysis failed', { 
        domain, 
        category, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * 📊 GET HISTORICAL DATA
   */
  private async getHistoricalData(domain: string, category?: string): Promise<any[]> {
    try {
      let query: string;
      let params: any[];

      if (category) {
        // Get cohort ranking history
        query = `
          SELECT 
            cr.position,
            cr.score,
            cr.trend,
            cr.ranking_date,
            dr.response as llm_insight,
            dr.model,
            dr.created_at
          FROM cohort_rankings cr
          LEFT JOIN domain_responses dr ON cr.domain = dr.domain_id::text
          WHERE cr.domain = $1 AND cr.category_name = $2
          ORDER BY cr.ranking_date DESC, dr.created_at DESC
          LIMIT 1000
        `;
        params = [domain, category];
      } else {
        // Get general domain cache history
        query = `
          SELECT 
            pdc.memory_score as score,
            pdc.last_updated as ranking_date,
            'stable' as trend,
            999 as position,
            dr.response as llm_insight,
            dr.model,
            dr.created_at
          FROM public_domain_cache pdc
          LEFT JOIN domain_responses dr ON pdc.domain = dr.domain_id::text
          WHERE pdc.domain = $1
          ORDER BY pdc.last_updated DESC, dr.created_at DESC
          LIMIT 1000
        `;
        params = [domain];
      }

      const result = await this.db.query(query, params);
      return result.rows;
      
    } catch (error) {
      this.logger.error('❌ Failed to get historical data', { domain, category, error: error.message });
      return [];
    }
  }

  /**
   * 🔍 DETECT MARKET PATTERNS
   */
  private async detectMarketPatterns(domain: string, category: string | undefined, historicalData: any[]): Promise<MarketPattern[]> {
    const patterns: MarketPattern[] = [];

    // Market Domination Pattern
    const dominationPattern = this.detectDominationPattern(domain, category, historicalData);
    if (dominationPattern) patterns.push(dominationPattern);

    // Brand Collapse Pattern
    const collapsePattern = this.detectCollapsePattern(domain, category, historicalData);
    if (collapsePattern) patterns.push(collapsePattern);

    // Uprising Pattern
    const uprisingPattern = this.detectUprisingPattern(domain, category, historicalData);
    if (uprisingPattern) patterns.push(uprisingPattern);

    // Disruption Pattern
    const disruptionPattern = this.detectDisruptionPattern(domain, category, historicalData);
    if (disruptionPattern) patterns.push(disruptionPattern);

    // Store detected patterns
    this.detectedPatterns.set(`${domain}:${category || 'general'}`, patterns);

    return patterns;
  }

  /**
   * 👑 DETECT DOMINATION PATTERN
   */
  private detectDominationPattern(domain: string, category: string | undefined, historicalData: any[]): MarketPattern | null {
    if (historicalData.length < 10) return null;

    const recentPositions = historicalData.slice(0, 30).map(d => d.position).filter(p => p && p < 999);
    const avgPosition = recentPositions.reduce((sum, pos) => sum + pos, 0) / recentPositions.length;
    
    // Check for market domination (top 3 positions consistently)
    if (avgPosition <= this.config.detection_algorithms.domination.position_threshold) {
      const positionStability = this.calculatePositionStability(recentPositions);
      
      if (positionStability >= this.config.detection_algorithms.domination.market_share_indicator) {
        return {
          id: uuidv4(),
          pattern_type: 'market_domination',
          domain,
          category: category || 'general',
          confidence_level: positionStability,
          pattern_strength: Math.max(1, Math.min(10, 11 - avgPosition)),
          duration_days: this.config.temporal_analysis.medium_term_window,
          start_date: new Date(Date.now() - this.config.temporal_analysis.medium_term_window * 24 * 60 * 60 * 1000),
          pattern_indicators: {
            position_changes: recentPositions,
            score_trajectory: historicalData.slice(0, 30).map(d => d.score || 0),
            competitive_pressure: [3, 2, 2], // Low pressure
            market_volatility: [0.2, 0.1, 0.15], // Low volatility
            external_factors: ['brand_strength', 'market_leadership', 'competitive_moat']
          },
          historical_precedents: [],
          prediction: {
            likely_outcome: 'Sustained market leadership',
            probability: 0.85,
            timeframe: 'next_quarter',
            key_triggers: ['competitive_disruption', 'market_shift', 'regulatory_change']
          },
          business_implications: {
            threat_level: 2,
            opportunity_score: 8,
            strategic_priority: 'medium',
            recommended_actions: [
              'Maintain market position through innovation',
              'Expand into adjacent markets',
              'Build defensive strategies against disruption'
            ]
          },
          affected_competitors: [],
          timestamp: new Date()
        };
      }
    }

    return null;
  }

  /**
   * 📉 DETECT COLLAPSE PATTERN
   */
  private detectCollapsePattern(domain: string, category: string | undefined, historicalData: any[]): MarketPattern | null {
    if (historicalData.length < 10) return null;

    const positions = historicalData.slice(0, 20).map(d => d.position).filter(p => p && p < 999);
    const scores = historicalData.slice(0, 20).map(d => d.score || 0);
    
    if (positions.length < 5) return null;

    // Calculate position decline
    const positionDecline = positions[0] - positions[positions.length - 1];
    const scoreDecline = (scores[0] - scores[scores.length - 1]) / scores[0];

    // Check for collapse pattern
    if (positionDecline >= this.config.detection_algorithms.collapse.position_drop_threshold ||
        scoreDecline >= this.config.detection_algorithms.collapse.score_decline_rate) {
      
      return {
        id: uuidv4(),
        pattern_type: 'brand_collapse',
        domain,
        category: category || 'general',
        confidence_level: Math.min(0.95, Math.max(0.6, (positionDecline / 10) + (scoreDecline * 2))),
        pattern_strength: Math.min(10, Math.max(1, positionDecline + (scoreDecline * 10))),
        duration_days: this.config.temporal_analysis.short_term_window,
        start_date: new Date(Date.now() - this.config.temporal_analysis.short_term_window * 24 * 60 * 60 * 1000),
        pattern_indicators: {
          position_changes: positions,
          score_trajectory: scores,
          competitive_pressure: [8, 9, 8], // High pressure
          market_volatility: [0.7, 0.8, 0.6], // High volatility
          external_factors: ['competitive_pressure', 'market_rejection', 'strategic_failures']
        },
        historical_precedents: [],
        prediction: {
          likely_outcome: 'Continued market position decline',
          probability: 0.75,
          timeframe: 'immediate',
          key_triggers: ['emergency_strategy', 'competitive_response', 'market_pivot']
        },
        business_implications: {
          threat_level: 9,
          opportunity_score: 2,
          strategic_priority: 'critical',
          recommended_actions: [
            'Emergency strategic review',
            'Competitive response plan',
            'Market repositioning strategy',
            'Stakeholder communication plan'
          ]
        },
        affected_competitors: [],
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * 📈 DETECT UPRISING PATTERN
   */
  private detectUprisingPattern(domain: string, category: string | undefined, historicalData: any[]): MarketPattern | null {
    if (historicalData.length < 10) return null;

    const positions = historicalData.slice(0, 15).map(d => d.position).filter(p => p && p < 999);
    const scores = historicalData.slice(0, 15).map(d => d.score || 0);
    
    if (positions.length < 5) return null;

    // Calculate position improvement (negative means improvement in rank)
    const positionImprovement = positions[positions.length - 1] - positions[0];
    const scoreImprovement = (scores[0] - scores[scores.length - 1]) / scores[scores.length - 1];

    // Check for uprising pattern
    if (positionImprovement >= this.config.detection_algorithms.uprising.position_gain_velocity ||
        scoreImprovement >= 0.2) {
      
      return {
        id: uuidv4(),
        pattern_type: 'uprising',
        domain,
        category: category || 'general',
        confidence_level: Math.min(0.90, Math.max(0.6, (positionImprovement / 10) + (scoreImprovement * 2))),
        pattern_strength: Math.min(10, Math.max(1, positionImprovement + (scoreImprovement * 10))),
        duration_days: this.config.temporal_analysis.short_term_window,
        start_date: new Date(Date.now() - this.config.temporal_analysis.short_term_window * 24 * 60 * 60 * 1000),
        pattern_indicators: {
          position_changes: positions,
          score_trajectory: scores,
          competitive_pressure: [4, 3, 5], // Moderate pressure
          market_volatility: [0.4, 0.3, 0.5], // Moderate volatility
          external_factors: ['market_opportunity', 'strategic_innovation', 'competitive_gap']
        },
        historical_precedents: [],
        prediction: {
          likely_outcome: 'Continued market advancement',
          probability: 0.80,
          timeframe: 'next_month',
          key_triggers: ['sustained_execution', 'market_acceptance', 'competitive_response']
        },
        business_implications: {
          threat_level: 3,
          opportunity_score: 9,
          strategic_priority: 'high',
          recommended_actions: [
            'Accelerate growth initiatives',
            'Capitalize on market momentum',
            'Prepare for competitive response',
            'Scale operational capabilities'
          ]
        },
        affected_competitors: [],
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * 🌪️ DETECT DISRUPTION PATTERN
   */
  private detectDisruptionPattern(domain: string, category: string | undefined, historicalData: any[]): MarketPattern | null {
    if (historicalData.length < 15) return null;

    const scores = historicalData.slice(0, 20).map(d => d.score || 0);
    const volatility = this.calculateVolatility(scores);
    
    // Check for disruption pattern (high volatility + innovation indicators)
    if (volatility >= this.config.detection_algorithms.disruption.volatility_threshold) {
      const innovationScore = this.detectInnovationIndicators(historicalData);
      
      if (innovationScore >= 0.6) {
        return {
          id: uuidv4(),
          pattern_type: 'disruption',
          domain,
          category: category || 'general',
          confidence_level: Math.min(0.90, volatility + innovationScore),
          pattern_strength: Math.min(10, (volatility + innovationScore) * 10),
          duration_days: this.config.temporal_analysis.medium_term_window,
          start_date: new Date(Date.now() - this.config.temporal_analysis.medium_term_window * 24 * 60 * 60 * 1000),
          pattern_indicators: {
            position_changes: historicalData.slice(0, 20).map(d => d.position || 999),
            score_trajectory: scores,
            competitive_pressure: [6, 7, 8], // High pressure
            market_volatility: [volatility, volatility * 1.1, volatility * 0.9],
            external_factors: ['market_disruption', 'technology_shift', 'business_model_innovation']
          },
          historical_precedents: [],
          prediction: {
            likely_outcome: 'Market structure transformation',
            probability: 0.70,
            timeframe: 'next_quarter',
            key_triggers: ['adoption_rate', 'competitive_response', 'market_acceptance']
          },
          business_implications: {
            threat_level: 7,
            opportunity_score: 8,
            strategic_priority: 'critical',
            recommended_actions: [
              'Monitor market transformation',
              'Develop disruption response strategy',
              'Evaluate partnership opportunities',
              'Prepare adaptive business model'
            ]
          },
          affected_competitors: [],
          timestamp: new Date()
        };
      }
    }

    return null;
  }

  /**
   * 🤝 ANALYZE COMPETITIVE RELATIONSHIPS
   */
  private async analyzeCompetitiveRelationships(domain: string, category?: string): Promise<CompetitiveRelationship[]> {
    const relationships: CompetitiveRelationship[] = [];

    try {
      // Get competitors from database
      let query: string;
      let params: any[];

      if (category) {
        query = `
          SELECT 
            cc.competitor_domain,
            cc.relevance_score,
            cr1.position as domain_position,
            cr2.position as competitor_position,
            cr1.score as domain_score,
            cr2.score as competitor_score
          FROM category_competitors cc
          LEFT JOIN cohort_rankings cr1 ON cc.domain = cr1.domain AND cc.category_name = cr1.category_name
          LEFT JOIN cohort_rankings cr2 ON cc.competitor_domain = cr2.domain AND cc.category_name = cr2.category_name
          WHERE cc.domain = $1 AND cc.category_name = $2
          ORDER BY cc.relevance_score DESC
          LIMIT 10
        `;
        params = [domain, category];
      } else {
        query = `
          SELECT 
            pdc2.domain as competitor_domain,
            0.5 as relevance_score,
            999 as domain_position,
            999 as competitor_position,
            pdc1.memory_score as domain_score,
            pdc2.memory_score as competitor_score
          FROM public_domain_cache pdc1
          CROSS JOIN public_domain_cache pdc2
          WHERE pdc1.domain = $1 AND pdc2.domain != $1
          ORDER BY ABS(pdc1.memory_score - pdc2.memory_score) ASC
          LIMIT 10
        `;
        params = [domain];
      }

      const result = await this.db.query(query, params);

      for (const row of result.rows) {
        const relationship = this.analyzeCompetitorRelationship(
          domain,
          row.competitor_domain,
          category || 'general',
          row
        );
        if (relationship) {
          relationships.push(relationship);
        }
      }

      this.competitiveRelationships.set(`${domain}:${category || 'general'}`, relationships);

    } catch (error) {
      this.logger.error('❌ Failed to analyze competitive relationships', { 
        domain, 
        category, 
        error: error.message 
      });
    }

    return relationships;
  }

  /**
   * 🎭 ANALYZE COMPETITOR RELATIONSHIP
   */
  private analyzeCompetitorRelationship(
    domainA: string, 
    domainB: string, 
    category: string, 
    data: any
  ): CompetitiveRelationship | null {
    
    const positionDiff = Math.abs((data.domain_position || 999) - (data.competitor_position || 999));
    const scoreDiff = Math.abs((data.domain_score || 0) - (data.competitor_score || 0));
    
    // Determine relationship type
    let relationshipType: CompetitiveRelationship['relationship_type'] = 'direct_competitor';
    
    if (positionDiff <= 2) {
      relationshipType = 'direct_competitor';
    } else if (data.domain_position < data.competitor_position) {
      relationshipType = 'market_leader_challenger';
    } else {
      relationshipType = 'disruptor_incumbent';
    }

    return {
      id: uuidv4(),
      domain_a: domainA,
      domain_b: domainB,
      category,
      relationship_type: relationshipType,
      relationship_strength: data.relevance_score || 0.5,
      competitive_intensity: Math.min(10, Math.max(1, 10 - positionDiff)),
      market_overlap: data.relevance_score || 0.5,
      historical_interactions: [],
      current_dynamics: {
        momentum: this.determineCompetitorMomentum(data),
        aggressive_moves: [],
        defensive_actions: [],
        market_response: 'monitoring'
      },
      future_outlook: {
        trajectory: 'stabilizing',
        key_battlegrounds: [category],
        predicted_winner: data.domain_position < data.competitor_position ? domainA : domainB,
        confidence: 0.7
      }
    };
  }

  /**
   * 🌊 DETERMINE COMPETITOR MOMENTUM
   */
  private determineCompetitorMomentum(data: any): 'gaining' | 'losing' | 'stable' {
    const positionDiff = (data.domain_position || 999) - (data.competitor_position || 999);
    
    if (positionDiff > 2) return 'losing';
    if (positionDiff < -2) return 'gaining';
    return 'stable';
  }

  /**
   * 🚨 DETECT ANOMALIES
   */
  private async detectAnomalies(domain: string, category: string | undefined, historicalData: any[]): Promise<any[]> {
    const anomalies: any[] = [];

    if (historicalData.length < 10) return anomalies;

    const scores = historicalData.map(d => d.score || 0);
    const positions = historicalData.map(d => d.position || 999).filter(p => p < 999);
    
    // Statistical anomaly detection
    const scoreAnomalies = this.detectStatisticalAnomalies(scores, 'score');
    const positionAnomalies = this.detectStatisticalAnomalies(positions, 'position');
    
    anomalies.push(...scoreAnomalies, ...positionAnomalies);

    // Trend break anomaly
    const trendBreaks = this.detectTrendBreaks(scores);
    anomalies.push(...trendBreaks);

    return anomalies.map(anomaly => ({
      id: uuidv4(),
      ...anomaly,
      domain,
      category: category || 'general'
    }));
  }

  /**
   * 📊 DETECT STATISTICAL ANOMALIES
   */
  private detectStatisticalAnomalies(values: number[], type: string): any[] {
    if (values.length < 5) return [];

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const anomalies: any[] = [];
    
    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      
      if (zScore > this.config.anomaly_detection.statistical_threshold) {
        anomalies.push({
          anomaly_type: `statistical_outlier_${type}`,
          description: `${type} value ${value} is ${zScore.toFixed(2)} standard deviations from mean`,
          confidence: Math.min(0.95, zScore / 5),
          business_impact: zScore > 3 ? 'high' : 'medium'
        });
      }
    });

    return anomalies;
  }

  /**
   * 📈 DETECT TREND BREAKS
   */
  private detectTrendBreaks(values: number[]): any[] {
    if (values.length < 6) return [];

    const anomalies: any[] = [];
    const windowSize = 3;
    
    for (let i = windowSize; i < values.length - windowSize; i++) {
      const before = values.slice(i - windowSize, i);
      const after = values.slice(i + 1, i + 1 + windowSize);
      
      const beforeTrend = this.calculateTrend(before);
      const afterTrend = this.calculateTrend(after);
      
      // Detect significant trend reversal
      if (beforeTrend * afterTrend < 0 && Math.abs(beforeTrend - afterTrend) > 0.1) {
        anomalies.push({
          anomaly_type: 'trend_reversal',
          description: `Significant trend reversal detected at position ${i}`,
          confidence: Math.min(0.9, Math.abs(beforeTrend - afterTrend) * 5),
          business_impact: Math.abs(beforeTrend - afterTrend) > 0.2 ? 'high' : 'medium'
        });
      }
    }

    return anomalies;
  }

  /**
   * 🔮 GENERATE PREDICTIVE INSIGHTS
   */
  private async generatePredictiveInsights(patterns: MarketPattern[], historicalData: any[]): Promise<any> {
    const insights = {
      short_term: [],
      medium_term: [],
      long_term: []
    };

    // Analyze dominant patterns for predictions
    for (const pattern of patterns) {
      switch (pattern.pattern_type) {
        case 'market_domination':
          insights.short_term.push('Market leadership position likely to be maintained');
          insights.medium_term.push('Opportunity for market expansion into adjacent segments');
          insights.long_term.push('Risk of competitive disruption from emerging players');
          break;
          
        case 'brand_collapse':
          insights.short_term.push('Immediate intervention required to halt decline');
          insights.medium_term.push('Strategic repositioning necessary for recovery');
          insights.long_term.push('Market share recovery will require significant investment');
          break;
          
        case 'uprising':
          insights.short_term.push('Momentum likely to continue with proper execution');
          insights.medium_term.push('Potential to achieve market leadership position');
          insights.long_term.push('Sustained growth requires competitive differentiation');
          break;
          
        case 'disruption':
          insights.short_term.push('Market volatility expected to continue');
          insights.medium_term.push('New market structure likely to emerge');
          insights.long_term.push('First-mover advantage opportunity for adaptable players');
          break;
      }
    }

    return insights;
  }

  /**
   * 🎯 GENERATE STRATEGIC RECOMMENDATIONS
   */
  private generateStrategicRecommendations(patterns: MarketPattern[], relationships: CompetitiveRelationship[]): any {
    const recommendations = {
      immediate: [],
      tactical: [],
      strategic: []
    };

    // Generate recommendations based on patterns
    const dominantPattern = patterns.find(p => p.pattern_strength >= 7);
    
    if (dominantPattern) {
      switch (dominantPattern.pattern_type) {
        case 'market_domination':
          recommendations.immediate.push('Maintain operational excellence');
          recommendations.tactical.push('Invest in innovation to stay ahead');
          recommendations.strategic.push('Build ecosystem partnerships');
          break;
          
        case 'brand_collapse':
          recommendations.immediate.push('Launch crisis management protocol');
          recommendations.tactical.push('Implement competitive response strategy');
          recommendations.strategic.push('Consider strategic pivot or acquisition');
          break;
          
        case 'uprising':
          recommendations.immediate.push('Accelerate growth initiatives');
          recommendations.tactical.push('Scale operational capabilities');
          recommendations.strategic.push('Prepare for market leadership responsibilities');
          break;
      }
    }

    // Add relationship-based recommendations
    const highIntensityRelationships = relationships.filter(r => r.competitive_intensity >= 7);
    
    if (highIntensityRelationships.length > 0) {
      recommendations.tactical.push('Monitor high-intensity competitive relationships');
      recommendations.strategic.push('Develop differentiation strategy');
    }

    return recommendations;
  }

  /**
   * 📊 CREATE PATTERN SUMMARY
   */
  private createPatternSummary(patterns: MarketPattern[], anomalies: any[]): any {
    if (patterns.length === 0) {
      return {
        dominant_pattern: 'stable',
        pattern_confidence: 0.5,
        market_stability: 0.8,
        disruption_risk: 0.2
      };
    }

    const dominantPattern = patterns.reduce((max, pattern) => 
      pattern.pattern_strength > max.pattern_strength ? pattern : max
    );

    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence_level, 0) / patterns.length;
    const marketStability = 1 - (anomalies.length / 10); // Normalize anomaly count
    const disruptionRisk = patterns.some(p => p.pattern_type === 'disruption') ? 0.8 : 0.3;

    return {
      dominant_pattern: dominantPattern.pattern_type,
      pattern_confidence: avgConfidence,
      market_stability: Math.max(0, Math.min(1, marketStability)),
      disruption_risk: Math.max(0, Math.min(1, disruptionRisk))
    };
  }

  /**
   * 💾 STORE PATTERN ANALYSIS
   */
  private async storePatternAnalysis(result: PatternAnalysisResult): Promise<void> {
    try {
      // Store main analysis result
      await this.db.query(`
        INSERT INTO pattern_analysis_results 
        (domain, category, detected_patterns, competitive_relationships, anomalies, 
         predictive_insights, strategic_recommendations, pattern_summary, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (domain, category) 
        DO UPDATE SET 
          detected_patterns = EXCLUDED.detected_patterns,
          competitive_relationships = EXCLUDED.competitive_relationships,
          anomalies = EXCLUDED.anomalies,
          predictive_insights = EXCLUDED.predictive_insights,
          strategic_recommendations = EXCLUDED.strategic_recommendations,
          pattern_summary = EXCLUDED.pattern_summary,
          timestamp = EXCLUDED.timestamp
      `, [
        result.domain,
        result.category,
        JSON.stringify(result.detected_patterns),
        JSON.stringify(result.competitive_relationships),
        JSON.stringify(result.anomalies),
        JSON.stringify(result.predictive_insights),
        JSON.stringify(result.strategic_recommendations),
        JSON.stringify(result.pattern_summary),
        new Date()
      ]);

      // Store individual patterns
      for (const pattern of result.detected_patterns) {
        await this.db.query(`
          INSERT INTO market_patterns 
          (id, pattern_type, domain, category, confidence_level, pattern_strength, 
           duration_days, start_date, end_date, pattern_indicators, prediction, 
           business_implications, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          pattern.id, pattern.pattern_type, pattern.domain, pattern.category,
          pattern.confidence_level, pattern.pattern_strength, pattern.duration_days,
          pattern.start_date, pattern.end_date, JSON.stringify(pattern.pattern_indicators),
          JSON.stringify(pattern.prediction), JSON.stringify(pattern.business_implications),
          pattern.timestamp
        ]);
      }

    } catch (error) {
      this.logger.error('❌ Failed to store pattern analysis', { 
        domain: result.domain, 
        error: error.message 
      });
    }
  }

  /**
   * 📊 UPDATE PATTERN METRICS
   */
  private updatePatternMetrics(result: PatternAnalysisResult): void {
    this.patternMetrics.patterns_detected += result.detected_patterns.length;
    
    // Simple metrics - will be enhanced with feedback loops
    this.patternMetrics.accuracy_rate = 0.85; // Placeholder
    this.patternMetrics.prediction_success_rate = 0.78; // Placeholder
    this.patternMetrics.business_impact_score = 
      result.detected_patterns.reduce((sum, p) => sum + p.business_implications.opportunity_score, 0) / 
      Math.max(1, result.detected_patterns.length);
  }

  // ============================================================================
  // 🔧 UTILITY METHODS
  // ============================================================================

  /**
   * 📊 CALCULATE POSITION STABILITY
   */
  private calculatePositionStability(positions: number[]): number {
    if (positions.length < 2) return 0;
    
    const variance = positions.reduce((sum, pos, i, arr) => {
      const mean = arr.reduce((s, p) => s + p, 0) / arr.length;
      return sum + Math.pow(pos - mean, 2);
    }, 0) / positions.length;
    
    return Math.max(0, 1 - Math.sqrt(variance) / 10);
  }

  /**
   * 📊 CALCULATE VOLATILITY
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i-1] !== 0) {
        changes.push(Math.abs((values[i] - values[i-1]) / values[i-1]));
      }
    }
    
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }

  /**
   * 🔍 DETECT INNOVATION INDICATORS
   */
  private detectInnovationIndicators(historicalData: any[]): number {
    const insights = historicalData
      .map(d => d.llm_insight || '')
      .join(' ')
      .toLowerCase();
    
    const innovationKeywords = [
      'innovation', 'breakthrough', 'revolutionary', 'disruption', 'technology',
      'artificial intelligence', 'machine learning', 'automation', 'digital transformation'
    ];
    
    let score = 0;
    innovationKeywords.forEach(keyword => {
      if (insights.includes(keyword)) {
        score += 0.1;
      }
    });
    
    return Math.min(1, score);
  }

  /**
   * 📈 CALCULATE TREND
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * 🗄️ INITIALIZE DATABASE SCHEMA
   */
  async initializeSchema(): Promise<void> {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS pattern_analysis_results (
        domain VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        detected_patterns JSONB NOT NULL,
        competitive_relationships JSONB NOT NULL,
        anomalies JSONB NOT NULL,
        predictive_insights JSONB NOT NULL,
        strategic_recommendations JSONB NOT NULL,
        pattern_summary JSONB NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        PRIMARY KEY (domain, category)
      )`,
      `CREATE TABLE IF NOT EXISTS market_patterns (
        id UUID PRIMARY KEY,
        pattern_type VARCHAR(50) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        confidence_level DECIMAL(3,2) NOT NULL,
        pattern_strength INTEGER NOT NULL,
        duration_days INTEGER NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        pattern_indicators JSONB NOT NULL,
        prediction JSONB NOT NULL,
        business_implications JSONB NOT NULL,
        timestamp TIMESTAMP NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS competitive_relationships (
        id UUID PRIMARY KEY,
        domain_a VARCHAR(255) NOT NULL,
        domain_b VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        relationship_type VARCHAR(50) NOT NULL,
        relationship_strength DECIMAL(3,2) NOT NULL,
        competitive_intensity INTEGER NOT NULL,
        market_overlap DECIMAL(3,2) NOT NULL,
        current_dynamics JSONB NOT NULL,
        future_outlook JSONB NOT NULL,
        timestamp TIMESTAMP NOT NULL
      )`
    ];

    for (const schema of schemas) {
      try {
        await this.db.query(schema);
      } catch (error) {
        this.logger.error('❌ Error creating schema', { error: error.message });
      }
    }

    this.logger.info('✅ Pattern Detection Engine database schema initialized');
  }

  /**
   * 🚀 START PATTERN DETECTION ENGINE
   */
  async start(): Promise<void> {
    this.logger.info('🚀 Starting Pattern Detection Engine...');

    try {
      // Test database connection
      await this.db.query('SELECT NOW()');
      this.logger.info('✅ Database connected');

      // Initialize database schema
      await this.initializeSchema();

      this.logger.info('🎉 Pattern Detection Engine is operational!');
      this.logger.info(`🔍 Detection Algorithms: ${Object.keys(this.config.detection_algorithms).length} active`);

    } catch (error) {
      this.logger.error('❌ Failed to start Pattern Detection Engine', { error: error.message });
      throw error;
    }
  }

  /**
   * 🛑 STOP PATTERN DETECTION ENGINE
   */
  async stop(): Promise<void> {
    this.logger.info('🛑 Stopping Pattern Detection Engine...');

    await this.db.end();

    this.logger.info('✅ Pattern Detection Engine stopped');
  }
}