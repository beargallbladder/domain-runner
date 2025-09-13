/**
 * AI Zeitgeist Tracker Engine
 * Tracks and analyzes trending topics across LLM consciousness
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Logger } from '../../utils/logger';
import {
  ZeitgeistEngine,
  ZeitgeistTrend,
  ZeitgeistSnapshot,
  ZeitgeistQuery,
  EmergingTopic,
  ZeitgeistAlert,
  ZeitgeistSubscription,
  TrendPrediction,
  DivergenceMetric,
  TrendHistory,
  EngineMetrics,
  ZeitgeistConfig,
  TrendCategory,
  AlertType,
  TimeSeriesPoint,
  KeywordFrequency,
  DomainMention
} from './interfaces';
import { IDatabaseService } from '../database/interfaces';
import { LLMConsensusEngine } from '../consensus-api/consensus-engine';

export class AIZeitgeistEngine extends EventEmitter implements ZeitgeistEngine {
  private redis: Redis;
  private logger: Logger;
  private config: ZeitgeistConfig;
  private database: IDatabaseService;
  private consensusEngine: LLMConsensusEngine;
  
  // State management
  private trends: Map<string, ZeitgeistTrend>;
  private subscriptions: Map<string, ZeitgeistSubscription>;
  private processingQueue: Set<string>;
  private updateInterval?: NodeJS.Timeout;
  private streamCallbacks: Set<(trend: ZeitgeistTrend) => void>;
  
  // Metrics
  private metrics = {
    trendsDetected: 0,
    alertsGenerated: 0,
    lastUpdateTime: 0,
    averageProcessingTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  constructor(
    consensusEngine: LLMConsensusEngine,
    database: IDatabaseService,
    logger: Logger,
    config: ZeitgeistConfig,
    redisConfig?: any
  ) {
    super();
    this.consensusEngine = consensusEngine;
    this.database = database;
    this.logger = logger.child('zeitgeist-engine');
    this.config = config;
    this.redis = new Redis(redisConfig || { host: 'localhost', port: 6379 });
    
    this.trends = new Map();
    this.subscriptions = new Map();
    this.processingQueue = new Set();
    this.streamCallbacks = new Set();
    
    this.initialize();
  }

  private async initialize() {
    // Set up Redis pub/sub
    const subscriber = this.redis.duplicate();
    subscriber.subscribe('zeitgeist:update', 'consensus:generated');
    
    subscriber.on('message', (channel, message) => {
      this.handleRedisMessage(channel, message);
    });

    // Listen to consensus engine events
    this.consensusEngine.on('consensus:generated', (response) => {
      this.processConsensusResponse(response);
    });

    // Start update cycle
    if (this.config.updateInterval > 0) {
      this.updateInterval = setInterval(() => {
        this.performUpdate();
      }, this.config.updateInterval);
    }

    // Load existing trends from cache
    await this.loadTrendsFromCache();

    this.logger.info('AI Zeitgeist Engine initialized', {
      updateInterval: this.config.updateInterval,
      providers: this.config.providers.length
    });
  }

  /**
   * Get current zeitgeist snapshot
   */
  async getCurrentZeitgeist(): Promise<ZeitgeistSnapshot> {
    const allTrends = Array.from(this.trends.values());
    const now = new Date();
    
    // Filter active trends
    const activeTrends = allTrends.filter(t => 
      t.lastUpdated > new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );

    // Separate rising and declining
    const risingTrends = activeTrends
      .filter(t => t.momentum > 0)
      .sort((a, b) => b.momentum - a.momentum)
      .slice(0, 20);

    const decliningTrends = activeTrends
      .filter(t => t.momentum < 0)
      .sort((a, b) => a.momentum - b.momentum)
      .slice(0, 10);

    // Identify emerging topics
    const emergingTopics = await this.identifyEmergingTopics(activeTrends);

    // Extract dominant themes
    const dominantThemes = this.extractDominantThemes(activeTrends);

    // Calculate LLM divergence
    const divergence = await this.calculateGlobalDivergence(activeTrends);

    // Calculate global sentiment
    const globalSentiment = this.calculateGlobalSentiment(activeTrends);

    return {
      timestamp: now,
      totalTrends: activeTrends.length,
      risingTrends,
      decliningTrends,
      emergingTopics,
      dominantThemes,
      llmDivergence: divergence,
      globalSentiment
    };
  }

  /**
   * Get trends based on query
   */
  async getTrends(query: ZeitgeistQuery): Promise<ZeitgeistTrend[]> {
    let trends = Array.from(this.trends.values());

    // Apply time range filter
    if (query.timeRange) {
      const cutoff = this.getTimeRangeCutoff(query.timeRange);
      trends = trends.filter(t => t.lastUpdated > cutoff);
    }

    // Apply category filter
    if (query.categories && query.categories.length > 0) {
      trends = trends.filter(t => query.categories!.includes(t.category));
    }

    // Apply momentum filter
    if (query.minMomentum !== undefined) {
      trends = trends.filter(t => Math.abs(t.momentum) >= query.minMomentum);
    }

    // Apply sentiment filter
    if (query.sentiment && query.sentiment !== 'all') {
      trends = trends.filter(t => {
        if (query.sentiment === 'positive') return t.sentiment > 0.3;
        if (query.sentiment === 'negative') return t.sentiment < -0.3;
        return t.sentiment >= -0.3 && t.sentiment <= 0.3;
      });
    }

    // Apply keyword filter
    if (query.keywords && query.keywords.length > 0) {
      trends = trends.filter(t => 
        query.keywords!.some(keyword => 
          t.topic.toLowerCase().includes(keyword.toLowerCase()) ||
          t.keywords.some(k => k.keyword.toLowerCase().includes(keyword.toLowerCase()))
        )
      );
    }

    // Sort by momentum (descending)
    trends.sort((a, b) => Math.abs(b.momentum) - Math.abs(a.momentum));

    // Apply limit
    if (query.limit) {
      trends = trends.slice(0, query.limit);
    }

    // Add visualization data if requested
    if (query.includeVisualization) {
      trends = await Promise.all(trends.map(async t => ({
        ...t,
        visualizationData: await this.generateVisualizationData(t)
      })));
    }

    return trends;
  }

  /**
   * Get trend by ID
   */
  async getTrendById(id: string): Promise<ZeitgeistTrend | null> {
    return this.trends.get(id) || null;
  }

  /**
   * Get emerging topics
   */
  async getEmergingTopics(limit: number = 10): Promise<EmergingTopic[]> {
    const trends = Array.from(this.trends.values());
    const emerging = await this.identifyEmergingTopics(trends);
    return emerging.slice(0, limit);
  }

  /**
   * Stream trends in real-time
   */
  streamTrends(callback: (trend: ZeitgeistTrend) => void): void {
    this.streamCallbacks.add(callback);
    this.logger.debug('Added trend stream callback');
  }

  /**
   * Subscribe to alerts
   */
  async subscribeToAlerts(subscription: ZeitgeistSubscription): Promise<string> {
    const id = subscription.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    subscription.id = id;
    
    this.subscriptions.set(id, subscription);
    
    // Store in Redis for persistence
    await this.redis.hset(
      'zeitgeist:subscriptions',
      id,
      JSON.stringify(subscription)
    );

    this.logger.info('Created alert subscription', { id });
    
    return id;
  }

  /**
   * Unsubscribe from alerts
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
    await this.redis.hdel('zeitgeist:subscriptions', subscriptionId);
    
    this.logger.info('Removed subscription', { subscriptionId });
  }

  /**
   * Analyze trend trajectory
   */
  async analyzeTrendTrajectory(trendId: string): Promise<TrendPrediction> {
    const trend = this.trends.get(trendId);
    if (!trend) {
      throw new Error('Trend not found');
    }

    // Get historical data
    const history = await this.getTrendHistory(trend.topic);
    
    // Simple prediction model (in production, use ML)
    const currentMomentum = trend.momentum;
    const velocity = trend.velocity;
    
    // Predict peak based on velocity and historical patterns
    const daysToTrend = history.averageDuration / 24;
    const timeSinceStart = (Date.now() - trend.firstDetected.getTime()) / (1000 * 60 * 60 * 24);
    const remainingDays = Math.max(1, daysToTrend - timeSinceStart);
    
    const predictedPeak = new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000);
    const peakValue = currentMomentum + (velocity * remainingDays * 0.5); // Decay factor
    
    // Calculate confidence based on data quality
    const dataPoints = trend.visualizationData?.timeSeries.length || 0;
    const confidence = Math.min(0.95, 0.5 + (dataPoints / 100) * 0.45);

    // Identify factors
    const factors = this.identifyTrendFactors(trend, history);

    // Generate recommendations
    const recommendations = this.generateTrendRecommendations(trend, currentMomentum, velocity);

    return {
      trendId,
      currentMomentum,
      predictedPeak,
      peakValue: Math.min(100, Math.max(-100, peakValue)),
      confidence,
      factors,
      recommendations
    };
  }

  /**
   * Compare provider perspectives on a topic
   */
  async compareProviderPerspectives(topic: string): Promise<DivergenceMetric> {
    // Find all trends related to this topic
    const relatedTrends = Array.from(this.trends.values()).filter(t =>
      t.topic.toLowerCase().includes(topic.toLowerCase())
    );

    if (relatedTrends.length === 0) {
      throw new Error('No trends found for topic');
    }

    // Aggregate provider perspectives
    const providers: DivergenceMetric['providers'] = {};
    
    // Get consensus data for the topic
    const consensusData = await this.consensusEngine.getConsensus({
      domain: topic,
      includeMetadata: true
    });

    // Analyze each provider's perspective
    consensusData.providers.forEach(provider => {
      if (provider.status === 'success' && provider.content) {
        providers[provider.provider] = {
          sentiment: provider.sentiment || 0,
          emphasis: this.calculateEmphasis(provider.content, topic),
          perspective: this.extractPerspective(provider.content)
        };
      }
    });

    // Calculate divergence score
    const sentiments = Object.values(providers).map(p => p.sentiment);
    const divergenceScore = this.calculateDivergenceScore(sentiments);

    return {
      topic,
      providers,
      divergenceScore
    };
  }

  /**
   * Get historical trends for a topic
   */
  async getHistoricalTrends(topic: string, days: number): Promise<TrendHistory> {
    const history = await this.getTrendHistory(topic, days);
    return history;
  }

  /**
   * Force refresh of zeitgeist data
   */
  async forceRefresh(): Promise<void> {
    this.logger.info('Forcing zeitgeist refresh');
    await this.performUpdate();
  }

  /**
   * Get engine metrics
   */
  async getEngineMetrics(): Promise<EngineMetrics> {
    const hitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0
      ? this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)
      : 0;

    return {
      activeTrackings: this.trends.size,
      trendsPerHour: this.calculateTrendsPerHour(),
      averageProcessingTime: this.metrics.averageProcessingTime,
      cacheHitRate: hitRate,
      subscriptionCount: this.subscriptions.size,
      alertsGenerated: this.metrics.alertsGenerated,
      lastUpdate: new Date(this.metrics.lastUpdateTime)
    };
  }

  /**
   * Process consensus response to extract trends
   */
  private async processConsensusResponse(response: any) {
    try {
      // Extract topics and keywords from response
      const extraction = this.extractTopicsFromConsensus(response);
      
      for (const topic of extraction.topics) {
        // Check if trend exists
        let trend = this.findOrCreateTrend(topic.name, topic.category);
        
        // Update trend metrics
        trend.volume += 1;
        trend.lastUpdated = new Date();
        
        // Update sentiment
        const sentimentDelta = response.aggregatedContent.sentiment.overall;
        trend.sentiment = (trend.sentiment * 0.7) + (sentimentDelta * 0.3);
        
        // Update momentum and velocity
        const oldMomentum = trend.momentum;
        trend.momentum = this.calculateMomentum(trend);
        trend.velocity = trend.momentum - oldMomentum;
        
        // Update domain mentions
        this.updateDomainMentions(trend, response.domain, sentimentDelta);
        
        // Update keywords
        this.updateKeywords(trend, topic.keywords);
        
        // Check for alerts
        await this.checkForAlerts(trend, oldMomentum);
        
        // Emit update
        this.emitTrendUpdate(trend);
      }
    } catch (error) {
      this.logger.error('Failed to process consensus response', { error });
    }
  }

  /**
   * Extract topics from consensus response
   */
  private extractTopicsFromConsensus(response: any): { topics: any[] } {
    const topics: any[] = [];
    
    // Extract from key themes
    if (response.aggregatedContent.keyThemes) {
      response.aggregatedContent.keyThemes.forEach((theme: string) => {
        topics.push({
          name: theme,
          category: this.categorizeTheme(theme),
          keywords: [theme]
        });
      });
    }

    // Extract from technical capabilities
    if (response.aggregatedContent.technicalCapabilities) {
      response.aggregatedContent.technicalCapabilities.forEach((capability: string) => {
        topics.push({
          name: capability,
          category: 'technology' as TrendCategory,
          keywords: [capability]
        });
      });
    }

    return { topics };
  }

  /**
   * Find or create trend
   */
  private findOrCreateTrend(topic: string, category: TrendCategory): ZeitgeistTrend {
    // Check existing trends
    for (const [id, trend] of this.trends) {
      if (trend.topic.toLowerCase() === topic.toLowerCase()) {
        return trend;
      }
    }

    // Create new trend
    const id = `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const trend: ZeitgeistTrend = {
      id,
      topic,
      category,
      momentum: 0,
      velocity: 0,
      volume: 0,
      sentiment: 0,
      firstDetected: new Date(),
      lastUpdated: new Date(),
      domains: [],
      keywords: [],
      llmConsensus: 'weak'
    };

    this.trends.set(id, trend);
    this.metrics.trendsDetected++;
    
    return trend;
  }

  /**
   * Calculate momentum for a trend
   */
  private calculateMomentum(trend: ZeitgeistTrend): number {
    const hoursSinceStart = (Date.now() - trend.firstDetected.getTime()) / (1000 * 60 * 60);
    const volumeFactor = Math.log10(trend.volume + 1) * 10;
    const recencyFactor = Math.exp(-hoursSinceStart / 168); // Decay over a week
    const sentimentFactor = (trend.sentiment + 1) / 2; // Normalize to 0-1
    
    const momentum = volumeFactor * recencyFactor * sentimentFactor * 20;
    
    return Math.min(100, Math.max(-100, momentum));
  }

  /**
   * Update domain mentions
   */
  private updateDomainMentions(
    trend: ZeitgeistTrend,
    domain: string,
    sentiment: number
  ) {
    const existing = trend.domains.find(d => d.domain === domain);
    
    if (existing) {
      existing.frequency++;
      existing.sentiment = (existing.sentiment * 0.8) + (sentiment * 0.2);
    } else {
      trend.domains.push({
        domain,
        frequency: 1,
        sentiment,
        context: []
      });
    }

    // Keep top 10 domains
    trend.domains.sort((a, b) => b.frequency - a.frequency);
    trend.domains = trend.domains.slice(0, 10);
  }

  /**
   * Update keywords
   */
  private updateKeywords(trend: ZeitgeistTrend, keywords: string[]) {
    keywords.forEach(keyword => {
      const existing = trend.keywords.find(k => k.keyword === keyword);
      
      if (existing) {
        existing.count++;
        existing.growth = ((existing.count - 1) / 1) * 100; // Simple growth
      } else {
        trend.keywords.push({
          keyword,
          count: 1,
          growth: 0,
          associations: []
        });
      }
    });

    // Keep top 20 keywords
    trend.keywords.sort((a, b) => b.count - a.count);
    trend.keywords = trend.keywords.slice(0, 20);
  }

  /**
   * Check for alerts
   */
  private async checkForAlerts(trend: ZeitgeistTrend, oldMomentum: number) {
    const alerts: ZeitgeistAlert[] = [];

    // Rapid rise
    if (trend.velocity > this.config.alertThresholds.rapidRise) {
      alerts.push(this.createAlert('rapid_rise', trend, 'high'));
    }

    // Sentiment flip
    if (Math.sign(trend.sentiment) !== Math.sign(oldMomentum)) {
      alerts.push(this.createAlert('sentiment_flip', trend, 'medium'));
    }

    // Volume spike
    if (trend.volume > this.config.trendThreshold * this.config.alertThresholds.volumeSpike) {
      alerts.push(this.createAlert('volume_spike', trend, 'medium'));
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  /**
   * Create alert
   */
  private createAlert(
    type: AlertType,
    trend: ZeitgeistTrend,
    severity: ZeitgeistAlert['severity']
  ): ZeitgeistAlert {
    const messages: Record<AlertType, string> = {
      rapid_rise: `Trend "${trend.topic}" is rising rapidly with ${trend.velocity.toFixed(1)}% velocity`,
      consensus_shift: `LLMs changing opinion on "${trend.topic}"`,
      divergence: `High divergence detected for "${trend.topic}"`,
      sentiment_flip: `Sentiment reversed for "${trend.topic}"`,
      volume_spike: `Unusual activity detected for "${trend.topic}"`,
      new_emergence: `New trend emerged: "${trend.topic}"`,
      trend_reversal: `Trend reversal detected for "${trend.topic}"`
    };

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      trend,
      message: messages[type],
      detectedAt: new Date()
    };
  }

  /**
   * Send alert to subscribers
   */
  private async sendAlert(alert: ZeitgeistAlert) {
    this.metrics.alertsGenerated++;
    
    // Emit event
    this.emit('alert:generated', alert);
    
    // Check subscriptions
    for (const subscription of this.subscriptions.values()) {
      if (this.alertMatchesSubscription(alert, subscription)) {
        // Send via webhook or email
        if (subscription.webhookUrl) {
          // In production, send HTTP request
          this.logger.info('Would send webhook', {
            url: subscription.webhookUrl,
            alert: alert.id
          });
        }
      }
    }
  }

  /**
   * Check if alert matches subscription
   */
  private alertMatchesSubscription(
    alert: ZeitgeistAlert,
    subscription: ZeitgeistSubscription
  ): boolean {
    // Check alert type
    if (!subscription.alertTypes.includes(alert.type)) {
      return false;
    }

    // Check filters
    if (subscription.filters.categories && 
        !subscription.filters.categories.includes(alert.trend.category)) {
      return false;
    }

    return true;
  }

  /**
   * Emit trend update
   */
  private emitTrendUpdate(trend: ZeitgeistTrend) {
    // Emit event
    this.emit('trend:update', trend);
    
    // Notify stream callbacks
    this.streamCallbacks.forEach(callback => {
      try {
        callback(trend);
      } catch (error) {
        this.logger.error('Stream callback error', { error });
      }
    });
    
    // Publish to Redis
    this.redis.publish('zeitgeist:update', JSON.stringify({
      type: 'trend:update',
      trend,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Perform periodic update
   */
  private async performUpdate() {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Starting zeitgeist update');
      
      // Get sample of domains to analyze
      const domains = await this.getDomainsToAnalyze();
      
      // Process domains in batches
      const batchSize = 10;
      for (let i = 0; i < domains.length; i += batchSize) {
        const batch = domains.slice(i, i + batchSize);
        await Promise.all(batch.map(domain => 
          this.consensusEngine.getConsensus({ domain })
        ));
      }
      
      // Clean old trends
      this.cleanOldTrends();
      
      // Update metrics
      const processingTime = Date.now() - startTime;
      this.metrics.lastUpdateTime = Date.now();
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * 0.9) + (processingTime * 0.1);
      
      // Save to cache
      await this.saveTrendsToCache();
      
      this.logger.debug('Zeitgeist update complete', {
        processingTime,
        trendsActive: this.trends.size
      });
    } catch (error) {
      this.logger.error('Zeitgeist update failed', { error });
    }
  }

  /**
   * Get domains to analyze for trends
   */
  private async getDomainsToAnalyze(): Promise<string[]> {
    // In production, this would query database for trending domains
    // For now, return sample domains
    return [
      'openai.com',
      'anthropic.com',
      'google.com',
      'microsoft.com',
      'meta.com',
      'x.ai',
      'mistral.ai',
      'perplexity.ai',
      'deepmind.com',
      'nvidia.com'
    ];
  }

  /**
   * Clean old trends
   */
  private cleanOldTrends() {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [id, trend] of this.trends) {
      if (trend.lastUpdated.getTime() < cutoff && Math.abs(trend.momentum) < 10) {
        this.trends.delete(id);
      }
    }
  }

  /**
   * Load trends from cache
   */
  private async loadTrendsFromCache() {
    try {
      const keys = await this.redis.keys('zeitgeist:trend:*');
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const trend = JSON.parse(data);
          trend.firstDetected = new Date(trend.firstDetected);
          trend.lastUpdated = new Date(trend.lastUpdated);
          if (trend.peakTime) trend.peakTime = new Date(trend.peakTime);
          
          this.trends.set(trend.id, trend);
        }
      }
      
      this.logger.info('Loaded trends from cache', { count: this.trends.size });
    } catch (error) {
      this.logger.error('Failed to load trends from cache', { error });
    }
  }

  /**
   * Save trends to cache
   */
  private async saveTrendsToCache() {
    const pipeline = this.redis.pipeline();
    
    for (const [id, trend] of this.trends) {
      pipeline.setex(
        `zeitgeist:trend:${id}`,
        this.config.cacheTTL,
        JSON.stringify(trend)
      );
    }
    
    await pipeline.exec();
  }

  /**
   * Helper methods
   */
  
  private getTimeRangeCutoff(range: string): Date {
    const now = Date.now();
    const ranges: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };
    
    return new Date(now - (ranges[range] || 0));
  }

  private async identifyEmergingTopics(trends: ZeitgeistTrend[]): Promise<EmergingTopic[]> {
    const emerging: EmergingTopic[] = [];
    const cutoff = Date.now() - this.config.emergenceWindow * 60 * 60 * 1000;
    
    for (const trend of trends) {
      if (trend.firstDetected.getTime() > cutoff && trend.momentum > 20) {
        emerging.push({
          topic: trend.topic,
          firstMention: trend.firstDetected,
          growthRate: trend.velocity,
          relatedTrends: this.findRelatedTrends(trend, trends),
          earlyAdopters: this.getEarlyAdopters(trend)
        });
      }
    }
    
    return emerging.sort((a, b) => b.growthRate - a.growthRate);
  }

  private extractDominantThemes(trends: ZeitgeistTrend[]): string[] {
    const themes = new Map<string, number>();
    
    trends.forEach(trend => {
      trend.keywords.forEach(kw => {
        themes.set(kw.keyword, (themes.get(kw.keyword) || 0) + kw.count);
      });
    });
    
    return Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme]) => theme);
  }

  private async calculateGlobalDivergence(trends: ZeitgeistTrend[]): Promise<DivergenceMetric[]> {
    const divergenceMetrics: DivergenceMetric[] = [];
    
    // Sample top trends for divergence analysis
    const topTrends = trends
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
    
    for (const trend of topTrends) {
      try {
        const divergence = await this.compareProviderPerspectives(trend.topic);
        divergenceMetrics.push(divergence);
      } catch (error) {
        // Skip if analysis fails
      }
    }
    
    return divergenceMetrics;
  }

  private calculateGlobalSentiment(trends: ZeitgeistTrend[]): any {
    const sentiments = trends.map(t => t.sentiment);
    const overall = sentiments.length > 0 
      ? sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length 
      : 0;
    
    const byCategory: any = {};
    const categories: TrendCategory[] = [
      'technology', 'company', 'product', 'person', 
      'event', 'concept', 'controversy', 'innovation', 'market_shift'
    ];
    
    categories.forEach(category => {
      const catTrends = trends.filter(t => t.category === category);
      if (catTrends.length > 0) {
        byCategory[category] = catTrends.reduce((sum, t) => sum + t.sentiment, 0) / catTrends.length;
      }
    });
    
    // Calculate volatility
    const variance = sentiments.length > 1
      ? sentiments.reduce((sum, s) => sum + Math.pow(s - overall, 2), 0) / sentiments.length
      : 0;
    const volatility = Math.sqrt(variance);
    
    return {
      overall,
      byCategory,
      byProvider: {}, // Would be populated with real provider data
      volatility
    };
  }

  private categorizeTheme(theme: string): TrendCategory {
    const lowerTheme = theme.toLowerCase();
    
    if (['api', 'sdk', 'platform', 'cloud', 'ai', 'ml'].some(t => lowerTheme.includes(t))) {
      return 'technology';
    }
    if (['inc', 'corp', 'company', '.com'].some(t => lowerTheme.includes(t))) {
      return 'company';
    }
    if (['launch', 'release', 'announce'].some(t => lowerTheme.includes(t))) {
      return 'event';
    }
    
    return 'concept';
  }

  private calculateEmphasis(content: string, topic: string): number {
    const contentLower = content.toLowerCase();
    const topicLower = topic.toLowerCase();
    const mentions = (contentLower.match(new RegExp(topicLower, 'g')) || []).length;
    const totalWords = content.split(/\s+/).length;
    
    return Math.min(1, mentions / (totalWords / 100));
  }

  private extractPerspective(content: string): string {
    // Simple extraction - in production use NLP
    const sentences = content.split(/[.!?]+/);
    return sentences[0]?.trim().substring(0, 100) + '...' || 'No perspective available';
  }

  private calculateDivergenceScore(sentiments: number[]): number {
    if (sentiments.length < 2) return 0;
    
    const mean = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
    const variance = sentiments.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / sentiments.length;
    
    return Math.min(100, variance * 100);
  }

  private async generateVisualizationData(trend: ZeitgeistTrend): Promise<any> {
    // Generate time series data
    const timeSeries: TimeSeriesPoint[] = [];
    const now = Date.now();
    const points = 24; // 24 hour points
    
    for (let i = 0; i < points; i++) {
      timeSeries.push({
        timestamp: new Date(now - (points - i) * 60 * 60 * 1000),
        value: trend.momentum * (0.5 + Math.random() * 0.5), // Simulated variation
        volume: Math.floor(trend.volume * (0.5 + Math.random() * 0.5))
      });
    }
    
    return { timeSeries };
  }

  private async getTrendHistory(topic: string, days: number = 30): Promise<TrendHistory> {
    // In production, query from database
    // Mock implementation
    const dataPoints: TimeSeriesPoint[] = [];
    const now = Date.now();
    
    for (let i = 0; i < days * 24; i++) {
      dataPoints.push({
        timestamp: new Date(now - i * 60 * 60 * 1000),
        value: Math.random() * 100,
        volume: Math.floor(Math.random() * 1000)
      });
    }
    
    return {
      topic,
      dataPoints,
      peaks: [
        { date: new Date(now - 5 * 24 * 60 * 60 * 1000), value: 85 },
        { date: new Date(now - 15 * 24 * 60 * 60 * 1000), value: 72 }
      ],
      averageDuration: 72, // hours
      recurrence: 0.3
    };
  }

  private identifyTrendFactors(trend: ZeitgeistTrend, history: TrendHistory): string[] {
    const factors: string[] = [];
    
    if (trend.velocity > 20) factors.push('Rapid growth velocity');
    if (trend.sentiment > 0.5) factors.push('Strong positive sentiment');
    if (trend.domains.length > 5) factors.push('Wide domain coverage');
    if (history.recurrence > 0.5) factors.push('Historical recurrence pattern');
    
    return factors;
  }

  private generateTrendRecommendations(
    trend: ZeitgeistTrend,
    momentum: number,
    velocity: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (momentum > 70 && velocity > 0) {
      recommendations.push('Monitor for peak timing');
      recommendations.push('Prepare content for trend peak');
    }
    
    if (velocity < -10) {
      recommendations.push('Trend is declining rapidly');
      recommendations.push('Consider pivoting strategy');
    }
    
    if (trend.llmConsensus === 'divergent') {
      recommendations.push('High LLM divergence - monitor for shifts');
    }
    
    return recommendations;
  }

  private findRelatedTrends(trend: ZeitgeistTrend, allTrends: ZeitgeistTrend[]): string[] {
    return allTrends
      .filter(t => t.id !== trend.id)
      .filter(t => {
        // Check keyword overlap
        const trendKeywords = new Set(trend.keywords.map(k => k.keyword.toLowerCase()));
        return t.keywords.some(k => trendKeywords.has(k.keyword.toLowerCase()));
      })
      .slice(0, 5)
      .map(t => t.topic);
  }

  private getEarlyAdopters(trend: ZeitgeistTrend): string[] {
    // In production, track which LLMs mentioned it first
    return ['openai', 'anthropic', 'google'];
  }

  private calculateTrendsPerHour(): number {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentTrends = Array.from(this.trends.values()).filter(t =>
      t.firstDetected.getTime() > hourAgo
    );
    return recentTrends.length;
  }

  private handleRedisMessage(channel: string, message: string) {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'zeitgeist:update':
          // Handle distributed updates
          this.emit('distributed:update', data);
          break;
        case 'consensus:generated':
          // Process consensus data
          this.processConsensusResponse(data);
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
    this.logger.info('Shutting down Zeitgeist Engine');
    
    // Clear intervals
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Save current state
    await this.saveTrendsToCache();
    
    // Close Redis connection
    await this.redis.quit();
    
    // Clear callbacks
    this.streamCallbacks.clear();
    this.removeAllListeners();
    
    this.logger.info('Zeitgeist Engine shutdown complete');
  }
}