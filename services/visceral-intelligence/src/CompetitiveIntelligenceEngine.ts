import { Pool } from 'pg';
import { VisceralAlert, CompetitiveCarnage, MarketDomination, RealTimeEvent, PremiumTrigger } from './types';
import { VisceralLanguageEngine } from './VisceralLanguageEngine';

export class CompetitiveIntelligenceEngine {
  private pool: Pool;
  private languageEngine: VisceralLanguageEngine;
  private alertHistory: Map<string, VisceralAlert[]> = new Map();
  private carnageCache: Map<string, CompetitiveCarnage[]> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.languageEngine = new VisceralLanguageEngine();
  }

  async detectMarketCarnage(): Promise<VisceralAlert[]> {
    try {
      // Get latest domain scores and rankings across all categories
      const query = `
        WITH ranked_domains AS (
          SELECT 
            d.domain,
            d.category,
            d.llm_pagerank_score as current_score,
            LAG(d.llm_pagerank_score, 1) OVER (PARTITION BY d.domain, d.category ORDER BY d.updated_at) as previous_score,
            ROW_NUMBER() OVER (PARTITION BY d.category ORDER BY d.llm_pagerank_score DESC) as current_rank,
            LAG(ROW_NUMBER() OVER (PARTITION BY d.category ORDER BY d.llm_pagerank_score DESC), 1) 
              OVER (PARTITION BY d.domain, d.category ORDER BY d.updated_at) as previous_rank,
            d.updated_at,
            LAG(d.updated_at, 1) OVER (PARTITION BY d.domain, d.category ORDER BY d.updated_at) as previous_update
          FROM domains d 
          WHERE d.llm_pagerank_score IS NOT NULL 
            AND d.updated_at >= NOW() - INTERVAL '24 hours'
        ),
        carnage_analysis AS (
          SELECT 
            domain,
            category,
            current_score,
            previous_score,
            COALESCE(previous_score, current_score) as safe_previous_score,
            current_rank,
            COALESCE(previous_rank, current_rank) as safe_previous_rank,
            (current_score - COALESCE(previous_score, current_score)) as score_change,
            (COALESCE(previous_rank, current_rank) - current_rank) as rank_change,
            CASE 
              WHEN current_rank <= 3 AND (COALESCE(previous_rank, current_rank) - current_rank) >= 2 THEN 'dominating'
              WHEN current_rank <= 3 AND current_score >= 85 THEN 'annihilating'
              WHEN (COALESCE(previous_rank, current_rank) - current_rank) >= 5 THEN 'rising'
              WHEN (current_rank - COALESCE(previous_rank, current_rank)) >= 5 THEN 'getting_destroyed'
              WHEN (current_rank - COALESCE(previous_rank, current_rank)) >= 2 THEN 'bleeding'
              ELSE 'stable'
            END as carnage_level,
            CASE 
              WHEN (current_score - COALESCE(previous_score, current_score)) >= 15 THEN 'rocket_ship'
              WHEN (current_score - COALESCE(previous_score, current_score)) >= 8 THEN 'growth'
              WHEN ABS(current_score - COALESCE(previous_score, current_score)) < 3 THEN 'sideways'
              WHEN (current_score - COALESCE(previous_score, current_score)) <= -8 THEN 'decline'
              WHEN (current_score - COALESCE(previous_score, current_score)) <= -15 THEN 'freefall'
              ELSE 'sideways'
            END as trend_direction,
            updated_at
          FROM ranked_domains
          WHERE previous_score IS NOT NULL OR previous_rank IS NOT NULL
        )
        SELECT * FROM carnage_analysis 
        WHERE carnage_level != 'stable' 
        ORDER BY ABS(rank_change) DESC, ABS(score_change) DESC
        LIMIT 50
      `;

      const result = await this.pool.query(query);
      const carnageData: CompetitiveCarnage[] = result.rows.map(row => ({
        domain: row.domain,
        category: row.category,
        current_rank: row.current_rank,
        previous_rank: row.safe_previous_rank,
        rank_change: row.rank_change,
        score: row.current_score,
        score_change: ((row.current_score - row.safe_previous_score) / row.safe_previous_score) * 100,
        market_share_impact: this.calculateMarketShareImpact(row.rank_change, row.current_rank),
        carnage_level: row.carnage_level,
        trend_direction: row.trend_direction,
        threat_level: this.assessThreatLevel(row.carnage_level, row.rank_change, row.current_rank)
      }));

      // Group by category for context analysis
      const categoryGroups = new Map<string, CompetitiveCarnage[]>();
      carnageData.forEach(carnage => {
        if (!categoryGroups.has(carnage.category)) {
          categoryGroups.set(carnage.category, []);
        }
        categoryGroups.get(carnage.category)!.push(carnage);
      });

      // Generate visceral alerts
      const alerts: VisceralAlert[] = [];
      
      for (const [category, categoryData] of categoryGroups) {
        const significantEvents = categoryData.filter(c => 
          Math.abs(c.rank_change) >= 3 || Math.abs(c.score_change) >= 10
        );

        for (const carnage of significantEvents) {
          const alert = this.generateVisceralAlert(carnage, categoryData);
          if (alert) {
            alerts.push(alert);
          }
        }
      }

      // Cache results and return
      this.carnageCache.set('latest', carnageData);
      return alerts.sort((a, b) => b.confidence_score - a.confidence_score);

    } catch (error) {
      console.error('Error detecting market carnage:', error);
      return [];
    }
  }

  private generateVisceralAlert(carnage: CompetitiveCarnage, categoryContext: CompetitiveCarnage[]): VisceralAlert | null {
    const intensity = this.determineAlertIntensity(carnage);
    if (!intensity) return null;

    const headline = this.languageEngine.generateVisceralHeadline(carnage, categoryContext);
    const damageAssessment = this.languageEngine.generateDamageAssessment(carnage, categoryContext);
    
    // Determine aggressor and victims
    let aggressor = carnage.domain;
    let victims = [carnage.domain];
    
    if (carnage.carnage_level === 'dominating' || carnage.carnage_level === 'annihilating') {
      victims = categoryContext
        .filter(c => c.domain !== carnage.domain && (c.carnage_level === 'bleeding' || c.carnage_level === 'getting_destroyed'))
        .map(c => c.domain)
        .slice(0, 3);
    } else if (carnage.carnage_level === 'getting_destroyed' || carnage.carnage_level === 'bleeding') {
      const dominators = categoryContext.filter(c => c.carnage_level === 'dominating' || c.carnage_level === 'rising');
      aggressor = dominators.length > 0 ? dominators[0].domain : 'competitors';
    }

    return {
      id: `alert_${Date.now()}_${carnage.domain}_${carnage.category}`,
      intensity,
      headline,
      victim: victims,
      aggressor,
      damage_assessment: damageAssessment,
      market_position_change: carnage.rank_change,
      category: carnage.category,
      timestamp: new Date(),
      confidence_score: this.calculateConfidenceScore(carnage, categoryContext),
      viral_potential: this.calculateViralPotential(carnage),
      executive_urgency: this.determineExecutiveUrgency(carnage)
    };
  }

  private determineAlertIntensity(carnage: CompetitiveCarnage): VisceralAlert['intensity'] | null {
    const { carnage_level, rank_change, score_change } = carnage;
    
    if (carnage_level === 'annihilating' || (carnage_level === 'dominating' && Math.abs(rank_change) >= 8)) {
      return 'obliteration';
    }
    
    if (carnage_level === 'dominating' || (carnage_level === 'rising' && rank_change >= 8)) {
      return 'domination';
    }
    
    if (carnage_level === 'getting_destroyed' && rank_change <= -8) {
      return 'bloodbath';
    }
    
    if (carnage_level === 'rising' && rank_change >= 5) {
      return 'uprising';
    }
    
    if (carnage_level === 'bleeding' && rank_change <= -5) {
      return 'collapse';
    }
    
    if (carnage_level === 'rising' && Math.abs(score_change) >= 15) {
      return 'rampage';
    }
    
    if (Math.abs(rank_change) >= 3 || Math.abs(score_change) >= 10) {
      return 'annihilation';
    }
    
    return null;
  }

  private calculateMarketShareImpact(rankChange: number, currentRank: number): number {
    // Market share impact based on rank position and change
    if (currentRank <= 3) {
      return rankChange * 3.5; // Top 3 have higher impact
    } else if (currentRank <= 10) {
      return rankChange * 2.0;
    } else {
      return rankChange * 1.0;
    }
  }

  private assessThreatLevel(carnageLevel: CompetitiveCarnage['carnage_level'], rankChange: number, currentRank: number): CompetitiveCarnage['threat_level'] {
    if (carnageLevel === 'getting_destroyed' && currentRank > 20) {
      return 'existential';
    }
    
    if (carnageLevel === 'bleeding' && rankChange <= -10) {
      return 'severe';
    }
    
    if (carnageLevel === 'bleeding' || (carnageLevel === 'getting_destroyed' && currentRank <= 20)) {
      return 'moderate';
    }
    
    if (carnageLevel === 'stable' || carnageLevel === 'rising' || carnageLevel === 'dominating') {
      return 'minimal';
    }
    
    return 'none';
  }

  private calculateConfidenceScore(carnage: CompetitiveCarnage, context: CompetitiveCarnage[]): number {
    let score = 0.5; // Base confidence
    
    // Rank change significance
    score += Math.min(Math.abs(carnage.rank_change) / 20, 0.3);
    
    // Score change significance  
    score += Math.min(Math.abs(carnage.score_change) / 50, 0.2);
    
    // Market context - if multiple competitors affected
    const affectedCompetitors = context.filter(c => Math.abs(c.rank_change) >= 2).length;
    score += Math.min(affectedCompetitors / 10, 0.15);
    
    // Position significance - changes in top ranks are more significant
    if (carnage.current_rank <= 5) {
      score += 0.15;
    } else if (carnage.current_rank <= 10) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private calculateViralPotential(carnage: CompetitiveCarnage): number {
    let potential = 0.3; // Base viral potential
    
    // Extreme changes are more viral
    potential += Math.min(Math.abs(carnage.rank_change) / 15, 0.3);
    potential += Math.min(Math.abs(carnage.score_change) / 30, 0.2);
    
    // Top positions are more viral
    if (carnage.current_rank <= 3) {
      potential += 0.2;
    }
    
    // Dramatic carnage levels are more viral
    if (carnage.carnage_level === 'annihilating' || carnage.carnage_level === 'getting_destroyed') {
      potential += 0.15;
    }
    
    return Math.min(potential, 1.0);
  }

  private determineExecutiveUrgency(carnage: CompetitiveCarnage): VisceralAlert['executive_urgency'] {
    if (carnage.threat_level === 'existential' || 
        (carnage.carnage_level === 'getting_destroyed' && carnage.current_rank <= 10)) {
      return 'critical';
    }
    
    if (carnage.threat_level === 'severe' || 
        (carnage.carnage_level === 'bleeding' && carnage.current_rank <= 15)) {
      return 'high';
    }
    
    if (carnage.threat_level === 'moderate' || Math.abs(carnage.rank_change) >= 5) {
      return 'medium';
    }
    
    return 'low';
  }

  async generatePremiumTriggers(userDomain?: string): Promise<PremiumTrigger[]> {
    const carnageData = this.carnageCache.get('latest') || [];
    const triggers: PremiumTrigger[] = [];
    
    if (userDomain) {
      // Personalized triggers for specific domain
      const userCarnage = carnageData.find(c => c.domain === userDomain);
      if (userCarnage && userCarnage.threat_level !== 'none') {
        triggers.push({
          trigger_type: 'competitive_anxiety',
          message: `Your position in ${userCarnage.category} is under pressure. See who's gaining ground.`,
          urgency_level: this.mapThreatToUrgency(userCarnage.threat_level),
          conversion_probability: 0.75,
          preview_data: { rank_change: userCarnage.rank_change, category: userCarnage.category },
          upgrade_incentive: 'UNLOCK FULL THREAT ANALYSIS'
        });
      }
    }
    
    // General market opportunity triggers
    const majorUprisings = carnageData.filter(c => c.carnage_level === 'rising' && c.rank_change >= 8);
    if (majorUprisings.length > 0) {
      triggers.push({
        trigger_type: 'market_opportunity',
        message: `${majorUprisings.length} newcomers are DISRUPTING major categories. See the full uprising.`,
        urgency_level: 8,
        conversion_probability: 0.6,
        preview_data: { uprisings: majorUprisings.length },
        upgrade_incentive: 'SEE DISRUPTION OPPORTUNITIES'
      });
    }
    
    // FOMO pressure for high-impact events
    const bloodbaths = carnageData.filter(c => c.carnage_level === 'getting_destroyed');
    if (bloodbaths.length >= 3) {
      triggers.push({
        trigger_type: 'fomo_pressure',
        message: `Major market carnage happening NOW. ${bloodbaths.length} brands getting destroyed.`,
        urgency_level: 9,
        conversion_probability: 0.8,
        preview_data: { bloodbath_count: bloodbaths.length },
        upgrade_incentive: 'WITNESS THE CARNAGE'
      });
    }
    
    return triggers.sort((a, b) => b.urgency_level - a.urgency_level);
  }

  private mapThreatToUrgency(threat: CompetitiveCarnage['threat_level']): number {
    switch (threat) {
      case 'existential': return 10;
      case 'severe': return 8;
      case 'moderate': return 6;
      case 'minimal': return 3;
      default: return 1;
    }
  }

  async getMarketDomination(): Promise<MarketDomination[]> {
    const carnageData = this.carnageCache.get('latest') || [];
    const categoryGroups = new Map<string, CompetitiveCarnage[]>();
    
    carnageData.forEach(carnage => {
      if (!categoryGroups.has(carnage.category)) {
        categoryGroups.set(carnage.category, []);
      }
      categoryGroups.get(carnage.category)!.push(carnage);
    });
    
    const domination: MarketDomination[] = [];
    
    for (const [category, data] of categoryGroups) {
      const sortedByRank = data.sort((a, b) => a.current_rank - b.current_rank);
      const leader = sortedByRank[0];
      const second = sortedByRank[1];
      
      if (leader && second) {
        const volatility = this.calculateMarketVolatility(data);
        
        domination.push({
          category,
          leader: leader.domain,
          leader_score: leader.score,
          gap_to_second: leader.score - second.score,
          total_destruction: data.filter(c => c.carnage_level === 'getting_destroyed' || c.carnage_level === 'bleeding'),
          rising_threats: data.filter(c => c.carnage_level === 'rising' && c.rank_change >= 3),
          market_volatility: volatility,
          disruption_probability: this.calculateDisruptionProbability(data)
        });
      }
    }
    
    return domination.sort((a, b) => b.market_volatility - a.market_volatility);
  }

  private calculateMarketVolatility(data: CompetitiveCarnage[]): number {
    const changes = data.map(d => Math.abs(d.rank_change));
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    return Math.min(avgChange / 10, 1.0); // Normalize to 0-1
  }

  private calculateDisruptionProbability(data: CompetitiveCarnage[]): number {
    const risingThreats = data.filter(d => d.carnage_level === 'rising' && d.rank_change >= 5).length;
    const fallingLeaders = data.filter(d => d.current_rank <= 5 && d.rank_change <= -2).length;
    
    return Math.min((risingThreats * 0.3 + fallingLeaders * 0.4) / data.length, 1.0);
  }
}