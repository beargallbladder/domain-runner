/**
 * Closed-Loop Intelligence Engine
 * Coordinates juice scores, memory tensors, and grounding signals
 */

import { EventEmitter } from 'events';
import { IDatabaseService } from '../modules/database/interfaces';
import { Logger } from '../utils/logger';
import Redis from 'ioredis';
import WebSocket from 'ws';

export interface JuiceSignal {
  guid: string;
  domain: string;
  juice_score: number;
  components: {
    reddit_volatility: number;
    news_coverage: number;
    market_movement: number;
    competitor_activity: number;
    social_virality: number;
  };
  timestamp: string;
  reason: string;
}

export interface MemoryTensor {
  domain: string;
  guid: string;
  llm_scores: Map<string, number>;
  consensus: number;
  drift_rate: number;
  decay_velocity: number;
  last_refresh: Date;
  tensor_depth: number;
}

export interface CrawlPriority {
  domain: string;
  guid: string;
  priority_score: number;
  juice_weight: number;
  decay_weight: number;
  sla_weight: number;
  next_crawl: Date;
  crawl_frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
}

export class ClosedLoopEngine extends EventEmitter {
  private redis: Redis;
  private wss: WebSocket.Server;
  private logger: Logger;
  private database: IDatabaseService;
  
  // Priority queue management
  private priorityQueue: Map<string, CrawlPriority>;
  private juiceCache: Map<string, JuiceSignal>;
  private tensorCache: Map<string, MemoryTensor>;
  
  // Configuration
  private readonly JUICE_WEIGHT = 0.6;  // 60% weight on real-world signals
  private readonly DECAY_WEIGHT = 0.3;  // 30% weight on memory staleness
  private readonly SLA_WEIGHT = 0.1;    // 10% weight on customer SLAs
  
  constructor(database: IDatabaseService, logger: Logger, redisConfig?: any) {
    super();
    this.database = database;
    this.logger = logger.child('closed-loop');
    
    // Handle Redis config - ioredis accepts URL string directly
    if (typeof redisConfig === 'string') {
      this.redis = new Redis(redisConfig);
    } else {
      this.redis = new Redis(redisConfig || { host: 'localhost', port: 6379 });
    }
    
    this.priorityQueue = new Map();
    this.juiceCache = new Map();
    this.tensorCache = new Map();
    
    this.initialize();
  }
  
  private async initialize() {
    // Set up Redis pub/sub for distributed coordination
    const subscriber = this.redis.duplicate();
    
    // Subscribe to brandsentiment.io signals
    subscriber.subscribe(
      'juice:update',
      'juice:spike',
      'grounding:request',
      'volatility:alert'
    );
    
    subscriber.on('message', (channel, message) => {
      this.handleGroundingSignal(channel, message);
    });
    
    // Initialize WebSocket for real-time updates
    this.wss = new WebSocket.Server({ noServer: true });
    this.wss.on('connection', this.handleRealtimeConnection.bind(this));
    
    // Start the closed loop
    this.startClosedLoop();
    
    this.logger.info('Closed-loop engine initialized');
  }
  
  /**
   * Process juice feedback from brandsentiment.io
   */
  async processJuiceFeedback(juice: JuiceSignal): Promise<CrawlPriority> {
    // Store juice signal
    this.juiceCache.set(juice.guid, juice);
    await this.redis.setex(
      `juice:${juice.guid}`,
      3600, // 1 hour cache
      JSON.stringify(juice)
    );
    
    // Get current memory tensor
    const tensor = await this.getMemoryTensor(juice.guid);
    
    // Calculate new priority
    const priority = this.calculatePriority(juice, tensor);
    
    // Update priority queue
    this.priorityQueue.set(juice.guid, priority);
    
    // Persist to database
    await this.persistPriority(priority);
    
    // Emit events for coordination
    this.emit('priority:updated', priority);
    
    // Notify WebSocket subscribers
    this.broadcastPriorityUpdate(priority);
    
    // Log significant changes
    if (juice.juice_score > 0.8) {
      this.logger.warn('High juice detected', {
        domain: juice.domain,
        juice_score: juice.juice_score,
        reason: juice.reason
      });
      
      // Trigger immediate crawl for high-juice domains
      this.emit('crawl:immediate', juice.domain);
    }
    
    return priority;
  }
  
  /**
   * Calculate crawl priority using weighted formula
   */
  private calculatePriority(juice: JuiceSignal, tensor: MemoryTensor): CrawlPriority {
    // Calculate individual scores
    const juiceScore = juice.juice_score * this.JUICE_WEIGHT;
    const decayScore = this.calculateDecayScore(tensor) * this.DECAY_WEIGHT;
    const slaScore = this.getSLAScore(juice.domain) * this.SLA_WEIGHT;
    
    // Combined priority score
    const priorityScore = juiceScore + decayScore + slaScore;
    
    // Determine crawl frequency based on score
    const crawlFrequency = this.determineCrawlFrequency(priorityScore);
    
    // Calculate next crawl time
    const nextCrawl = this.calculateNextCrawlTime(crawlFrequency, priorityScore);
    
    return {
      domain: juice.domain,
      guid: juice.guid,
      priority_score: priorityScore,
      juice_weight: juiceScore,
      decay_weight: decayScore,
      sla_weight: slaScore,
      next_crawl: nextCrawl,
      crawl_frequency: crawlFrequency
    };
  }
  
  /**
   * Calculate decay score based on memory staleness
   */
  private calculateDecayScore(tensor: MemoryTensor): number {
    const now = new Date();
    const lastRefresh = tensor.last_refresh;
    const hoursSinceRefresh = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60);
    
    // Exponential decay: fresher = lower score (less urgent)
    const decayScore = 1 - Math.exp(-hoursSinceRefresh / 168); // 168 hours = 1 week
    
    // Factor in drift rate
    const driftMultiplier = 1 + (tensor.drift_rate * 0.5);
    
    return Math.min(1, decayScore * driftMultiplier);
  }
  
  /**
   * Get SLA score for enterprise customers
   */
  private getSLAScore(domain: string): number {
    // Check if domain has enterprise SLA
    const enterpriseDomains = [
      'openai.com',
      'anthropic.com',
      'google.com',
      'microsoft.com'
    ];
    
    if (enterpriseDomains.includes(domain)) {
      return 1.0; // Maximum SLA priority
    }
    
    // Check for premium tier
    const premiumDomains = this.getPremiumDomains();
    if (premiumDomains.includes(domain)) {
      return 0.5;
    }
    
    return 0.1; // Base priority
  }
  
  /**
   * Determine crawl frequency based on priority score
   */
  private determineCrawlFrequency(score: number): CrawlPriority['crawl_frequency'] {
    if (score > 0.9) return 'realtime';
    if (score > 0.7) return 'hourly';
    if (score > 0.4) return 'daily';
    return 'weekly';
  }
  
  /**
   * Calculate next crawl time
   */
  private calculateNextCrawlTime(
    frequency: CrawlPriority['crawl_frequency'],
    score: number
  ): Date {
    const now = new Date();
    let intervalMs: number;
    
    switch (frequency) {
      case 'realtime':
        intervalMs = 5 * 60 * 1000; // 5 minutes
        break;
      case 'hourly':
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case 'daily':
        intervalMs = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'weekly':
        intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
    }
    
    // Adjust based on score for variation
    intervalMs = intervalMs * (2 - score);
    
    return new Date(now.getTime() + intervalMs);
  }
  
  /**
   * Get or calculate memory tensor
   */
  private async getMemoryTensor(guid: string): Promise<MemoryTensor> {
    // Check cache
    if (this.tensorCache.has(guid)) {
      return this.tensorCache.get(guid)!;
    }
    
    // Check Redis
    const cached = await this.redis.get(`tensor:${guid}`);
    if (cached) {
      const tensor = JSON.parse(cached);
      tensor.llm_scores = new Map(Object.entries(tensor.llm_scores));
      tensor.last_refresh = new Date(tensor.last_refresh);
      this.tensorCache.set(guid, tensor);
      return tensor;
    }
    
    // Calculate fresh tensor
    const tensor = await this.calculateMemoryTensor(guid);
    
    // Cache it
    this.tensorCache.set(guid, tensor);
    await this.redis.setex(
      `tensor:${guid}`,
      3600,
      JSON.stringify({
        ...tensor,
        llm_scores: Object.fromEntries(tensor.llm_scores)
      })
    );
    
    return tensor;
  }
  
  /**
   * Calculate memory tensor from database
   */
  private async calculateMemoryTensor(guid: string): Promise<MemoryTensor> {
    // This would query actual database
    // Mock implementation for now
    const llmScores = new Map([
      ['gpt-4', 0.92],
      ['claude-3', 0.89],
      ['gemini-1.5', 0.85],
      ['llama-3', 0.78],
      ['mistral', 0.81]
    ]);
    
    const consensus = Array.from(llmScores.values())
      .reduce((a, b) => a + b, 0) / llmScores.size;
    
    return {
      domain: 'example.com',
      guid,
      llm_scores: llmScores,
      consensus,
      drift_rate: Math.random() * 0.1,
      decay_velocity: Math.random() * 0.05,
      last_refresh: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      tensor_depth: 11
    };
  }
  
  /**
   * Start the closed-loop coordination
   */
  private startClosedLoop() {
    // Check priority queue every minute
    setInterval(() => {
      this.processPriorityQueue();
    }, 60000);
    
    // Refresh juice scores every 5 minutes
    setInterval(() => {
      this.refreshJuiceScores();
    }, 300000);
    
    // Clean expired cache every hour
    setInterval(() => {
      this.cleanExpiredCache();
    }, 3600000);
    
    this.logger.info('Closed-loop coordination started');
  }
  
  /**
   * Process priority queue and trigger crawls
   */
  private async processPriorityQueue() {
    const now = new Date();
    const crawlTargets: string[] = [];
    
    for (const [guid, priority] of this.priorityQueue) {
      if (priority.next_crawl <= now) {
        crawlTargets.push(priority.domain);
        
        // Update next crawl time
        priority.next_crawl = this.calculateNextCrawlTime(
          priority.crawl_frequency,
          priority.priority_score
        );
      }
    }
    
    if (crawlTargets.length > 0) {
      this.logger.info('Triggering crawls', {
        count: crawlTargets.length,
        domains: crawlTargets.slice(0, 5) // Log first 5
      });
      
      this.emit('crawl:batch', crawlTargets);
    }
  }
  
  /**
   * Refresh juice scores from brandsentiment.io
   */
  private async refreshJuiceScores() {
    // This would call brandsentiment.io API
    // For now, emit request for grounding
    const domains = Array.from(this.priorityQueue.values())
      .map(p => p.domain)
      .slice(0, 100); // Top 100 domains
    
    this.emit('grounding:request', domains);
  }
  
  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    
    // Clean juice cache
    for (const [guid, juice] of this.juiceCache) {
      const age = now - new Date(juice.timestamp).getTime();
      if (age > maxAge) {
        this.juiceCache.delete(guid);
      }
    }
    
    // Clean tensor cache
    for (const [guid, tensor] of this.tensorCache) {
      const age = now - tensor.last_refresh.getTime();
      if (age > maxAge) {
        this.tensorCache.delete(guid);
      }
    }
    
    this.logger.info('Cache cleaned', {
      juice_remaining: this.juiceCache.size,
      tensor_remaining: this.tensorCache.size
    });
  }
  
  /**
   * Handle grounding signals from Redis pub/sub
   */
  private handleGroundingSignal(channel: string, message: string) {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'juice:update':
          this.processJuiceFeedback(data);
          break;
        case 'juice:spike':
          this.handleJuiceSpike(data);
          break;
        case 'volatility:alert':
          this.handleVolatilityAlert(data);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to process grounding signal', {
        channel,
        error
      });
    }
  }
  
  /**
   * Handle juice spike events (immediate attention needed)
   */
  private async handleJuiceSpike(data: any) {
    this.logger.warn('Juice spike detected', data);
    
    // Immediately crawl high-juice domain
    this.emit('crawl:immediate', data.domain);
    
    // Notify WebSocket subscribers
    this.broadcast({
      type: 'juice_spike',
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Handle volatility alerts
   */
  private async handleVolatilityAlert(data: any) {
    this.logger.warn('Volatility alert', data);
    
    // Adjust priorities for volatile domains
    for (const domain of data.domains) {
      const priority = this.priorityQueue.get(domain);
      if (priority) {
        priority.priority_score *= 1.5; // Boost priority
        priority.next_crawl = new Date(); // Crawl immediately
      }
    }
  }
  
  /**
   * Handle real-time WebSocket connections
   */
  private handleRealtimeConnection(ws: WebSocket, req: any) {
    const clientId = `client_${Date.now()}_${Math.random()}`;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleRealtimeMessage(ws, data);
      } catch (error) {
        ws.send(JSON.stringify({
          error: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      this.logger.info('WebSocket client disconnected', { clientId });
    });
    
    // Send initial state
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    }));
  }
  
  /**
   * Handle real-time messages from WebSocket clients
   */
  private handleRealtimeMessage(ws: WebSocket, data: any) {
    switch (data.type) {
      case 'subscribe:priority':
        // Subscribe to priority updates for specific domain
        this.subscribeToPriority(ws, data.domain);
        break;
      case 'subscribe:juice':
        // Subscribe to juice updates
        this.subscribeToJuice(ws, data.domain);
        break;
      case 'get:tensor':
        // Get current tensor for domain
        this.sendTensor(ws, data.guid);
        break;
    }
  }
  
  /**
   * Broadcast priority update to WebSocket subscribers
   */
  private broadcastPriorityUpdate(priority: CrawlPriority) {
    this.broadcast({
      type: 'priority:update',
      data: priority,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Broadcast to all WebSocket clients
   */
  private broadcast(message: any) {
    const payload = JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
  
  // Helper methods
  private async persistPriority(priority: CrawlPriority) {
    // Store in database
    await this.redis.hset(
      'priorities',
      priority.guid,
      JSON.stringify(priority)
    );
  }
  
  private getPremiumDomains(): string[] {
    // This would query database for premium customers
    return ['stripe.com', 'tesla.com', 'nvidia.com'];
  }
  
  private subscribeToPriority(ws: WebSocket, domain: string) {
    // Implementation for WebSocket subscriptions
  }
  
  private subscribeToJuice(ws: WebSocket, domain: string) {
    // Implementation for juice subscriptions
  }
  
  private async sendTensor(ws: WebSocket, guid: string) {
    const tensor = await this.getMemoryTensor(guid);
    ws.send(JSON.stringify({
      type: 'tensor:data',
      data: {
        ...tensor,
        llm_scores: Object.fromEntries(tensor.llm_scores)
      },
      timestamp: new Date().toISOString()
    }));
  }
  
  /**
   * Get system metrics
   */
  getMetrics() {
    return {
      queue_size: this.priorityQueue.size,
      juice_cache_size: this.juiceCache.size,
      tensor_cache_size: this.tensorCache.size,
      websocket_clients: this.wss?.clients.size || 0,
      high_priority_count: Array.from(this.priorityQueue.values())
        .filter(p => p.priority_score > 0.8).length
    };
  }
  
  /**
   * Handle WebSocket upgrade request
   */
  handleWebSocketUpgrade(request: any, socket: any, head: any) {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Closed-Loop Engine');
    
    // Close WebSocket connections
    this.wss.clients.forEach(client => {
      client.close(1000, 'Server shutting down');
    });
    
    // Close Redis connections
    await this.redis.quit();
    
    // Clear timers
    this.removeAllListeners();
    
    this.logger.info('Closed-Loop Engine shutdown complete');
  }
}

export default ClosedLoopEngine;