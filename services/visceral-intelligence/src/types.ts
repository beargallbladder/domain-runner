export interface VisceralAlert {
  id: string;
  intensity: 'bloodbath' | 'domination' | 'uprising' | 'collapse' | 'annihilation' | 'rampage' | 'obliteration';
  headline: string;
  victim: string[];
  aggressor: string;
  damage_assessment: string;
  market_position_change: number;
  category: string;
  timestamp: Date;
  confidence_score: number;
  viral_potential: number;
  executive_urgency: 'critical' | 'high' | 'medium' | 'low';
}

export interface CompetitiveCarnage {
  domain: string;
  category: string;
  current_rank: number;
  previous_rank: number;
  rank_change: number;
  score: number;
  score_change: number;
  market_share_impact: number;
  carnage_level: 'getting_destroyed' | 'bleeding' | 'stable' | 'rising' | 'dominating' | 'annihilating';
  trend_direction: 'freefall' | 'decline' | 'sideways' | 'growth' | 'rocket_ship' | 'unstoppable';
  threat_level: 'existential' | 'severe' | 'moderate' | 'minimal' | 'none';
}

export interface MarketDomination {
  category: string;
  leader: string;
  leader_score: number;
  gap_to_second: number;
  total_destruction: CompetitiveCarnage[];
  rising_threats: CompetitiveCarnage[];
  market_volatility: number;
  disruption_probability: number;
}

export interface VisceralMetrics {
  total_domains_tracked: number;
  categories_monitored: number;
  active_bloodbaths: number;
  domination_events: number;
  uprising_alerts: number;
  market_volatility_index: number;
  competitive_intensity_score: number;
  disruption_probability: number;
}

export interface EnterpriseReport {
  executive_summary: string;
  competitive_threats: VisceralAlert[];
  market_opportunities: VisceralAlert[];
  immediate_actions: string[];
  strategic_recommendations: string[];
  risk_assessment: {
    existential_threats: number;
    market_disruption_risk: number;
    competitive_pressure: number;
  };
}

export interface ShareableContent {
  type: 'victory_brag' | 'threat_warning' | 'market_carnage' | 'domination_report';
  headline: string;
  content: string;
  visual_elements: {
    background_color: string;
    animation: string;
    emoji: string;
  };
  cta_premium: string;
  viral_hooks: string[];
}

export interface RealTimeEvent {
  event_id: string;
  event_type: 'rank_change' | 'score_change' | 'new_competitor' | 'market_shift';
  domain: string;
  category: string;
  impact_magnitude: number;
  visceral_impact: VisceralAlert;
  timestamp: Date;
  broadcast_priority: number;
}

export interface PremiumTrigger {
  trigger_type: 'competitive_anxiety' | 'fomo_pressure' | 'market_opportunity' | 'threat_exposure';
  message: string;
  urgency_level: number;
  conversion_probability: number;
  preview_data: any;
  upgrade_incentive: string;
}