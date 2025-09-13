import { Pool } from 'pg';
import { CompetitiveCarnage, MarketDomination, VisceralAlert } from './types';

export interface CrossPlatformDomination {
  domain: string;
  total_categories: number;
  dominated_categories: number;
  domination_percentage: number;
  domination_level: 'none' | 'emerging' | 'significant' | 'major' | 'total';
  category_breakdown: CategoryDomination[];
  competitive_threats: string[];
  empire_score: number;
  trajectory: 'building' | 'maintaining' | 'losing';
}

export interface CategoryDomination {
  category: string;
  rank: number;
  score: number;
  market_share_estimate: number;
  domination_strength: 'weak' | 'moderate' | 'strong' | 'overwhelming';
  gap_to_second: number;
  threat_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  closest_competitor: string;
  time_in_position: number; // days
  position_stability: 'unstable' | 'volatile' | 'stable' | 'entrenched';
}

export interface MarketEmpire {
  emperor: string;
  total_empire_score: number;
  categories_ruled: string[];
  vassal_categories: string[]; // categories where they're #2-3
  territories_lost: string[];
  expansion_opportunities: string[];
  existential_threats: string[];
  empire_stability: 'collapsing' | 'declining' | 'stable' | 'growing' | 'conquering';
}

export interface CompetitiveBattleground {
  category: string;
  battle_intensity: 'skirmish' | 'engagement' | 'battle' | 'war' | 'apocalypse';
  primary_combatants: string[];
  current_leader: string;
  challenger: string;
  lead_margin: number;
  battle_duration: number; // days
  predicted_victor: string;
  confidence: number;
  civilian_casualties: string[]; // other competitors affected
}

export class DominationTracker {
  private pool: Pool;
  private dominationHistory: Map<string, CrossPlatformDomination[]> = new Map();
  private battleHistory: Map<string, CompetitiveBattleground[]> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async trackCrossPlatformDomination(): Promise<CrossPlatformDomination[]> {
    try {
      // Get current rankings across all categories
      const rankingsQuery = `
        WITH ranked_domains AS (
          SELECT 
            domain,
            category,
            llm_pagerank_score as score,
            ROW_NUMBER() OVER (PARTITION BY category ORDER BY llm_pagerank_score DESC) as rank,
            COUNT(*) OVER (PARTITION BY category) as total_in_category,
            updated_at
          FROM domains 
          WHERE llm_pagerank_score IS NOT NULL 
            AND category IS NOT NULL
            AND status = 'completed'
        ),
        category_leaders AS (
          SELECT 
            domain,
            category,
            score,
            rank,
            total_in_category,
            CASE 
              WHEN rank = 1 THEN 'leader'
              WHEN rank <= 3 THEN 'contender'
              WHEN rank <= 10 THEN 'player'
              ELSE 'follower'
            END as position_type
          FROM ranked_domains
        ),
        domain_stats AS (
          SELECT 
            domain,
            COUNT(*) as total_categories,
            COUNT(CASE WHEN rank = 1 THEN 1 END) as dominated_categories,
            COUNT(CASE WHEN rank <= 3 THEN 1 END) as top3_categories,
            AVG(score) as avg_score,
            MIN(rank) as best_rank,
            MAX(rank) as worst_rank
          FROM category_leaders
          GROUP BY domain
        )
        SELECT 
          ds.*,
          cl.category,
          cl.rank,
          cl.score as category_score,
          cl.position_type,
          cl.total_in_category
        FROM domain_stats ds
        JOIN category_leaders cl ON ds.domain = cl.domain
        WHERE ds.total_categories >= 3  -- Only domains competing in multiple categories
        ORDER BY ds.dominated_categories DESC, ds.top3_categories DESC, ds.avg_score DESC
      `;

      const result = await this.pool.query(rankingsQuery);
      
      // Group by domain
      const domainData = new Map<string, any>();
      result.rows.forEach(row => {
        if (!domainData.has(row.domain)) {
          domainData.set(row.domain, {
            domain: row.domain,
            total_categories: row.total_categories,
            dominated_categories: row.dominated_categories,
            categories: []
          });
        }
        
        domainData.get(row.domain).categories.push({
          category: row.category,
          rank: row.rank,
          score: row.category_score,
          position_type: row.position_type,
          total_in_category: row.total_in_category
        });
      });

      // Build domination analysis
      const dominations: CrossPlatformDomination[] = [];
      
      for (const [domain, data] of domainData) {
        const categoryBreakdown = await this.analyzeCategoryDomination(data.categories);
        const competitiveThreats = await this.identifyCompetitiveThreats(domain, data.categories);
        const empireScore = this.calculateEmpireScore(data, categoryBreakdown);
        const trajectory = await this.analyzeTrajectory(domain);
        
        const domination: CrossPlatformDomination = {
          domain,
          total_categories: data.total_categories,
          dominated_categories: data.dominated_categories,
          domination_percentage: (data.dominated_categories / data.total_categories) * 100,
          domination_level: this.categorizeDominationLevel(data.dominated_categories, data.total_categories),
          category_breakdown: categoryBreakdown,
          competitive_threats: competitiveThreats,
          empire_score: empireScore,
          trajectory
        };
        
        dominations.push(domination);
      }
      
      // Store historical data
      this.storeDominationHistory(dominations);
      
      return dominations.sort((a, b) => b.empire_score - a.empire_score);
      
    } catch (error) {
      console.error('Error tracking cross-platform domination:', error);
      return [];
    }
  }

  async identifyMarketEmpires(): Promise<MarketEmpire[]> {
    const dominations = await this.trackCrossPlatformDomination();
    const empires: MarketEmpire[] = [];
    
    for (const domination of dominations.slice(0, 10)) { // Top 10 potential empires
      const ruledCategories = domination.category_breakdown
        .filter(cat => cat.rank === 1)
        .map(cat => cat.category);
      
      const vassalCategories = domination.category_breakdown
        .filter(cat => cat.rank >= 2 && cat.rank <= 3)
        .map(cat => cat.category);
      
      const territoriesLost = await this.identifyLostTerritories(domination.domain);
      const expansionOpportunities = await this.identifyExpansionOpportunities(domination.domain);
      const existentialThreats = await this.identifyExistentialThreats(domination.domain);
      const empireStability = this.assessEmpireStability(domination);
      
      const empire: MarketEmpire = {
        emperor: domination.domain,
        total_empire_score: domination.empire_score,
        categories_ruled: ruledCategories,
        vassal_categories: vassalCategories,
        territories_lost: territoriesLost,
        expansion_opportunities: expansionOpportunities,
        existential_threats: existentialThreats,
        empire_stability: empireStability
      };
      
      empires.push(empire);
    }
    
    return empires.sort((a, b) => b.total_empire_score - a.total_empire_score);
  }

  async trackCompetitiveBattlegrounds(): Promise<CompetitiveBattleground[]> {
    try {
      // Find categories with intense competition (close scores in top positions)
      const battlegroundQuery = `
        WITH ranked_domains AS (
          SELECT 
            domain,
            category,
            llm_pagerank_score as score,
            ROW_NUMBER() OVER (PARTITION BY category ORDER BY llm_pagerank_score DESC) as rank,
            LAG(llm_pagerank_score) OVER (PARTITION BY category ORDER BY llm_pagerank_score DESC) as next_score,
            updated_at
          FROM domains 
          WHERE llm_pagerank_score IS NOT NULL 
            AND category IS NOT NULL
            AND status = 'completed'
        ),
        competitive_categories AS (
          SELECT 
            category,
            domain as leader,
            score as leader_score,
            next_score as second_score,
            (score - COALESCE(next_score, 0)) as lead_margin
          FROM ranked_domains
          WHERE rank = 1
            AND next_score IS NOT NULL
            AND (score - next_score) <= 15  -- Close competition threshold
        ),
        category_volatility AS (
          SELECT 
            category,
            COUNT(*) as competitors,
            STDDEV(score) as score_volatility
          FROM ranked_domains
          WHERE rank <= 10
          GROUP BY category
        )
        SELECT 
          cc.*,
          cv.competitors,
          cv.score_volatility,
          CASE 
            WHEN cc.lead_margin <= 2 THEN 'apocalypse'
            WHEN cc.lead_margin <= 5 THEN 'war'
            WHEN cc.lead_margin <= 10 THEN 'battle'
            WHEN cc.lead_margin <= 15 THEN 'engagement'
            ELSE 'skirmish'
          END as battle_intensity
        FROM competitive_categories cc
        JOIN category_volatility cv ON cc.category = cv.category
        WHERE cv.competitors >= 5  -- Must have sufficient competitors
        ORDER BY cc.lead_margin ASC, cv.score_volatility DESC
      `;

      const result = await this.pool.query(battlegroundQuery);
      const battlegrounds: CompetitiveBattleground[] = [];
      
      for (const row of result.rows) {
        const combatants = await this.identifyPrimaryCombatants(row.category);
        const challenger = combatants.find(c => c !== row.leader) || 'Unknown';
        const battleDuration = await this.calculateBattleDuration(row.category);
        const predictedVictor = await this.predictBattleOutcome(row.category, combatants);
        const confidence = this.calculatePredictionConfidence(row);
        const casualties = await this.identifyCasualties(row.category, combatants);
        
        const battleground: CompetitiveBattleground = {
          category: row.category,
          battle_intensity: row.battle_intensity,
          primary_combatants: combatants,
          current_leader: row.leader,
          challenger,
          lead_margin: row.lead_margin,
          battle_duration: battleDuration,
          predicted_victor: predictedVictor,
          confidence,
          civilian_casualties: casualties
        };
        
        battlegrounds.push(battleground);
      }
      
      // Store battle history
      this.storeBattleHistory(battlegrounds);
      
      return battlegrounds;
      
    } catch (error) {
      console.error('Error tracking competitive battlegrounds:', error);
      return [];
    }
  }

  generateDominationReport(
    dominations: CrossPlatformDomination[],
    empires: MarketEmpire[],
    battlegrounds: CompetitiveBattleground[]
  ): string {
    let report = `🏛️ MARKET DOMINATION INTELLIGENCE REPORT\n\n`;
    
    // Empire Overview
    report += `👑 MARKET EMPIRES:\n`;
    empires.slice(0, 5).forEach((empire, index) => {
      const stabilityEmoji = this.getStabilityEmoji(empire.empire_stability);
      report += `${index + 1}. ${empire.emperor} ${stabilityEmoji}\n`;
      report += `   • Rules: ${empire.categories_ruled.length} categories\n`;
      report += `   • Vassals: ${empire.vassal_categories.length} territories\n`;
      report += `   • Empire Score: ${empire.total_empire_score.toFixed(0)}\n`;
      report += `   • Status: ${empire.empire_stability.toUpperCase()}\n\n`;
    });
    
    // Cross-Platform Domination
    report += `🌍 CROSS-PLATFORM DOMINATION:\n`;
    dominations.slice(0, 5).forEach((dom, index) => {
      const levelEmoji = this.getDominationEmoji(dom.domination_level);
      const trajectoryEmoji = this.getTrajectoryEmoji(dom.trajectory);
      report += `${index + 1}. ${dom.domain} ${levelEmoji} ${trajectoryEmoji}\n`;
      report += `   • Dominates: ${dom.dominated_categories}/${dom.total_categories} categories (${dom.domination_percentage.toFixed(1)}%)\n`;
      report += `   • Level: ${dom.domination_level.toUpperCase()}\n`;
      report += `   • Trajectory: ${dom.trajectory.toUpperCase()}\n`;
      if (dom.competitive_threats.length > 0) {
        report += `   • Threats: ${dom.competitive_threats.slice(0, 2).join(', ')}\n`;
      }
      report += '\n';
    });
    
    // Active Battlegrounds
    report += `⚔️ ACTIVE BATTLEGROUNDS:\n`;
    battlegrounds.slice(0, 5).forEach((battle, index) => {
      const intensityEmoji = this.getBattleEmoji(battle.battle_intensity);
      report += `${index + 1}. ${battle.category} ${intensityEmoji}\n`;
      report += `   • Combatants: ${battle.primary_combatants.slice(0, 3).join(' vs ')}\n`;
      report += `   • Leader: ${battle.current_leader} (margin: ${battle.lead_margin.toFixed(1)})\n`;
      report += `   • Intensity: ${battle.battle_intensity.toUpperCase()}\n`;
      report += `   • Predicted Victor: ${battle.predicted_victor} (${(battle.confidence * 100).toFixed(0)}% confidence)\n`;
      if (battle.civilian_casualties.length > 0) {
        report += `   • Casualties: ${battle.civilian_casualties.slice(0, 2).join(', ')}\n`;
      }
      report += '\n';
    });
    
    // Strategic Intelligence Summary
    report += `📊 STRATEGIC INTELLIGENCE:\n`;
    report += `• Total Market Empires Tracked: ${empires.length}\n`;
    report += `• Active Battlegrounds: ${battlegrounds.length}\n`;
    report += `• Apocalyptic Battles: ${battlegrounds.filter(b => b.battle_intensity === 'apocalypse').length}\n`;
    report += `• Empire Instability Events: ${empires.filter(e => e.empire_stability === 'declining' || e.empire_stability === 'collapsing').length}\n`;
    report += `• Market Volatility Index: ${this.calculateMarketVolatilityIndex(battlegrounds)}\n\n`;
    
    report += `This is Bloomberg for AI: Professional. Authoritative. Absolutely VISCERAL.`;
    
    return report;
  }

  // Helper methods
  private async analyzeCategoryDomination(categories: any[]): Promise<CategoryDomination[]> {
    return categories.map(cat => {
      const gapToSecond = cat.rank === 1 ? this.estimateGapToSecond(cat) : 0;
      const timeInPosition = this.estimateTimeInPosition(cat);
      
      return {
        category: cat.category,
        rank: cat.rank,
        score: cat.score,
        market_share_estimate: this.estimateMarketShare(cat),
        domination_strength: this.assessDominationStrength(cat),
        gap_to_second: gapToSecond,
        threat_level: this.assessThreatLevel(cat),
        closest_competitor: 'Unknown', // Would need additional query
        time_in_position: timeInPosition,
        position_stability: this.assessPositionStability(cat)
      };
    });
  }

  private async identifyCompetitiveThreats(domain: string, categories: any[]): Promise<string[]> {
    // Mock implementation - would query for rising competitors
    const threats = new Set<string>();
    
    // Identify domains that are close behind in categories where this domain leads
    categories.filter(cat => cat.rank === 1).forEach(cat => {
      if (cat.score < 85) { // Vulnerable leadership
        threats.add('Rising Competitor A');
      }
    });
    
    return Array.from(threats).slice(0, 3);
  }

  private calculateEmpireScore(data: any, categoryBreakdown: CategoryDomination[]): number {
    let score = 0;
    
    // Base score from dominated categories
    score += data.dominated_categories * 100;
    
    // Bonus for top 3 positions
    categoryBreakdown.forEach(cat => {
      if (cat.rank === 1) score += 50;
      else if (cat.rank === 2) score += 25;
      else if (cat.rank === 3) score += 10;
      
      // Bonus for strong domination
      if (cat.domination_strength === 'overwhelming') score += 30;
      else if (cat.domination_strength === 'strong') score += 20;
      else if (cat.domination_strength === 'moderate') score += 10;
    });
    
    // Penalty for vulnerability
    const vulnerableCategories = categoryBreakdown.filter(cat => cat.threat_level === 'high' || cat.threat_level === 'critical');
    score -= vulnerableCategories.length * 15;
    
    return Math.max(0, score);
  }

  private async analyzeTrajectory(domain: string): Promise<CrossPlatformDomination['trajectory']> {
    // Mock implementation - would analyze historical data
    const random = Math.random();
    if (random < 0.4) return 'building';
    if (random < 0.8) return 'maintaining';
    return 'losing';
  }

  private categorizeDominationLevel(dominated: number, total: number): CrossPlatformDomination['domination_level'] {
    const percentage = (dominated / total) * 100;
    
    if (percentage >= 80) return 'total';
    if (percentage >= 60) return 'major';
    if (percentage >= 40) return 'significant';
    if (percentage >= 20) return 'emerging';
    return 'none';
  }

  private async identifyLostTerritories(domain: string): Promise<string[]> {
    // Mock implementation - would track historical rank changes
    return ['Category X', 'Category Y'].slice(0, Math.floor(Math.random() * 3));
  }

  private async identifyExpansionOpportunities(domain: string): Promise<string[]> {
    // Mock implementation - would identify categories with weak leaders
    return ['Emerging Tech', 'New Markets'].slice(0, Math.floor(Math.random() * 4));
  }

  private async identifyExistentialThreats(domain: string): Promise<string[]> {
    // Mock implementation - would identify aggressive competitors
    return ['Disruptor A', 'Challenger B'].slice(0, Math.floor(Math.random() * 3));
  }

  private assessEmpireStability(domination: CrossPlatformDomination): MarketEmpire['empire_stability'] {
    if (domination.trajectory === 'losing') {
      return domination.dominated_categories <= 1 ? 'collapsing' : 'declining';
    } else if (domination.trajectory === 'building') {
      return domination.dominated_categories >= 5 ? 'conquering' : 'growing';
    } else {
      return 'stable';
    }
  }

  private async identifyPrimaryCombatants(category: string): Promise<string[]> {
    // Mock implementation - would query top competitors in category
    return ['Leader A', 'Challenger B', 'Contender C'];
  }

  private async calculateBattleDuration(category: string): Promise<number> {
    // Mock implementation - would track when intense competition began
    return Math.floor(Math.random() * 180) + 30; // 30-210 days
  }

  private async predictBattleOutcome(category: string, combatants: string[]): Promise<string> {
    // Mock implementation - would use ML prediction
    return combatants[Math.floor(Math.random() * combatants.length)];
  }

  private calculatePredictionConfidence(battleData: any): number {
    // Base confidence on lead margin and volatility
    const marginFactor = Math.max(0, (15 - battleData.lead_margin) / 15);
    const volatilityFactor = Math.min(1, battleData.score_volatility / 20);
    
    return Math.max(0.3, Math.min(0.95, 0.7 - marginFactor * 0.3 + volatilityFactor * 0.2));
  }

  private async identifyCasualties(category: string, primaryCombatants: string[]): Promise<string[]> {
    // Mock implementation - would identify domains losing position during battle
    return ['Casualty A', 'Casualty B'].slice(0, Math.floor(Math.random() * 3));
  }

  // Estimation and assessment helper methods
  private estimateMarketShare(category: any): number {
    // Rough estimation based on rank and total competitors
    if (category.rank === 1) return Math.max(15, 40 - category.total_in_category);
    if (category.rank <= 3) return Math.max(5, 20 - category.rank * 3);
    return Math.max(1, 10 - category.rank);
  }

  private assessDominationStrength(category: any): CategoryDomination['domination_strength'] {
    if (category.rank > 1) return 'weak';
    
    if (category.score >= 90) return 'overwhelming';
    if (category.score >= 80) return 'strong';
    if (category.score >= 70) return 'moderate';
    return 'weak';
  }

  private estimateGapToSecond(category: any): number {
    // Mock estimation - would require actual second place score
    return Math.max(1, category.score * 0.1);
  }

  private estimateTimeInPosition(category: any): number {
    // Mock estimation - would require historical tracking
    return Math.floor(Math.random() * 365) + 30;
  }

  private assessThreatLevel(category: any): CategoryDomination['threat_level'] {
    if (category.rank === 1 && category.score >= 85) return 'none';
    if (category.rank === 1 && category.score >= 75) return 'low';
    if (category.rank <= 3) return 'medium';
    if (category.rank <= 10) return 'high';
    return 'critical';
  }

  private assessPositionStability(category: any): CategoryDomination['position_stability'] {
    if (category.rank === 1 && category.score >= 90) return 'entrenched';
    if (category.rank === 1 && category.score >= 80) return 'stable';
    if (category.rank <= 3) return 'volatile';
    return 'unstable';
  }

  // Emoji and formatting helpers
  private getStabilityEmoji(stability: MarketEmpire['empire_stability']): string {
    const emojiMap = {
      collapsing: '💥',
      declining: '📉',
      stable: '🏛️',
      growing: '📈',
      conquering: '⚔️'
    };
    return emojiMap[stability] || '📊';
  }

  private getDominationEmoji(level: CrossPlatformDomination['domination_level']): string {
    const emojiMap = {
      none: '📊',
      emerging: '📈',
      significant: '💪',
      major: '🔥',
      total: '👑'
    };
    return emojiMap[level] || '📊';
  }

  private getTrajectoryEmoji(trajectory: CrossPlatformDomination['trajectory']): string {
    const emojiMap = {
      building: '🚀',
      maintaining: '🏛️',
      losing: '📉'
    };
    return emojiMap[trajectory] || '📊';
  }

  private getBattleEmoji(intensity: CompetitiveBattleground['battle_intensity']): string {
    const emojiMap = {
      skirmish: '⚡',
      engagement: '💥',
      battle: '⚔️',
      war: '🔥',
      apocalypse: '💀'
    };
    return emojiMap[intensity] || '⚡';
  }

  private calculateMarketVolatilityIndex(battlegrounds: CompetitiveBattleground[]): string {
    const apocalypticBattles = battlegrounds.filter(b => b.battle_intensity === 'apocalypse').length;
    const wars = battlegrounds.filter(b => b.battle_intensity === 'war').length;
    
    const volatility = (apocalypticBattles * 3 + wars * 2) / Math.max(battlegrounds.length, 1);
    
    if (volatility >= 2) return 'EXTREME';
    if (volatility >= 1.5) return 'HIGH';
    if (volatility >= 1) return 'MODERATE';
    return 'LOW';
  }

  // Data persistence
  private storeDominationHistory(dominations: CrossPlatformDomination[]) {
    const timestamp = Date.now();
    dominations.forEach(dom => {
      if (!this.dominationHistory.has(dom.domain)) {
        this.dominationHistory.set(dom.domain, []);
      }
      
      const history = this.dominationHistory.get(dom.domain)!;
      history.push({ ...dom, timestamp } as any);
      
      // Keep only last 50 entries
      if (history.length > 50) {
        history.shift();
      }
    });
  }

  private storeBattleHistory(battlegrounds: CompetitiveBattleground[]) {
    const timestamp = Date.now();
    battlegrounds.forEach(battle => {
      if (!this.battleHistory.has(battle.category)) {
        this.battleHistory.set(battle.category, []);
      }
      
      const history = this.battleHistory.get(battle.category)!;
      history.push({ ...battle, timestamp } as any);
      
      // Keep only last 30 entries
      if (history.length > 30) {
        history.shift();
      }
    });
  }
}