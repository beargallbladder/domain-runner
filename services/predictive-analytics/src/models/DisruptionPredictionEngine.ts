import { Pool } from 'pg';
import { Logger } from 'winston';

export interface DisruptionPrediction {
  disruption_id: string;
  category: string;
  probability: number;
  severity: 'minor' | 'moderate' | 'major' | 'paradigm_shift';
  time_horizon: string;
  description: string;
  potential_disruptors: string[];
  early_signals: string[];
  industry_impact: number;
  preparation_time: string;
  defensive_strategies: string[];
  disruption_type: 'technology' | 'business_model' | 'market_entry' | 'regulatory' | 'consumer_behavior';
  confidence_level: number;
  historical_patterns: string[];
  market_indicators: {
    new_entrant_activity: number;
    technology_advancement: number;
    investment_patterns: number;
    regulatory_changes: number;
    consumer_sentiment_shifts: number;
  };
}

export class DisruptionPredictionEngine {
  private pool: Pool;
  private logger: Logger;
  private disruptionPatterns = {
    technology: {
      indicators: ['AI', 'automation', 'cloud', 'mobile', 'blockchain', 'IoT'],
      timeframe: '6-18 months',
      severity_multiplier: 1.2
    },
    business_model: {
      indicators: ['subscription', 'platform', 'marketplace', 'freemium', 'direct-to-consumer'],
      timeframe: '12-24 months', 
      severity_multiplier: 1.0
    },
    market_entry: {
      indicators: ['new competitor', 'startup', 'expansion', 'acquisition'],
      timeframe: '3-12 months',
      severity_multiplier: 0.8
    },
    regulatory: {
      indicators: ['regulation', 'compliance', 'policy', 'government'],
      timeframe: '12-36 months',
      severity_multiplier: 1.1
    },
    consumer_behavior: {
      indicators: ['trend', 'behavior', 'preference', 'adoption', 'usage'],
      timeframe: '6-24 months',
      severity_multiplier: 0.9
    }
  };

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  async predictDisruptions(
    category: string,
    categoryData: any,
    emergingTrends: any,
    config: any
  ): Promise<DisruptionPrediction[]> {
    try {
      this.logger.info('🌊 Predicting market disruptions', { category });

      const disruptions: DisruptionPrediction[] = [];

      // Analyze different types of potential disruptions
      const technologyDisruptions = await this.predictTechnologyDisruptions(category, config);
      const businessModelDisruptions = await this.predictBusinessModelDisruptions(category, config);
      const marketEntryDisruptions = await this.predictMarketEntryDisruptions(category, config);
      const regulatoryDisruptions = await this.predictRegulatoryDisruptions(category, config);
      const consumerBehaviorDisruptions = await this.predictConsumerBehaviorDisruptions(category, config);

      disruptions.push(
        ...technologyDisruptions,
        ...businessModelDisruptions,
        ...marketEntryDisruptions,
        ...regulatoryDisruptions,
        ...consumerBehaviorDisruptions
      );

      // Apply confidence threshold filtering
      const confidenceThreshold = config.confidenceThreshold || 0.6;
      const filteredDisruptions = disruptions.filter(d => d.confidence_level >= confidenceThreshold);

      // Sort by probability and severity
      filteredDisruptions.sort((a, b) => {
        const severityOrder = { paradigm_shift: 4, major: 3, moderate: 2, minor: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.probability - a.probability;
      });

      this.logger.info('✅ Disruption predictions completed', {
        category,
        totalDisruptions: filteredDisruptions.length,
        highProbabilityDisruptions: filteredDisruptions.filter(d => d.probability > 0.7).length
      });

      return filteredDisruptions;

    } catch (error) {
      this.logger.error('Disruption prediction failed', { error: error.message, category });
      throw new Error(`Disruption prediction failed: ${error.message}`);
    }
  }

  private async predictTechnologyDisruptions(category: string, config: any): Promise<DisruptionPrediction[]> {
    const disruptions: DisruptionPrediction[] = [];

    // Analyze technology mentions and advancement patterns
    const technologyQuery = `
      SELECT 
        d.domain,
        d.cohort,
        COUNT(CASE WHEN dr.response ILIKE ANY(ARRAY['%AI%', '%artificial intelligence%', '%machine learning%', '%automation%', '%cloud%', '%mobile%', '%blockchain%', '%IoT%']) THEN 1 END) as tech_mentions,
        COUNT(*) as total_responses,
        STRING_AGG(DISTINCT CASE 
          WHEN dr.response ILIKE '%AI%' OR dr.response ILIKE '%artificial intelligence%' THEN 'AI'
          WHEN dr.response ILIKE '%machine learning%' THEN 'ML'
          WHEN dr.response ILIKE '%automation%' THEN 'Automation'
          WHEN dr.response ILIKE '%cloud%' THEN 'Cloud'
          WHEN dr.response ILIKE '%mobile%' THEN 'Mobile'
          WHEN dr.response ILIKE '%blockchain%' THEN 'Blockchain'
          WHEN dr.response ILIKE '%IoT%' THEN 'IoT'
        END, ', ') as technologies
      FROM domains d
      JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.cohort = $1
        AND dr.created_at > NOW() - INTERVAL '60 days'
      GROUP BY d.domain, d.cohort
      HAVING COUNT(CASE WHEN dr.response ILIKE ANY(ARRAY['%AI%', '%artificial intelligence%', '%machine learning%', '%automation%', '%cloud%', '%mobile%', '%blockchain%', '%IoT%']) THEN 1 END) > 5
      ORDER BY tech_mentions DESC
      LIMIT 10
    `;

    const result = await this.pool.query(technologyQuery, [category]);

    // Analyze technology adoption patterns
    for (const row of result.rows) {
      const techRatio = row.tech_mentions / row.total_responses;
      const technologies = row.technologies ? row.technologies.split(', ').filter(Boolean) : [];

      if (techRatio > 0.2 && technologies.length > 0) {
        const probability = Math.min(0.9, techRatio * 2);
        const severity = this.determineSeverity(probability, 'technology');

        disruptions.push({
          disruption_id: `tech_${category}_${row.domain}_${Date.now()}`,
          category,
          probability,
          severity,
          time_horizon: this.disruptionPatterns.technology.timeframe,
          description: `Technology-driven disruption in ${category} led by ${row.domain} with focus on ${technologies.join(', ')}`,
          potential_disruptors: [row.domain],
          early_signals: [
            `High technology mention frequency (${Math.round(techRatio * 100)}%)`,
            `Focus on ${technologies.join(', ')}`,
            'Technology-forward positioning'
          ],
          industry_impact: probability * 0.8,
          preparation_time: '6-12 months',
          defensive_strategies: [
            'Accelerate digital transformation',
            'Invest in emerging technologies',
            'Partner with technology leaders',
            'Develop technology roadmap'
          ],
          disruption_type: 'technology',
          confidence_level: Math.min(0.8, techRatio + (technologies.length * 0.1)),
          historical_patterns: this.getTechnologyDisruptionPatterns(),
          market_indicators: await this.getMarketIndicators(category, 'technology')
        });
      }
    }

    return disruptions;
  }

  private async predictBusinessModelDisruptions(category: string, config: any): Promise<DisruptionPrediction[]> {
    const disruptions: DisruptionPrediction[] = [];

    // Analyze business model innovation mentions
    const businessModelQuery = `
      SELECT 
        d.domain,
        d.cohort,
        COUNT(CASE WHEN dr.response ILIKE ANY(ARRAY['%subscription%', '%platform%', '%marketplace%', '%freemium%', '%direct%', '%service%', '%model%']) THEN 1 END) as model_mentions,
        COUNT(*) as total_responses,
        STRING_AGG(DISTINCT CASE 
          WHEN dr.response ILIKE '%subscription%' THEN 'Subscription'
          WHEN dr.response ILIKE '%platform%' THEN 'Platform'
          WHEN dr.response ILIKE '%marketplace%' THEN 'Marketplace'
          WHEN dr.response ILIKE '%freemium%' THEN 'Freemium'
          WHEN dr.response ILIKE '%direct%' THEN 'Direct-to-Consumer'
          WHEN dr.response ILIKE '%as-a-service%' OR dr.response ILIKE '%aaS%' THEN 'As-a-Service'
        END, ', ') as business_models
      FROM domains d
      JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.cohort = $1
        AND dr.created_at > NOW() - INTERVAL '60 days'
      GROUP BY d.domain, d.cohort
      HAVING COUNT(CASE WHEN dr.response ILIKE ANY(ARRAY['%subscription%', '%platform%', '%marketplace%', '%freemium%', '%direct%', '%service%', '%model%']) THEN 1 END) > 3
      ORDER BY model_mentions DESC
      LIMIT 8
    `;

    const result = await this.pool.query(businessModelQuery, [category]);

    for (const row of result.rows) {
      const modelRatio = row.model_mentions / row.total_responses;
      const businessModels = row.business_models ? row.business_models.split(', ').filter(Boolean) : [];

      if (modelRatio > 0.15 && businessModels.length > 0) {
        const probability = Math.min(0.8, modelRatio * 3);
        const severity = this.determineSeverity(probability, 'business_model');

        disruptions.push({
          disruption_id: `model_${category}_${row.domain}_${Date.now()}`,
          category,
          probability,
          severity,
          time_horizon: this.disruptionPatterns.business_model.timeframe,
          description: `Business model innovation in ${category} by ${row.domain} introducing ${businessModels.join(', ')} approaches`,
          potential_disruptors: [row.domain],
          early_signals: [
            `Business model innovation signals (${Math.round(modelRatio * 100)}%)`,
            `Focus on ${businessModels.join(', ')}`,
            'New revenue model approaches'
          ],
          industry_impact: probability * 0.7,
          preparation_time: '12-18 months',
          defensive_strategies: [
            'Evaluate business model alternatives',
            'Test new revenue streams',
            'Study disruptor strategies',
            'Pilot innovative approaches'
          ],
          disruption_type: 'business_model',
          confidence_level: Math.min(0.7, modelRatio + (businessModels.length * 0.05)),
          historical_patterns: this.getBusinessModelDisruptionPatterns(),
          market_indicators: await this.getMarketIndicators(category, 'business_model')
        });
      }
    }

    return disruptions;
  }

  private async predictMarketEntryDisruptions(category: string, config: any): Promise<DisruptionPrediction[]> {
    const disruptions: DisruptionPrediction[] = [];

    // Look for new entrants and rapid growth patterns
    const newEntrantQuery = `
      WITH recent_entrants AS (
        SELECT 
          d.domain,
          d.cohort,
          MIN(dr.created_at) as first_mention,
          COUNT(dr.id) as total_mentions,
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
        WHERE d.cohort = $1
          AND dr.created_at > NOW() - INTERVAL '90 days'
        GROUP BY d.domain, d.cohort
        HAVING MIN(dr.created_at) > NOW() - INTERVAL '60 days'
           AND COUNT(dr.id) > 5
      )
      SELECT 
        domain,
        cohort,
        first_mention,
        total_mentions,
        avg_position,
        EXTRACT(DAYS FROM NOW() - first_mention) as days_since_first
      FROM recent_entrants
      WHERE avg_position <= 8
      ORDER BY avg_position ASC, total_mentions DESC
      LIMIT 5
    `;

    const result = await this.pool.query(newEntrantQuery, [category]);

    for (const row of result.rows) {
      const daysSinceFirst = row.days_since_first;
      const mentionsPerDay = row.total_mentions / Math.max(1, daysSinceFirst);
      const avgPosition = row.avg_position;

      // High disruption potential if new entrant is gaining traction quickly
      if (mentionsPerDay > 0.5 && avgPosition <= 6) {
        const probability = Math.min(0.85, (mentionsPerDay * 0.3) + ((8 - avgPosition) / 8 * 0.7));
        const severity = this.determineSeverity(probability, 'market_entry');

        disruptions.push({
          disruption_id: `entry_${category}_${row.domain}_${Date.now()}`,
          category,
          probability,
          severity,
          time_horizon: this.disruptionPatterns.market_entry.timeframe,
          description: `Rapid market entry disruption by ${row.domain} achieving position ${Math.round(avgPosition)} within ${Math.round(daysSinceFirst)} days`,
          potential_disruptors: [row.domain],
          early_signals: [
            `Rapid market penetration (${mentionsPerDay.toFixed(1)} mentions/day)`,
            `Strong initial positioning (#${Math.round(avgPosition)})`,
            'Fast market recognition'
          ],
          industry_impact: probability * 0.6,
          preparation_time: '3-6 months',
          defensive_strategies: [
            'Monitor new entrant strategies',
            'Accelerate competitive response',
            'Strengthen market position',
            'Consider strategic partnerships'
          ],
          disruption_type: 'market_entry',
          confidence_level: Math.min(0.8, probability + (mentionsPerDay * 0.1)),
          historical_patterns: this.getMarketEntryDisruptionPatterns(),
          market_indicators: await this.getMarketIndicators(category, 'market_entry')
        });
      }
    }

    return disruptions;
  }

  private async predictRegulatoryDisruptions(category: string, config: any): Promise<DisruptionPrediction[]> {
    const disruptions: DisruptionPrediction[] = [];

    // Analyze regulatory mention patterns
    const regulatoryQuery = `
      SELECT 
        COUNT(CASE WHEN dr.response ILIKE ANY(ARRAY['%regulation%', '%compliance%', '%policy%', '%government%', '%legal%', '%regulatory%']) THEN 1 END) as regulatory_mentions,
        COUNT(*) as total_responses,
        STRING_AGG(DISTINCT CASE 
          WHEN dr.response ILIKE '%regulation%' THEN 'Regulation'
          WHEN dr.response ILIKE '%compliance%' THEN 'Compliance'
          WHEN dr.response ILIKE '%policy%' THEN 'Policy'
          WHEN dr.response ILIKE '%government%' THEN 'Government'
          WHEN dr.response ILIKE '%legal%' THEN 'Legal'
        END, ', ') as regulatory_types
      FROM domains d
      JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.cohort = $1
        AND dr.created_at > NOW() - INTERVAL '90 days'
    `;

    const result = await this.pool.query(regulatoryQuery, [category]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const regulatoryRatio = row.regulatory_mentions / (row.total_responses || 1);
      const regulatoryTypes = row.regulatory_types ? row.regulatory_types.split(', ').filter(Boolean) : [];

      if (regulatoryRatio > 0.1 && row.regulatory_mentions > 5) {
        const probability = Math.min(0.75, regulatoryRatio * 4);
        const severity = this.determineSeverity(probability, 'regulatory');

        disruptions.push({
          disruption_id: `regulatory_${category}_${Date.now()}`,
          category,
          probability,
          severity,
          time_horizon: this.disruptionPatterns.regulatory.timeframe,
          description: `Regulatory disruption potential in ${category} with ${Math.round(regulatoryRatio * 100)}% of discussions mentioning ${regulatoryTypes.join(', ')} factors`,
          potential_disruptors: ['Regulatory bodies', 'Policy makers'],
          early_signals: [
            `High regulatory discussion frequency (${Math.round(regulatoryRatio * 100)}%)`,
            `Focus on ${regulatoryTypes.join(', ')}`,
            'Increased compliance requirements'
          ],
          industry_impact: probability * 0.9,
          preparation_time: '12-24 months',
          defensive_strategies: [
            'Enhance regulatory compliance',
            'Engage with regulatory bodies',
            'Monitor policy developments',
            'Develop compliance frameworks'
          ],
          disruption_type: 'regulatory',
          confidence_level: Math.min(0.6, regulatoryRatio + (regulatoryTypes.length * 0.05)),
          historical_patterns: this.getRegulatoryDisruptionPatterns(),
          market_indicators: await this.getMarketIndicators(category, 'regulatory')
        });
      }
    }

    return disruptions;
  }

  private async predictConsumerBehaviorDisruptions(category: string, config: any): Promise<DisruptionPrediction[]> {
    const disruptions: DisruptionPrediction[] = [];

    // Analyze consumer behavior and trend mentions
    const behaviorQuery = `
      SELECT 
        COUNT(CASE WHEN dr.response ILIKE ANY(ARRAY['%trend%', '%behavior%', '%preference%', '%adoption%', '%usage%', '%consumer%', '%customer%']) THEN 1 END) as behavior_mentions,
        COUNT(*) as total_responses,
        STRING_AGG(DISTINCT CASE 
          WHEN dr.response ILIKE '%trend%' THEN 'Trends'
          WHEN dr.response ILIKE '%behavior%' THEN 'Behavior'
          WHEN dr.response ILIKE '%preference%' THEN 'Preferences'
          WHEN dr.response ILIKE '%adoption%' THEN 'Adoption'
          WHEN dr.response ILIKE '%usage%' THEN 'Usage Patterns'
        END, ', ') as behavior_types
      FROM domains d
      JOIN domain_responses dr ON d.id = dr.domain_id
      WHERE d.cohort = $1
        AND dr.created_at > NOW() - INTERVAL '60 days'
    `;

    const result = await this.pool.query(behaviorQuery, [category]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const behaviorRatio = row.behavior_mentions / (row.total_responses || 1);
      const behaviorTypes = row.behavior_types ? row.behavior_types.split(', ').filter(Boolean) : [];

      if (behaviorRatio > 0.2 && row.behavior_mentions > 8) {
        const probability = Math.min(0.7, behaviorRatio * 2.5);
        const severity = this.determineSeverity(probability, 'consumer_behavior');

        disruptions.push({
          disruption_id: `behavior_${category}_${Date.now()}`,
          category,
          probability,
          severity,
          time_horizon: this.disruptionPatterns.consumer_behavior.timeframe,
          description: `Consumer behavior shift disruption in ${category} with ${Math.round(behaviorRatio * 100)}% focus on ${behaviorTypes.join(', ')} changes`,
          potential_disruptors: ['Changing consumer preferences', 'Market trends'],
          early_signals: [
            `High consumer behavior discussion (${Math.round(behaviorRatio * 100)}%)`,
            `Focus on ${behaviorTypes.join(', ')}`,
            'Shifting market dynamics'
          ],
          industry_impact: probability * 0.65,
          preparation_time: '6-18 months',
          defensive_strategies: [
            'Monitor consumer trends',
            'Adapt product offerings',
            'Enhance customer research',
            'Develop flexible strategies'
          ],
          disruption_type: 'consumer_behavior',
          confidence_level: Math.min(0.7, behaviorRatio + (behaviorTypes.length * 0.05)),
          historical_patterns: this.getConsumerBehaviorDisruptionPatterns(),
          market_indicators: await this.getMarketIndicators(category, 'consumer_behavior')
        });
      }
    }

    return disruptions;
  }

  private determineSeverity(probability: number, disruptionType: string): 'minor' | 'moderate' | 'major' | 'paradigm_shift' {
    const multiplier = this.disruptionPatterns[disruptionType as keyof typeof this.disruptionPatterns].severity_multiplier;
    const adjustedProbability = probability * multiplier;

    if (adjustedProbability > 0.8) return 'paradigm_shift';
    if (adjustedProbability > 0.6) return 'major';
    if (adjustedProbability > 0.4) return 'moderate';
    return 'minor';
  }

  private async getMarketIndicators(category: string, disruptionType: string): Promise<any> {
    // Placeholder for market indicator analysis
    return {
      new_entrant_activity: Math.random() * 0.8,
      technology_advancement: Math.random() * 0.9,
      investment_patterns: Math.random() * 0.7,
      regulatory_changes: Math.random() * 0.6,
      consumer_sentiment_shifts: Math.random() * 0.8
    };
  }

  private getTechnologyDisruptionPatterns(): string[] {
    return [
      'iPhone disrupted mobile phones (2007)',
      'Netflix disrupted video rental (2010)',
      'Uber disrupted transportation (2012)',
      'Tesla disrupted automotive (2012)',
      'ChatGPT disrupted AI applications (2022)'
    ];
  }

  private getBusinessModelDisruptionPatterns(): string[] {
    return [
      'Subscription models disrupted software licensing',
      'Platform models disrupted traditional retail',
      'Freemium models disrupted paid software',
      'Direct-to-consumer disrupted retail distribution',
      'Marketplace models disrupted classified ads'
    ];
  }

  private getMarketEntryDisruptionPatterns(): string[] {
    return [
      'Amazon entered cloud computing (AWS)',
      'Google entered mobile OS (Android)',
      'Microsoft entered gaming (Xbox)',
      'Apple entered streaming (Apple TV+)',
      'Meta entered VR/AR (Reality Labs)'
    ];
  }

  private getRegulatoryDisruptionPatterns(): string[] {
    return [
      'GDPR disrupted data practices (2018)',
      'PSD2 disrupted banking (2019)',
      'California Privacy Act disrupted data collection (2020)',
      'EU AI Act disrupting AI development (2024)',
      'Crypto regulations disrupting digital assets'
    ];
  }

  private getConsumerBehaviorDisruptionPatterns(): string[] {
    return [
      'Remote work disrupted office real estate',
      'Streaming disrupted traditional TV',
      'Mobile payments disrupted cash transactions',
      'Social commerce disrupted traditional retail',
      'Sustainability focus disrupting consumption patterns'
    ];
  }
}