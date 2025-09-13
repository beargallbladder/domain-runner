import { Pool } from 'pg';
import winston from 'winston';
import { MemoryOracle, CompetitiveMemory } from './memory-oracle-core';
import { NeuralLearningSystem } from './neural-learning-system';
import { IntelligenceGraphSystem } from './intelligence-graph-system';

export interface MemoryAlert {
  id: string;
  alertType: 'competitive_threat' | 'market_shift' | 'pattern_emergence' | 'prediction_validation' | 'anomaly_detected' | 'opportunity_identified';
  domain: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'immediate' | 'within_hour' | 'within_day' | 'within_week';
  confidence: number;
  actionability: number;
  rawPriority: number;
  memoryEnhancedPriority: number;
  bloombergPriority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  supportingMemories: string[];
  historicalAccuracy: number;
  impactMagnitude: number;
  timeToRelevance: number; // minutes
  stakeholders: string[];
  recommendedActions: string[];
  createdAt: Date;
  validUntil: Date;
  acknowledged: boolean;
  resolved: boolean;
  feedback?: AlertFeedback;
}

export interface AlertFeedback {
  id: string;
  alertId: string;
  feedbackType: 'accuracy' | 'relevance' | 'timing' | 'actionability';
  rating: number; // 1-5 scale
  comment?: string;
  providedBy: string;
  providedAt: Date;
}

export interface AlertPattern {
  id: string;
  patternType: string;
  conditions: Record<string, any>;
  effectiveness: number;
  falsePositiveRate: number;
  avgResponseTime: number;
  successfulOutcomes: number;
  totalTriggers: number;
  lastRefined: Date;
}

export interface AlertContext {
  domainHistory: CompetitiveMemory[];
  similarPastAlerts: MemoryAlert[];
  currentMarketConditions: any;
  competitivePosition: any;
  predictiveSignals: any[];
  riskFactors: any[];
}

export class AlertPrioritizationSystem {
  private pool: Pool;
  private logger: winston.Logger;
  private memoryOracle: MemoryOracle;
  private neuralLearning: NeuralLearningSystem;
  private intelligenceGraph: IntelligenceGraphSystem;
  private alertCache: Map<string, MemoryAlert> = new Map();
  private alertPatterns: Map<string, AlertPattern> = new Map();

  // Alert prioritization weights (learned through neural system)
  private prioritizationWeights = {
    historicalAccuracy: 0.25,
    memoryRelevance: 0.2,
    competitiveImportance: 0.2,
    temporalUrgency: 0.15,
    actionability: 0.1,
    stakeholderImpact: 0.1
  };

  constructor(
    pool: Pool,
    logger: winston.Logger,
    memoryOracle: MemoryOracle,
    neuralLearning: NeuralLearningSystem,
    intelligenceGraph: IntelligenceGraphSystem
  ) {
    this.pool = pool;
    this.logger = logger;
    this.memoryOracle = memoryOracle;
    this.neuralLearning = neuralLearning;
    this.intelligenceGraph = intelligenceGraph;
    this.initializeAlertTables();
    this.startAlertMonitoringCycle();
  }

  private async initializeAlertTables() {
    const alertSchema = `
      -- Memory-enhanced alerts
      CREATE TABLE IF NOT EXISTS memory_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_type TEXT NOT NULL CHECK (alert_type IN ('competitive_threat', 'market_shift', 'pattern_emergence', 'prediction_validation', 'anomaly_detected', 'opportunity_identified')),
        domain TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        urgency TEXT NOT NULL CHECK (urgency IN ('immediate', 'within_hour', 'within_day', 'within_week')),
        confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
        actionability FLOAT CHECK (actionability >= 0 AND actionability <= 1),
        raw_priority FLOAT,
        memory_enhanced_priority FLOAT,
        bloomberg_priority TEXT CHECK (bloomberg_priority IN ('P1', 'P2', 'P3', 'P4', 'P5')),
        supporting_memories TEXT[],
        historical_accuracy FLOAT DEFAULT 0.5,
        impact_magnitude FLOAT DEFAULT 0.5,
        time_to_relevance INTEGER, -- minutes
        stakeholders TEXT[],
        recommended_actions TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP WITH TIME ZONE,
        acknowledged BOOLEAN DEFAULT false,
        resolved BOOLEAN DEFAULT false,
        resolution_time TIMESTAMP WITH TIME ZONE,
        resolution_outcome TEXT
      );

      -- Alert feedback for neural learning
      CREATE TABLE IF NOT EXISTS alert_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_id UUID REFERENCES memory_alerts(id),
        feedback_type TEXT NOT NULL CHECK (feedback_type IN ('accuracy', 'relevance', 'timing', 'actionability')),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        provided_by TEXT,
        provided_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Alert patterns for pattern recognition
      CREATE TABLE IF NOT EXISTS alert_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pattern_type TEXT NOT NULL,
        conditions JSONB NOT NULL,
        effectiveness FLOAT DEFAULT 0.5,
        false_positive_rate FLOAT DEFAULT 0.1,
        avg_response_time INTEGER, -- minutes
        successful_outcomes INTEGER DEFAULT 0,
        total_triggers INTEGER DEFAULT 0,
        last_refined TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );

      -- Alert escalation rules
      CREATE TABLE IF NOT EXISTS alert_escalation_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_name TEXT NOT NULL,
        conditions JSONB NOT NULL,
        escalation_delay INTEGER, -- minutes
        escalation_targets TEXT[],
        escalation_actions JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Alert correlation tracking
      CREATE TABLE IF NOT EXISTS alert_correlations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        primary_alert_id UUID REFERENCES memory_alerts(id),
        correlated_alert_id UUID REFERENCES memory_alerts(id),
        correlation_type TEXT NOT NULL,
        correlation_strength FLOAT CHECK (correlation_strength >= 0 AND correlation_strength <= 1),
        time_gap INTEGER, -- minutes between alerts
        discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Alert performance metrics
      CREATE TABLE IF NOT EXISTS alert_performance_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_name TEXT NOT NULL,
        metric_value FLOAT NOT NULL,
        metric_context JSONB,
        measurement_window TEXT,
        measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for alert performance
      CREATE INDEX IF NOT EXISTS idx_memory_alerts_domain ON memory_alerts(domain);
      CREATE INDEX IF NOT EXISTS idx_memory_alerts_priority ON memory_alerts(memory_enhanced_priority DESC);
      CREATE INDEX IF NOT EXISTS idx_memory_alerts_created ON memory_alerts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_memory_alerts_severity ON memory_alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_memory_alerts_urgency ON memory_alerts(urgency);
      CREATE INDEX IF NOT EXISTS idx_alert_feedback_alert ON alert_feedback(alert_id);
      CREATE INDEX IF NOT EXISTS idx_alert_patterns_type ON alert_patterns(pattern_type);
      CREATE INDEX IF NOT EXISTS idx_alert_correlations_primary ON alert_correlations(primary_alert_id);
    `;

    try {
      await this.pool.query(alertSchema);
      await this.initializeDefaultAlertPatterns();
      this.logger.info('🚨 Alert Prioritization System: Database schema initialized');
    } catch (error) {
      this.logger.error('Failed to initialize alert schema:', error);
      throw error;
    }
  }

  private async initializeDefaultAlertPatterns() {
    const defaultPatterns = [
      {
        pattern_type: 'competitive_threat_sudden_change',
        conditions: {
          domain_importance: { min: 0.7 },
          confidence_change: { min: 0.3 },
          time_window: 'last_24_hours'
        }
      },
      {
        pattern_type: 'market_shift_pattern_emergence',
        conditions: {
          pattern_occurrences: { min: 3 },
          pattern_effectiveness: { min: 0.8 },
          cross_domain_correlation: { min: 0.6 }
        }
      },
      {
        pattern_type: 'prediction_accuracy_validation',
        conditions: {
          prediction_confidence: { min: 0.8 },
          actual_outcome_match: { min: 0.7 },
          time_to_validation: { max: 7200 } // 48 hours in minutes
        }
      }
    ];

    for (const pattern of defaultPatterns) {
      await this.pool.query(
        `INSERT INTO alert_patterns (pattern_type, conditions) 
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [pattern.pattern_type, pattern.conditions]
      );
    }
  }

  // Process and prioritize new alert using memory intelligence
  async processAlert(alertData: Partial<MemoryAlert>): Promise<MemoryAlert> {
    try {
      // Generate alert ID
      const alertId = this.generateAlertId();

      // Build alert context from memory
      const context = await this.buildAlertContext(alertData.domain!, alertData.alertType!);

      // Calculate base priority
      const rawPriority = this.calculateRawPriority(alertData);

      // Enhance priority using memory intelligence
      const memoryEnhancedPriority = await this.enhancePriorityWithMemory(rawPriority, context);

      // Calculate Bloomberg-style priority
      const bloombergPriority = this.calculateBloombergPriority(memoryEnhancedPriority);

      // Get historical accuracy for this type of alert
      const historicalAccuracy = await this.getHistoricalAccuracy(alertData.alertType!, alertData.domain!);

      // Calculate time to relevance
      const timeToRelevance = this.calculateTimeToRelevance(alertData, context);

      // Generate recommended actions
      const recommendedActions = await this.generateRecommendedActions(alertData, context);

      // Create complete alert
      const alert: MemoryAlert = {
        id: alertId,
        alertType: alertData.alertType!,
        domain: alertData.domain!,
        title: alertData.title || this.generateAlertTitle(alertData),
        description: alertData.description || this.generateAlertDescription(alertData, context),
        severity: alertData.severity || this.calculateSeverity(memoryEnhancedPriority),
        urgency: alertData.urgency || this.calculateUrgency(timeToRelevance),
        confidence: alertData.confidence || context.currentMarketConditions?.confidence || 0.7,
        actionability: alertData.actionability || this.calculateActionability(context),
        rawPriority,
        memoryEnhancedPriority,
        bloombergPriority,
        supportingMemories: context.domainHistory.slice(0, 5).map(m => m.id),
        historicalAccuracy,
        impactMagnitude: alertData.impactMagnitude || this.calculateImpactMagnitude(context),
        timeToRelevance,
        stakeholders: this.identifyStakeholders(alertData, context),
        recommendedActions,
        createdAt: new Date(),
        validUntil: this.calculateValidUntil(alertData, timeToRelevance),
        acknowledged: false,
        resolved: false
      };

      // Store alert
      await this.storeAlert(alert);

      // Check for correlations with existing alerts
      await this.checkAlertCorrelations(alert);

      // Train neural system with alert creation
      await this.neuralLearning.trainFromFeedback(
        'memory',
        alertId,
        0.5, // Neutral feedback until validated
        `Alert created: ${alert.alertType} for ${alert.domain}`,
        1.0
      );

      // Cache alert
      this.alertCache.set(alertId, alert);

      this.logger.info(`🚨 Created memory-enhanced alert: ${alert.title} (Priority: ${alert.bloombergPriority})`);
      return alert;

    } catch (error) {
      this.logger.error('Failed to process alert:', error);
      throw error;
    }
  }

  // Build comprehensive context for alert processing
  private async buildAlertContext(domain: string, alertType: MemoryAlert['alertType']): Promise<AlertContext> {
    try {
      // Get domain history from memory oracle
      const domainHistoryQuery = `
        SELECT * FROM competitive_memories 
        WHERE domain = $1 
        ORDER BY created_at DESC 
        LIMIT 20
      `;
      const historyResult = await this.pool.query(domainHistoryQuery, [domain]);
      const domainHistory = historyResult.rows.map(row => this.mapToCompetitiveMemory(row));

      // Get similar past alerts
      const similarAlertsQuery = `
        SELECT * FROM memory_alerts 
        WHERE domain = $1 AND alert_type = $2 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      const alertsResult = await this.pool.query(similarAlertsQuery, [domain, alertType]);
      const similarPastAlerts = alertsResult.rows.map(row => this.mapToMemoryAlert(row));

      // Get competitive intelligence from graph system
      const competitiveIntelligence = await this.intelligenceGraph.getCompetitiveIntelligence(domain);

      // Build current market conditions from recent memories
      const currentMarketConditions = await this.analyzeCurrentMarketConditions(domain);

      // Get predictive signals
      const predictiveSignals = await this.getPredictiveSignals(domain);

      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(domain, alertType);

      return {
        domainHistory,
        similarPastAlerts,
        currentMarketConditions,
        competitivePosition: competitiveIntelligence,
        predictiveSignals,
        riskFactors
      };

    } catch (error) {
      this.logger.error('Failed to build alert context:', error);
      throw error;
    }
  }

  // Enhance priority using memory intelligence
  private async enhancePriorityWithMemory(rawPriority: number, context: AlertContext): Promise<number> {
    let enhancement = 0;

    // Historical accuracy boost
    const avgHistoricalAccuracy = this.calculateAverageHistoricalAccuracy(context.similarPastAlerts);
    enhancement += avgHistoricalAccuracy * this.prioritizationWeights.historicalAccuracy;

    // Memory relevance boost
    const memoryRelevance = this.calculateMemoryRelevance(context.domainHistory);
    enhancement += memoryRelevance * this.prioritizationWeights.memoryRelevance;

    // Competitive importance boost
    const competitiveImportance = this.calculateCompetitiveImportance(context.competitivePosition);
    enhancement += competitiveImportance * this.prioritizationWeights.competitiveImportance;

    // Temporal urgency factor
    const temporalUrgency = this.calculateTemporalUrgency(context.predictiveSignals);
    enhancement += temporalUrgency * this.prioritizationWeights.temporalUrgency;

    // Apply enhancement to raw priority
    const enhancedPriority = rawPriority * (1 + enhancement);

    return Math.min(enhancedPriority, 10.0); // Cap at 10
  }

  // Calculate Bloomberg-style priority classification
  private calculateBloombergPriority(enhancedPriority: number): MemoryAlert['bloombergPriority'] {
    if (enhancedPriority >= 9.0) return 'P1'; // Breaking news level
    if (enhancedPriority >= 7.5) return 'P2'; // High priority
    if (enhancedPriority >= 6.0) return 'P3'; // Medium priority
    if (enhancedPriority >= 4.0) return 'P4'; // Low priority
    return 'P5'; // Background monitoring
  }

  // Get all active alerts with memory-enhanced prioritization
  async getActiveAlerts(filters?: {
    domain?: string;
    alertType?: MemoryAlert['alertType'];
    minPriority?: number;
    maxAge?: number; // hours
  }): Promise<MemoryAlert[]> {
    try {
      let query = `
        SELECT * FROM memory_alerts 
        WHERE resolved = false 
        AND valid_until > CURRENT_TIMESTAMP
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.domain) {
        query += ` AND domain = $${paramIndex}`;
        params.push(filters.domain);
        paramIndex++;
      }

      if (filters?.alertType) {
        query += ` AND alert_type = $${paramIndex}`;
        params.push(filters.alertType);
        paramIndex++;
      }

      if (filters?.minPriority) {
        query += ` AND memory_enhanced_priority >= $${paramIndex}`;
        params.push(filters.minPriority);
        paramIndex++;
      }

      if (filters?.maxAge) {
        query += ` AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${filters.maxAge} hours'`;
      }

      query += ` ORDER BY memory_enhanced_priority DESC, created_at DESC`;

      const result = await this.pool.query(query, params);
      const alerts = result.rows.map(row => this.mapToMemoryAlert(row));

      // Update cache
      for (const alert of alerts) {
        this.alertCache.set(alert.id, alert);
      }

      return alerts;

    } catch (error) {
      this.logger.error('Failed to get active alerts:', error);
      throw error;
    }
  }

  // Process alert feedback for neural learning
  async processAlertFeedback(alertId: string, feedback: Omit<AlertFeedback, 'id' | 'alertId' | 'providedAt'>): Promise<void> {
    try {
      const feedbackId = this.generateFeedbackId();
      
      // Store feedback
      const query = `
        INSERT INTO alert_feedback (id, alert_id, feedback_type, rating, comment, provided_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await this.pool.query(query, [
        feedbackId, alertId, feedback.feedbackType, 
        feedback.rating, feedback.comment, feedback.providedBy
      ]);

      // Convert rating to learning signal (-1 to 1)
      const learningSignal = (feedback.rating - 3) / 2; // Convert 1-5 to -1 to 1

      // Train neural system
      await this.neuralLearning.trainFromFeedback(
        'memory',
        alertId,
        learningSignal,
        `Alert feedback: ${feedback.feedbackType} rating ${feedback.rating}`,
        Math.abs(learningSignal)
      );

      // Update alert historical accuracy
      await this.updateAlertAccuracy(alertId, feedback);

      // Update alert patterns based on feedback
      await this.updateAlertPatterns(alertId, feedback);

      this.logger.info(`📝 Processed alert feedback: ${feedback.feedbackType} rating ${feedback.rating} for alert ${alertId}`);

    } catch (error) {
      this.logger.error('Failed to process alert feedback:', error);
      throw error;
    }
  }

  // Correlate alerts to identify patterns and reduce noise
  private async checkAlertCorrelations(newAlert: MemoryAlert): Promise<void> {
    try {
      const recentAlerts = await this.getActiveAlerts({
        maxAge: 24, // Last 24 hours
        domain: newAlert.domain
      });

      for (const existingAlert of recentAlerts) {
        if (existingAlert.id === newAlert.id) continue;

        const correlation = this.calculateAlertCorrelation(newAlert, existingAlert);
        
        if (correlation.strength > 0.7) {
          // Store correlation
          await this.storeAlertCorrelation(newAlert.id, existingAlert.id, correlation);
          
          // Potentially suppress duplicate alerts
          if (correlation.type === 'duplicate' && correlation.strength > 0.9) {
            await this.markAlertAsCorrelated(newAlert.id, existingAlert.id);
          }
        }
      }

    } catch (error) {
      this.logger.error('Failed to check alert correlations:', error);
    }
  }

  // Generate intelligent alert summaries for stakeholders
  async generateAlertSummary(timeframe: 'hour' | 'day' | 'week', filters?: any): Promise<{
    totalAlerts: number;
    criticalAlerts: number;
    topDomains: { domain: string; alertCount: number; avgPriority: number }[];
    trendAnalysis: any;
    recommendations: string[];
  }> {
    try {
      const timeframeHours = { hour: 1, day: 24, week: 168 }[timeframe];
      
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(*) FILTER (WHERE bloomberg_priority IN ('P1', 'P2')) as critical_alerts,
          domain,
          AVG(memory_enhanced_priority) as avg_priority
        FROM memory_alerts 
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${timeframeHours} hours'
        GROUP BY domain
        ORDER BY avg_priority DESC
        LIMIT 10
      `;

      const result = await this.pool.query(summaryQuery);
      
      const totalAlerts = result.rows.reduce((sum, row) => sum + parseInt(row.total_alerts), 0);
      const criticalAlerts = result.rows.reduce((sum, row) => sum + parseInt(row.critical_alerts), 0);
      
      const topDomains = result.rows.map(row => ({
        domain: row.domain,
        alertCount: parseInt(row.total_alerts),
        avgPriority: parseFloat(row.avg_priority)
      }));

      // Analyze trends
      const trendAnalysis = await this.analyzeTrends(timeframe);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(topDomains, trendAnalysis);

      return {
        totalAlerts,
        criticalAlerts,
        topDomains,
        trendAnalysis,
        recommendations
      };

    } catch (error) {
      this.logger.error('Failed to generate alert summary:', error);
      throw error;
    }
  }

  // Start continuous alert monitoring and optimization
  private startAlertMonitoringCycle(): void {
    // Check for new patterns every 15 minutes
    setInterval(async () => {
      try {
        await this.detectNewAlertPatterns();
        await this.optimizeAlertThresholds();
      } catch (error) {
        this.logger.error('Alert pattern detection failed:', error);
      }
    }, 15 * 60 * 1000);

    // Generate hourly performance metrics
    setInterval(async () => {
      try {
        await this.calculateAlertPerformanceMetrics();
      } catch (error) {
        this.logger.error('Alert performance calculation failed:', error);
      }
    }, 60 * 60 * 1000);

    this.logger.info('🔄 Alert monitoring cycle started');
  }

  // Helper methods (simplified implementations)
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateFeedbackId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private calculateRawPriority(alertData: Partial<MemoryAlert>): number {
    // Base priority calculation
    let priority = 5.0; // Base priority

    if (alertData.severity === 'critical') priority += 3;
    else if (alertData.severity === 'high') priority += 2;
    else if (alertData.severity === 'medium') priority += 1;

    if (alertData.confidence && alertData.confidence > 0.8) priority += 1;
    if (alertData.actionability && alertData.actionability > 0.7) priority += 0.5;

    return Math.min(priority, 10.0);
  }

  private calculateSeverity(priority: number): MemoryAlert['severity'] {
    if (priority >= 8.5) return 'critical';
    if (priority >= 7.0) return 'high';
    if (priority >= 5.5) return 'medium';
    return 'low';
  }

  private calculateUrgency(timeToRelevance: number): MemoryAlert['urgency'] {
    if (timeToRelevance <= 60) return 'immediate';
    if (timeToRelevance <= 360) return 'within_hour';
    if (timeToRelevance <= 1440) return 'within_day';
    return 'within_week';
  }

  private calculateTimeToRelevance(alertData: Partial<MemoryAlert>, context: AlertContext): number {
    // Simplified implementation
    const baseTime = 120; // 2 hours default
    
    if (alertData.severity === 'critical') return 30;
    if (alertData.alertType === 'competitive_threat') return 60;
    
    return baseTime;
  }

  private calculateValidUntil(alertData: Partial<MemoryAlert>, timeToRelevance: number): Date {
    const validityHours = Math.max(timeToRelevance / 60, 1) * 2; // Double the time to relevance
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + validityHours);
    return validUntil;
  }

  private generateAlertTitle(alertData: Partial<MemoryAlert>): string {
    return `${alertData.alertType?.replace('_', ' ').toUpperCase()} - ${alertData.domain}`;
  }

  private generateAlertDescription(alertData: Partial<MemoryAlert>, context: AlertContext): string {
    return `Memory-enhanced alert for ${alertData.domain} based on ${context.domainHistory.length} historical memories and current intelligence.`;
  }

  private calculateActionability(context: AlertContext): number {
    // Calculate based on available actions and competitive position
    return Math.min(context.domainHistory.length / 10, 1.0);
  }

  private calculateImpactMagnitude(context: AlertContext): number {
    // Calculate based on competitive importance and market position
    return 0.7;
  }

  private identifyStakeholders(alertData: Partial<MemoryAlert>, context: AlertContext): string[] {
    // Identify relevant stakeholders based on alert type and domain
    const stakeholders = ['competitive_intelligence_team'];
    
    if (alertData.severity === 'critical') {
      stakeholders.push('executive_team', 'product_team');
    }
    
    return stakeholders;
  }

  private async generateRecommendedActions(alertData: Partial<MemoryAlert>, context: AlertContext): Promise<string[]> {
    // Generate contextual recommendations based on memory and intelligence
    const actions = [
      'Review competitive positioning',
      'Analyze market trends',
      'Update strategic response plan'
    ];
    
    if (alertData.alertType === 'competitive_threat') {
      actions.push('Accelerate product roadmap', 'Enhance marketing strategy');
    }
    
    return actions;
  }

  // Performance and analytics methods (simplified)
  private calculateAverageHistoricalAccuracy(alerts: MemoryAlert[]): number {
    if (alerts.length === 0) return 0.5;
    return alerts.reduce((sum, alert) => sum + alert.historicalAccuracy, 0) / alerts.length;
  }

  private calculateMemoryRelevance(memories: CompetitiveMemory[]): number {
    if (memories.length === 0) return 0.5;
    return memories.reduce((sum, memory) => sum + memory.effectiveness, 0) / memories.length;
  }

  private calculateCompetitiveImportance(competitivePosition: any): number {
    // Calculate based on competitive graph analysis
    return 0.7;
  }

  private calculateTemporalUrgency(predictiveSignals: any[]): number {
    // Calculate based on predictive signals
    return 0.6;
  }

  private async getHistoricalAccuracy(alertType: string, domain: string): Promise<number> {
    const query = `
      SELECT AVG(af.rating) as avg_rating
      FROM alert_feedback af
      JOIN memory_alerts ma ON af.alert_id = ma.id
      WHERE ma.alert_type = $1 AND ma.domain = $2 AND af.feedback_type = 'accuracy'
    `;
    
    const result = await this.pool.query(query, [alertType, domain]);
    const avgRating = result.rows[0]?.avg_rating;
    
    return avgRating ? (avgRating - 1) / 4 : 0.5; // Convert 1-5 to 0-1
  }

  private async storeAlert(alert: MemoryAlert): Promise<void> {
    const query = `
      INSERT INTO memory_alerts (
        id, alert_type, domain, title, description, severity, urgency,
        confidence, actionability, raw_priority, memory_enhanced_priority,
        bloomberg_priority, supporting_memories, historical_accuracy,
        impact_magnitude, time_to_relevance, stakeholders, recommended_actions,
        valid_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `;

    await this.pool.query(query, [
      alert.id, alert.alertType, alert.domain, alert.title, alert.description,
      alert.severity, alert.urgency, alert.confidence, alert.actionability,
      alert.rawPriority, alert.memoryEnhancedPriority, alert.bloombergPriority,
      alert.supportingMemories, alert.historicalAccuracy, alert.impactMagnitude,
      alert.timeToRelevance, alert.stakeholders, alert.recommendedActions,
      alert.validUntil
    ]);
  }

  // Additional helper methods for alert analysis and optimization
  private calculateAlertCorrelation(alert1: MemoryAlert, alert2: MemoryAlert): { strength: number; type: string } {
    let strength = 0;
    let type = 'unknown';

    // Domain similarity
    if (alert1.domain === alert2.domain) {
      strength += 0.3;
      type = 'same_domain';
    }

    // Type similarity
    if (alert1.alertType === alert2.alertType) {
      strength += 0.4;
      if (type === 'same_domain') type = 'duplicate';
    }

    // Time proximity
    const timeDiff = Math.abs(alert1.createdAt.getTime() - alert2.createdAt.getTime());
    if (timeDiff < 60 * 60 * 1000) { // Within 1 hour
      strength += 0.3;
    }

    return { strength: Math.min(strength, 1.0), type };
  }

  private async storeAlertCorrelation(primaryId: string, correlatedId: string, correlation: any): Promise<void> {
    const query = `
      INSERT INTO alert_correlations (primary_alert_id, correlated_alert_id, correlation_type, correlation_strength)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `;
    
    await this.pool.query(query, [primaryId, correlatedId, correlation.type, correlation.strength]);
  }

  private async markAlertAsCorrelated(newAlertId: string, existingAlertId: string): Promise<void> {
    // Mark the newer alert as correlated/suppressed
    const query = `
      UPDATE memory_alerts 
      SET resolved = true, resolution_outcome = 'correlated_with_' || $2
      WHERE id = $1
    `;
    
    await this.pool.query(query, [newAlertId, existingAlertId]);
  }

  // Placeholder methods for future implementation
  private async analyzeCurrentMarketConditions(domain: string): Promise<any> {
    return { confidence: 0.7, volatility: 0.3 };
  }

  private async getPredictiveSignals(domain: string): Promise<any[]> {
    return [];
  }

  private async identifyRiskFactors(domain: string, alertType: string): Promise<any[]> {
    return [];
  }

  private async updateAlertAccuracy(alertId: string, feedback: any): Promise<void> {
    // Update historical accuracy based on feedback
  }

  private async updateAlertPatterns(alertId: string, feedback: any): Promise<void> {
    // Update alert patterns based on feedback
  }

  private async detectNewAlertPatterns(): Promise<void> {
    // Detect new patterns in alert data
  }

  private async optimizeAlertThresholds(): Promise<void> {
    // Optimize alert thresholds based on performance
  }

  private async calculateAlertPerformanceMetrics(): Promise<void> {
    // Calculate various performance metrics
  }

  private async analyzeTrends(timeframe: string): Promise<any> {
    return { trend: 'stable', confidence: 0.8 };
  }

  private async generateRecommendations(topDomains: any[], trendAnalysis: any): Promise<string[]> {
    return ['Monitor top domains closely', 'Review alert thresholds'];
  }

  // Mapping functions
  private mapToCompetitiveMemory(row: any): CompetitiveMemory {
    return {
      id: row.id,
      domainId: row.domain_id,
      domain: row.domain,
      memoryType: row.memory_type,
      content: row.content,
      confidence: row.confidence,
      sourceModels: row.source_models || [],
      relationships: row.relationships || [],
      patterns: row.patterns || [],
      predictionAccuracy: row.prediction_accuracy,
      alertPriority: row.alert_priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      accessCount: row.access_count,
      lastAccessed: row.last_accessed,
      effectiveness: row.effectiveness,
      memoryWeight: row.memory_weight
    };
  }

  private mapToMemoryAlert(row: any): MemoryAlert {
    return {
      id: row.id,
      alertType: row.alert_type,
      domain: row.domain,
      title: row.title,
      description: row.description,
      severity: row.severity,
      urgency: row.urgency,
      confidence: row.confidence,
      actionability: row.actionability,
      rawPriority: row.raw_priority,
      memoryEnhancedPriority: row.memory_enhanced_priority,
      bloombergPriority: row.bloomberg_priority,
      supportingMemories: row.supporting_memories || [],
      historicalAccuracy: row.historical_accuracy,
      impactMagnitude: row.impact_magnitude,
      timeToRelevance: row.time_to_relevance,
      stakeholders: row.stakeholders || [],
      recommendedActions: row.recommended_actions || [],
      createdAt: row.created_at,
      validUntil: row.valid_until,
      acknowledged: row.acknowledged,
      resolved: row.resolved
    };
  }
}