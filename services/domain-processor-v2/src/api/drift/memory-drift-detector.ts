/**
 * Memory Drift Detection & Alert System
 * Real-time notifications when LLM memories diverge from reality
 * Enterprise-grade feature for reputation management
 */

import { EventEmitter } from 'events';
import { IDatabaseService } from '../../modules/database/interfaces';
import { Logger } from '../../utils/logger';
import Redis from 'ioredis';
import { ConsensusEngine } from '../consensus/consensus-engine';

export interface DriftAlert {
  id: string;
  domain: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  driftScore: number; // 0-100, higher = more drift
  affectedProviders: ProviderDrift[];
  consensus: {
    current: number;
    expected: number;
    deviation: number;
  };
  realityCheckpoints: RealityCheckpoint[];
  recommendation: string;
  alertType: 'memory_stale' | 'fact_divergence' | 'sentiment_shift' | 'consensus_breakdown';
  createdAt: Date;
  expiresAt: Date;
  metadata: {
    lastCrawl: Date;
    daysSinceUpdate: number;
    confidenceLevel: number;
  };
}

export interface ProviderDrift {
  provider: string;
  currentBelief: string;
  expectedBelief: string;
  driftAmount: number;
  lastUpdated: Date;
}

export interface RealityCheckpoint {
  source: string;
  fact: string;
  verifiedDate: Date;
  conflictsWith: string;
}

export interface DriftSubscription {
  id: string;
  domain: string;
  email?: string;
  webhook?: string;
  threshold: number; // Minimum drift score to trigger
  frequency: 'realtime' | 'hourly' | 'daily';
  tier: 'enterprise' | 'premium';
  active: boolean;
  createdAt: Date;
}

export interface DriftAnalysis {
  domain: string;
  overallDrift: number;
  driftVelocity: number; // Rate of drift increase
  providers: {
    aligned: number;
    drifting: number;
    critical: number;
  };
  timeline: DriftPoint[];
  projectedDrift: number; // Predicted drift in 7 days
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface DriftPoint {
  date: Date;
  driftScore: number;
  consensus: number;
  event?: string; // Notable event that caused drift
}

export class MemoryDriftDetector extends EventEmitter {
  private redis: Redis;
  private logger: Logger;
  private database: IDatabaseService;
  private consensusEngine: ConsensusEngine;
  
  // Configuration
  private readonly DRIFT_CHECK_INTERVAL = 300000; // 5 minutes
  private readonly CRITICAL_DRIFT_THRESHOLD = 30;
  private readonly HIGH_DRIFT_THRESHOLD = 20;
  private readonly MEDIUM_DRIFT_THRESHOLD = 10;
  private readonly ALERT_RETENTION = 604800; // 7 days in seconds
  
  // Monitoring
  private checkTimer: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, DriftSubscription[]> = new Map();
  
  constructor(
    database: IDatabaseService,
    consensusEngine: ConsensusEngine,
    logger: Logger,
    redisConfig?: any
  ) {
    super();
    this.database = database;
    this.consensusEngine = consensusEngine;
    this.logger = logger.child('drift-detector');
    
    // Handle Redis config - ioredis accepts URL string directly
    if (typeof redisConfig === 'string') {
      this.redis = new Redis(redisConfig);
    } else {
      this.redis = new Redis(redisConfig || { host: 'localhost', port: 6379 });
    }
    
    this.initialize();
  }
  
  private async initialize() {
    this.logger.info('Memory Drift Detector initializing');
    
    // Load subscriptions
    await this.loadSubscriptions();
    
    // Start monitoring
    this.startMonitoring();
    
    // Subscribe to consensus updates
    this.consensusEngine.on('consensus:calculated', this.checkForDrift.bind(this));
    
    this.logger.info('Memory Drift Detector initialized');
  }
  
  /**
   * Analyze drift for a specific domain
   */
  async analyzeDrift(domain: string): Promise<DriftAnalysis> {
    const start = Date.now();
    
    try {
      // Get current consensus
      const consensus = await this.consensusEngine.getConsensus({ domain });
      
      // Get historical data
      const history = await this.getDriftHistory(domain, 30);
      
      // Get reality checkpoints (from external sources)
      const realityChecks = await this.getRealityCheckpoints(domain);
      
      // Calculate drift metrics
      const overallDrift = this.calculateOverallDrift(consensus, realityChecks);
      const driftVelocity = this.calculateDriftVelocity(history);
      const projectedDrift = this.projectFutureDrift(overallDrift, driftVelocity);
      
      // Analyze provider alignment
      const providerAnalysis = this.analyzeProviderAlignment(consensus);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(overallDrift, driftVelocity, providerAnalysis);
      
      const analysis: DriftAnalysis = {
        domain,
        overallDrift,
        driftVelocity,
        providers: providerAnalysis,
        timeline: history,
        projectedDrift,
        riskLevel
      };
      
      // Cache analysis
      await this.redis.setex(
        `drift:analysis:${domain}`,
        3600, // 1 hour
        JSON.stringify(analysis)
      );
      
      this.logger.info('Drift analysis completed', {
        domain,
        drift: overallDrift,
        risk: riskLevel,
        time: Date.now() - start
      });
      
      return analysis;
      
    } catch (error) {
      this.logger.error('Drift analysis failed', { domain, error });
      throw error;
    }
  }
  
  /**
   * Create a drift alert
   */
  async createAlert(domain: string, analysis: DriftAnalysis): Promise<DriftAlert> {
    const alertId = `drift_${domain}_${Date.now()}`;
    
    // Determine alert type
    const alertType = this.determineAlertType(analysis);
    
    // Get affected providers
    const affectedProviders = await this.getAffectedProviders(domain, analysis);
    
    // Get reality checkpoints
    const realityCheckpoints = await this.getRealityCheckpoints(domain);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(analysis, alertType);
    
    const alert: DriftAlert = {
      id: alertId,
      domain,
      severity: analysis.riskLevel,
      driftScore: analysis.overallDrift,
      affectedProviders,
      consensus: {
        current: 0, // Will be filled from consensus
        expected: 0, // Will be filled from reality checks
        deviation: analysis.overallDrift
      },
      realityCheckpoints,
      recommendation,
      alertType,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      metadata: {
        lastCrawl: new Date(), // Would get from DB
        daysSinceUpdate: 0, // Would calculate
        confidenceLevel: 0.85 // Would calculate
      }
    };
    
    // Store alert
    await this.storeAlert(alert);
    
    // Notify subscribers
    await this.notifySubscribers(alert);
    
    // Emit event
    this.emit('drift:alert', alert);
    
    this.logger.warn('Drift alert created', {
      domain,
      severity: alert.severity,
      drift: alert.driftScore
    });
    
    return alert;
  }
  
  /**
   * Subscribe to drift alerts
   */
  async subscribe(subscription: Omit<DriftSubscription, 'id' | 'createdAt'>): Promise<DriftSubscription> {
    const sub: DriftSubscription = {
      ...subscription,
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    
    // Store subscription
    await this.redis.hset(
      'drift:subscriptions',
      sub.id,
      JSON.stringify(sub)
    );
    
    // Update in-memory map
    const domainSubs = this.subscriptions.get(sub.domain) || [];
    domainSubs.push(sub);
    this.subscriptions.set(sub.domain, domainSubs);
    
    this.logger.info('Drift subscription created', {
      id: sub.id,
      domain: sub.domain,
      tier: sub.tier
    });
    
    return sub;
  }
  
  /**
   * Get active alerts for a domain
   */
  async getActiveAlerts(domain?: string): Promise<DriftAlert[]> {
    const pattern = domain ? `drift:alert:${domain}:*` : 'drift:alert:*';
    const keys = await this.redis.keys(pattern);
    
    if (keys.length === 0) return [];
    
    const alerts = await Promise.all(
      keys.map(async key => {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );
    
    return alerts
      .filter(alert => alert && new Date(alert.expiresAt) > new Date())
      .sort((a, b) => b.driftScore - a.driftScore);
  }
  
  /**
   * Calculate overall drift score
   */
  private calculateOverallDrift(consensus: any, realityChecks: RealityCheckpoint[]): number {
    // This would implement sophisticated drift calculation
    // For now, mock implementation
    let driftScore = 0;
    
    // Factor 1: Time since last update (staleness)
    const daysSinceUpdate = 7; // Would calculate from DB
    driftScore += Math.min(30, daysSinceUpdate * 2);
    
    // Factor 2: Consensus confidence
    const lowConfidence = consensus.confidence < 0.7;
    if (lowConfidence) driftScore += 15;
    
    // Factor 3: Reality checkpoint conflicts
    const conflicts = realityChecks.filter(rc => rc.conflictsWith).length;
    driftScore += conflicts * 10;
    
    // Factor 4: Provider disagreement
    const outliers = consensus.outliers.filter(o => o.isOutlier).length;
    driftScore += outliers * 5;
    
    return Math.min(100, driftScore);
  }
  
  /**
   * Calculate drift velocity (rate of change)
   */
  private calculateDriftVelocity(history: DriftPoint[]): number {
    if (history.length < 2) return 0;
    
    // Calculate average daily drift change
    const recentHistory = history.slice(-7); // Last 7 days
    if (recentHistory.length < 2) return 0;
    
    const firstPoint = recentHistory[0];
    const lastPoint = recentHistory[recentHistory.length - 1];
    const daysDiff = (lastPoint.date.getTime() - firstPoint.date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff === 0) return 0;
    
    const driftChange = lastPoint.driftScore - firstPoint.driftScore;
    return driftChange / daysDiff; // Drift points per day
  }
  
  /**
   * Project future drift based on current trajectory
   */
  private projectFutureDrift(currentDrift: number, velocity: number, days: number = 7): number {
    const projected = currentDrift + (velocity * days);
    return Math.max(0, Math.min(100, projected));
  }
  
  /**
   * Analyze provider alignment
   */
  private analyzeProviderAlignment(consensus: any): DriftAnalysis['providers'] {
    const total = consensus.respondingProviders;
    const outliers = consensus.outliers.filter(o => o.isOutlier).length;
    const critical = consensus.outliers.filter(o => Math.abs(o.zScore) > 3).length;
    
    return {
      aligned: total - outliers,
      drifting: outliers - critical,
      critical
    };
  }
  
  /**
   * Determine risk level based on multiple factors
   */
  private determineRiskLevel(
    drift: number, 
    velocity: number, 
    providers: DriftAnalysis['providers']
  ): DriftAnalysis['riskLevel'] {
    // Critical if drift is high OR velocity is very high OR many critical providers
    if (drift >= this.CRITICAL_DRIFT_THRESHOLD || 
        velocity > 5 || 
        providers.critical > 3) {
      return 'critical';
    }
    
    // High if moderate drift with positive velocity
    if (drift >= this.HIGH_DRIFT_THRESHOLD || 
        (drift >= this.MEDIUM_DRIFT_THRESHOLD && velocity > 1)) {
      return 'high';
    }
    
    // Medium if some drift or some velocity
    if (drift >= this.MEDIUM_DRIFT_THRESHOLD || velocity > 0.5) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Get drift history for timeline
   */
  private async getDriftHistory(domain: string, days: number): Promise<DriftPoint[]> {
    // This would query actual drift history
    // For now, generating mock data
    const points: DriftPoint[] = [];
    const now = Date.now();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const baseScore = 15 + Math.random() * 10;
      const trend = i < days / 2 ? 1 : 1.5; // Accelerating drift
      
      points.push({
        date,
        driftScore: baseScore * trend + (days - i) * 0.5,
        consensus: 85 - (days - i) * 0.3,
        event: i === Math.floor(days / 2) ? 'Major company announcement' : undefined
      });
    }
    
    return points;
  }
  
  /**
   * Get reality checkpoints from external sources
   */
  private async getRealityCheckpoints(domain: string): Promise<RealityCheckpoint[]> {
    // This would integrate with external APIs, news sources, etc.
    // For now, mock data
    return [
      {
        source: 'Company Website',
        fact: 'Headquarters moved to Austin, TX',
        verifiedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        conflictsWith: 'LLMs still think HQ is in San Francisco'
      },
      {
        source: 'SEC Filing',
        fact: 'Revenue $2.5B in Q4 2024',
        verifiedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        conflictsWith: 'AI models quote Q2 2024 numbers'
      }
    ];
  }
  
  /**
   * Determine alert type
   */
  private determineAlertType(analysis: DriftAnalysis): DriftAlert['alertType'] {
    if (analysis.providers.critical > 2) return 'consensus_breakdown';
    if (analysis.driftVelocity < 0) return 'sentiment_shift';
    if (analysis.overallDrift > 20) return 'fact_divergence';
    return 'memory_stale';
  }
  
  /**
   * Get affected providers details
   */
  private async getAffectedProviders(domain: string, analysis: DriftAnalysis): Promise<ProviderDrift[]> {
    // Would get actual provider beliefs
    // Mock for now
    return [
      {
        provider: 'openai',
        currentBelief: 'Company is pre-IPO startup',
        expectedBelief: 'Company went public in 2024',
        driftAmount: 25,
        lastUpdated: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      },
      {
        provider: 'anthropic',
        currentBelief: 'CEO is previous founder',
        expectedBelief: 'New CEO appointed in Q3 2024',
        driftAmount: 20,
        lastUpdated: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
      }
    ];
  }
  
  /**
   * Generate actionable recommendation
   */
  private generateRecommendation(analysis: DriftAnalysis, alertType: string): string {
    const recommendations = {
      critical: `URGENT: Immediate action required. ${analysis.providers.critical} providers have critical drift. Launch correction campaign within 24 hours to prevent reputation damage.`,
      high: `High priority: Significant drift detected (${Math.round(analysis.overallDrift)}%). Schedule content updates and monitor closely. Consider proactive PR campaign.`,
      medium: `Moderate drift detected. Plan content refresh within 1 week. Monitor competitor movements for similar issues.`,
      low: `Low drift detected. Include in next regular update cycle. No immediate action required.`
    };
    
    return recommendations[analysis.riskLevel] || recommendations.medium;
  }
  
  /**
   * Store alert in database
   */
  private async storeAlert(alert: DriftAlert): Promise<void> {
    const key = `drift:alert:${alert.domain}:${alert.id}`;
    await this.redis.setex(key, this.ALERT_RETENTION, JSON.stringify(alert));
    
    // Also store in sorted set for easy retrieval
    await this.redis.zadd(
      'drift:alerts:active',
      alert.driftScore,
      key
    );
  }
  
  /**
   * Notify subscribers about alert
   */
  private async notifySubscribers(alert: DriftAlert): Promise<void> {
    const subscribers = this.subscriptions.get(alert.domain) || [];
    
    for (const sub of subscribers) {
      if (!sub.active || alert.driftScore < sub.threshold) continue;
      
      // Check frequency
      if (sub.frequency !== 'realtime') {
        const lastNotify = await this.redis.get(`drift:notify:${sub.id}:last`);
        if (lastNotify) {
          const hoursSince = (Date.now() - parseInt(lastNotify)) / (1000 * 60 * 60);
          if (sub.frequency === 'hourly' && hoursSince < 1) continue;
          if (sub.frequency === 'daily' && hoursSince < 24) continue;
        }
      }
      
      // Send notification
      if (sub.webhook) {
        this.sendWebhookNotification(sub.webhook, alert);
      }
      if (sub.email) {
        this.sendEmailNotification(sub.email, alert);
      }
      
      // Update last notification time
      await this.redis.set(`drift:notify:${sub.id}:last`, Date.now());
    }
  }
  
  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(webhook: string, alert: DriftAlert): Promise<void> {
    try {
      // Would implement actual webhook call
      this.logger.info('Webhook notification sent', {
        webhook,
        alertId: alert.id,
        domain: alert.domain
      });
    } catch (error) {
      this.logger.error('Webhook notification failed', { webhook, error });
    }
  }
  
  /**
   * Send email notification
   */
  private async sendEmailNotification(email: string, alert: DriftAlert): Promise<void> {
    try {
      // Would implement actual email sending
      this.logger.info('Email notification sent', {
        email,
        alertId: alert.id,
        domain: alert.domain
      });
    } catch (error) {
      this.logger.error('Email notification failed', { email, error });
    }
  }
  
  /**
   * Start monitoring for drift
   */
  private startMonitoring(): void {
    this.checkTimer = setInterval(async () => {
      try {
        await this.runDriftCheck();
      } catch (error) {
        this.logger.error('Drift check failed', { error });
      }
    }, this.DRIFT_CHECK_INTERVAL);
    
    this.logger.info('Drift monitoring started');
  }
  
  /**
   * Run periodic drift check
   */
  private async runDriftCheck(): Promise<void> {
    // Get domains with active subscriptions
    const domains = Array.from(this.subscriptions.keys());
    
    for (const domain of domains) {
      try {
        const analysis = await this.analyzeDrift(domain);
        
        // Create alert if drift exceeds thresholds
        if (analysis.overallDrift >= this.MEDIUM_DRIFT_THRESHOLD) {
          await this.createAlert(domain, analysis);
        }
      } catch (error) {
        this.logger.error('Domain drift check failed', { domain, error });
      }
    }
  }
  
  /**
   * Check for drift when consensus updates
   */
  private async checkForDrift(consensus: any): Promise<void> {
    const domain = consensus.domain;
    const subscribers = this.subscriptions.get(domain);
    
    if (!subscribers || subscribers.length === 0) return;
    
    // Quick drift check based on consensus
    const quickDrift = this.calculateQuickDrift(consensus);
    
    if (quickDrift >= this.MEDIUM_DRIFT_THRESHOLD) {
      const analysis = await this.analyzeDrift(domain);
      if (analysis.overallDrift >= this.MEDIUM_DRIFT_THRESHOLD) {
        await this.createAlert(domain, analysis);
      }
    }
  }
  
  /**
   * Quick drift calculation from consensus
   */
  private calculateQuickDrift(consensus: any): number {
    let drift = 0;
    
    // Low confidence indicates potential drift
    if (consensus.confidence < 0.7) drift += 15;
    
    // Low convergence indicates disagreement
    if (consensus.convergence < 0.6) drift += 20;
    
    // Many outliers indicate drift
    const outlierRatio = consensus.outliers.filter(o => o.isOutlier).length / consensus.respondingProviders;
    drift += outlierRatio * 30;
    
    return drift;
  }
  
  /**
   * Load subscriptions from storage
   */
  private async loadSubscriptions(): Promise<void> {
    const subs = await this.redis.hgetall('drift:subscriptions');
    
    for (const [id, data] of Object.entries(subs)) {
      try {
        const sub = JSON.parse(data) as DriftSubscription;
        const domainSubs = this.subscriptions.get(sub.domain) || [];
        domainSubs.push(sub);
        this.subscriptions.set(sub.domain, domainSubs);
      } catch (error) {
        this.logger.error('Failed to load subscription', { id, error });
      }
    }
    
    this.logger.info('Subscriptions loaded', {
      total: Object.keys(subs).length,
      domains: this.subscriptions.size
    });
  }
  
  /**
   * Get drift report for domain
   */
  async getDriftReport(domain: string): Promise<any> {
    const analysis = await this.analyzeDrift(domain);
    const alerts = await this.getActiveAlerts(domain);
    const consensus = await this.consensusEngine.getConsensus({ domain });
    
    return {
      domain,
      analysis,
      alerts,
      consensus: {
        score: consensus.consensusScore,
        confidence: consensus.confidence,
        providers: consensus.respondingProviders
      },
      recommendations: this.generateDetailedRecommendations(analysis, alerts),
      lastChecked: new Date()
    };
  }
  
  /**
   * Generate detailed recommendations
   */
  private generateDetailedRecommendations(analysis: DriftAnalysis, alerts: DriftAlert[]): string[] {
    const recommendations: string[] = [];
    
    if (analysis.riskLevel === 'critical') {
      recommendations.push('1. IMMEDIATE: Issue press release with updated facts');
      recommendations.push('2. Launch aggressive content campaign across all channels');
      recommendations.push('3. Direct outreach to AI providers with correction requests');
      recommendations.push('4. Monitor social media for misinformation spread');
    } else if (analysis.riskLevel === 'high') {
      recommendations.push('1. Update all digital properties within 48 hours');
      recommendations.push('2. Create FAQ addressing common misconceptions');
      recommendations.push('3. Increase content publishing frequency');
      recommendations.push('4. Set up weekly drift monitoring');
    } else {
      recommendations.push('1. Include updates in next content cycle');
      recommendations.push('2. Monitor competitor drift scores');
      recommendations.push('3. Set up monthly drift reports');
    }
    
    return recommendations;
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Memory Drift Detector');
    
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    
    await this.redis.quit();
    this.removeAllListeners();
  }
}

export default MemoryDriftDetector;