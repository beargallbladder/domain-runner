/**
 * AI Zeitgeist Tracker Interfaces
 * Live feed of what's trending in AI consciousness
 */

export interface ZeitgeistTrend {
  id: string;
  topic: string;
  category: TrendCategory;
  momentum: number; // -100 to 100 (negative = declining, positive = rising)
  velocity: number; // Rate of change
  volume: number; // Number of mentions across LLMs
  sentiment: number; // -1 to 1
  firstDetected: Date;
  lastUpdated: Date;
  peakTime?: Date;
  domains: DomainMention[];
  keywords: KeywordFrequency[];
  llmConsensus: LLMConsensusLevel;
  visualizationData?: TrendVisualization;
}

export type TrendCategory = 
  | 'technology'
  | 'company'
  | 'product'
  | 'person'
  | 'event'
  | 'concept'
  | 'controversy'
  | 'innovation'
  | 'market_shift';

export interface DomainMention {
  domain: string;
  frequency: number;
  sentiment: number;
  context: string[];
}

export interface KeywordFrequency {
  keyword: string;
  count: number;
  growth: number; // Percentage growth over time period
  associations: string[];
}

export type LLMConsensusLevel = 
  | 'unanimous' 
  | 'strong' 
  | 'moderate' 
  | 'weak' 
  | 'divergent';

export interface TrendVisualization {
  timeSeries: TimeSeriesPoint[];
  heatmap?: HeatmapData;
  networkGraph?: NetworkNode[];
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  volume: number;
}

export interface HeatmapData {
  providers: string[];
  timestamps: Date[];
  values: number[][];
}

export interface NetworkNode {
  id: string;
  label: string;
  size: number;
  connections: string[];
  weight: number;
}

export interface ZeitgeistSnapshot {
  timestamp: Date;
  totalTrends: number;
  risingTrends: ZeitgeistTrend[];
  decliningTrends: ZeitgeistTrend[];
  emergingTopics: EmergingTopic[];
  dominantThemes: string[];
  llmDivergence: DivergenceMetric[];
  globalSentiment: SentimentBreakdown;
}

export interface EmergingTopic {
  topic: string;
  firstMention: Date;
  growthRate: number;
  predictedPeak?: Date;
  relatedTrends: string[];
  earlyAdopters: string[]; // LLM providers that mentioned it first
}

export interface DivergenceMetric {
  topic: string;
  providers: {
    [provider: string]: {
      sentiment: number;
      emphasis: number; // 0-1, how much they emphasize this topic
      perspective: string; // Brief description of their take
    };
  };
  divergenceScore: number; // 0-100, how much providers disagree
}

export interface SentimentBreakdown {
  overall: number;
  byCategory: {
    [category in TrendCategory]?: number;
  };
  byProvider: {
    [provider: string]: number;
  };
  volatility: number; // How much sentiment varies
}

export interface ZeitgeistQuery {
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'all';
  categories?: TrendCategory[];
  minMomentum?: number;
  providers?: string[];
  keywords?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral' | 'all';
  limit?: number;
  includeVisualization?: boolean;
}

export interface ZeitgeistAlert {
  id: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend: ZeitgeistTrend;
  message: string;
  detectedAt: Date;
  metadata?: any;
}

export type AlertType = 
  | 'rapid_rise'      // Trend rising unusually fast
  | 'consensus_shift' // LLMs changing opinion
  | 'divergence'      // LLMs strongly disagree
  | 'sentiment_flip'  // Sentiment changed polarity
  | 'volume_spike'    // Unusual mention volume
  | 'new_emergence'   // Brand new topic detected
  | 'trend_reversal'; // Trend changed direction

export interface ZeitgeistSubscription {
  id: string;
  userId: string;
  filters: ZeitgeistQuery;
  alertTypes: AlertType[];
  webhookUrl?: string;
  email?: string;
  realtime: boolean;
  created: Date;
}

export interface ZeitgeistEngine {
  // Core methods
  getCurrentZeitgeist(): Promise<ZeitgeistSnapshot>;
  getTrends(query: ZeitgeistQuery): Promise<ZeitgeistTrend[]>;
  getTrendById(id: string): Promise<ZeitgeistTrend | null>;
  getEmergingTopics(limit?: number): Promise<EmergingTopic[]>;
  
  // Real-time methods
  streamTrends(callback: (trend: ZeitgeistTrend) => void): void;
  subscribeToAlerts(subscription: ZeitgeistSubscription): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  
  // Analysis methods
  analyzeTrendTrajectory(trendId: string): Promise<TrendPrediction>;
  compareProviderPerspectives(topic: string): Promise<DivergenceMetric>;
  getHistoricalTrends(topic: string, days: number): Promise<TrendHistory>;
  
  // Admin methods
  forceRefresh(): Promise<void>;
  getEngineMetrics(): Promise<EngineMetrics>;
}

export interface TrendPrediction {
  trendId: string;
  currentMomentum: number;
  predictedPeak: Date;
  peakValue: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

export interface TrendHistory {
  topic: string;
  dataPoints: TimeSeriesPoint[];
  peaks: { date: Date; value: number }[];
  averageDuration: number; // Average trend lifespan in hours
  recurrence: number; // How often this topic trends
}

export interface EngineMetrics {
  activeTrackings: number;
  trendsPerHour: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  subscriptionCount: number;
  alertsGenerated: number;
  lastUpdate: Date;
}

export interface ZeitgeistWebSocketMessage {
  type: 'trend:new' | 'trend:update' | 'trend:alert' | 'snapshot:update' | 'metrics:update';
  data: any;
  timestamp: Date;
}

export interface ZeitgeistConfig {
  updateInterval: number; // ms
  trendThreshold: number; // Minimum mentions to be considered a trend
  emergenceWindow: number; // Hours to look back for emergence
  alertThresholds: {
    rapidRise: number; // Momentum threshold
    consensusShift: number; // Consensus change threshold
    divergence: number; // Divergence score threshold
    volumeSpike: number; // Volume multiplier threshold
  };
  providers: string[]; // LLM providers to track
  enableRealtime: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
}