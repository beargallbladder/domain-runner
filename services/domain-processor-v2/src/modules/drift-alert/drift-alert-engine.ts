/**
 * Memory Drift Alert Engine
 * Monitors and alerts when LLM memories diverge from reality
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Logger } from '../../utils/logger';
import {
  DriftAlertEngine,
  DriftAlert,
  DriftCheckResult,
  DriftMonitoringConfig,
  DomainMonitoringConfig,
  AlertChannel,
  DriftResolution,
  DriftTrend,
  DriftReport,
  DomainDriftSummary,
  EngineStatus,
  DriftSeverity,
  DriftType,
  ProviderDrift,
  SpecificDrift,
  RealityData,
  MemoryData,
  DivergenceAnalysis,
  RecommendedAction,
  AlertStatus,
  RealitySource,
  FactualData
} from './interfaces';
import { IDatabaseService } from '../database/interfaces';
import { LLMConsensusEngine } from '../consensus-api/consensus-engine';
import axios from 'axios';

export class MemoryDriftAlertEngine extends EventEmitter implements DriftAlertEngine {
  private redis: Redis;
  private logger: Logger;
  private config: DriftMonitoringConfig;
  private database: IDatabaseService;
  private consensusEngine: LLMConsensusEngine;
  
  // State management
  private activeAlerts: Map<string, DriftAlert>;
  private subscriptions: Map<string, AlertChannel>;
  private checkInterval?: NodeJS.Timeout;
  private streamCallbacks: Set<(alert: DriftAlert) => void>;
  private monitoringQueue: Set<string>;
  
  // Performance tracking
  private metrics = {
    checksPerformed: 0,
    alertsGenerated: 0,
    alertsResolved: 0,
    averageCheckTime: 0,
    lastCheckTime: new Date(),
    errors: [] as string[]
  };

  constructor(
    consensusEngine: LLMConsensusEngine,
    database: IDatabaseService,
    logger: Logger,
    config: DriftMonitoringConfig,
    redisConfig?: any
  ) {
    super();
    this.consensusEngine = consensusEngine;
    this.database = database;
    this.logger = logger.child('drift-alert');
    this.config = config;
    this.redis = new Redis(redisConfig || { host: 'localhost', port: 6379 });
    
    this.activeAlerts = new Map();
    this.subscriptions = new Map();
    this.streamCallbacks = new Set();
    this.monitoringQueue = new Set();
    
    this.initialize();
  }

  private async initialize() {
    // Set up Redis pub/sub
    const subscriber = this.redis.duplicate();
    subscriber.subscribe('drift:detected', 'consensus:generated');
    
    subscriber.on('message', (channel, message) => {
      this.handleRedisMessage(channel, message);
    });

    // Listen to consensus engine for automatic drift detection
    this.consensusEngine.on('consensus:generated', (response) => {
      if (response.memoryDrift?.detected) {
        this.processDetectedDrift(response);
      }
    });

    // Load active alerts from cache
    await this.loadActiveAlerts();

    // Start monitoring if enabled
    if (this.config.enabled && this.config.checkInterval > 0) {
      this.startMonitoring();
    }

    this.logger.info('Memory Drift Alert Engine initialized', {
      enabled: this.config.enabled,
      checkInterval: this.config.checkInterval,
      domainsMonitored: this.config.domains.length
    });
  }

  /**
   * Check a specific domain for drift
   */
  async checkDomain(domain: string): Promise<DriftCheckResult> {
    const startTime = Date.now();
    const result: DriftCheckResult = {
      domain,
      timestamp: new Date(),
      driftDetected: false,
      driftScore: 0,
      alerts: [],
      performanceMetrics: {
        checkDuration: 0,
        providersChecked: 0,
        realitySourcesUsed: 0
      }
    };

    try {
      this.logger.debug('Checking domain for drift', { domain });

      // Get domain config
      const domainConfig = this.config.domains.find(d => d.domain === domain);
      if (!domainConfig) {
        throw new Error(`Domain ${domain} not configured for monitoring`);
      }

      // Get current reality data
      const realityData = await this.fetchRealityData(domain);
      result.performanceMetrics.realitySourcesUsed = this.config.realitySources.length;

      // Get LLM consensus
      const consensus = await this.consensusEngine.getConsensus({
        domain,
        includeMetadata: true,
        realtime: true
      });
      result.performanceMetrics.providersChecked = consensus.providers.length;

      // Extract memory data
      const memoryData = this.extractMemoryData(consensus);

      // Analyze drift
      const driftAnalysis = await this.analyzeDrift(
        domain,
        realityData,
        memoryData,
        consensus.providers
      );

      result.driftScore = driftAnalysis.score;
      result.driftDetected = driftAnalysis.driftDetected;

      // Generate alerts if drift detected
      if (driftAnalysis.driftDetected) {
        const alert = await this.generateAlert(
          domain,
          driftAnalysis,
          realityData,
          memoryData
        );
        
        if (alert) {
          result.alerts.push(alert);
          await this.processAlert(alert);
        }
      }

      // Update metrics
      result.performanceMetrics.checkDuration = Date.now() - startTime;
      this.updateMetrics(result);

      return result;
    } catch (error) {
      this.logger.error('Domain drift check failed', { domain, error });
      this.metrics.errors.push(`${domain}: ${error}`);
      
      result.performanceMetrics.checkDuration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Check all configured domains
   */
  async checkAllDomains(): Promise<DriftCheckResult[]> {
    const results: DriftCheckResult[] = [];
    const batchSize = 5; // Process in batches to avoid overload

    for (let i = 0; i < this.config.domains.length; i += batchSize) {
      const batch = this.config.domains.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(config => this.checkDomain(config.domain))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<DriftAlert[]> {
    return Array.from(this.activeAlerts.values())
      .filter(alert => alert.status === 'active' || alert.status === 'acknowledged');
  }

  /**
   * Get specific alert
   */
  async getAlert(alertId: string): Promise<DriftAlert | null> {
    return this.activeAlerts.get(alertId) || null;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = 'acknowledged';
    await this.updateAlert(alert);
    
    this.logger.info('Alert acknowledged', { alertId, acknowledgedBy });
    this.emit('alert:acknowledged', { alert, acknowledgedBy });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolution: DriftResolution): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.status = 'resolved';
    alert.resolution = resolution;
    
    await this.updateAlert(alert);
    this.metrics.alertsResolved++;
    
    this.logger.info('Alert resolved', { alertId, method: resolution.method });
    this.emit('alert:resolved', { alert, resolution });
    
    // Broadcast resolution
    this.broadcastUpdate({
      type: 'drift:resolved',
      data: alert,
      timestamp: new Date()
    });
  }

  /**
   * Subscribe to alerts
   */
  async subscribe(channel: AlertChannel): Promise<string> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.set(id, channel);
    
    // Store in Redis for persistence
    await this.redis.hset(
      'drift:subscriptions',
      id,
      JSON.stringify(channel)
    );
    
    this.logger.info('Alert subscription created', { id, type: channel.type });
    return id;
  }

  /**
   * Unsubscribe from alerts
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
    await this.redis.hdel('drift:subscriptions', subscriptionId);
    
    this.logger.info('Alert subscription removed', { subscriptionId });
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<DriftMonitoringConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring if interval changed
    if (config.checkInterval !== undefined || config.enabled !== undefined) {
      this.stopMonitoring();
      if (this.config.enabled) {
        this.startMonitoring();
      }
    }
    
    this.logger.info('Configuration updated');
  }

  /**
   * Add domain to monitoring
   */
  async addDomain(config: DomainMonitoringConfig): Promise<void> {
    const existing = this.config.domains.find(d => d.domain === config.domain);
    if (existing) {
      // Update existing config
      Object.assign(existing, config);
    } else {
      this.config.domains.push(config);
    }
    
    this.logger.info('Domain added to monitoring', { domain: config.domain });
  }

  /**
   * Remove domain from monitoring
   */
  async removeDomain(domain: string): Promise<void> {
    this.config.domains = this.config.domains.filter(d => d.domain !== domain);
    
    // Remove any active alerts for this domain
    for (const [id, alert] of this.activeAlerts) {
      if (alert.domain === domain) {
        this.activeAlerts.delete(id);
      }
    }
    
    this.logger.info('Domain removed from monitoring', { domain });
  }

  /**
   * Get drift trends for a domain
   */
  async getDriftTrends(domain: string, days: number): Promise<DriftTrend[]> {
    // In production, query from database
    // Mock implementation
    const trends: DriftTrend[] = [];
    const now = Date.now();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      trends.push({
        date,
        averageDriftScore: Math.random() * 50,
        alertCount: Math.floor(Math.random() * 5),
        topDriftTypes: ['temporal', 'factual'] as DriftType[],
        resolutionTime: Math.random() * 24 * 60 // minutes
      });
    }
    
    return trends;
  }

  /**
   * Get drift report
   */
  async getDriftReport(startDate: Date, endDate: Date): Promise<DriftReport> {
    const alerts = Array.from(this.activeAlerts.values()).filter(
      a => a.detectedAt >= startDate && a.detectedAt <= endDate
    );

    const alertsBySeverity: Record<DriftSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const alertsByType: Record<DriftType, number> = {} as any;
    let totalScore = 0;
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    alerts.forEach(alert => {
      alertsBySeverity[alert.severity]++;
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      totalScore += alert.score;
      
      if (alert.resolution) {
        const resolutionTime = alert.resolution.resolvedAt.getTime() - alert.detectedAt.getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    return {
      period: { start: startDate, end: endDate },
      totalAlerts: alerts.length,
      alertsBySeverity,
      alertsByType,
      averageDriftScore: alerts.length > 0 ? totalScore / alerts.length : 0,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      topDriftedDomains: await this.getTopDriftedDomains(5, alerts),
      providerAccuracy: await this.calculateProviderAccuracy(alerts)
    };
  }

  /**
   * Get most drifted domains
   */
  async getMostDriftedDomains(limit: number): Promise<DomainDriftSummary[]> {
    const domainStats = new Map<string, any>();
    
    for (const alert of this.activeAlerts.values()) {
      const stats = domainStats.get(alert.domain) || {
        domain: alert.domain,
        totalAlerts: 0,
        totalScore: 0,
        types: new Map(),
        lastChecked: alert.detectedAt
      };
      
      stats.totalAlerts++;
      stats.totalScore += alert.score;
      stats.types.set(alert.type, (stats.types.get(alert.type) || 0) + 1);
      stats.lastChecked = alert.detectedAt > stats.lastChecked ? alert.detectedAt : stats.lastChecked;
      
      domainStats.set(alert.domain, stats);
    }

    const summaries: DomainDriftSummary[] = Array.from(domainStats.values())
      .map(stats => ({
        domain: stats.domain,
        totalAlerts: stats.totalAlerts,
        averageDriftScore: stats.totalScore / stats.totalAlerts,
        mostCommonDriftType: this.getMostCommonType(stats.types),
        lastChecked: stats.lastChecked,
        trend: 'stable' as const // Would calculate based on historical data
      }))
      .sort((a, b) => b.averageDriftScore - a.averageDriftScore)
      .slice(0, limit);

    return summaries;
  }

  /**
   * Stream alerts in real-time
   */
  streamAlerts(callback: (alert: DriftAlert) => void): void {
    this.streamCallbacks.add(callback);
    this.logger.debug('Added alert stream callback');
  }

  /**
   * Get engine status
   */
  async getEngineStatus(): Promise<EngineStatus> {
    const queuedChecks = this.monitoringQueue.size;
    const checksPerHour = this.calculateChecksPerHour();
    const alertsPerHour = this.calculateAlertsPerHour();

    return {
      running: this.checkInterval !== undefined,
      lastCheck: this.metrics.lastCheckTime,
      nextCheck: this.getNextCheckTime(),
      activeMonitors: this.config.domains.length,
      queuedChecks,
      recentErrors: this.metrics.errors.slice(-10),
      performance: {
        averageCheckTime: this.metrics.averageCheckTime,
        checksPerHour,
        alertsPerHour
      }
    };
  }

  /**
   * Fetch reality data from configured sources
   */
  private async fetchRealityData(domain: string): Promise<RealityData> {
    const facts: FactualData[] = [];
    const sources = this.config.realitySources.sort((a, b) => b.priority - a.priority);
    
    for (const source of sources) {
      try {
        const sourceData = await this.fetchFromSource(domain, source);
        facts.push(...sourceData);
      } catch (error) {
        this.logger.warn('Reality source fetch failed', { 
          domain, 
          source: source.type,
          error 
        });
      }
    }

    if (facts.length === 0) {
      throw new Error('No reality data available');
    }

    return {
      source: facts.length > 1 ? 'multiple_sources' : this.mapSourceType(facts[0].source),
      timestamp: new Date(),
      facts,
      confidence: this.calculateConfidence(facts),
      verificationMethod: 'multi-source-validation'
    };
  }

  /**
   * Fetch data from a specific source
   */
  private async fetchFromSource(domain: string, source: any): Promise<FactualData[]> {
    switch (source.type) {
      case 'official_website':
        return this.fetchFromWebsite(domain);
      case 'news_article':
        return this.fetchFromNews(domain);
      case 'api_data':
        return this.fetchFromAPI(domain, source);
      default:
        return [];
    }
  }

  /**
   * Fetch from official website
   */
  private async fetchFromWebsite(domain: string): Promise<FactualData[]> {
    // In production, implement web scraping
    // Mock implementation
    return [{
      category: 'company_info',
      fact: 'Current CEO: Example Person',
      source: 'official_website',
      sourceUrl: `https://${domain}`,
      extractedAt: new Date(),
      confidence: 0.9
    }];
  }

  /**
   * Fetch from news sources
   */
  private async fetchFromNews(domain: string): Promise<FactualData[]> {
    // In production, integrate with news APIs
    // Mock implementation
    return [{
      category: 'recent_news',
      fact: 'Announced new product launch',
      source: 'news_article',
      sourceUrl: 'https://example-news.com/article',
      extractedAt: new Date(),
      confidence: 0.8
    }];
  }

  /**
   * Fetch from API
   */
  private async fetchFromAPI(domain: string, source: any): Promise<FactualData[]> {
    if (!source.endpoint) return [];

    try {
      const response = await axios.get(source.endpoint, {
        headers: source.headers,
        params: { domain }
      });

      // Parse response based on API format
      return this.parseAPIResponse(response.data, domain);
    } catch (error) {
      this.logger.error('API fetch failed', { domain, error });
      return [];
    }
  }

  /**
   * Parse API response into facts
   */
  private parseAPIResponse(data: any, domain: string): FactualData[] {
    // Implementation depends on API format
    return [];
  }

  /**
   * Extract memory data from consensus
   */
  private extractMemoryData(consensus: any): MemoryData {
    const providerBeliefs = new Map<string, string>();
    const themes: string[] = consensus.aggregatedContent.keyThemes || [];

    consensus.providers.forEach((provider: any) => {
      if (provider.status === 'success' && provider.content) {
        providerBeliefs.set(provider.provider, provider.content);
      }
    });

    return {
      aggregatedBelief: consensus.aggregatedContent.summary,
      providerBeliefs,
      consensusLevel: consensus.consensusScore,
      extractedAt: new Date(consensus.timestamp),
      themes
    };
  }

  /**
   * Analyze drift between reality and memory
   */
  private async analyzeDrift(
    domain: string,
    realityData: RealityData,
    memoryData: MemoryData,
    providers: any[]
  ): Promise<any> {
    const providerDrifts: ProviderDrift[] = [];
    let totalDriftScore = 0;

    // Analyze each provider
    for (const provider of providers) {
      if (provider.status === 'success' && provider.content) {
        const drifts = this.detectSpecificDrifts(
          provider.content,
          realityData.facts
        );

        if (drifts.length > 0) {
          const providerDrift: ProviderDrift = {
            provider: provider.provider,
            model: provider.model,
            driftScore: this.calculateProviderDriftScore(drifts),
            specificDrifts: drifts,
            confidence: provider.confidence || 0.5
          };
          
          providerDrifts.push(providerDrift);
          totalDriftScore += providerDrift.driftScore;
        }
      }
    }

    const driftDetected = providerDrifts.length > 0;
    const averageDriftScore = driftDetected 
      ? totalDriftScore / providerDrifts.length 
      : 0;

    return {
      driftDetected,
      score: averageDriftScore,
      providerDrifts,
      driftType: this.determinePrimaryDriftType(providerDrifts),
      severity: this.calculateSeverity(averageDriftScore)
    };
  }

  /**
   * Detect specific drifts
   */
  private detectSpecificDrifts(
    llmContent: string,
    facts: FactualData[]
  ): SpecificDrift[] {
    const drifts: SpecificDrift[] = [];
    
    // Simple drift detection - in production use NLP
    facts.forEach(fact => {
      if (!llmContent.toLowerCase().includes(fact.fact.toLowerCase())) {
        drifts.push({
          type: this.categorizeDriftType(fact.category),
          description: `Missing fact: ${fact.category}`,
          llmBelief: 'Not mentioned',
          reality: fact.fact,
          evidence: [fact.sourceUrl || fact.source],
          severity: 'medium'
        });
      }
    });

    return drifts;
  }

  /**
   * Generate alert from drift analysis
   */
  private async generateAlert(
    domain: string,
    driftAnalysis: any,
    realityData: RealityData,
    memoryData: MemoryData
  ): Promise<DriftAlert | null> {
    // Check if similar alert already exists
    const existingAlert = this.findExistingAlert(domain, driftAnalysis.driftType);
    if (existingAlert && !this.shouldCreateNewAlert(existingAlert, driftAnalysis)) {
      return null;
    }

    const id = `drift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: DriftAlert = {
      id,
      domain,
      severity: driftAnalysis.severity,
      type: driftAnalysis.driftType,
      score: driftAnalysis.score,
      detectedAt: new Date(),
      affectedProviders: driftAnalysis.providerDrifts,
      realitySnapshot: realityData,
      memorySnapshot: memoryData,
      divergenceAnalysis: await this.createDivergenceAnalysis(
        domain,
        driftAnalysis,
        realityData,
        memoryData
      ),
      recommendedActions: this.generateRecommendedActions(
        driftAnalysis.driftType,
        driftAnalysis.severity
      ),
      status: 'active'
    };

    return alert;
  }

  /**
   * Create divergence analysis
   */
  private async createDivergenceAnalysis(
    domain: string,
    driftAnalysis: any,
    realityData: RealityData,
    memoryData: MemoryData
  ): Promise<DivergenceAnalysis> {
    return {
      primaryDivergence: this.identifyPrimaryDivergence(driftAnalysis),
      divergencePattern: this.identifyPattern(driftAnalysis, memoryData),
      timelineAnalysis: {
        firstDriftDetected: new Date(),
        driftVelocity: driftAnalysis.score / 100,
        projectedFullDrift: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      impactAssessment: this.assessImpact(domain, driftAnalysis),
      correlatedDrifts: await this.findCorrelatedDrifts(domain, driftAnalysis.driftType)
    };
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendedActions(
    driftType: DriftType,
    severity: DriftSeverity
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    // Universal actions
    actions.push({
      type: 'monitoring_increase',
      priority: 'medium',
      description: 'Increase monitoring frequency for this domain',
      automatable: true,
      estimatedTime: '5 minutes'
    });

    // Type-specific actions
    switch (driftType) {
      case 'temporal':
        actions.push({
          type: 'content_update',
          priority: severity === 'critical' ? 'urgent' : 'high',
          description: 'Publish updated content with current information',
          automatable: false,
          estimatedTime: '2-4 hours'
        });
        break;
      case 'factual':
        actions.push({
          type: 'api_correction',
          priority: 'urgent',
          description: 'Submit corrections to LLM providers via API',
          automatable: true,
          estimatedTime: '30 minutes'
        });
        break;
      case 'financial':
        actions.push({
          type: 'manual_intervention',
          priority: 'urgent',
          description: 'Review and update financial information immediately',
          automatable: false,
          estimatedTime: '1-2 hours'
        });
        break;
    }

    return actions;
  }

  /**
   * Process alert (send notifications, store, etc.)
   */
  private async processAlert(alert: DriftAlert) {
    // Store alert
    this.activeAlerts.set(alert.id, alert);
    await this.storeAlert(alert);
    
    // Send notifications
    await this.sendAlertNotifications(alert);
    
    // Stream to callbacks
    this.streamCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        this.logger.error('Stream callback error', { error });
      }
    });
    
    // Broadcast via WebSocket
    this.broadcastUpdate({
      type: 'drift:detected',
      data: alert,
      timestamp: new Date()
    });
    
    // Update metrics
    this.metrics.alertsGenerated++;
    
    this.logger.warn('Drift alert generated', {
      domain: alert.domain,
      type: alert.type,
      severity: alert.severity,
      score: alert.score
    });
  }

  /**
   * Send alert notifications to subscribers
   */
  private async sendAlertNotifications(alert: DriftAlert) {
    for (const [id, channel] of this.subscriptions) {
      if (this.shouldNotify(alert, channel)) {
        try {
          await this.sendNotification(alert, channel);
        } catch (error) {
          this.logger.error('Notification failed', { 
            subscriptionId: id,
            error 
          });
        }
      }
    }
  }

  /**
   * Check if should notify based on filters
   */
  private shouldNotify(alert: DriftAlert, channel: AlertChannel): boolean {
    if (channel.severityFilter && !channel.severityFilter.includes(alert.severity)) {
      return false;
    }
    
    if (channel.typeFilter && !channel.typeFilter.includes(alert.type)) {
      return false;
    }
    
    return true;
  }

  /**
   * Send notification via channel
   */
  private async sendNotification(alert: DriftAlert, channel: AlertChannel) {
    switch (channel.type) {
      case 'webhook':
        await this.sendWebhookNotification(alert, channel);
        break;
      case 'email':
        await this.sendEmailNotification(alert, channel);
        break;
      case 'slack':
        await this.sendSlackNotification(alert, channel);
        break;
      // Add other notification types
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: DriftAlert, channel: any) {
    await axios.post(channel.config.url, {
      alert,
      timestamp: new Date().toISOString()
    }, {
      headers: channel.config.headers || {}
    });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: DriftAlert, channel: any) {
    // In production, integrate with email service
    this.logger.info('Would send email notification', {
      to: channel.config.to,
      subject: `Drift Alert: ${alert.domain} - ${alert.severity}`
    });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: DriftAlert, channel: any) {
    // In production, integrate with Slack API
    const message = {
      text: `🚨 Memory Drift Alert`,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Domain', value: alert.domain, short: true },
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Type', value: alert.type, short: true },
          { title: 'Score', value: `${alert.score}/100`, short: true },
          { title: 'Affected Providers', value: alert.affectedProviders.length.toString(), short: true }
        ]
      }]
    };
    
    // await slackClient.post(channel.config.webhook, message);
  }

  /**
   * Helper methods
   */

  private startMonitoring() {
    this.checkInterval = setInterval(() => {
      this.performScheduledChecks();
    }, this.config.checkInterval);
    
    this.logger.info('Monitoring started', {
      interval: this.config.checkInterval
    });
  }

  private stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    
    this.logger.info('Monitoring stopped');
  }

  private async performScheduledChecks() {
    const now = Date.now();
    
    for (const domainConfig of this.config.domains) {
      // Check if due for checking
      const checkFrequency = domainConfig.checkFrequency || this.config.checkInterval;
      const shouldCheck = !this.monitoringQueue.has(domainConfig.domain);
      
      if (shouldCheck) {
        this.monitoringQueue.add(domainConfig.domain);
        
        // Perform check asynchronously
        this.checkDomain(domainConfig.domain)
          .finally(() => {
            this.monitoringQueue.delete(domainConfig.domain);
          });
      }
    }
    
    this.metrics.lastCheckTime = new Date();
  }

  private async loadActiveAlerts() {
    try {
      const keys = await this.redis.keys('drift:alert:*');
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const alert = JSON.parse(data);
          // Restore Date objects
          alert.detectedAt = new Date(alert.detectedAt);
          this.activeAlerts.set(alert.id, alert);
        }
      }
      
      this.logger.info('Loaded active alerts', { count: this.activeAlerts.size });
    } catch (error) {
      this.logger.error('Failed to load active alerts', { error });
    }
  }

  private async storeAlert(alert: DriftAlert) {
    const key = `drift:alert:${alert.id}`;
    await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(alert)); // 7 days TTL
  }

  private async updateAlert(alert: DriftAlert) {
    await this.storeAlert(alert);
    
    // Broadcast update
    this.broadcastUpdate({
      type: 'drift:updated',
      data: alert,
      timestamp: new Date()
    });
  }

  private processDetectedDrift(consensusResponse: any) {
    // Process drift detected by consensus engine
    const domain = consensusResponse.domain;
    this.checkDomain(domain);
  }

  private updateMetrics(result: DriftCheckResult) {
    this.metrics.checksPerformed++;
    
    const checkTime = result.performanceMetrics.checkDuration;
    this.metrics.averageCheckTime = 
      (this.metrics.averageCheckTime * (this.metrics.checksPerformed - 1) + checkTime) / 
      this.metrics.checksPerformed;
  }

  private calculateConfidence(facts: FactualData[]): number {
    if (facts.length === 0) return 0;
    const avgConfidence = facts.reduce((sum, f) => sum + f.confidence, 0) / facts.length;
    const sourceDiversity = new Set(facts.map(f => f.source)).size / facts.length;
    return avgConfidence * (0.7 + 0.3 * sourceDiversity);
  }

  private mapSourceType(source: string): RealitySource {
    // Map string to RealitySource type
    return source as RealitySource;
  }

  private calculateProviderDriftScore(drifts: SpecificDrift[]): number {
    if (drifts.length === 0) return 0;
    
    const severityScores = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 100
    };
    
    const totalScore = drifts.reduce((sum, drift) => 
      sum + severityScores[drift.severity], 0
    );
    
    return Math.min(100, totalScore / drifts.length);
  }

  private determinePrimaryDriftType(providerDrifts: ProviderDrift[]): DriftType {
    const typeCounts = new Map<DriftType, number>();
    
    providerDrifts.forEach(pd => {
      pd.specificDrifts.forEach(drift => {
        typeCounts.set(drift.type, (typeCounts.get(drift.type) || 0) + 1);
      });
    });
    
    let maxType: DriftType = 'temporal';
    let maxCount = 0;
    
    typeCounts.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    });
    
    return maxType;
  }

  private calculateSeverity(score: number): DriftSeverity {
    if (score >= this.config.thresholds.critical) return 'critical';
    if (score >= this.config.thresholds.high) return 'high';
    if (score >= this.config.thresholds.medium) return 'medium';
    return 'low';
  }

  private categorizeDriftType(category: string): DriftType {
    const categoryMap: Record<string, DriftType> = {
      'company_info': 'factual',
      'financial': 'financial',
      'product': 'product',
      'personnel': 'personnel',
      'recent_news': 'temporal'
    };
    
    return categoryMap[category] || 'factual';
  }

  private findExistingAlert(domain: string, type: DriftType): DriftAlert | undefined {
    return Array.from(this.activeAlerts.values()).find(
      alert => alert.domain === domain && 
               alert.type === type && 
               alert.status === 'active'
    );
  }

  private shouldCreateNewAlert(existing: DriftAlert, analysis: any): boolean {
    // Create new alert if score increased significantly
    return analysis.score > existing.score * 1.5;
  }

  private identifyPrimaryDivergence(analysis: any): string {
    return `${analysis.driftType} drift detected across ${analysis.providerDrifts.length} providers`;
  }

  private identifyPattern(analysis: any, memory: MemoryData): any {
    if (memory.consensusLevel < 50) return 'conflicting';
    if (analysis.providerDrifts.length === memory.providerBeliefs.size) return 'complete_miss';
    if (analysis.providerDrifts.length > memory.providerBeliefs.size / 2) return 'partial_update';
    return 'gradual_decay';
  }

  private assessImpact(domain: string, analysis: any): any {
    // Simplified impact assessment
    const severity = analysis.severity;
    const impactMap = {
      low: { business: 'low', reputation: 20, financial: 10, legal: 5 },
      medium: { business: 'medium', reputation: 40, financial: 30, legal: 20 },
      high: { business: 'high', reputation: 70, financial: 60, legal: 40 },
      critical: { business: 'critical', reputation: 90, financial: 80, legal: 70 }
    };
    
    return {
      businessImpact: impactMap[severity].business,
      affectedQueries: Math.floor(Math.random() * 10000),
      reputationRisk: impactMap[severity].reputation,
      financialRisk: impactMap[severity].financial,
      legalRisk: impactMap[severity].legal
    };
  }

  private async findCorrelatedDrifts(domain: string, type: DriftType): Promise<string[]> {
    const correlated: string[] = [];
    
    for (const alert of this.activeAlerts.values()) {
      if (alert.domain !== domain && alert.type === type) {
        correlated.push(alert.domain);
      }
    }
    
    return correlated.slice(0, 5);
  }

  private async getTopDriftedDomains(limit: number, alerts: DriftAlert[]): Promise<DomainDriftSummary[]> {
    const domainMap = new Map<string, any>();
    
    alerts.forEach(alert => {
      const stats = domainMap.get(alert.domain) || {
        domain: alert.domain,
        totalAlerts: 0,
        totalScore: 0,
        types: new Map()
      };
      
      stats.totalAlerts++;
      stats.totalScore += alert.score;
      stats.types.set(alert.type, (stats.types.get(alert.type) || 0) + 1);
      
      domainMap.set(alert.domain, stats);
    });
    
    return Array.from(domainMap.values())
      .map(stats => ({
        domain: stats.domain,
        totalAlerts: stats.totalAlerts,
        averageDriftScore: stats.totalScore / stats.totalAlerts,
        mostCommonDriftType: this.getMostCommonType(stats.types),
        lastChecked: new Date(),
        trend: 'stable' as const
      }))
      .sort((a, b) => b.totalAlerts - a.totalAlerts)
      .slice(0, limit);
  }

  private async calculateProviderAccuracy(alerts: DriftAlert[]): Promise<Record<string, number>> {
    const providerStats = new Map<string, { total: number; correct: number }>();
    
    alerts.forEach(alert => {
      alert.affectedProviders.forEach(provider => {
        const stats = providerStats.get(provider.provider) || { total: 0, correct: 0 };
        stats.total++;
        stats.correct += (100 - provider.driftScore) / 100;
        providerStats.set(provider.provider, stats);
      });
    });
    
    const accuracy: Record<string, number> = {};
    providerStats.forEach((stats, provider) => {
      accuracy[provider] = (stats.correct / stats.total) * 100;
    });
    
    return accuracy;
  }

  private getMostCommonType(types: Map<DriftType, number>): DriftType {
    let maxType: DriftType = 'temporal';
    let maxCount = 0;
    
    types.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    });
    
    return maxType;
  }

  private calculateChecksPerHour(): number {
    if (this.config.checkInterval === 0) return 0;
    return (60 * 60 * 1000) / this.config.checkInterval * this.config.domains.length;
  }

  private calculateAlertsPerHour(): number {
    // Simple calculation based on recent metrics
    return this.metrics.alertsGenerated / Math.max(1, this.metrics.checksPerformed) * this.calculateChecksPerHour();
  }

  private getNextCheckTime(): Date {
    if (!this.config.enabled || !this.checkInterval) {
      return new Date(0); // Never
    }
    
    return new Date(this.metrics.lastCheckTime.getTime() + this.config.checkInterval);
  }

  private getSeverityColor(severity: DriftSeverity): string {
    const colors = {
      low: '#2196F3',
      medium: '#FF9800',
      high: '#F44336',
      critical: '#B71C1C'
    };
    
    return colors[severity];
  }

  private broadcastUpdate(message: any) {
    // Emit local event
    this.emit('update', message);
    
    // Publish to Redis for distributed systems
    this.redis.publish('drift:updates', JSON.stringify(message));
  }

  private handleRedisMessage(channel: string, message: string) {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'drift:detected':
          // Handle distributed drift detection
          this.emit('distributed:drift', data);
          break;
        case 'consensus:generated':
          // Check for drift in consensus results
          if (data.memoryDrift?.detected) {
            this.processDetectedDrift(data);
          }
          break;
      }
    } catch (error) {
      this.logger.error('Failed to handle Redis message', { channel, error });
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Memory Drift Alert Engine');
    
    // Stop monitoring
    this.stopMonitoring();
    
    // Save state
    for (const alert of this.activeAlerts.values()) {
      await this.storeAlert(alert);
    }
    
    // Close Redis connection
    await this.redis.quit();
    
    // Clear callbacks
    this.streamCallbacks.clear();
    this.removeAllListeners();
    
    this.logger.info('Memory Drift Alert Engine shutdown complete');
  }
}