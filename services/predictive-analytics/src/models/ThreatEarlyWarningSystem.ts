import { Pool } from 'pg';
import { Logger } from 'winston';

export interface ThreatWarning {
  threat_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  probability: number;
  impact_score: number;
  time_to_impact: string;
  mitigation_strategies: string[];
  early_indicators: string[];
  competitor: string;
  category: string;
  threat_type: 'market_share_loss' | 'competitive_displacement' | 'technology_disruption' | 'brand_erosion' | 'regulatory_risk';
  confidence_level: number;
  historical_precedents: string[];
  monitoring_metrics: string[];
}

export class ThreatEarlyWarningSystem {
  private pool: Pool;
  private logger: Logger;
  private threatThresholds = {
    critical: { probability: 0.8, impact: 0.9 },
    high: { probability: 0.6, impact: 0.7 },
    medium: { probability: 0.4, impact: 0.5 },
    low: { probability: 0.2, impact: 0.3 }
  };

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  async detectThreats(
    domain: string,
    competitorData: any,
    marketMovements: any,
    config: any
  ): Promise<ThreatWarning[]> {
    try {
      this.logger.info('⚠️ Detecting competitive threats', { domain });

      const threats: ThreatWarning[] = [];

      // Detect different types of threats
      const marketShareThreats = await this.detectMarketShareThreats(domain, competitorData);
      const displacementThreats = await this.detectCompetitiveDisplacementThreats(domain, competitorData);
      const technologyThreats = await this.detectTechnologyDisruptionThreats(domain, marketMovements);
      const brandThreats = await this.detectBrandErosionThreats(domain);
      const regulatoryThreats = await this.detectRegulatoryThreats(domain);

      threats.push(
        ...marketShareThreats,
        ...displacementThreats,
        ...technologyThreats,
        ...brandThreats,
        ...regulatoryThreats
      );

      // Apply sensitivity filtering
      const filteredThreats = this.filterBySensitivity(threats, config.sensitivity || 'medium');

      // Sort by severity and probability
      filteredThreats.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.probability - a.probability;
      });

      this.logger.info('✅ Threat detection completed', { 
        domain,
        threatsDetected: filteredThreats.length,
        criticalThreats: filteredThreats.filter(t => t.severity === 'critical').length
      });

      return filteredThreats;

    } catch (error) {
      this.logger.error('Threat detection failed', { error: error.message, domain });
      throw new Error(`Threat detection failed: ${error.message}`);
    }
  }

  async getCurrentThreatLevel(domain: string): Promise<string> {
    try {
      // Get lightweight threat level for real-time monitoring
      const query = `
        SELECT 
          COUNT(CASE WHEN dr.response LIKE '%threat%' OR dr.response LIKE '%risk%' OR dr.response LIKE '%challenge%' THEN 1 END) as threat_mentions,
          COUNT(CASE WHEN dr.response LIKE '%competition%' OR dr.response LIKE '%competitor%' THEN 1 END) as competition_mentions,
          COUNT(*) as total_responses
        FROM domain_responses dr
        JOIN domains d ON dr.domain_id = d.id
        WHERE d.domain = $1
          AND dr.created_at > NOW() - INTERVAL '7 days'
      `;
      
      const result = await this.pool.query(query, [domain]);
      
      if (result.rows.length === 0 || result.rows[0].total_responses === 0) {
        return 'unknown';
      }

      const row = result.rows[0];
      const threatRatio = row.threat_mentions / row.total_responses;
      const competitionRatio = row.competition_mentions / row.total_responses;
      
      const overallThreatScore = (threatRatio + competitionRatio) / 2;

      if (overallThreatScore > 0.6) return 'critical';
      if (overallThreatScore > 0.4) return 'high';
      if (overallThreatScore > 0.2) return 'medium';
      return 'low';

    } catch (error) {
      this.logger.error('Current threat level check failed', { error: error.message, domain });
      return 'unknown';
    }
  }

  private async detectMarketShareThreats(domain: string, competitorData: any): Promise<ThreatWarning[]> {
    const threats: ThreatWarning[] = [];

    // Analyze rapid competitor growth
    const rapidGrowthQuery = `
      SELECT 
        d.domain as competitor,
        d.cohort,
        COUNT(dr.id) as recent_responses,
        AVG(CASE 
          WHEN dr.response LIKE '%#1%' THEN 1
          WHEN dr.response LIKE '%#2%' THEN 2
          WHEN dr.response LIKE '%#3%' THEN 3
          WHEN dr.response LIKE '%#4%' THEN 4
          WHEN dr.response LIKE '%#5%' THEN 5
          ELSE 10
        END) as avg_position
      FROM domains d
      JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.cohort IN (
        SELECT DISTINCT cohort FROM domains WHERE domain = $1
      )
      AND d.domain != $1
      AND dr.created_at > NOW() - INTERVAL '30 days'
      GROUP BY d.domain, d.cohort
      HAVING COUNT(dr.id) > 10
      ORDER BY avg_position ASC, recent_responses DESC
      LIMIT 5
    `;

    const result = await this.pool.query(rapidGrowthQuery, [domain]);

    for (const row of result.rows) {
      const avgPosition = row.avg_position;
      const responseCount = row.recent_responses;

      // High threat if competitor is in top 3 with lots of mentions
      if (avgPosition <= 3 && responseCount > 20) {
        threats.push({
          threat_id: `market_share_${row.competitor}_${Date.now()}`,
          severity: avgPosition === 1 ? 'critical' : 'high',
          description: `${row.competitor} showing strong market performance with average position ${Math.round(avgPosition)} and high mention frequency`,
          probability: Math.min(0.9, (responseCount / 50) * (4 - avgPosition) / 3),
          impact_score: (4 - avgPosition) / 3,
          time_to_impact: avgPosition === 1 ? '1-3 months' : '3-6 months',
          mitigation_strategies: [
            'Increase competitive differentiation',
            'Accelerate product development',
            'Enhance marketing presence',
            'Analyze competitor strategy for gaps'
          ],
          early_indicators: [
            'Rising mention frequency',
            'Improving position rankings',
            'Increased market visibility'
          ],
          competitor: row.competitor,
          category: row.cohort,
          threat_type: 'market_share_loss',
          confidence_level: 0.7,
          historical_precedents: [],
          monitoring_metrics: ['Position ranking', 'Mention frequency', 'Sentiment analysis']
        });
      }
    }

    return threats;
  }

  private async detectCompetitiveDisplacementThreats(domain: string, competitorData: any): Promise<ThreatWarning[]> {
    const threats: ThreatWarning[] = [];

    // Look for new entrants or companies rapidly climbing rankings
    const displacementQuery = `
      WITH position_changes AS (
        SELECT 
          d.domain,
          d.cohort,
          AVG(CASE 
            WHEN dr.response LIKE '%#1%' THEN 1
            WHEN dr.response LIKE '%#2%' THEN 2
            WHEN dr.response LIKE '%#3%' THEN 3
            WHEN dr.response LIKE '%#4%' THEN 4
            WHEN dr.response LIKE '%#5%' THEN 5
            ELSE 10
          END) FILTER (WHERE dr.created_at > NOW() - INTERVAL '15 days') as recent_position,
          AVG(CASE 
            WHEN dr.response LIKE '%#1%' THEN 1
            WHEN dr.response LIKE '%#2%' THEN 2
            WHEN dr.response LIKE '%#3%' THEN 3
            WHEN dr.response LIKE '%#4%' THEN 4
            WHEN dr.response LIKE '%#5%' THEN 5
            ELSE 10
          END) FILTER (WHERE dr.created_at BETWEEN NOW() - INTERVAL '45 days' AND NOW() - INTERVAL '15 days') as previous_position
        FROM domains d
        JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE d.cohort IN (
          SELECT DISTINCT cohort FROM domains WHERE domain = $1
        )
        AND d.domain != $1
        GROUP BY d.domain, d.cohort
        HAVING COUNT(dr.id) FILTER (WHERE dr.created_at > NOW() - INTERVAL '15 days') > 5
           AND COUNT(dr.id) FILTER (WHERE dr.created_at BETWEEN NOW() - INTERVAL '45 days' AND NOW() - INTERVAL '15 days') > 5
      )
      SELECT 
        domain,
        cohort,
        recent_position,
        previous_position,
        (previous_position - recent_position) as improvement
      FROM position_changes
      WHERE (previous_position - recent_position) > 2
      ORDER BY improvement DESC
      LIMIT 3
    `;

    const result = await this.pool.query(displacementQuery, [domain]);

    for (const row of result.rows) {
      const improvement = row.improvement;
      const recentPosition = row.recent_position;

      threats.push({
        threat_id: `displacement_${row.domain}_${Date.now()}`,
        severity: recentPosition <= 5 ? 'high' : 'medium',
        description: `${row.domain} has rapidly improved position by ${improvement.toFixed(1)} places, indicating strong competitive momentum`,
        probability: Math.min(0.8, improvement / 5),
        impact_score: Math.min(0.9, improvement / 4),
        time_to_impact: recentPosition <= 3 ? '2-4 weeks' : '1-3 months',
        mitigation_strategies: [
          'Rapid competitive response strategy',
          'Accelerate innovation pipeline',
          'Strategic partnership considerations',
          'Market positioning reinforcement'
        ],
        early_indicators: [
          'Rapid position improvement',
          'Increased market momentum',
          'Growing competitive mentions'
        ],
        competitor: row.domain,
        category: row.cohort,
        threat_type: 'competitive_displacement',
        confidence_level: 0.8,
        historical_precedents: [],
        monitoring_metrics: ['Position trajectory', 'Momentum score', 'Market share indicators']
      });
    }

    return threats;
  }

  private async detectTechnologyDisruptionThreats(domain: string, marketMovements: any): Promise<ThreatWarning[]> {
    const threats: ThreatWarning[] = [];

    // Detect mentions of disruptive technologies in competitor responses
    const technologyQuery = `
      SELECT 
        d.domain,
        d.cohort,
        dr.response,
        COUNT(*) as mention_count
      FROM domains d
      JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.cohort IN (
        SELECT DISTINCT cohort FROM domains WHERE domain = $1
      )
      AND d.domain != $1
      AND dr.created_at > NOW() - INTERVAL '30 days'
      AND (
        dr.response ILIKE '%AI%' OR
        dr.response ILIKE '%artificial intelligence%' OR
        dr.response ILIKE '%machine learning%' OR
        dr.response ILIKE '%blockchain%' OR
        dr.response ILIKE '%automation%' OR
        dr.response ILIKE '%cloud%' OR
        dr.response ILIKE '%mobile%' OR
        dr.response ILIKE '%innovative%' OR
        dr.response ILIKE '%disruptive%' OR
        dr.response ILIKE '%next-generation%'
      )
      GROUP BY d.domain, d.cohort, dr.response
      HAVING COUNT(*) > 3
      ORDER BY mention_count DESC
      LIMIT 10
    `;

    const result = await this.pool.query(technologyQuery, [domain]);

    const technologyMentions = new Map<string, number>();
    for (const row of result.rows) {
      const count = technologyMentions.get(row.domain) || 0;
      technologyMentions.set(row.domain, count + row.mention_count);
    }

    for (const [competitor, mentionCount] of technologyMentions.entries()) {
      if (mentionCount > 10) {
        threats.push({
          threat_id: `technology_${competitor}_${Date.now()}`,
          severity: mentionCount > 20 ? 'high' : 'medium',
          description: `${competitor} showing strong technology innovation signals with ${mentionCount} relevant mentions`,
          probability: Math.min(0.7, mentionCount / 30),
          impact_score: 0.6,
          time_to_impact: '6-12 months',
          mitigation_strategies: [
            'Accelerate technology adoption',
            'Increase R&D investment',
            'Form strategic technology partnerships',
            'Monitor technology trends closely'
          ],
          early_indicators: [
            'Technology-focused mentions',
            'Innovation signals',
            'R&D investment indicators'
          ],
          competitor,
          category: 'technology',
          threat_type: 'technology_disruption',
          confidence_level: 0.6,
          historical_precedents: [],
          monitoring_metrics: ['Technology mentions', 'Innovation indicators', 'R&D signals']
        });
      }
    }

    return threats;
  }

  private async detectBrandErosionThreats(domain: string): Promise<ThreatWarning[]> {
    const threats: ThreatWarning[] = [];

    // Analyze sentiment and positioning decline indicators
    const brandQuery = `
      SELECT 
        COUNT(CASE WHEN dr.response ILIKE '%decline%' OR dr.response ILIKE '%falling%' OR dr.response ILIKE '%losing%' THEN 1 END) as negative_mentions,
        COUNT(CASE WHEN dr.response ILIKE '%strong%' OR dr.response ILIKE '%leading%' OR dr.response ILIKE '%growing%' THEN 1 END) as positive_mentions,
        COUNT(*) as total_mentions
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.domain = $1
        AND dr.created_at > NOW() - INTERVAL '30 days'
    `;

    const result = await this.pool.query(brandQuery, [domain]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const negativeRatio = row.negative_mentions / (row.total_mentions || 1);
      const positiveRatio = row.positive_mentions / (row.total_mentions || 1);

      if (negativeRatio > 0.3 || (negativeRatio > positiveRatio && row.total_mentions > 10)) {
        threats.push({
          threat_id: `brand_erosion_${domain}_${Date.now()}`,
          severity: negativeRatio > 0.5 ? 'high' : 'medium',
          description: `Brand sentiment showing concerning patterns with ${Math.round(negativeRatio * 100)}% negative indicators`,
          probability: negativeRatio,
          impact_score: 0.7,
          time_to_impact: '3-9 months',
          mitigation_strategies: [
            'Brand reputation management',
            'Positive PR campaign',
            'Customer satisfaction improvement',
            'Market perception research'
          ],
          early_indicators: [
            'Declining sentiment mentions',
            'Negative positioning signals',
            'Market perception shifts'
          ],
          competitor: 'market_perception',
          category: 'brand',
          threat_type: 'brand_erosion',
          confidence_level: 0.5,
          historical_precedents: [],
          monitoring_metrics: ['Sentiment analysis', 'Brand mentions', 'Market perception']
        });
      }
    }

    return threats;
  }

  private async detectRegulatoryThreats(domain: string): Promise<ThreatWarning[]> {
    const threats: ThreatWarning[] = [];

    // Look for regulatory and compliance mentions
    const regulatoryQuery = `
      SELECT 
        COUNT(CASE WHEN dr.response ILIKE '%regulation%' OR dr.response ILIKE '%compliance%' OR dr.response ILIKE '%legal%' THEN 1 END) as regulatory_mentions,
        COUNT(*) as total_mentions
      FROM domain_responses dr
      JOIN domains d ON dr.domain_id = d.id
      WHERE d.domain = $1
        AND dr.created_at > NOW() - INTERVAL '60 days'
    `;

    const result = await this.pool.query(regulatoryQuery, [domain]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const regulatoryRatio = row.regulatory_mentions / (row.total_mentions || 1);

      if (regulatoryRatio > 0.15 && row.regulatory_mentions > 3) {
        threats.push({
          threat_id: `regulatory_${domain}_${Date.now()}`,
          severity: regulatoryRatio > 0.3 ? 'high' : 'medium',
          description: `Increased regulatory mentions detected with ${Math.round(regulatoryRatio * 100)}% of responses containing regulatory signals`,
          probability: Math.min(0.6, regulatoryRatio * 2),
          impact_score: 0.8,
          time_to_impact: '6-18 months',
          mitigation_strategies: [
            'Regulatory compliance audit',
            'Legal risk assessment',
            'Government relations strategy',
            'Compliance framework strengthening'
          ],
          early_indicators: [
            'Regulatory mentions increasing',
            'Compliance discussions',
            'Legal framework changes'
          ],
          competitor: 'regulatory_environment',
          category: 'regulatory',
          threat_type: 'regulatory_risk',
          confidence_level: 0.4,
          historical_precedents: [],
          monitoring_metrics: ['Regulatory mentions', 'Compliance indicators', 'Legal signals']
        });
      }
    }

    return threats;
  }

  private filterBySensitivity(threats: ThreatWarning[], sensitivity: string): ThreatWarning[] {
    const thresholds = {
      low: 0.2,
      medium: 0.4,
      high: 0.6
    };

    const threshold = thresholds[sensitivity as keyof typeof thresholds] || 0.4;

    return threats.filter(threat => threat.probability >= threshold);
  }
}