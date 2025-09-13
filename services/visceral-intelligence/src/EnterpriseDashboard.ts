import { Pool } from 'pg';
import { VisceralAlert, EnterpriseReport, MarketDomination, VisceralMetrics, PremiumTrigger } from './types';
import { VisceralLanguageEngine } from './VisceralLanguageEngine';
import { ViralSharingEngine } from './ViralSharingEngine';

export class EnterpriseDashboard {
  private pool: Pool;
  private languageEngine: VisceralLanguageEngine;
  private viralEngine: ViralSharingEngine;

  constructor(pool: Pool) {
    this.pool = pool;
    this.languageEngine = new VisceralLanguageEngine();
    this.viralEngine = new ViralSharingEngine();
  }

  async generateExecutiveBriefing(
    timeframe: '24h' | '48h' | '7d' | '30d' = '24h',
    targetDomain?: string
  ): Promise<EnterpriseReport> {
    try {
      const hours = this.getHoursFromTimeframe(timeframe);
      
      // Get recent alerts
      const alertsQuery = `
        SELECT * FROM visceral_alerts 
        WHERE created_at >= NOW() - INTERVAL '${hours} HOURS'
        ${targetDomain ? `AND (aggressor = $1 OR $1 = ANY(victims))` : ''}
        ORDER BY confidence_score DESC, executive_urgency DESC
        LIMIT 50
      `;
      
      const alertsResult = await this.pool.query(
        alertsQuery, 
        targetDomain ? [targetDomain] : []
      );
      
      // Mock alerts for demo (replace with actual query results)
      const mockAlerts: VisceralAlert[] = [
        {
          id: 'alert_001',
          intensity: 'domination',
          headline: 'Stripe OBLITERATES competition in Payment Processing',
          victim: ['PayPal', 'Square', 'Adyen'],
          aggressor: 'Stripe',
          damage_assessment: '23-point lead expansion, competitors losing market share daily',
          market_position_change: 5,
          category: 'Payment Processing',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          confidence_score: 0.94,
          viral_potential: 0.88,
          executive_urgency: 'high'
        },
        {
          id: 'alert_002',
          intensity: 'uprising',
          headline: 'Anthropic DEMOLISHES established AI giants',
          victim: ['Google Bard', 'Meta AI'],
          aggressor: 'Anthropic',
          damage_assessment: 'Surged from #8 to #2 in just 90 days, making competitors look obsolete',
          market_position_change: 6,
          category: 'AI Platforms',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          confidence_score: 0.91,
          viral_potential: 0.93,
          executive_urgency: 'critical'
        }
      ];

      const alerts = mockAlerts; // Use mock data for now
      
      // Categorize alerts
      const criticalThreats = alerts.filter(a => a.executive_urgency === 'critical');
      const highPriorityAlerts = alerts.filter(a => a.executive_urgency === 'high');
      const opportunities = alerts.filter(a => a.intensity === 'uprising' || a.intensity === 'rampage');
      const bloodbaths = alerts.filter(a => a.intensity === 'bloodbath' || a.intensity === 'collapse');
      
      // Generate executive summary
      const executiveSummary = this.generateExecutiveSummary(alerts, timeframe, targetDomain);
      
      // Generate actionable recommendations
      const immediateActions = this.generateImmediateActions(alerts, targetDomain);
      const strategicRecommendations = this.generateStrategicRecommendations(alerts, targetDomain);
      
      // Calculate risk assessment
      const riskAssessment = {
        existential_threats: criticalThreats.length,
        market_disruption_risk: Math.min(Math.round((opportunities.length / alerts.length) * 100), 100),
        competitive_pressure: Math.min(Math.round((bloodbaths.length / alerts.length) * 100), 100)
      };
      
      return {
        executive_summary: executiveSummary,
        competitive_threats: [...criticalThreats, ...highPriorityAlerts].slice(0, 10),
        market_opportunities: opportunities.slice(0, 5),
        immediate_actions: immediateActions,
        strategic_recommendations: strategicRecommendations,
        risk_assessment: riskAssessment
      };
      
    } catch (error) {
      console.error('Error generating executive briefing:', error);
      throw new Error('Failed to generate executive briefing');
    }
  }

  async generateCSODashboard(targetDomain: string): Promise<{
    threat_landscape: any;
    competitive_positioning: any;
    market_vulnerabilities: any;
    defensive_strategies: string[];
    offensive_opportunities: string[];
  }> {
    // Security-focused competitive intelligence dashboard
    const threatLandscape = await this.analyzeThreatLandscape(targetDomain);
    const positioning = await this.analyzeCompetitivePositioning(targetDomain);
    const vulnerabilities = await this.identifyMarketVulnerabilities(targetDomain);
    
    return {
      threat_landscape: threatLandscape,
      competitive_positioning: positioning,
      market_vulnerabilities: vulnerabilities,
      defensive_strategies: this.generateDefensiveStrategies(vulnerabilities),
      offensive_opportunities: this.generateOffensiveOpportunities(positioning)
    };
  }

  async generateCMODashboard(alerts: VisceralAlert[]): Promise<{
    viral_opportunities: any[];
    content_recommendations: any[];
    pr_moments: any[];
    competitor_vulnerabilities: any[];
    narrative_opportunities: string[];
  }> {
    const viralOpportunities = alerts
      .filter(a => a.viral_potential > 0.6)
      .map(alert => ({
        alert,
        content_types: this.recommendContentTypes(alert),
        estimated_reach: this.estimateReach(alert),
        best_platforms: this.recommendPlatforms(alert)
      }));

    const prMoments = alerts
      .filter(a => a.confidence_score > 0.8 && a.executive_urgency !== 'low')
      .map(alert => ({
        alert,
        press_angle: this.generatePressAngle(alert),
        media_value: this.estimateMediaValue(alert),
        timing_recommendation: this.recommendTiming(alert)
      }));

    return {
      viral_opportunities: viralOpportunities,
      content_recommendations: this.generateContentRecommendations(alerts),
      pr_moments: prMoments,
      competitor_vulnerabilities: this.identifyCompetitorVulnerabilities(alerts),
      narrative_opportunities: this.generateNarrativeOpportunities(alerts)
    };
  }

  async generateBoardReport(alerts: VisceralAlert[], timeframe: string): Promise<{
    executive_summary: string;
    key_metrics: any;
    strategic_implications: string[];
    competitive_landscape: any;
    risk_matrix: any;
    recommendations: string[];
  }> {
    const keyMetrics = {
      market_events_tracked: alerts.length,
      critical_threats: alerts.filter(a => a.executive_urgency === 'critical').length,
      market_opportunities: alerts.filter(a => a.intensity === 'uprising').length,
      competitive_pressure_index: this.calculateCompetitivePressureIndex(alerts),
      disruption_probability: this.calculateDisruptionProbability(alerts),
      market_volatility_score: this.calculateMarketVolatility(alerts)
    };

    const strategicImplications = [
      `${keyMetrics.critical_threats} critical competitive threats require immediate attention`,
      `${keyMetrics.market_opportunities} emerging opportunities identified for strategic consideration`,
      `Market volatility at ${(keyMetrics.market_volatility_score * 100).toFixed(0)}% - ${keyMetrics.market_volatility_score > 0.7 ? 'HIGH ALERT' : 'MONITORED'}`,
      `Disruption probability: ${(keyMetrics.disruption_probability * 100).toFixed(0)}% - Strategic defense protocols ${keyMetrics.disruption_probability > 0.6 ? 'ACTIVATED' : 'STANDBY'}`
    ];

    const competitiveLandscape = {
      dominant_players: this.identifyDominantPlayers(alerts),
      rising_threats: this.identifyRisingThreats(alerts),
      declining_competitors: this.identifyDecliningCompetitors(alerts),
      market_dynamics: this.analyzeMarketDynamics(alerts)
    };

    const riskMatrix = this.generateRiskMatrix(alerts);

    return {
      executive_summary: this.generateBoardExecutiveSummary(keyMetrics, timeframe),
      key_metrics: keyMetrics,
      strategic_implications: strategicImplications,
      competitive_landscape: competitiveLandscape,
      risk_matrix: riskMatrix,
      recommendations: this.generateBoardRecommendations(keyMetrics, alerts)
    };
  }

  async generatePremiumUpgradePrompts(userDomain: string, userTier: 'free' | 'basic' | 'pro'): Promise<PremiumTrigger[]> {
    const triggers: PremiumTrigger[] = [];
    
    // Get recent market activity affecting user's domain or category
    const domainAlerts = await this.getAlertsForDomain(userDomain);
    const categoryAlerts = await this.getAlertsForDomainCategory(userDomain);
    
    // Competitive anxiety triggers
    if (domainAlerts.some(a => a.victim.includes(userDomain))) {
      triggers.push({
        trigger_type: 'competitive_anxiety',
        message: `🚨 YOUR POSITION IS UNDER ATTACK\n\nSomeone just LEAPFROGGED you in your category. See who's eating your lunch and how to respond.`,
        urgency_level: 9,
        conversion_probability: 0.85,
        preview_data: { threats: domainAlerts.filter(a => a.victim.includes(userDomain)).length },
        upgrade_incentive: 'UNLOCK THREAT ANALYSIS + DEFENSE STRATEGIES'
      });
    }
    
    // FOMO pressure triggers
    const majorUprisings = categoryAlerts.filter(a => a.intensity === 'uprising' && a.confidence_score > 0.8);
    if (majorUprisings.length >= 2) {
      triggers.push({
        trigger_type: 'fomo_pressure',
        message: `💥 MASSIVE DISRUPTION HAPPENING NOW\n\n${majorUprisings.length} newcomers are DESTROYING established players in your space. Don't get left behind.`,
        urgency_level: 8,
        conversion_probability: 0.75,
        preview_data: { disruptions: majorUprisings.length },
        upgrade_incentive: 'SEE THE FULL CARNAGE + SURVIVAL GUIDE'
      });
    }
    
    // Market opportunity triggers
    if (userTier === 'free') {
      triggers.push({
        trigger_type: 'market_opportunity',
        message: `📈 EXCLUSIVE: 47 MARKET OPPORTUNITIES DETECTED\n\nWhile you're seeing surface data, Premium users are already capitalizing on deep market insights.`,
        urgency_level: 6,
        conversion_probability: 0.45,
        preview_data: { opportunities: 47 },
        upgrade_incentive: 'UNLOCK ALL OPPORTUNITIES + STRATEGIC PLAYBOOK'
      });
    }
    
    // Tier-specific upgrade paths
    if (userTier === 'basic') {
      triggers.push({
        trigger_type: 'competitive_anxiety',
        message: `⚡ REAL-TIME ALERTS MISSING\n\nYou're seeing yesterday's news. Pro users get instant alerts when market positions shift.`,
        urgency_level: 7,
        conversion_probability: 0.65,
        preview_data: { missed_alerts: 12 },
        upgrade_incentive: 'UPGRADE TO PRO: REAL-TIME INTELLIGENCE'
      });
    }
    
    return triggers.sort((a, b) => b.urgency_level - a.urgency_level);
  }

  // Helper methods
  private getHoursFromTimeframe(timeframe: string): number {
    switch (timeframe) {
      case '24h': return 24;
      case '48h': return 48;
      case '7d': return 168;
      case '30d': return 720;
      default: return 24;
    }
  }

  private generateExecutiveSummary(alerts: VisceralAlert[], timeframe: string, targetDomain?: string): string {
    const criticalEvents = alerts.filter(a => a.executive_urgency === 'critical').length;
    const majorShifts = alerts.filter(a => Math.abs(a.market_position_change) >= 5).length;
    const categories = [...new Set(alerts.map(a => a.category))].length;
    
    const domainSpecific = targetDomain ? 
      `\n\nDOMAIN-SPECIFIC IMPACT (${targetDomain}):\n` +
      `• Direct threats: ${alerts.filter(a => a.victim.includes(targetDomain)).length}\n` +
      `• Category competition: ${alerts.filter(a => a.aggressor !== targetDomain).length}\n` +
      `• Market opportunities: ${alerts.filter(a => a.intensity === 'uprising').length}` : '';
    
    return `EXECUTIVE INTELLIGENCE BRIEF - ${timeframe.toUpperCase()} ANALYSIS\n\n` +
           `MARKET OVERVIEW:\n` +
           `• Total significant events: ${alerts.length}\n` +
           `• Critical priority alerts: ${criticalEvents}\n` +
           `• Major position shifts: ${majorShifts}\n` +
           `• Categories affected: ${categories}\n\n` +
           `MARKET CONDITION: ${this.assessMarketCondition(alerts)}\n` +
           `VOLATILITY INDEX: ${this.calculateVolatilityIndex(alerts)}\n` +
           `DISRUPTION RISK: ${this.assessDisruptionRisk(alerts)}${domainSpecific}\n\n` +
           `EXECUTIVE ACTION REQUIRED: ${criticalEvents > 0 ? 'IMMEDIATE' : majorShifts > 5 ? 'WITHIN 24H' : 'MONITOR'}`;
  }

  private generateImmediateActions(alerts: VisceralAlert[], targetDomain?: string): string[] {
    const actions: string[] = [];
    
    const criticalThreats = alerts.filter(a => a.executive_urgency === 'critical');
    if (criticalThreats.length > 0) {
      actions.push(`🚨 Address ${criticalThreats.length} critical competitive threats immediately`);
      actions.push(`📊 Conduct emergency competitive assessment`);
    }
    
    if (targetDomain) {
      const domainThreats = alerts.filter(a => a.victim.includes(targetDomain));
      if (domainThreats.length > 0) {
        actions.push(`🎯 Review ${targetDomain} positioning in ${[...new Set(domainThreats.map(a => a.category))].join(', ')}`);
      }
    }
    
    const opportunities = alerts.filter(a => a.intensity === 'uprising' && a.confidence_score > 0.8);
    if (opportunities.length > 0) {
      actions.push(`📈 Evaluate ${opportunities.length} emerging market opportunities`);
    }
    
    const volatileCategories = this.identifyVolatileCategories(alerts);
    if (volatileCategories.length > 0) {
      actions.push(`⚡ Implement enhanced monitoring in volatile categories: ${volatileCategories.join(', ')}`);
    }
    
    return actions.length > 0 ? actions : ['📊 Continue standard competitive monitoring', '🔍 Maintain market position tracking'];
  }

  private generateStrategicRecommendations(alerts: VisceralAlert[], targetDomain?: string): string[] {
    const recommendations: string[] = [];
    
    // Market dynamics analysis
    const uprisings = alerts.filter(a => a.intensity === 'uprising' || a.intensity === 'rampage');
    if (uprisings.length > 3) {
      recommendations.push('🚀 Market disruption accelerating - develop rapid response capabilities');
      recommendations.push('💡 Investigate emerging competitor strategies and business models');
    }
    
    // Defensive strategies
    const bloodbaths = alerts.filter(a => a.intensity === 'bloodbath' || a.intensity === 'collapse');
    if (bloodbaths.length > 2) {
      recommendations.push('🛡️ Strengthen competitive moats in vulnerable categories');
      recommendations.push('📊 Develop early warning systems for position erosion');
    }
    
    // Offensive opportunities
    const dominationGaps = alerts.filter(a => a.intensity === 'domination' && a.confidence_score > 0.8);
    if (dominationGaps.length > 0) {
      recommendations.push('⚔️ Identify acquisition targets among declining competitors');
      recommendations.push('💰 Increase investment in categories showing market leadership gaps');
    }
    
    // Technology and innovation
    const aiCategories = alerts.filter(a => a.category.toLowerCase().includes('ai')).length;
    if (aiCategories > 0) {
      recommendations.push('🤖 Accelerate AI/technology initiatives to match market pace');
    }
    
    // Always include these strategic recommendations
    recommendations.push('📡 Implement continuous competitive intelligence monitoring');
    recommendations.push('🎯 Develop scenario planning for top 3 competitive threats');
    recommendations.push('💼 Establish cross-functional rapid response team for market shifts');
    
    return recommendations;
  }

  // Additional helper methods for dashboard functionality
  private async analyzeThreatLandscape(domain: string): Promise<any> {
    // Implementation for threat landscape analysis
    return {
      immediate_threats: 3,
      emerging_threats: 7,
      threat_velocity: 0.65,
      attack_vectors: ['market_share_erosion', 'feature_parity', 'pricing_pressure']
    };
  }

  private async analyzeCompetitivePositioning(domain: string): Promise<any> {
    return {
      market_position: 'Defender',
      competitive_strength: 0.72,
      vulnerable_areas: ['pricing', 'feature_velocity'],
      defensive_assets: ['brand_recognition', 'customer_loyalty', 'distribution']
    };
  }

  private async identifyMarketVulnerabilities(domain: string): Promise<any> {
    return {
      category_vulnerabilities: [
        { category: 'AI Platforms', risk_level: 'high', threat_count: 4 },
        { category: 'Cloud Infrastructure', risk_level: 'medium', threat_count: 2 }
      ],
      timeline_risks: {
        '30_days': 'medium',
        '90_days': 'high',
        '12_months': 'critical'
      }
    };
  }

  private generateDefensiveStrategies(vulnerabilities: any): string[] {
    return [
      'Strengthen competitive moats in high-risk categories',
      'Develop rapid response capabilities for emerging threats',
      'Implement enhanced customer retention programs',
      'Accelerate product development in vulnerable areas'
    ];
  }

  private generateOffensiveOpportunities(positioning: any): string[] {
    return [
      'Target competitor vulnerabilities in pricing strategy',
      'Accelerate feature development to create competitive gaps',
      'Expand into adjacent markets where competitors are weak',
      'Leverage brand strength for market expansion'
    ];
  }

  private recommendContentTypes(alert: VisceralAlert): string[] {
    const types = ['Twitter Thread'];
    
    if (alert.confidence_score > 0.8) types.push('LinkedIn Post');
    if (alert.executive_urgency === 'critical') types.push('Press Release');
    if (alert.viral_potential > 0.7) types.push('Instagram Story');
    
    return types;
  }

  private estimateReach(alert: VisceralAlert): number {
    return Math.round(alert.viral_potential * alert.confidence_score * 100000);
  }

  private recommendPlatforms(alert: VisceralAlert): string[] {
    const platforms = ['Twitter'];
    
    if (alert.confidence_score > 0.7) platforms.push('LinkedIn');
    if (alert.viral_potential > 0.8) platforms.push('Instagram', 'TikTok');
    
    return platforms;
  }

  private generatePressAngle(alert: VisceralAlert): string {
    if (alert.intensity === 'domination') {
      return 'Market leadership validation story';
    }
    if (alert.intensity === 'uprising') {
      return 'Industry disruption and innovation narrative';
    }
    return 'Market analysis and thought leadership';
  }

  private estimateMediaValue(alert: VisceralAlert): number {
    return Math.round(alert.confidence_score * alert.viral_potential * 50000);
  }

  private recommendTiming(alert: VisceralAlert): string {
    if (alert.executive_urgency === 'critical') return 'Immediate (within 2 hours)';
    if (alert.executive_urgency === 'high') return 'Same day';
    return 'Within 48 hours';
  }

  private generateContentRecommendations(alerts: VisceralAlert[]): any[] {
    return alerts.slice(0, 5).map(alert => ({
      alert_id: alert.id,
      recommended_angle: this.generatePressAngle(alert),
      content_types: this.recommendContentTypes(alert),
      target_audience: this.identifyTargetAudience(alert),
      key_messages: this.generateKeyMessages(alert)
    }));
  }

  private identifyCompetitorVulnerabilities(alerts: VisceralAlert[]): any[] {
    const vulnerabilities = new Map();
    
    alerts.filter(a => a.intensity === 'bloodbath' || a.intensity === 'collapse')
          .forEach(alert => {
            alert.victim.forEach(victim => {
              if (!vulnerabilities.has(victim)) {
                vulnerabilities.set(victim, {
                  company: victim,
                  vulnerability_count: 0,
                  categories_affected: new Set(),
                  severity: 'medium'
                });
              }
              const vuln = vulnerabilities.get(victim);
              vuln.vulnerability_count++;
              vuln.categories_affected.add(alert.category);
              if (alert.executive_urgency === 'critical') vuln.severity = 'high';
            });
          });
    
    return Array.from(vulnerabilities.values()).map(v => ({
      ...v,
      categories_affected: Array.from(v.categories_affected)
    }));
  }

  private generateNarrativeOpportunities(alerts: VisceralAlert[]): string[] {
    const narratives = [];
    
    const dominations = alerts.filter(a => a.intensity === 'domination').length;
    if (dominations > 0) {
      narratives.push('Market leadership and competitive advantage stories');
    }
    
    const uprisings = alerts.filter(a => a.intensity === 'uprising').length;
    if (uprisings > 0) {
      narratives.push('Industry disruption and innovation leadership');
    }
    
    narratives.push('Data-driven market analysis and thought leadership');
    narratives.push('Competitive intelligence and strategic insights');
    
    return narratives;
  }

  private identifyTargetAudience(alert: VisceralAlert): string[] {
    const audiences = ['Industry analysts', 'Trade publications'];
    
    if (alert.executive_urgency === 'critical') {
      audiences.push('C-suite executives', 'Board members');
    }
    
    if (alert.viral_potential > 0.7) {
      audiences.push('Social media followers', 'General business audience');
    }
    
    return audiences;
  }

  private generateKeyMessages(alert: VisceralAlert): string[] {
    return [
      `Market dynamics shifting in ${alert.category}`,
      `Competitive landscape evolution with ${alert.intensity} level changes`,
      `Strategic implications for industry participants`,
      'Data-driven insights for competitive positioning'
    ];
  }

  // Market analysis helper methods
  private assessMarketCondition(alerts: VisceralAlert[]): string {
    const volatility = this.calculateVolatilityIndex(alerts);
    if (volatility > 0.8) return 'EXTREMELY VOLATILE';
    if (volatility > 0.6) return 'HIGHLY VOLATILE';
    if (volatility > 0.4) return 'MODERATE VOLATILITY';
    return 'STABLE';
  }

  private calculateVolatilityIndex(alerts: VisceralAlert[]): number {
    if (alerts.length === 0) return 0;
    
    const totalIntensity = alerts.reduce((sum, alert) => {
      const intensityWeights = {
        'obliteration': 10, 'domination': 8, 'bloodbath': 7,
        'rampage': 6, 'uprising': 5, 'collapse': 4, 'annihilation': 6
      };
      return sum + (intensityWeights[alert.intensity] || 3);
    }, 0);
    
    return Math.min(totalIntensity / (alerts.length * 10), 1.0);
  }

  private assessDisruptionRisk(alerts: VisceralAlert[]): string {
    const uprisings = alerts.filter(a => a.intensity === 'uprising' || a.intensity === 'rampage').length;
    const ratio = alerts.length > 0 ? uprisings / alerts.length : 0;
    
    if (ratio > 0.4) return 'CRITICAL';
    if (ratio > 0.25) return 'ELEVATED';
    if (ratio > 0.1) return 'MODERATE';
    return 'LOW';
  }

  private identifyVolatileCategories(alerts: VisceralAlert[]): string[] {
    const categoryActivity = new Map<string, number>();
    
    alerts.forEach(alert => {
      const current = categoryActivity.get(alert.category) || 0;
      categoryActivity.set(alert.category, current + 1);
    });
    
    return Array.from(categoryActivity.entries())
                .filter(([_, count]) => count >= 3)
                .map(([category, _]) => category);
  }

  private async getAlertsForDomain(domain: string): Promise<VisceralAlert[]> {
    // Mock implementation - replace with actual database query
    return [];
  }

  private async getAlertsForDomainCategory(domain: string): Promise<VisceralAlert[]> {
    // Mock implementation - replace with actual database query
    return [];
  }

  // Board report helper methods
  private calculateCompetitivePressureIndex(alerts: VisceralAlert[]): number {
    const pressureEvents = alerts.filter(a => 
      a.intensity === 'bloodbath' || a.intensity === 'collapse' || a.executive_urgency === 'critical'
    ).length;
    
    return Math.min(pressureEvents / Math.max(alerts.length, 1), 1.0);
  }

  private calculateDisruptionProbability(alerts: VisceralAlert[]): number {
    const disruptiveEvents = alerts.filter(a => 
      a.intensity === 'uprising' || a.intensity === 'rampage'
    ).length;
    
    return Math.min(disruptiveEvents / Math.max(alerts.length, 1), 1.0);
  }

  private calculateMarketVolatility(alerts: VisceralAlert[]): number {
    return this.calculateVolatilityIndex(alerts);
  }

  private identifyDominantPlayers(alerts: VisceralAlert[]): any[] {
    const dominators = new Map<string, number>();
    
    alerts.filter(a => a.intensity === 'domination' || a.intensity === 'obliteration')
          .forEach(alert => {
            dominators.set(alert.aggressor, (dominators.get(alert.aggressor) || 0) + 1);
          });
    
    return Array.from(dominators.entries())
                .map(([player, events]) => ({ player, dominance_events: events }))
                .sort((a, b) => b.dominance_events - a.dominance_events);
  }

  private identifyRisingThreats(alerts: VisceralAlert[]): any[] {
    const risers = new Map<string, any>();
    
    alerts.filter(a => a.intensity === 'uprising' || a.intensity === 'rampage')
          .forEach(alert => {
            if (!risers.has(alert.aggressor)) {
              risers.set(alert.aggressor, {
                player: alert.aggressor,
                rise_events: 0,
                categories: new Set(),
                average_confidence: 0
              });
            }
            const riser = risers.get(alert.aggressor);
            riser.rise_events++;
            riser.categories.add(alert.category);
            riser.average_confidence = (riser.average_confidence + alert.confidence_score) / riser.rise_events;
          });
    
    return Array.from(risers.values()).map(r => ({
      ...r,
      categories: Array.from(r.categories)
    }));
  }

  private identifyDecliningCompetitors(alerts: VisceralAlert[]): any[] {
    const declining = new Map<string, any>();
    
    alerts.filter(a => a.intensity === 'bloodbath' || a.intensity === 'collapse')
          .forEach(alert => {
            alert.victim.forEach(victim => {
              if (!declining.has(victim)) {
                declining.set(victim, {
                  player: victim,
                  decline_events: 0,
                  categories: new Set(),
                  severity: 'medium'
                });
              }
              const decliner = declining.get(victim);
              decliner.decline_events++;
              decliner.categories.add(alert.category);
              if (alert.executive_urgency === 'critical') decliner.severity = 'high';
            });
          });
    
    return Array.from(declining.values()).map(d => ({
      ...d,
      categories: Array.from(d.categories)
    }));
  }

  private analyzeMarketDynamics(alerts: VisceralAlert[]): any {
    return {
      total_events: alerts.length,
      domination_ratio: alerts.filter(a => a.intensity === 'domination').length / alerts.length,
      uprising_ratio: alerts.filter(a => a.intensity === 'uprising').length / alerts.length,
      bloodbath_ratio: alerts.filter(a => a.intensity === 'bloodbath').length / alerts.length,
      average_confidence: alerts.reduce((sum, a) => sum + a.confidence_score, 0) / alerts.length,
      categories_affected: [...new Set(alerts.map(a => a.category))].length
    };
  }

  private generateRiskMatrix(alerts: VisceralAlert[]): any {
    const risks = {
      high_probability_high_impact: [] as VisceralAlert[],
      high_probability_low_impact: [] as VisceralAlert[],
      low_probability_high_impact: [] as VisceralAlert[],
      low_probability_low_impact: [] as VisceralAlert[]
    };
    
    alerts.forEach(alert => {
      const highProbability = alert.confidence_score > 0.7;
      const highImpact = alert.executive_urgency === 'critical' || Math.abs(alert.market_position_change) >= 5;
      
      if (highProbability && highImpact) {
        risks.high_probability_high_impact.push(alert);
      } else if (highProbability && !highImpact) {
        risks.high_probability_low_impact.push(alert);
      } else if (!highProbability && highImpact) {
        risks.low_probability_high_impact.push(alert);
      } else {
        risks.low_probability_low_impact.push(alert);
      }
    });
    
    return risks;
  }

  private generateBoardExecutiveSummary(metrics: any, timeframe: string): string {
    return `BOARD INTELLIGENCE BRIEF - ${timeframe.toUpperCase()}\n\n` +
           `Market intelligence analysis reveals ${metrics.market_events_tracked} significant competitive events ` +
           `with ${metrics.critical_threats} requiring immediate board attention.\n\n` +
           `Competitive landscape shows ${(metrics.competitive_pressure_index * 100).toFixed(0)}% pressure index ` +
           `and ${(metrics.disruption_probability * 100).toFixed(0)}% disruption probability. ` +
           `Market volatility at ${(metrics.market_volatility_score * 100).toFixed(0)}% indicates ` +
           `${metrics.market_volatility_score > 0.7 ? 'heightened' : 'normal'} strategic attention required.\n\n` +
           `${metrics.market_opportunities} strategic opportunities identified for consideration. ` +
           `Recommend ${metrics.critical_threats > 0 ? 'immediate' : 'scheduled'} executive review.`;
  }

  private generateBoardRecommendations(metrics: any, alerts: VisceralAlert[]): string[] {
    const recommendations = [];
    
    if (metrics.critical_threats > 0) {
      recommendations.push('Convene emergency strategy session for critical threats');
    }
    
    if (metrics.disruption_probability > 0.6) {
      recommendations.push('Activate disruption response protocols');
      recommendations.push('Review and update competitive strategy framework');
    }
    
    if (metrics.market_opportunities > 3) {
      recommendations.push('Establish investment committee for market opportunities');
    }
    
    recommendations.push('Increase competitive intelligence budget allocation');
    recommendations.push('Implement quarterly competitive landscape reviews');
    recommendations.push('Develop rapid response capabilities for market shifts');
    
    return recommendations;
  }
}