// ============================================================================
// 🎯 REALITY VALIDATOR TYPES
// ============================================================================

export interface DomainData {
  id: string;
  domain: string;
  ai_consensus_score: number;
  memory_score: number;
  model_count: number;
  last_processed: Date;
}

export interface AIResponse {
  domain_id: string;
  model: string;
  prompt_type: string;
  raw_response: string;
  captured_at: Date;
  token_count: number;
}

export interface GroundTruthMetrics {
  domain_id: string;
  financial_data: FinancialData;
  regulatory_data: RegulatoryData;
  market_data: MarketData;
  business_data: BusinessData;
  calculated_at: Date;
  data_freshness: string;
}

export interface FinancialData {
  stock_symbol?: string;
  stock_price?: number;
  market_cap?: number;
  revenue_ttm?: number;
  profit_margin?: number;
  debt_to_equity?: number;
  status: 'public' | 'private' | 'delisted' | 'bankrupt' | 'unknown';
  last_updated: Date;
}

export interface RegulatoryData {
  sec_filings: SECFiling[];
  violations: RegulatoryViolation[];
  investigations: Investigation[];
  compliance_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  last_updated: Date;
}

export interface SECFiling {
  form_type: string;
  filing_date: Date;
  description: string;
  significance: 'routine' | 'important' | 'critical';
}

export interface RegulatoryViolation {
  agency: string;
  violation_type: string;
  date: Date;
  penalty_amount?: number;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'severe';
}

export interface Investigation {
  agency: string;
  investigation_type: string;
  start_date: Date;
  status: 'ongoing' | 'closed' | 'settled';
  outcome?: string;
}

export interface MarketData {
  google_trends_score: number;
  social_sentiment: number;
  news_sentiment: number;
  brand_mentions: number;
  search_volume_trend: 'increasing' | 'stable' | 'decreasing';
  last_updated: Date;
}

export interface BusinessData {
  funding_rounds: FundingRound[];
  employee_count?: number;
  business_stage: 'startup' | 'growth' | 'mature' | 'declining' | 'defunct';
  industry: string;
  headquarters?: string;
  founded_year?: number;
  last_updated: Date;
}

export interface FundingRound {
  round_type: string;
  amount: number;
  date: Date;
  investors: string[];
  valuation?: number;
}

export interface RealityCheck {
  domain: string;
  domain_id: string;
  ai_assessment: AIAssessment;
  reality_metrics: GroundTruthMetrics;
  divergence_analysis: DivergenceAnalysis;
  truth_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  last_updated: Date;
}

export interface AIAssessment {
  consensus_score: number;
  model_agreement: number;
  confidence_level: number;
  dominant_themes: string[];
  sentiment_distribution: Record<string, number>;
  model_breakdown: ModelBreakdown[];
}

export interface ModelBreakdown {
  model: string;
  score: number;
  confidence: number;
  key_themes: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface DivergenceAnalysis {
  overall_divergence: number;
  financial_divergence: number;
  regulatory_divergence: number;
  market_divergence: number;
  divergence_level: 'low' | 'medium' | 'high' | 'extreme';
  key_discrepancies: string[];
  risk_factors: string[];
}

export interface TimelinePoint {
  date: Date;
  ai_score: number;
  reality_score: number;
  major_events: string[];
  divergence: number;
}

export interface ModelAccuracy {
  model: string;
  overall_accuracy: number;
  financial_accuracy: number;
  regulatory_accuracy: number;
  market_accuracy: number;
  bias_direction: 'optimistic' | 'pessimistic' | 'neutral';
  confidence_calibration: number;
  sample_size: number;
}

export interface DivergenceAlert {
  domain: string;
  alert_type: 'high_divergence' | 'reality_shift' | 'ai_blindspot' | 'crisis_lag';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  ai_score: number;
  reality_score: number;
  divergence: number;
  recommended_action: string;
  created_at: Date;
}

export interface DataSource {
  name: string;
  type: 'financial' | 'regulatory' | 'market' | 'business';
  reliability: number;
  update_frequency: string;
  last_updated: Date;
  status: 'active' | 'inactive' | 'error';
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  processing_time_ms: number;
}

export interface BatchRequest {
  domains: string[];
  include_timeline?: boolean;
  include_alerts?: boolean;
  max_age_hours?: number;
} 