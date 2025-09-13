/**
 * AI Zeitgeist Tracker
 * Live feed of what's trending in AI consciousness
 * Designed for viral content generation
 */

import { EventEmitter } from 'events';
import { IDatabaseService } from '../../modules/database/interfaces';
import { Logger } from '../../utils/logger';
import Redis from 'ioredis';
import { ConsensusEngine } from '../consensus/consensus-engine';

export interface TrendingDomain {
  domain: string;
  currentScore: number;
  previousScore: number;
  changePercent: number;
  momentum: 'rising' | 'falling' | 'stable' | 'volatile';
  viralScore: number; // 0-100, likelihood to go viral
  headline: string;   // Auto-generated viral headline
  tweetText: string;  // Ready-to-post tweet
  providers: number;
  lastUpdated: Date;
}

export interface ZeitgeistSnapshot {
  timestamp: Date;
  trending: {
    rising: TrendingDomain[];
    falling: TrendingDomain[];
    volatile: TrendingDomain[];
  };
  insights: ZeitgeistInsight[];
  viralContent: ViralContent[];
  metadata: {
    totalDomains: number;
    significantChanges: number;
    generationTime: number;
  };
}

export interface ZeitgeistInsight {
  type: 'consensus_shift' | 'outlier_alert' | 'category_trend' | 'sentiment_flip';
  title: string;
  description: string;
  affectedDomains: string[];
  impact: 'high' | 'medium' | 'low';
  shareableQuote: string;
}

export interface ViralContent {
  platform: 'twitter' | 'linkedin' | 'hackernews';
  content: string;
  hashtags: string[];
  estimatedReach: number;
  bestPostTime: string;
}

export class ZeitgeistTracker extends EventEmitter {
  private redis: Redis;
  private logger: Logger;
  private database: IDatabaseService;
  private consensusEngine: ConsensusEngine;
  
  // Configuration
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly SIGNIFICANT_CHANGE_THRESHOLD = 5; // 5% change
  private readonly VIRAL_SCORE_THRESHOLD = 70;
  private readonly UPDATE_INTERVAL = 300000; // 5 minutes
  
  // Viral content templates
  private readonly HEADLINE_TEMPLATES = [
    "🚨 {domain} just {action} in AI's collective mind by {change}%",
    "AI consensus shock: {domain} {direction} as LLMs {verb}",
    "Breaking: What {count} AI models think about {domain} will surprise you",
    "{domain} is {momentum} - here's what AI really thinks",
    "The AI hive mind has spoken: {domain} {verdict}"
  ];
  
  private readonly TWEET_TEMPLATES = [
    "🤖 AI Consensus Alert: {domain} {direction} {change}% across {providers} LLMs\n\n{insight}\n\n#AI #LLM #TechTrends",
    "📊 Just tracked what {providers} AI models think about {domain}:\n\n{emoji} {momentum}\n📈 Score: {score}/100\n\n{quote}\n\n#AIConsensus",
    "🔥 {domain} is {momentum} in AI consciousness\n\nChange: {change}%\nProviders: {providers}/11\n\n{headline}\n\n#AI #Tech"
  ];
  
  private updateTimer: NodeJS.Timeout | null = null;
  
  constructor(
    database: IDatabaseService, 
    consensusEngine: ConsensusEngine,
    logger: Logger, 
    redisConfig?: any
  ) {
    super();
    this.database = database;
    this.consensusEngine = consensusEngine;
    this.logger = logger.child('zeitgeist-tracker');
    
    // Handle Redis config - ioredis accepts URL string directly
    if (typeof redisConfig === 'string') {
      this.redis = new Redis(redisConfig);
    } else {
      this.redis = new Redis(redisConfig || { host: 'localhost', port: 6379 });
    }
    
    this.initialize();
  }
  
  private async initialize() {
    this.logger.info('Zeitgeist Tracker initializing');
    
    // Start automatic updates
    this.startTracking();
    
    // Subscribe to consensus changes
    this.consensusEngine.on('consensus:calculated', this.handleConsensusUpdate.bind(this));
    
    this.logger.info('Zeitgeist Tracker initialized');
  }
  
  /**
   * Get current zeitgeist snapshot
   */
  async getZeitgeist(forceRefresh = false): Promise<ZeitgeistSnapshot> {
    const start = Date.now();
    const cacheKey = 'zeitgeist:current';
    
    try {
      // Check cache
      if (!forceRefresh) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.logger.info('Zeitgeist cache hit');
          return JSON.parse(cached);
        }
      }
      
      // Generate fresh snapshot
      const snapshot = await this.generateSnapshot();
      
      // Cache it
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(snapshot));
      
      // Emit for real-time subscribers
      this.emit('zeitgeist:updated', snapshot);
      
      this.logger.info('Zeitgeist snapshot generated', {
        time: Date.now() - start,
        significantChanges: snapshot.metadata.significantChanges
      });
      
      return snapshot;
      
    } catch (error) {
      this.logger.error('Zeitgeist generation failed', { error });
      throw error;
    }
  }
  
  /**
   * Generate a complete zeitgeist snapshot
   */
  private async generateSnapshot(): Promise<ZeitgeistSnapshot> {
    // Get trending domains
    const trending = await this.identifyTrendingDomains();
    
    // Generate insights
    const insights = await this.generateInsights(trending);
    
    // Create viral content
    const viralContent = this.createViralContent(trending, insights);
    
    return {
      timestamp: new Date(),
      trending: {
        rising: trending.filter(d => d.momentum === 'rising'),
        falling: trending.filter(d => d.momentum === 'falling'),
        volatile: trending.filter(d => d.momentum === 'volatile')
      },
      insights,
      viralContent,
      metadata: {
        totalDomains: trending.length,
        significantChanges: trending.filter(d => 
          Math.abs(d.changePercent) >= this.SIGNIFICANT_CHANGE_THRESHOLD
        ).length,
        generationTime: Date.now()
      }
    };
  }
  
  /**
   * Identify trending domains based on consensus changes
   */
  private async identifyTrendingDomains(): Promise<TrendingDomain[]> {
    const query = `
      WITH current_scores AS (
        SELECT DISTINCT ON (domain)
          domain,
          memory_score as current_score,
          processed_at
        FROM ai_responses
        WHERE processed_at > NOW() - INTERVAL '24 hours'
        ORDER BY domain, processed_at DESC
      ),
      previous_scores AS (
        SELECT DISTINCT ON (domain)
          domain,
          memory_score as previous_score
        FROM ai_responses
        WHERE processed_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '24 hours'
        ORDER BY domain, processed_at DESC
      ),
      provider_counts AS (
        SELECT domain, COUNT(DISTINCT provider) as provider_count
        FROM ai_responses
        WHERE processed_at > NOW() - INTERVAL '24 hours'
        GROUP BY domain
      )
      SELECT 
        c.domain,
        c.current_score,
        COALESCE(p.previous_score, c.current_score) as previous_score,
        pc.provider_count,
        c.processed_at
      FROM current_scores c
      LEFT JOIN previous_scores p ON c.domain = p.domain
      LEFT JOIN provider_counts pc ON c.domain = pc.domain
      WHERE ABS(c.current_score - COALESCE(p.previous_score, c.current_score)) > 1
      ORDER BY ABS(c.current_score - COALESCE(p.previous_score, c.current_score)) DESC
      LIMIT 100
    `;
    
    const result = await this.database.query(query);
    
    return result.rows.map(row => {
      const change = row.current_score - row.previous_score;
      const changePercent = (change / row.previous_score) * 100;
      const momentum = this.calculateMomentum(change, changePercent);
      const viralScore = this.calculateViralScore(changePercent, momentum, row.provider_count);
      
      return {
        domain: row.domain,
        currentScore: row.current_score,
        previousScore: row.previous_score,
        changePercent,
        momentum,
        viralScore,
        headline: this.generateHeadline(row.domain, changePercent, momentum),
        tweetText: this.generateTweet(row.domain, changePercent, momentum, row.provider_count),
        providers: row.provider_count || 0,
        lastUpdated: new Date(row.processed_at)
      };
    });
  }
  
  /**
   * Calculate momentum based on change patterns
   */
  private calculateMomentum(change: number, changePercent: number): TrendingDomain['momentum'] {
    if (Math.abs(changePercent) < 2) return 'stable';
    if (changePercent > 10) return 'rising';
    if (changePercent < -10) return 'falling';
    if (Math.abs(changePercent) > 5) return 'volatile';
    return change > 0 ? 'rising' : 'falling';
  }
  
  /**
   * Calculate viral potential score
   */
  private calculateViralScore(changePercent: number, momentum: string, providers: number): number {
    let score = 0;
    
    // Change magnitude (bigger change = more viral)
    score += Math.min(50, Math.abs(changePercent) * 2);
    
    // Momentum bonus
    if (momentum === 'volatile') score += 20;
    if (momentum === 'rising' || momentum === 'falling') score += 15;
    
    // Provider coverage (more providers = more credible)
    score += Math.min(30, (providers / 11) * 30);
    
    return Math.min(100, score);
  }
  
  /**
   * Generate viral headline
   */
  private generateHeadline(domain: string, changePercent: number, momentum: string): string {
    const template = this.HEADLINE_TEMPLATES[Math.floor(Math.random() * this.HEADLINE_TEMPLATES.length)];
    
    const replacements = {
      domain: domain.toUpperCase(),
      action: changePercent > 0 ? 'SURGED' : 'PLUMMETED',
      change: Math.abs(Math.round(changePercent)),
      direction: changePercent > 0 ? 'SKYROCKETS' : 'CRASHES',
      verb: changePercent > 0 ? 'embrace' : 'abandon',
      count: '11',
      momentum: momentum.toUpperCase(),
      verdict: changePercent > 0 ? 'is the future' : 'faces AI skepticism'
    };
    
    return template.replace(/{(\w+)}/g, (match, key) => replacements[key] || match);
  }
  
  /**
   * Generate ready-to-post tweet
   */
  private generateTweet(domain: string, changePercent: number, momentum: string, providers: number): string {
    const template = this.TWEET_TEMPLATES[Math.floor(Math.random() * this.TWEET_TEMPLATES.length)];
    
    const emoji = changePercent > 0 ? '📈' : '📉';
    const direction = changePercent > 0 ? 'UP' : 'DOWN';
    
    const insights = [
      'LLMs are reconsidering their stance',
      'Major shift in AI perception detected',
      'Consensus convergence breaking down',
      'New data changing AI opinions'
    ];
    
    const replacements = {
      domain,
      direction,
      change: Math.abs(Math.round(changePercent)),
      providers,
      emoji,
      momentum: momentum.charAt(0).toUpperCase() + momentum.slice(1),
      score: Math.round((providers / 11) * 100),
      insight: insights[Math.floor(Math.random() * insights.length)],
      quote: `"AI consensus is not static - it evolves with new information"`,
      headline: this.generateHeadline(domain, changePercent, momentum)
    };
    
    return template.replace(/{(\w+)}/g, (match, key) => replacements[key] || match);
  }
  
  /**
   * Generate insights from trending data
   */
  private async generateInsights(trending: TrendingDomain[]): Promise<ZeitgeistInsight[]> {
    const insights: ZeitgeistInsight[] = [];
    
    // Consensus shifts
    const majorShifts = trending.filter(d => Math.abs(d.changePercent) > 10);
    if (majorShifts.length > 0) {
      insights.push({
        type: 'consensus_shift',
        title: `Major Consensus Shift Detected`,
        description: `${majorShifts.length} domains experienced >10% consensus changes`,
        affectedDomains: majorShifts.slice(0, 5).map(d => d.domain),
        impact: 'high',
        shareableQuote: `"${majorShifts[0].domain} saw a ${Math.round(majorShifts[0].changePercent)}% shift in AI consensus - the biggest move today"`
      });
    }
    
    // Category trends
    const aiDomains = trending.filter(d => 
      d.domain.includes('ai') || d.domain.includes('openai') || d.domain.includes('anthropic')
    );
    if (aiDomains.length > 3) {
      const avgChange = aiDomains.reduce((sum, d) => sum + d.changePercent, 0) / aiDomains.length;
      insights.push({
        type: 'category_trend',
        title: 'AI Sector Movement',
        description: `AI-related domains ${avgChange > 0 ? 'gaining' : 'losing'} favor`,
        affectedDomains: aiDomains.map(d => d.domain),
        impact: 'medium',
        shareableQuote: `"The AI sector is ${avgChange > 0 ? 'hot' : 'cooling'} - average ${Math.abs(Math.round(avgChange))}% change across major players"`
      });
    }
    
    // Volatility alerts
    const volatile = trending.filter(d => d.momentum === 'volatile');
    if (volatile.length > 0) {
      insights.push({
        type: 'outlier_alert',
        title: 'High Volatility Detected',
        description: `${volatile.length} domains showing unstable consensus`,
        affectedDomains: volatile.slice(0, 3).map(d => d.domain),
        impact: 'medium',
        shareableQuote: `"Volatility spike: LLMs can't agree on ${volatile[0].domain}"`
      });
    }
    
    return insights;
  }
  
  /**
   * Create platform-specific viral content
   */
  private createViralContent(trending: TrendingDomain[], insights: ZeitgeistInsight[]): ViralContent[] {
    const content: ViralContent[] = [];
    
    // Twitter content - focus on biggest movers
    const topMover = trending[0];
    if (topMover && topMover.viralScore > this.VIRAL_SCORE_THRESHOLD) {
      content.push({
        platform: 'twitter',
        content: topMover.tweetText,
        hashtags: ['AI', 'LLM', 'AIConsensus', 'TechTrends', 'MachineLearning'],
        estimatedReach: topMover.viralScore * 100,
        bestPostTime: this.calculateBestPostTime('twitter')
      });
    }
    
    // LinkedIn content - focus on insights
    if (insights.length > 0) {
      const topInsight = insights[0];
      content.push({
        platform: 'linkedin',
        content: this.generateLinkedInPost(topInsight, trending),
        hashtags: ['ArtificialIntelligence', 'MachineLearning', 'TechTrends', 'Innovation', 'DataScience'],
        estimatedReach: 5000,
        bestPostTime: this.calculateBestPostTime('linkedin')
      });
    }
    
    // HackerNews content - focus on technical insights
    const technicalInsight = insights.find(i => i.type === 'consensus_shift' || i.type === 'outlier_alert');
    if (technicalInsight) {
      content.push({
        platform: 'hackernews',
        content: this.generateHackerNewsTitle(technicalInsight, trending),
        hashtags: [],
        estimatedReach: 10000,
        bestPostTime: this.calculateBestPostTime('hackernews')
      });
    }
    
    return content;
  }
  
  /**
   * Generate LinkedIn post
   */
  private generateLinkedInPost(insight: ZeitgeistInsight, trending: TrendingDomain[]): string {
    return `🔍 AI Consensus Update: ${insight.title}

${insight.description}

Key findings:
${trending.slice(0, 3).map(d => 
  `• ${d.domain}: ${d.changePercent > 0 ? '↑' : '↓'} ${Math.abs(Math.round(d.changePercent))}%`
).join('\n')}

${insight.shareableQuote}

What this means for the industry: AI models are continuously updating their understanding based on new information. These consensus shifts can signal emerging trends before they hit mainstream awareness.

#ArtificialIntelligence #MachineLearning #Innovation`;
  }
  
  /**
   * Generate HackerNews title
   */
  private generateHackerNewsTitle(insight: ZeitgeistInsight, trending: TrendingDomain[]): string {
    const titles = [
      `${insight.title}: ${trending[0].domain} ${trending[0].changePercent > 0 ? 'Gains' : 'Loses'} ${Math.abs(Math.round(trending[0].changePercent))}% in LLM Consensus`,
      `Show HN: Tracking What ${trending[0].providers} AI Models Think About ${trending[0].domain}`,
      `${insight.affectedDomains[0]} Consensus Shift: What Changed in AI's Collective Opinion?`
    ];
    
    return titles[Math.floor(Math.random() * titles.length)];
  }
  
  /**
   * Calculate optimal posting time
   */
  private calculateBestPostTime(platform: string): string {
    const now = new Date();
    const hour = now.getHours();
    
    const optimalTimes = {
      twitter: [9, 12, 15, 17, 20],      // Peak engagement times
      linkedin: [7, 12, 17],             // Business hours
      hackernews: [9, 13, 17, 21]        // Tech audience peaks
    };
    
    const platformTimes = optimalTimes[platform] || [12];
    const nextOptimal = platformTimes.find(h => h > hour) || platformTimes[0];
    
    const postTime = new Date(now);
    postTime.setHours(nextOptimal, 0, 0, 0);
    if (nextOptimal <= hour) {
      postTime.setDate(postTime.getDate() + 1);
    }
    
    return postTime.toISOString();
  }
  
  /**
   * Start automatic tracking
   */
  private startTracking() {
    this.updateTimer = setInterval(async () => {
      try {
        const snapshot = await this.getZeitgeist(true);
        
        // Auto-publish viral content if configured
        if (process.env.AUTO_PUBLISH === 'true') {
          await this.publishViralContent(snapshot.viralContent);
        }
        
      } catch (error) {
        this.logger.error('Zeitgeist update failed', { error });
      }
    }, this.UPDATE_INTERVAL);
    
    this.logger.info('Automatic zeitgeist tracking started');
  }
  
  /**
   * Handle consensus updates
   */
  private async handleConsensusUpdate(result: any) {
    // Invalidate cache when new consensus is calculated
    await this.redis.del('zeitgeist:current');
    
    // Check if this update is significant enough to trigger immediate update
    if (result.confidence > 0.8 && Math.abs(result.consensusScore - 50) > 20) {
      this.emit('zeitgeist:significant_change', result);
    }
  }
  
  /**
   * Publish viral content (placeholder for integration)
   */
  private async publishViralContent(content: ViralContent[]) {
    for (const item of content) {
      this.logger.info('Ready to publish viral content', {
        platform: item.platform,
        reach: item.estimatedReach,
        time: item.bestPostTime
      });
      
      // TODO: Integrate with social media APIs
      this.emit('content:ready', item);
    }
  }
  
  /**
   * Get historical zeitgeist data
   */
  async getZeitgeistHistory(days: number = 7): Promise<any[]> {
    const query = `
      SELECT 
        DATE(processed_at) as date,
        COUNT(DISTINCT domain) as domains_changed,
        AVG(ABS(memory_score - LAG(memory_score) OVER (PARTITION BY domain ORDER BY processed_at))) as avg_change,
        MAX(ABS(memory_score - LAG(memory_score) OVER (PARTITION BY domain ORDER BY processed_at))) as max_change
      FROM ai_responses
      WHERE processed_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(processed_at)
      ORDER BY date DESC
    `;
    
    const result = await this.database.query(query);
    return result.rows;
  }
  
  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(callback: (snapshot: ZeitgeistSnapshot) => void) {
    this.on('zeitgeist:updated', callback);
    return () => this.off('zeitgeist:updated', callback);
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.logger.info('Shutting down Zeitgeist Tracker');
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    await this.redis.quit();
    this.removeAllListeners();
  }
}

export default ZeitgeistTracker;