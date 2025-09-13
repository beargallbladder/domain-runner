import { Pool } from 'pg';
import { Logger } from 'winston';

export interface BloombergAnalysis {
  headline: string;
  severity_indicator: 'BLOODBATH' | 'DOMINATION' | 'UPRISING' | 'COLLAPSE' | 'STABLE';
  market_verdict: string;
  visceral_metrics: {
    destruction_score: number;
    momentum_intensity: number;
    competitive_carnage: number;
    opportunity_index: number;
  };
  power_rankings: Array<{
    position: number;
    entity: string;
    status: 'CRUSHING' | 'RISING' | 'FALLING' | 'STABLE' | 'DESTROYED';
    momentum: string;
  }>;
  market_dynamics: {
    winners: string[];
    losers: string[];
    dark_horses: string[];
    walking_dead: string[];
  };
  professional_assessment: string;
  confidence_rating: 'IRON-CLAD' | 'HIGH' | 'MODERATE' | 'SPECULATIVE';
}

export class BloombergStyleAnalyzer {
  private pool: Pool;
  private logger: Logger;

  // Bloomberg-style intensity thresholds
  private intensityThresholds = {
    bloodbath: { position_change: 5, momentum: -0.8, confidence: 0.8 },
    domination: { position_change: -3, momentum: 0.6, confidence: 0.8 },
    uprising: { position_change: -4, momentum: 0.7, confidence: 0.7 },
    collapse: { position_change: 6, momentum: -0.9, confidence: 0.9 },
    stable: { position_change: 2, momentum: 0.2, confidence: 0.5 }
  };

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  async generatePositionInsights(
    domain: string,
    predictions: any,
    confidence: any
  ): Promise<BloombergAnalysis> {
    try {
      this.logger.info('📈 Generating Bloomberg-style position insights', { domain });

      // Analyze current market position and trajectory
      const currentPosition = await this.getCurrentMarketPosition(domain);
      const competitiveContext = await this.getCompetitiveContext(domain);
      const momentumAnalysis = await this.analyzeMomentum(domain, predictions);

      // Determine severity and generate headline
      const severity = this.determineSeverityIndicator(predictions, momentumAnalysis, confidence);
      const headline = this.generateVisceralHeadline(domain, severity, predictions, competitiveContext);
      
      // Calculate visceral metrics
      const visceralMetrics = this.calculateVisceralMetrics(
        domain, 
        predictions, 
        competitiveContext, 
        momentumAnalysis
      );

      // Generate power rankings
      const powerRankings = await this.generatePowerRankings(domain, competitiveContext);

      // Analyze market dynamics
      const marketDynamics = this.analyzeMarketDynamics(competitiveContext, powerRankings);

      // Generate professional assessment
      const professionalAssessment = this.generateProfessionalAssessment(
        domain,
        severity,
        predictions,
        visceralMetrics,
        confidence
      );

      // Determine confidence rating
      const confidenceRating = this.mapConfidenceRating(confidence.overall_confidence);

      // Generate market verdict
      const marketVerdict = this.generateMarketVerdict(severity, visceralMetrics, powerRankings);

      const result: BloombergAnalysis = {
        headline,
        severity_indicator: severity,
        market_verdict: marketVerdict,
        visceral_metrics: visceralMetrics,
        power_rankings: powerRankings,
        market_dynamics: marketDynamics,
        professional_assessment: professionalAssessment,
        confidence_rating: confidenceRating
      };

      this.logger.info('✅ Bloomberg-style analysis generated', {
        domain,
        severity,
        confidenceRating,
        destructionScore: visceralMetrics.destruction_score
      });

      return result;

    } catch (error) {
      this.logger.error('Bloomberg-style analysis failed', { error: error.message, domain });
      throw new Error(`Bloomberg-style analysis failed: ${error.message}`);
    }
  }

  async generateThreatAnalysis(domain: string, threats: any[]): Promise<Record<string, any>> {
    const analysis: Record<string, any> = {};

    for (const threat of threats) {
      const visceral_threat_analysis = {
        headline: this.generateThreatHeadline(threat),
        severity_assessment: this.mapThreatSeverity(threat.severity),
        competitive_impact: this.assessCompetitiveImpact(threat),
        market_implications: this.generateMarketImplications(threat),
        professional_verdict: this.generateThreatVerdict(threat)
      };

      analysis[threat.threat_id] = visceral_threat_analysis;
    }

    return analysis;
  }

  async generateTrajectoryReport(
    domain: string,
    trajectory: any,
    joltInsights?: any
  ): Promise<any> {
    const trajectoryType = trajectory.trajectory_type;
    const momentum = trajectory.momentum_score;
    const currentPosition = trajectory.current_position;

    let headline = '';
    let severity = 'STABLE';
    let assessment = '';

    // Generate Bloomberg-style trajectory headlines
    if (trajectoryType === 'rising' && momentum > 0.5) {
      headline = `${domain.toUpperCase()} ROCKETS UP THE RANKINGS`;
      severity = 'UPRISING';
      assessment = `UNSTOPPABLE momentum with ${Math.round(momentum * 100)}% acceleration`;
    } else if (trajectoryType === 'declining' && momentum < -0.5) {
      headline = `${domain.toUpperCase()} IN FREEFALL`;
      severity = 'COLLAPSE';
      assessment = `BRUTAL decline with ${Math.round(Math.abs(momentum) * 100)}% negative momentum`;
    } else if (trajectoryType === 'volatile') {
      headline = `${domain.toUpperCase()} MARKET CHAOS`;
      severity = 'BLOODBATH';
      assessment = `EXTREME volatility with unpredictable swings`;
    } else if (trajectory.growth_rate > 5) {
      headline = `${domain.toUpperCase()} CRUSHES COMPETITION`;
      severity = 'DOMINATION';
      assessment = `DOMINANT performance with ${trajectory.growth_rate.toFixed(1)}% growth rate`;
    } else {
      headline = `${domain.toUpperCase()} HOLDS STEADY`;
      severity = 'STABLE';
      assessment = `STABLE trajectory maintaining position ${currentPosition}`;
    }

    return {
      headline,
      severity_indicator: severity,
      trajectory_verdict: assessment,
      momentum_analysis: this.generateMomentumAnalysis(momentum, trajectoryType),
      risk_assessment: this.generateTrajectoryRiskAssessment(trajectory),
      market_positioning: this.generateMarketPositioning(currentPosition, trajectoryType),
      jolt_context: joltInsights ? this.generateJOLTContext(joltInsights) : null
    };
  }

  async generateDisruptionAnalysis(
    category: string,
    disruptions: any[],
    joltPatterns?: any
  ): Promise<Record<string, any>> {
    const analysis: Record<string, any> = {};

    for (const disruption of disruptions) {
      const disruptionAnalysis = {
        headline: this.generateDisruptionHeadline(disruption),
        threat_level: this.mapDisruptionThreatLevel(disruption.severity),
        market_impact: this.assessDisruptionImpact(disruption),
        preparation_urgency: this.generatePreparationUrgency(disruption),
        strategic_response: this.generateStrategicResponse(disruption),
        historical_context: joltPatterns ? this.generateHistoricalContext(joltPatterns) : null
      };

      analysis[disruption.disruption_id] = disruptionAnalysis;
    }

    return analysis;
  }

  async generateInvestmentAnalysis(
    domain: string,
    allocation: any,
    joltInsights?: any
  ): Promise<any> {
    const totalBudget = allocation.total_budget;
    const topRecommendation = allocation.recommendations[0];
    const riskProfile = this.calculateRiskProfile(allocation.recommendations);

    let headline = '';
    let verdict = '';

    if (riskProfile === 'HIGH') {
      headline = `${domain.toUpperCase()}: ALL-IN AGGRESSIVE PLAY`;
      verdict = `HIGH-STAKES investment strategy with potential for MASSIVE returns`;
    } else if (riskProfile === 'MODERATE') {
      headline = `${domain.toUpperCase()}: BALANCED ASSAULT`;
      verdict = `STRATEGIC allocation balancing growth and defense`;
    } else {
      headline = `${domain.toUpperCase()}: DEFENSIVE FORTRESS`;
      verdict = `CONSERVATIVE approach prioritizing protection over growth`;
    }

    return {
      headline,
      investment_verdict: verdict,
      portfolio_assessment: this.generatePortfolioAssessment(allocation.recommendations),
      risk_profile: riskProfile,
      expected_returns: this.generateReturnsAssessment(allocation.recommendations),
      strategic_priorities: this.generateStrategicPriorities(allocation.recommendations),
      market_timing: this.generateMarketTiming(allocation.timeline),
      jolt_considerations: joltInsights ? this.generateJOLTInvestmentConsiderations(joltInsights) : null
    };
  }

  async generateConfidenceReport(predictionId: string, confidence: any): Promise<any> {
    const overallConfidence = confidence.overall_confidence;
    const reliabilityGrade = confidence.reliability_grade;

    let headline = '';
    let verdict = '';

    if (overallConfidence > 0.8 && reliabilityGrade === 'A') {
      headline = 'IRON-CLAD PREDICTION CONFIDENCE';
      verdict = 'ROCK-SOLID data foundation with EXCEPTIONAL reliability';
    } else if (overallConfidence > 0.6 && reliabilityGrade >= 'B') {
      headline = 'HIGH CONFIDENCE PREDICTION';
      verdict = 'STRONG data foundation with RELIABLE methodology';
    } else if (overallConfidence > 0.4) {
      headline = 'MODERATE CONFIDENCE WARNING';
      verdict = 'ACCEPTABLE data quality but ELEVATED uncertainty';
    } else {
      headline = 'LOW CONFIDENCE ALERT';
      verdict = 'WEAK data foundation requires CAUTIOUS interpretation';
    }

    return {
      headline,
      confidence_verdict: verdict,
      reliability_assessment: this.generateReliabilityAssessment(confidence),
      data_quality_breakdown: this.generateDataQualityBreakdown(confidence.factor_breakdown),
      uncertainty_analysis: this.generateUncertaintyAnalysis(confidence.confidence_intervals),
      professional_recommendation: this.generateProfessionalRecommendation(overallConfidence, reliabilityGrade)
    };
  }

  async generateTemporalReport(
    domain: string,
    temporalAnalysis: any,
    joltPatterns?: any
  ): Promise<any> {
    const shortTerm = temporalAnalysis.short_term;
    const longTerm = temporalAnalysis.long_term;
    const volatility = temporalAnalysis.prediction_stability?.volatility_score || 0;

    let headline = '';
    let timeVerdict = '';

    if (shortTerm.confidence > 0.8 && longTerm.confidence < 0.5) {
      headline = `${domain.toUpperCase()}: SHORT-TERM CLARITY, LONG-TERM FOG`;
      timeVerdict = 'IMMEDIATE predictions SOLID, future becomes MURKY';
    } else if (volatility > 0.7) {
      headline = `${domain.toUpperCase()}: TEMPORAL CHAOS AHEAD`;
      timeVerdict = 'EXTREME time-based uncertainty across all horizons';
    } else if (shortTerm.predicted_position < longTerm.predicted_position - 2) {
      headline = `${domain.toUpperCase()}: LONG-TERM RECOVERY TRAJECTORY`;
      timeVerdict = 'SHORT-TERM pain leading to LONG-TERM gains';
    } else {
      headline = `${domain.toUpperCase()}: STEADY TEMPORAL PROGRESSION`;
      timeVerdict = 'CONSISTENT trajectory across time horizons';
    }

    return {
      headline,
      temporal_verdict: timeVerdict,
      time_horizon_analysis: this.generateTimeHorizonAnalysis(temporalAnalysis),
      uncertainty_evolution: this.generateUncertaintyEvolution(temporalAnalysis.uncertainty_bands),
      risk_timeline: this.generateRiskTimeline(temporalAnalysis.risk_evolution),
      pattern_insights: this.generatePatternInsights(temporalAnalysis.temporal_patterns),
      jolt_temporal_effects: joltPatterns ? this.generateJOLTTemporalEffects(joltPatterns) : null
    };
  }

  async generateDashboardPresentation(domain: string, dashboard: any): Promise<any> {
    const components = dashboard.components;
    let overallSeverity = 'STABLE';
    let overallHeadline = '';
    let marketVerdict = '';

    // Analyze overall market situation
    const threats = components.threat_warnings?.length || 0;
    const opportunities = components.market_position?.opportunities?.length || 0;
    const momentum = components.brand_trajectory?.momentum_score || 0;

    // Determine overall situation
    if (threats > 3 && momentum < -0.5) {
      overallSeverity = 'BLOODBATH';
      overallHeadline = `${domain.toUpperCase()} UNDER SIEGE`;
      marketVerdict = 'MULTIPLE threats converging with NEGATIVE momentum';
    } else if (opportunities > 3 && momentum > 0.5) {
      overallSeverity = 'DOMINATION';
      overallHeadline = `${domain.toUpperCase()} MARKET DOMINATION`;
      marketVerdict = 'CRUSHING opportunities with EXPLOSIVE momentum';
    } else if (threats > opportunities) {
      overallSeverity = 'COLLAPSE';
      overallHeadline = `${domain.toUpperCase()} DEFENSIVE MODE`;
      marketVerdict = 'THREAT-heavy environment requiring IMMEDIATE response';
    } else {
      overallSeverity = 'STABLE';
      overallHeadline = `${domain.toUpperCase()} STEADY AS SHE GOES`;
      marketVerdict = 'BALANCED market position with MANAGEABLE dynamics';
    }

    return {
      executive_headline: overallHeadline,
      overall_severity: overallSeverity,
      market_verdict: marketVerdict,
      dashboard_summary: this.generateDashboardSummary(components),
      component_alerts: this.generateComponentAlerts(components),
      strategic_priorities: this.generateDashboardPriorities(components),
      immediate_actions: this.generateImmediateActions(components, overallSeverity)
    };
  }

  // Helper methods for visceral analysis

  private async getCurrentMarketPosition(domain: string): Promise<number> {
    const query = `
      SELECT 
        AVG(CASE 
          WHEN dr.response LIKE '%#1%' THEN 1
          WHEN dr.response LIKE '%#2%' THEN 2
          WHEN dr.response LIKE '%#3%' THEN 3
          WHEN dr.response LIKE '%#4%' THEN 4
          WHEN dr.response LIKE '%#5%' THEN 5
          ELSE 10
        END) as avg_position
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.domain = $1
        AND dr.created_at > NOW() - INTERVAL '7 days'
    `;
    
    const result = await this.pool.query(query, [domain]);
    return Math.round(result.rows[0]?.avg_position || 10);
  }

  private async getCompetitiveContext(domain: string): Promise<any> {
    const query = `
      SELECT 
        d.domain as competitor,
        AVG(CASE 
          WHEN dr.response LIKE '%#1%' THEN 1
          WHEN dr.response LIKE '%#2%' THEN 2
          WHEN dr.response LIKE '%#3%' THEN 3
          WHEN dr.response LIKE '%#4%' THEN 4
          WHEN dr.response LIKE '%#5%' THEN 5
          ELSE 10
        END) as avg_position,
        COUNT(dr.id) as mention_count
      FROM domains d
      JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.cohort IN (
        SELECT DISTINCT cohort FROM domains WHERE domain = $1
      )
      AND d.domain != $1
      AND dr.created_at > NOW() - INTERVAL '30 days'
      GROUP BY d.domain
      HAVING COUNT(dr.id) > 5
      ORDER BY avg_position ASC
      LIMIT 10
    `;
    
    const result = await this.pool.query(query, [domain]);
    return result.rows;
  }

  private async analyzeMomentum(domain: string, predictions: any): Promise<any> {
    const currentPrediction = predictions.predicted_positions?.[0];
    const futurePrediction = predictions.predicted_positions?.[2];
    
    if (!currentPrediction || !futurePrediction) {
      return { momentum: 0, velocity: 0, acceleration: 0 };
    }

    const momentum = (currentPrediction.position - futurePrediction.position) / 3; // Normalized
    return {
      momentum,
      velocity: Math.abs(momentum),
      acceleration: momentum > 0 ? 'POSITIVE' : 'NEGATIVE'
    };
  }

  private determineSeverityIndicator(
    predictions: any,
    momentum: any,
    confidence: any
  ): 'BLOODBATH' | 'DOMINATION' | 'UPRISING' | 'COLLAPSE' | 'STABLE' {
    const momentumScore = momentum.momentum || 0;
    const confidenceScore = confidence.overall_confidence || 0.5;
    
    if (momentumScore < -0.8 && confidenceScore > 0.8) return 'BLOODBATH';
    if (momentumScore > 0.6 && confidenceScore > 0.8) return 'DOMINATION';
    if (momentumScore > 0.4 && confidenceScore > 0.7) return 'UPRISING';
    if (momentumScore < -0.9 && confidenceScore > 0.9) return 'COLLAPSE';
    return 'STABLE';
  }

  private generateVisceralHeadline(
    domain: string,
    severity: string,
    predictions: any,
    competitive: any
  ): string {
    const domainName = domain.toUpperCase();
    
    switch (severity) {
      case 'BLOODBATH':
        return `${domainName} GETTING DESTROYED BY COMPETITION`;
      case 'DOMINATION':
        return `${domainName} OBLITERATES MARKET RIVALS`;
      case 'UPRISING':
        return `${domainName} ROCKETS UP THE RANKINGS`;
      case 'COLLAPSE':
        return `${domainName} IN COMPLETE FREEFALL`;
      default:
        return `${domainName} HOLDS STEADY IN MARKET BATTLE`;
    }
  }

  private calculateVisceralMetrics(
    domain: string,
    predictions: any,
    competitive: any,
    momentum: any
  ): any {
    const destructionScore = Math.abs(momentum.momentum || 0) * 100;
    const momentumIntensity = (momentum.velocity || 0) * 100;
    const competitiveCarnage = competitive.length > 0 ? 
      (competitive.filter((c: any) => c.avg_position < 5).length / competitive.length) * 100 : 50;
    const opportunityIndex = Math.max(0, (momentum.momentum || 0)) * 100;

    return {
      destruction_score: Math.round(destructionScore),
      momentum_intensity: Math.round(momentumIntensity),
      competitive_carnage: Math.round(competitiveCarnage),
      opportunity_index: Math.round(opportunityIndex)
    };
  }

  private async generatePowerRankings(domain: string, competitive: any): Promise<any[]> {
    const rankings = competitive.map((comp: any, index: number) => ({
      position: index + 1,
      entity: comp.competitor,
      status: this.determineEntityStatus(comp.avg_position, comp.mention_count),
      momentum: this.determineMomentumDescription(comp.avg_position)
    }));

    // Add the target domain
    const currentPos = await this.getCurrentMarketPosition(domain);
    rankings.push({
      position: rankings.length + 1,
      entity: domain,
      status: this.determineEntityStatus(currentPos, 100),
      momentum: 'ANALYZING'
    });

    return rankings.sort((a, b) => a.position - b.position).slice(0, 10);
  }

  private determineEntityStatus(position: number, mentions: number): string {
    if (position <= 2 && mentions > 50) return 'CRUSHING';
    if (position <= 5 && mentions > 30) return 'RISING';
    if (position > 10 || mentions < 10) return 'DESTROYED';
    if (position > 7) return 'FALLING';
    return 'STABLE';
  }

  private determineMomentumDescription(position: number): string {
    if (position <= 3) return 'UNSTOPPABLE ↗️';
    if (position <= 6) return 'CLIMBING ↗️';
    if (position <= 10) return 'SLIDING ↘️';
    return 'FREEFALL ↘️';
  }

  private analyzeMarketDynamics(competitive: any, rankings: any[]): any {
    const winners = rankings.filter(r => r.status === 'CRUSHING' || r.status === 'RISING').map(r => r.entity);
    const losers = rankings.filter(r => r.status === 'FALLING' || r.status === 'DESTROYED').map(r => r.entity);
    const darkHorses = competitive.filter((c: any) => c.mention_count > 20 && c.avg_position > 5).map((c: any) => c.competitor);
    const walkingDead = competitive.filter((c: any) => c.avg_position > 15).map((c: any) => c.competitor);

    return {
      winners: winners.slice(0, 3),
      losers: losers.slice(0, 3),
      dark_horses: darkHorses.slice(0, 2),
      walking_dead: walkingDead.slice(0, 2)
    };
  }

  private generateProfessionalAssessment(
    domain: string,
    severity: string,
    predictions: any,
    metrics: any,
    confidence: any
  ): string {
    const destructionScore = metrics.destruction_score;
    const confidenceLevel = confidence.overall_confidence;

    if (severity === 'BLOODBATH') {
      return `PROFESSIONAL VERDICT: ${domain} faces SEVERE competitive pressure with ${destructionScore}% destruction metrics. IMMEDIATE defensive action required.`;
    } else if (severity === 'DOMINATION') {
      return `PROFESSIONAL VERDICT: ${domain} demonstrates EXCEPTIONAL market performance with ${metrics.opportunity_index}% opportunity capture. MAINTAIN aggressive momentum.`;
    } else if (severity === 'UPRISING') {
      return `PROFESSIONAL VERDICT: ${domain} showing STRONG upward trajectory with ${metrics.momentum_intensity}% momentum intensity. CAPITALIZE on current positioning.`;
    } else {
      return `PROFESSIONAL VERDICT: ${domain} maintains STABLE market position. MONITOR for emerging opportunities and threats.`;
    }
  }

  private mapConfidenceRating(confidence: number): 'IRON-CLAD' | 'HIGH' | 'MODERATE' | 'SPECULATIVE' {
    if (confidence > 0.85) return 'IRON-CLAD';
    if (confidence > 0.7) return 'HIGH';
    if (confidence > 0.5) return 'MODERATE';
    return 'SPECULATIVE';
  }

  private generateMarketVerdict(severity: string, metrics: any, rankings: any[]): string {
    switch (severity) {
      case 'BLOODBATH':
        return `MARKET CARNAGE: ${metrics.destruction_score}% destruction score indicates BRUTAL competitive environment`;
      case 'DOMINATION':
        return `MARKET SUPREMACY: ${metrics.opportunity_index}% opportunity index shows CRUSHING competitive advantage`;
      case 'UPRISING':
        return `MARKET MOMENTUM: ${metrics.momentum_intensity}% intensity driving RAPID market ascension`;
      case 'COLLAPSE':
        return `MARKET FREEFALL: ${metrics.destruction_score}% destruction score signals IMMEDIATE intervention needed`;
      default:
        return `MARKET EQUILIBRIUM: BALANCED competitive dynamics with MANAGEABLE risk profile`;
    }
  }

  // Additional helper methods for other analysis types

  private generateThreatHeadline(threat: any): string {
    const competitor = threat.competitor?.toUpperCase() || 'UNKNOWN THREAT';
    const severity = threat.severity?.toUpperCase();
    
    if (severity === 'CRITICAL') {
      return `${competitor} POSES EXISTENTIAL THREAT`;
    } else if (severity === 'HIGH') {
      return `${competitor} GAINING DANGEROUS GROUND`;
    } else {
      return `${competitor} EMERGING ON RADAR`;
    }
  }

  private mapThreatSeverity(severity: string): string {
    const severityMap: Record<string, string> = {
      critical: 'DEFCON 1 - IMMEDIATE ACTION',
      high: 'DEFCON 2 - URGENT RESPONSE',
      medium: 'DEFCON 3 - ELEVATED ALERT',
      low: 'DEFCON 4 - ROUTINE MONITORING'
    };
    return severityMap[severity] || 'DEFCON 5 - NORMAL CONDITIONS';
  }

  private assessCompetitiveImpact(threat: any): string {
    const probability = threat.probability || 0;
    const impact = threat.impact_score || 0;
    
    if (probability > 0.8 && impact > 0.8) {
      return 'DEVASTATING impact with HIGH probability - CRISIS MANAGEMENT required';
    } else if (probability > 0.6 && impact > 0.6) {
      return 'SIGNIFICANT impact with MODERATE probability - STRATEGIC response needed';
    } else {
      return 'LIMITED impact with LOW probability - MONITORING sufficient';
    }
  }

  private generateMarketImplications(threat: any): string {
    return `Market displacement risk: ${Math.round((threat.probability || 0) * 100)}% | Impact severity: ${Math.round((threat.impact_score || 0) * 100)}%`;
  }

  private generateThreatVerdict(threat: any): string {
    const timeToImpact = threat.time_to_impact || 'unknown';
    return `THREAT ASSESSMENT: ${threat.description} with ${timeToImpact} timeline for materialization`;
  }

  private generateMomentumAnalysis(momentum: number, trajectoryType: string): string {
    if (momentum > 0.5) {
      return `EXPLOSIVE momentum with ${Math.round(momentum * 100)}% acceleration rate`;
    } else if (momentum < -0.5) {
      return `CRUSHING negative momentum with ${Math.round(Math.abs(momentum) * 100)}% decline rate`;
    } else {
      return `NEUTRAL momentum with STABLE trajectory pattern`;
    }
  }

  private generateTrajectoryRiskAssessment(trajectory: any): string {
    const volatility = trajectory.volatility_index || 0;
    if (volatility > 0.7) {
      return 'HIGH VOLATILITY RISK - Unpredictable market swings expected';
    } else if (volatility > 0.4) {
      return 'MODERATE VOLATILITY RISK - Some market fluctuation anticipated';
    } else {
      return 'LOW VOLATILITY RISK - Stable trajectory expected';
    }
  }

  private generateMarketPositioning(currentPosition: number, trajectoryType: string): string {
    if (currentPosition <= 3) {
      return `MARKET LEADER position ${currentPosition} with ${trajectoryType} trajectory`;
    } else if (currentPosition <= 8) {
      return `COMPETITIVE position ${currentPosition} with ${trajectoryType} trajectory`;
    } else {
      return `TRAILING position ${currentPosition} with ${trajectoryType} trajectory`;
    }
  }

  private generateJOLTContext(joltInsights: any): string {
    if (joltInsights.jolt_transition_impact) {
      const type = joltInsights.jolt_transition_impact.type;
      const date = joltInsights.jolt_transition_impact.date;
      return `JOLT FACTOR: ${type} transition from ${date} creating ONGOING market confusion`;
    }
    return 'NO JOLT FACTORS detected in current analysis';
  }

  private calculateRiskProfile(recommendations: any[]): string {
    const highRiskAllocation = recommendations
      .filter(rec => rec.risk_level === 'high')
      .reduce((sum, rec) => sum + rec.allocation_percentage, 0);
    
    if (highRiskAllocation > 40) return 'HIGH';
    if (highRiskAllocation > 20) return 'MODERATE';
    return 'CONSERVATIVE';
  }

  private generatePortfolioAssessment(recommendations: any[]): string {
    const topCategory = recommendations[0];
    const allocation = topCategory.allocation_percentage;
    return `PRIMARY FOCUS: ${topCategory.category} commanding ${allocation}% allocation with ${topCategory.expected_roi}x expected returns`;
  }

  private generateReturnsAssessment(recommendations: any[]): string {
    const weightedROI = recommendations.reduce((sum, rec) => 
      sum + (rec.expected_roi * rec.allocation_percentage), 0) / 100;
    
    return `PORTFOLIO ROI: ${weightedROI.toFixed(2)}x expected returns with ${recommendations.length} strategic initiatives`;
  }

  private generateStrategicPriorities(recommendations: any[]): string[] {
    return recommendations
      .filter(rec => rec.priority >= 8)
      .map(rec => `${rec.category}: ${rec.rationale}`)
      .slice(0, 3);
  }

  private generateMarketTiming(timeline: string): string {
    return `EXECUTION TIMELINE: ${timeline} deployment window for MAXIMUM market impact`;
  }

  private generateJOLTInvestmentConsiderations(joltInsights: any): string {
    if (joltInsights.jolt_investment_strategy) {
      const riskAdjustment = joltInsights.jolt_investment_strategy.risk_adjustment;
      return `JOLT ADJUSTMENT: ${riskAdjustment}x risk multiplier due to brand transition effects`;
    }
    return 'NO JOLT ADJUSTMENTS required for investment strategy';
  }

  // Additional helper methods continue...
  
  private generateDisruptionHeadline(disruption: any): string {
    const category = disruption.category?.toUpperCase() || 'MARKET';
    const severity = disruption.severity?.toUpperCase();
    
    if (severity === 'PARADIGM_SHIFT') {
      return `${category} FACES TOTAL DISRUPTION`;
    } else if (severity === 'MAJOR') {
      return `${category} MAJOR SHAKEUP INCOMING`;
    } else {
      return `${category} MINOR DISRUPTION DETECTED`;
    }
  }

  private mapDisruptionThreatLevel(severity: string): string {
    const levelMap: Record<string, string> = {
      paradigm_shift: 'EXTINCTION EVENT',
      major: 'SEVERE THREAT',
      moderate: 'ELEVATED RISK',
      minor: 'ROUTINE EVOLUTION'
    };
    return levelMap[severity] || 'UNKNOWN THREAT LEVEL';
  }

  private assessDisruptionImpact(disruption: any): string {
    const probability = Math.round((disruption.probability || 0) * 100);
    const impact = Math.round((disruption.industry_impact || 0) * 100);
    return `${probability}% probability with ${impact}% industry impact potential`;
  }

  private generatePreparationUrgency(disruption: any): string {
    const timeHorizon = disruption.time_horizon || 'unknown';
    const preparationTime = disruption.preparation_time || 'immediate';
    return `PREPARATION WINDOW: ${preparationTime} response required for ${timeHorizon} timeline`;
  }

  private generateStrategicResponse(disruption: any): string {
    const strategies = disruption.defensive_strategies || [];
    return `RESPONSE STRATEGY: ${strategies.slice(0, 2).join(' + ')} approach required`;
  }

  private generateHistoricalContext(joltPatterns: any): string {
    if (joltPatterns.historical_cases) {
      const caseCount = joltPatterns.historical_cases.length;
      return `HISTORICAL PRECEDENT: ${caseCount} similar disruption patterns identified`;
    }
    return 'NO HISTORICAL PRECEDENTS found for this disruption type';
  }

  private generateReliabilityAssessment(confidence: any): string {
    const grade = confidence.reliability_grade;
    const score = Math.round(confidence.overall_confidence * 100);
    
    return `RELIABILITY GRADE: ${grade} | CONFIDENCE SCORE: ${score}% | DATA FOUNDATION: ${confidence.data_quality_score > 0.8 ? 'SOLID' : 'WEAK'}`;
  }

  private generateDataQualityBreakdown(factorBreakdown: any): string {
    const completeness = Math.round(factorBreakdown.data_completeness * 100);
    const freshness = Math.round(factorBreakdown.data_freshness * 100);
    
    return `DATA METRICS: ${completeness}% completeness | ${freshness}% freshness | ${factorBreakdown.model_performance > 0.7 ? 'HIGH' : 'LOW'} model performance`;
  }

  private generateUncertaintyAnalysis(confidenceIntervals: any): string {
    const width = Math.round(confidenceIntervals.interval_width * 100);
    return `UNCERTAINTY BAND: ±${width}% prediction variance with ${confidenceIntervals.lower_bound}-${confidenceIntervals.upper_bound} confidence range`;
  }

  private generateProfessionalRecommendation(confidence: number, grade: string): string {
    if (confidence > 0.8 && grade === 'A') {
      return 'PROFESSIONAL RECOMMENDATION: FULL CONFIDENCE in prediction accuracy - EXECUTE strategic decisions based on analysis';
    } else if (confidence > 0.6) {
      return 'PROFESSIONAL RECOMMENDATION: MODERATE CONFIDENCE - USE as primary input with supplementary validation';
    } else {
      return 'PROFESSIONAL RECOMMENDATION: LOW CONFIDENCE - TREAT as directional guidance only, REQUIRE additional data';
    }
  }

  private generateTimeHorizonAnalysis(temporalAnalysis: any): string {
    const shortConf = Math.round(temporalAnalysis.short_term.confidence * 100);
    const longConf = Math.round(temporalAnalysis.long_term.confidence * 100);
    
    return `TIME HORIZON CONFIDENCE: Short-term ${shortConf}% | Long-term ${longConf}% | Prediction reliability DEGRADES over time`;
  }

  private generateUncertaintyEvolution(uncertaintyBands: any[]): string {
    const maxUncertainty = Math.max(...uncertaintyBands.map(b => b.interval_width || 0));
    return `UNCERTAINTY EVOLUTION: Prediction variance INCREASES to ±${Math.round(maxUncertainty * 100)}% at maximum time horizon`;
  }

  private generateRiskTimeline(riskEvolution: any): string {
    const emergingCount = riskEvolution.emerging_risks?.length || 0;
    const diminishingCount = riskEvolution.diminishing_risks?.length || 0;
    
    return `RISK TIMELINE: ${emergingCount} NEW risks emerging | ${diminishingCount} risks diminishing over time`;
  }

  private generatePatternInsights(temporalPatterns: string[]): string {
    return `PATTERN ANALYSIS: ${temporalPatterns.slice(0, 2).join(' + ')} detected in temporal data`;
  }

  private generateJOLTTemporalEffects(joltPatterns: any): string {
    if (joltPatterns.jolt_temporal_effects) {
      return `JOLT TEMPORAL IMPACT: ${joltPatterns.jolt_temporal_effects.short_term_confusion} affecting prediction accuracy`;
    }
    return 'NO JOLT TEMPORAL EFFECTS detected in analysis period';
  }

  private generateDashboardSummary(components: any): string {
    const componentCount = Object.keys(components).length;
    return `DASHBOARD STATUS: ${componentCount} analytical components integrated with REAL-TIME market intelligence`;
  }

  private generateComponentAlerts(components: any): string[] {
    const alerts = [];
    
    if (components.threat_warnings?.length > 2) {
      alerts.push(`HIGH THREAT ENVIRONMENT: ${components.threat_warnings.length} active threats detected`);
    }
    
    if (components.market_position?.confidence < 0.6) {
      alerts.push('LOW CONFIDENCE WARNING: Market position predictions require validation');
    }
    
    if (components.brand_trajectory?.momentum_score < -0.5) {
      alerts.push('NEGATIVE MOMENTUM ALERT: Brand trajectory showing concerning decline');
    }
    
    return alerts.length > 0 ? alerts : ['NO CRITICAL ALERTS: All systems operating within normal parameters'];
  }

  private generateDashboardPriorities(components: any): string[] {
    const priorities = [];
    
    if (components.threat_warnings?.length > 0) {
      priorities.push('PRIORITY 1: Address competitive threats immediately');
    }
    
    if (components.market_position?.opportunities?.length > 0) {
      priorities.push('PRIORITY 2: Capitalize on identified market opportunities');
    }
    
    if (components.resource_allocation) {
      priorities.push('PRIORITY 3: Execute optimized resource allocation strategy');
    }
    
    return priorities.length > 0 ? priorities : ['PRIORITY: Maintain current strategic positioning'];
  }

  private generateImmediateActions(components: any, severity: string): string[] {
    const actions = [];
    
    if (severity === 'BLOODBATH' || severity === 'COLLAPSE') {
      actions.push('IMMEDIATE: Implement crisis management protocols');
      actions.push('IMMEDIATE: Accelerate defensive market strategies');
    } else if (severity === 'DOMINATION') {
      actions.push('IMMEDIATE: Scale successful initiatives aggressively');
      actions.push('IMMEDIATE: Prepare for competitive retaliation');
    } else {
      actions.push('IMMEDIATE: Continue monitoring market dynamics');
      actions.push('IMMEDIATE: Prepare contingency strategies');
    }
    
    return actions;
  }
}