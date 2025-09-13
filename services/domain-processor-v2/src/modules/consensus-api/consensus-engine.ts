/**
 * LLM Consensus Engine
 * Orchestrates parallel LLM calls and aggregates responses into unified consensus
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Logger } from '../../utils/logger';
import {
  ConsensusRequest,
  ConsensusResponse,
  ConsensusEngine,
  ProviderResponse,
  SentimentAnalysis,
  ConsensusMetadata,
  MemoryDriftIndicator,
  ProviderStatus,
  ConsensusCache,
  ConsensusAPIConfig
} from './interfaces';
import { ILLMProviderRegistry } from '../llm-providers/interfaces';
import { PromptType } from '../../types';
import { IDatabaseService } from '../database/interfaces';

export class LLMConsensusEngine extends EventEmitter implements ConsensusEngine {
  private redis: Redis;
  private logger: Logger;
  private config: ConsensusAPIConfig;
  private providerRegistry: ILLMProviderRegistry;
  private database: IDatabaseService;
  private activeRequests: Map<string, Promise<ConsensusResponse>>;
  private subscribers: Map<string, Set<Function>>;

  constructor(
    providerRegistry: ILLMProviderRegistry,
    database: IDatabaseService,
    logger: Logger,
    config: ConsensusAPIConfig,
    redisConfig?: any
  ) {
    super();
    this.providerRegistry = providerRegistry;
    this.database = database;
    this.logger = logger.child('consensus-engine');
    this.config = config;
    this.redis = new Redis(redisConfig || { host: 'localhost', port: 6379 });
    this.activeRequests = new Map();
    this.subscribers = new Map();

    this.initialize();
  }

  private async initialize() {
    // Set up Redis pub/sub for distributed consensus updates
    const subscriber = this.redis.duplicate();
    subscriber.subscribe('consensus:update', 'consensus:drift');
    
    subscriber.on('message', (channel, message) => {
      this.handleDistributedUpdate(channel, message);
    });

    this.logger.info('LLM Consensus Engine initialized', {
      providers: Object.keys(this.config.providers).filter(p => this.config.providers[p].enabled).length
    });
  }

  /**
   * Get consensus from all configured LLM providers
   */
  async getConsensus(request: ConsensusRequest): Promise<ConsensusResponse> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(request);

    // Check if request is already in progress
    if (this.activeRequests.has(cacheKey)) {
      this.logger.debug('Returning in-progress request', { domain: request.domain });
      return this.activeRequests.get(cacheKey)!;
    }

    // Check cache if not forcing realtime
    if (!request.realtime && this.config.cacheEnabled) {
      const cached = await this.checkCache(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { domain: request.domain });
        return cached;
      }
    }

    // Create promise for this request
    const consensusPromise = this.generateConsensus(request, startTime);
    this.activeRequests.set(cacheKey, consensusPromise);

    try {
      const response = await consensusPromise;
      
      // Cache the response
      if (this.config.cacheEnabled) {
        await this.cacheResponse(cacheKey, request.domain, response);
      }

      // Emit update event
      this.emit('consensus:generated', response);

      // Notify subscribers
      this.notifySubscribers(request.domain, response);

      return response;
    } finally {
      this.activeRequests.delete(cacheKey);
    }
  }

  /**
   * Generate consensus by calling all providers in parallel
   */
  private async generateConsensus(request: ConsensusRequest, startTime: number): Promise<ConsensusResponse> {
    // Get enabled providers
    const enabledProviders = this.getEnabledProviders(request);
    
    if (enabledProviders.length === 0) {
      throw new Error('No providers available for consensus');
    }

    this.logger.info('Generating consensus', {
      domain: request.domain,
      providers: enabledProviders.length
    });

    // Create parallel provider calls
    const providerPromises = enabledProviders.map(provider => 
      this.callProviderWithTimeout(provider, request)
    );

    // Wait for all responses (with timeout)
    const timeout = request.timeout || this.config.defaultTimeout;
    const responses = await this.waitForResponses(providerPromises, timeout);

    // Analyze responses
    const analysis = this.analyzeResponses(responses, request.domain);

    // Check for memory drift
    const memoryDrift = this.config.driftDetectionEnabled 
      ? await this.detectMemoryDrift(request.domain, responses)
      : undefined;

    // Create consensus response
    const response: ConsensusResponse = {
      domain: request.domain,
      timestamp: new Date().toISOString(),
      consensusScore: analysis.consensusScore,
      aggregatedContent: analysis.aggregatedContent,
      providers: responses,
      metadata: {
        totalProviders: enabledProviders.length,
        successfulResponses: responses.filter(r => r.status === 'success').length,
        failedResponses: responses.filter(r => r.status === 'failed').length,
        averageResponseTime: this.calculateAverageResponseTime(responses),
        consensusStrength: this.determineConsensusStrength(analysis.consensusScore),
        processingTime: Date.now() - startTime,
        cacheStatus: 'miss',
        version: '1.0.0'
      },
      memoryDrift
    };

    // Store in database for historical tracking
    await this.storeConsensusResult(response);

    return response;
  }

  /**
   * Call a provider with timeout handling
   */
  private async callProviderWithTimeout(
    provider: any,
    request: ConsensusRequest
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    const timeout = this.config.providers[provider.name]?.timeout || this.config.defaultTimeout;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<ProviderResponse>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      });

      // Create provider call promise
      const providerPromise = this.callProvider(provider, request);

      // Race between provider call and timeout
      const result = await Promise.race([providerPromise, timeoutPromise]);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        provider: provider.name,
        model: provider.model,
        status: errorMessage === 'Timeout' ? 'timeout' : 'failed',
        responseTime: Date.now() - startTime,
        error: errorMessage
      };
    }
  }

  /**
   * Call individual provider
   */
  private async callProvider(provider: any, request: ConsensusRequest): Promise<ProviderResponse> {
    const startTime = Date.now();

    try {
      // Generate appropriate prompt based on request type
      const prompt = this.generatePrompt(request);
      
      // Call provider
      const response = await provider.generateResponse(
        prompt,
        request.domain,
        this.mapPromptType(request.promptType)
      );

      if (!response.success) {
        throw new Error(response.error || 'Provider failed');
      }

      // Analyze sentiment if content exists
      const sentiment = response.content ? this.analyzeSentiment(response.content) : undefined;

      return {
        provider: provider.name,
        model: provider.model,
        status: 'success',
        content: response.content,
        sentiment,
        confidence: this.calculateConfidence(response),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        provider: provider.name,
        model: provider.model,
        status: 'failed',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze responses to create aggregated consensus
   */
  private analyzeResponses(responses: ProviderResponse[], domain: string): any {
    const successfulResponses = responses.filter(r => r.status === 'success' && r.content);

    if (successfulResponses.length === 0) {
      return {
        consensusScore: 0,
        aggregatedContent: {
          summary: 'No successful responses available',
          keyThemes: [],
          sentiment: { overall: 0, breakdown: { positive: 0, neutral: 100, negative: 0 }, consensus: 'weak' }
        }
      };
    }

    // Extract themes from all responses
    const allThemes = this.extractThemes(successfulResponses);
    const keyThemes = this.identifyKeyThemes(allThemes);

    // Calculate sentiment
    const sentiment = this.calculateAggregatedSentiment(successfulResponses);

    // Generate summary
    const summary = this.generateSummary(successfulResponses, keyThemes);

    // Calculate consensus score
    const consensusScore = this.calculateConsensusScore(successfulResponses);

    // Extract additional insights
    const insights = this.extractInsights(successfulResponses);

    return {
      consensusScore,
      aggregatedContent: {
        summary,
        keyThemes,
        sentiment,
        ...insights
      }
    };
  }

  /**
   * Extract themes from responses
   */
  private extractThemes(responses: ProviderResponse[]): Map<string, number> {
    const themes = new Map<string, number>();
    
    // Simple theme extraction - in production, use NLP
    const keywords = [
      'AI', 'machine learning', 'innovation', 'technology', 'platform',
      'enterprise', 'startup', 'growth', 'market leader', 'disruption',
      'cloud', 'data', 'analytics', 'automation', 'digital transformation'
    ];

    responses.forEach(response => {
      if (response.content) {
        const content = response.content.toLowerCase();
        keywords.forEach(keyword => {
          if (content.includes(keyword.toLowerCase())) {
            themes.set(keyword, (themes.get(keyword) || 0) + 1);
          }
        });
      }
    });

    return themes;
  }

  /**
   * Identify key themes based on frequency
   */
  private identifyKeyThemes(themes: Map<string, number>): string[] {
    return Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);
  }

  /**
   * Calculate aggregated sentiment
   */
  private calculateAggregatedSentiment(responses: ProviderResponse[]): SentimentAnalysis {
    const sentiments = responses
      .filter(r => r.sentiment !== undefined)
      .map(r => r.sentiment!);

    if (sentiments.length === 0) {
      return {
        overall: 0,
        breakdown: { positive: 0, neutral: 100, negative: 0 },
        consensus: 'weak'
      };
    }

    const overall = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
    
    const breakdown = {
      positive: (sentiments.filter(s => s > 0.3).length / sentiments.length) * 100,
      neutral: (sentiments.filter(s => s >= -0.3 && s <= 0.3).length / sentiments.length) * 100,
      negative: (sentiments.filter(s => s < -0.3).length / sentiments.length) * 100
    };

    // Determine consensus strength
    const variance = this.calculateVariance(sentiments);
    let consensus: SentimentAnalysis['consensus'];
    
    if (variance < 0.1) consensus = 'strong';
    else if (variance < 0.3) consensus = 'moderate';
    else if (variance < 0.5) consensus = 'weak';
    else consensus = 'mixed';

    return { overall, breakdown, consensus };
  }

  /**
   * Generate summary from responses
   */
  private generateSummary(responses: ProviderResponse[], keyThemes: string[]): string {
    // In production, use advanced NLP for summarization
    const contentLength = responses.reduce((sum, r) => sum + (r.content?.length || 0), 0);
    const avgLength = contentLength / responses.length;

    const themesText = keyThemes.length > 0 
      ? `Key themes include: ${keyThemes.join(', ')}.`
      : '';

    return `Based on ${responses.length} LLM responses, ${themesText} ` +
           `The consensus shows ${this.determineConsensusQuality(responses)} agreement ` +
           `across providers regarding this domain.`;
  }

  /**
   * Calculate consensus score
   */
  private calculateConsensusScore(responses: ProviderResponse[]): number {
    if (responses.length < 2) return 100; // Single response = full consensus

    // Calculate similarity between responses
    const similarities: number[] = [];
    
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        if (responses[i].content && responses[j].content) {
          const similarity = this.calculateSimilarity(
            responses[i].content!,
            responses[j].content!
          );
          similarities.push(similarity);
        }
      }
    }

    if (similarities.length === 0) return 0;

    // Average similarity as consensus score
    const avgSimilarity = similarities.reduce((sum, s) => sum + s, 0) / similarities.length;
    return Math.round(avgSimilarity * 100);
  }

  /**
   * Calculate text similarity (simplified version)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // In production, use advanced NLP similarity measures
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Extract additional insights from responses
   */
  private extractInsights(responses: ProviderResponse[]): any {
    const insights: any = {};

    // Extract technical capabilities
    const technicalKeywords = ['API', 'SDK', 'platform', 'infrastructure', 'cloud'];
    const technicalMentions = responses.filter(r => 
      r.content && technicalKeywords.some(k => r.content!.toLowerCase().includes(k.toLowerCase()))
    );
    
    if (technicalMentions.length > 0) {
      insights.technicalCapabilities = technicalKeywords.filter(k =>
        technicalMentions.some(r => r.content!.toLowerCase().includes(k.toLowerCase()))
      );
    }

    // Extract market position
    const marketKeywords = ['leader', 'competitor', 'market share', 'growth'];
    const marketMentions = responses.filter(r =>
      r.content && marketKeywords.some(k => r.content!.toLowerCase().includes(k.toLowerCase()))
    );

    if (marketMentions.length > 0) {
      insights.marketPosition = 'Mentioned in market context';
    }

    return insights;
  }

  /**
   * Detect memory drift by comparing with historical data
   */
  private async detectMemoryDrift(
    domain: string,
    currentResponses: ProviderResponse[]
  ): Promise<MemoryDriftIndicator | undefined> {
    try {
      // Get historical consensus
      const history = await this.getConsensusHistory(domain, 5);
      
      if (history.length < 2) {
        return undefined; // Not enough history to detect drift
      }

      // Compare current with historical
      const driftScores = new Map<string, number>();
      const affectedProviders: string[] = [];

      currentResponses.forEach(current => {
        if (current.status === 'success' && current.content) {
          // Find historical response from same provider
          const historical = history[0].providers.find(p => p.provider === current.provider);
          
          if (historical && historical.content) {
            const drift = 1 - this.calculateSimilarity(current.content, historical.content);
            driftScores.set(current.provider, drift);
            
            if (drift > 0.5) { // Significant drift
              affectedProviders.push(current.provider);
            }
          }
        }
      });

      if (driftScores.size === 0) {
        return undefined;
      }

      // Calculate overall drift
      const avgDrift = Array.from(driftScores.values()).reduce((sum, d) => sum + d, 0) / driftScores.size;
      const driftScore = avgDrift * 100;

      // Determine severity
      let severity: MemoryDriftIndicator['severity'];
      let suggestedAction: MemoryDriftIndicator['suggestedAction'];
      
      if (driftScore > 75) {
        severity = 'critical';
        suggestedAction = 'urgent';
      } else if (driftScore > 50) {
        severity = 'high';
        suggestedAction = 'investigate';
      } else if (driftScore > 25) {
        severity = 'medium';
        suggestedAction = 'refresh';
      } else {
        severity = 'low';
        suggestedAction = 'monitor';
      }

      return {
        detected: true,
        severity,
        driftScore,
        affectedProviders,
        lastKnownAccurate: history[0].timestamp,
        suggestedAction
      };
    } catch (error) {
      this.logger.error('Failed to detect memory drift', { domain, error });
      return undefined;
    }
  }

  /**
   * Get enabled providers based on request
   */
  private getEnabledProviders(request: ConsensusRequest): any[] {
    let providers = this.providerRegistry.getAllProviders();

    // Filter by configuration
    providers = providers.filter(p => 
      this.config.providers[p.name]?.enabled !== false
    );

    // Apply include/exclude filters
    if (request.includeProviders && request.includeProviders.length > 0) {
      providers = providers.filter(p => request.includeProviders!.includes(p.name));
    }

    if (request.excludeProviders && request.excludeProviders.length > 0) {
      providers = providers.filter(p => !request.excludeProviders!.includes(p.name));
    }

    // Only use available providers
    providers = providers.filter(p => p.isAvailable());

    return providers;
  }

  /**
   * Generate appropriate prompt based on request type
   */
  private generatePrompt(request: ConsensusRequest): string {
    const basePrompt = `Provide a comprehensive analysis of ${request.domain}`;

    switch (request.promptType) {
      case 'brand':
        return `${basePrompt} focusing on brand perception, market position, and reputation.`;
      case 'technical':
        return `${basePrompt} focusing on technical capabilities, infrastructure, and innovation.`;
      case 'financial':
        return `${basePrompt} focusing on financial performance, business model, and growth prospects.`;
      case 'sentiment':
        return `${basePrompt} focusing on public sentiment, customer satisfaction, and market perception.`;
      default:
        return `${basePrompt} including brand perception, technical capabilities, market position, and overall assessment.`;
    }
  }

  /**
   * Map request prompt type to internal prompt type
   */
  private mapPromptType(requestType?: ConsensusRequest['promptType']): PromptType {
    switch (requestType) {
      case 'brand':
      case 'sentiment':
        return 'brand_description';
      case 'technical':
        return 'technical_analysis';
      case 'financial':
        return 'company_analysis';
      default:
        return 'general';
    }
  }

  /**
   * Analyze sentiment from text
   */
  private analyzeSentiment(text: string): number {
    // Simple sentiment analysis - in production use NLP library
    const positiveWords = ['excellent', 'great', 'innovative', 'leading', 'strong', 'successful'];
    const negativeWords = ['poor', 'weak', 'failing', 'struggling', 'problem', 'issue'];

    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(w => positiveWords.includes(w)).length;
    const negativeCount = words.filter(w => negativeWords.includes(w)).length;

    if (positiveCount + negativeCount === 0) return 0;

    return (positiveCount - negativeCount) / (positiveCount + negativeCount);
  }

  /**
   * Calculate confidence score for response
   */
  private calculateConfidence(response: any): number {
    // Base confidence on response completeness
    if (!response.content) return 0;
    
    const length = response.content.length;
    if (length < 100) return 0.3;
    if (length < 500) return 0.6;
    if (length < 1000) return 0.8;
    return 0.9;
  }

  /**
   * Wait for provider responses with overall timeout
   */
  private async waitForResponses(
    promises: Promise<ProviderResponse>[],
    timeout: number
  ): Promise<ProviderResponse[]> {
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          provider: 'unknown',
          model: 'unknown',
          status: 'failed' as const,
          responseTime: timeout,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(responses: ProviderResponse[]): number {
    if (responses.length === 0) return 0;
    
    const sum = responses.reduce((total, r) => total + r.responseTime, 0);
    return Math.round(sum / responses.length);
  }

  /**
   * Determine consensus strength based on score
   */
  private determineConsensusStrength(score: number): ConsensusMetadata['consensusStrength'] {
    if (score >= 95) return 'unanimous';
    if (score >= 80) return 'strong';
    if (score >= 60) return 'moderate';
    if (score >= 40) return 'weak';
    return 'divergent';
  }

  /**
   * Determine consensus quality
   */
  private determineConsensusQuality(responses: ProviderResponse[]): string {
    const successRate = responses.filter(r => r.status === 'success').length / responses.length;
    
    if (successRate >= 0.9) return 'strong';
    if (successRate >= 0.7) return 'moderate';
    if (successRate >= 0.5) return 'mixed';
    return 'weak';
  }

  /**
   * Calculate variance for sentiment analysis
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  }

  /**
   * Get cache key for request
   */
  private getCacheKey(request: ConsensusRequest): string {
    const parts = [
      'consensus',
      request.domain,
      request.promptType || 'all',
      request.includeProviders?.sort().join(',') || '',
      request.excludeProviders?.sort().join(',') || ''
    ];
    
    return parts.join(':');
  }

  /**
   * Check cache for response
   */
  private async checkCache(key: string): Promise<ConsensusResponse | null> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const response = JSON.parse(cached);
        response.metadata.cacheStatus = 'hit';
        
        // Update hit count
        await this.redis.hincrby('consensus:hits', key, 1);
        
        return response;
      }
    } catch (error) {
      this.logger.error('Cache check failed', { key, error });
    }
    
    return null;
  }

  /**
   * Cache response
   */
  private async cacheResponse(key: string, domain: string, response: ConsensusResponse): Promise<void> {
    try {
      const ttl = this.config.cacheTTL;
      await this.redis.setex(key, ttl, JSON.stringify(response));
      
      // Track cache entry
      await this.redis.zadd(
        'consensus:cache:index',
        Date.now(),
        `${key}:${domain}`
      );
    } catch (error) {
      this.logger.error('Failed to cache response', { key, error });
    }
  }

  /**
   * Store consensus result in database
   */
  private async storeConsensusResult(response: ConsensusResponse): Promise<void> {
    try {
      // This would store in actual database
      // For now, just emit event
      this.emit('consensus:stored', response);
    } catch (error) {
      this.logger.error('Failed to store consensus result', { 
        domain: response.domain,
        error 
      });
    }
  }

  /**
   * Get provider statuses
   */
  async getProviderStatuses(): Promise<Map<string, ProviderStatus>> {
    const statuses = new Map<string, ProviderStatus>();
    const providers = this.providerRegistry.getAllProviders();

    for (const provider of providers) {
      const metrics = provider.getMetrics();
      const status: ProviderStatus = {
        provider: provider.name,
        available: provider.isAvailable(),
        healthScore: this.calculateHealthScore(metrics),
        lastSuccess: metrics.lastRequestAt,
        lastError: metrics.lastError,
        averageResponseTime: metrics.averageResponseTime,
        reliabilityScore: this.calculateReliabilityScore(metrics)
      };
      
      statuses.set(provider.name, status);
    }

    return statuses;
  }

  /**
   * Calculate health score from metrics
   */
  private calculateHealthScore(metrics: any): number {
    if (metrics.totalRequests === 0) return 100;
    
    const successRate = metrics.successfulRequests / metrics.totalRequests;
    const recentActivity = metrics.lastRequestAt 
      ? (Date.now() - new Date(metrics.lastRequestAt).getTime()) < 3600000 ? 1 : 0.5
      : 0;
    
    return Math.round((successRate * 0.7 + recentActivity * 0.3) * 100);
  }

  /**
   * Calculate reliability score
   */
  private calculateReliabilityScore(metrics: any): number {
    if (metrics.totalRequests === 0) return 0;
    
    const successRate = metrics.successfulRequests / metrics.totalRequests;
    const consistencyFactor = metrics.averageResponseTime < 5000 ? 1 : 0.5;
    
    return Math.round(successRate * consistencyFactor * 100);
  }

  /**
   * Invalidate cache for domain
   */
  async invalidateCache(domain: string): Promise<void> {
    try {
      // Find all cache keys for domain
      const keys = await this.redis.keys(`consensus:${domain}:*`);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.info('Cache invalidated', { domain, keys: keys.length });
      }
      
      // Emit event
      this.emit('cache:invalidated', { domain });
    } catch (error) {
      this.logger.error('Failed to invalidate cache', { domain, error });
      throw error;
    }
  }

  /**
   * Get consensus history for domain
   */
  async getConsensusHistory(domain: string, limit: number = 10): Promise<ConsensusResponse[]> {
    try {
      // This would query from database
      // For now, return empty array
      return [];
    } catch (error) {
      this.logger.error('Failed to get consensus history', { domain, error });
      return [];
    }
  }

  /**
   * Subscribe to consensus updates for a domain
   */
  subscribeToUpdates(domain: string, callback: (response: ConsensusResponse) => void): void {
    if (!this.subscribers.has(domain)) {
      this.subscribers.set(domain, new Set());
    }
    
    this.subscribers.get(domain)!.add(callback);
    this.logger.debug('Subscribed to updates', { domain });
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(domain: string, callback: Function): void {
    const callbacks = this.subscribers.get(domain);
    if (callbacks) {
      callbacks.delete(callback);
      
      if (callbacks.size === 0) {
        this.subscribers.delete(domain);
      }
    }
  }

  /**
   * Notify subscribers of updates
   */
  private notifySubscribers(domain: string, response: ConsensusResponse): void {
    const callbacks = this.subscribers.get(domain);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(response);
        } catch (error) {
          this.logger.error('Subscriber callback failed', { domain, error });
        }
      });
    }
  }

  /**
   * Handle distributed updates from Redis pub/sub
   */
  private handleDistributedUpdate(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'consensus:update':
          this.emit('consensus:update', data);
          break;
        case 'consensus:drift':
          this.emit('consensus:drift', data);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to handle distributed update', { channel, error });
    }
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    return {
      activeRequests: this.activeRequests.size,
      subscribers: this.subscribers.size,
      cacheEnabled: this.config.cacheEnabled,
      driftDetectionEnabled: this.config.driftDetectionEnabled,
      enabledProviders: Object.keys(this.config.providers).filter(p => 
        this.config.providers[p].enabled
      ).length
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Consensus Engine');
    
    // Wait for active requests
    if (this.activeRequests.size > 0) {
      await Promise.all(Array.from(this.activeRequests.values()));
    }
    
    // Close Redis connections
    await this.redis.quit();
    
    // Clear subscribers
    this.subscribers.clear();
    this.removeAllListeners();
    
    this.logger.info('Consensus Engine shutdown complete');
  }
}