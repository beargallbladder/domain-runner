// ============================================================================
// INDUSTRY INTELLIGENCE - FOUNDATIONAL TYPES
// ============================================================================

export interface Industry {
  name: string;
  sectors: string[];
  market_cap_threshold: number;
  volatility: 'low' | 'medium' | 'high';
  rebrand_frequency: 'very_low' | 'low' | 'medium' | 'high';
  ai_relevance: 'low' | 'medium' | 'high' | 'critical';
}

export interface JoltCriteria {
  description: string;
  severity: 'low' | 'medium' | 'high';
  additional_prompts: number;
}

export interface BenchmarkCategory {
  description: string;
  measurement: string;
}

export interface JoltBenchmark {
  old_domain: string;
  new_domain: string | null;
  industry: string;
  sector: string;
  transition_date: string;
  type: 'brand_transition' | 'corporate_restructure' | 'acquisition_merger' | 'leadership_change';
  severity: 'low' | 'medium' | 'high';
  current_scores: Record<string, number | null>;
  baseline_metrics: {
    memory_decay_rate: number | null;
    brand_confusion_level: number;
    ai_consensus: number | null;
  };
  market_context: {
    investment: number;
    strategic_rationale: string;
    market_reaction: 'positive' | 'negative' | 'mixed';
  };
  ai_behavior_patterns: {
    models_still_use_facebook?: number;
    models_still_use_google?: number;
    models_still_use_twitter?: number;
    models_still_use_weightwatchers?: number;
    models_still_use_dunkindonuts?: number;
    models_understand_connection: number;
    temporal_awareness: number;
  };
}

export interface IndustryBenchmark {
  avg_memory_score: number;
  jolt_success_rate: number;
  typical_decay_pattern: string;
  ai_adaptability: 'low' | 'medium' | 'high';
}

export interface DomainAnalysis {
  domain: string;
  industry: string;
  sector: string;
  current_score: number | null;
  benchmark_comparison: {
    vs_industry_avg: number;
    vs_similar_jolts: JoltComparison[];
    threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    precipice_distance: number;
  };
}

export interface JoltComparison {
  benchmark_name: string;
  score_difference: number;
  similarity_factors: string[];
  outcome_prediction: string;
}

export interface FoundationConfig {
  industries: Record<string, Industry>;
  jolt_criteria: Record<string, JoltCriteria>;
  benchmark_categories: Record<string, BenchmarkCategory>;
}

export interface JoltBenchmarkConfig {
  jolt_benchmarks: Record<string, JoltBenchmark>;
  industry_benchmarks: Record<string, IndustryBenchmark>;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  version: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  config_loaded: boolean;
  benchmarks_loaded: boolean;
  uptime: number;
} 