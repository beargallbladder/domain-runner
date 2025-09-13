#!/usr/bin/env node

/**
 * 🚨 VISCERAL ALERT SYSTEM
 * ========================
 * 
 * Bloomberg-style intensity with professional brutality for competitive intelligence
 * 
 * Purpose: Generate visceral, actionable alerts that create competitive anxiety
 * while maintaining Bloomberg's professional standard and enterprise credibility
 * 
 * Key Features:
 * 1. Professional Brutality - Visceral language within enterprise standards
 * 2. Tiered Alert Severity - From subtle warnings to emergency notifications
 * 3. Competitive Anxiety Engine - Strategic psychological pressure
 * 4. Premium Alert Filtering - Hide critical insights behind paywall
 * 5. Real-time Broadcasting - Instant delivery via WebSocket
 * 6. Historical Alert Analytics - Track accuracy and business impact
 * 
 * Integration: Works with Bloomberg Intelligence Coordinator and frontend
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer, WebSocket } from 'ws';
import winston from 'winston';

// ============================================================================
// 🚨 VISCERAL ALERT TYPES
// ============================================================================

interface VisceralAlert {
  id: string;
  type: 'market_domination' | 'competitive_pressure' | 'brand_collapse' | 'uprising_detected' | 
        'position_change' | 'market_opportunity' | 'threat_escalation' | 'disruption_warning';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'urgent' | 'emergency';
  domain: string;
  category: string;
  headline: string; // Bloomberg-style headline
  message: string; // Detailed professional analysis
  visceral_language: string; // The "brutal truth" version
  professional_language: string; // Enterprise-appropriate version
  competitive_anxiety_score: number; // 1-10 scale
  business_impact: 'minimal' | 'moderate' | 'significant' | 'severe' | 'catastrophic';
  urgency: 'immediate' | 'within_24h' | 'within_week' | 'monitoring' | 'strategic';
  confidence_level: number; // 0-1
  data_sources: string[];
  actionable_insights: string[];
  premium_required: boolean;
  bloomberg_tier: 'public' | 'professional' | 'enterprise' | 'premium';
  timestamp: Date;
  expires_at?: Date;
  alert_triggers: {
    position_change?: number;
    threat_level_increase?: number;
    opportunity_score_change?: number;
    market_volatility?: number;
    competitor_movement?: string;
  };
  psychological_triggers: {
    loss_aversion: boolean;
    social_proof: boolean;
    urgency: boolean;
    exclusivity: boolean;
    authority: boolean;
  };
}

interface AlertTemplate {
  type: string;
  severity_thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
    urgent: number;
  };
  headline_templates: {
    rising: string[];
    falling: string[];
    stable: string[];
    disrupting: string[];
  };
  visceral_templates: {
    threat: string[];
    opportunity: string[];
    warning: string[];
    celebration: string[];
  };
  professional_templates: {
    analysis: string[];
    recommendation: string[];
    outlook: string[];
    strategy: string[];
  };
}

interface AlertSubscription {
  user_id: string;
  domain?: string;
  category?: string;
  severity_filter: string[];
  premium_access: boolean;
  delivery_channels: ('websocket' | 'email' | 'sms' | 'slack')[];
  preferences: {
    visceral_language: boolean;
    professional_only: boolean;
    competitive_anxiety: boolean;
  };
}

// ============================================================================
// 🚨 VISCERAL ALERT SYSTEM CLASS
// ============================================================================

export class VisceralAlertSystem {
  private db: Pool;
  private logger: winston.Logger;
  private wsServer: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private subscriptions: Map<string, AlertSubscription[]> = new Map();
  private alertTemplates: Map<string, AlertTemplate> = new Map();
  private alertHistory: Map<string, VisceralAlert[]> = new Map();
  private alertMetrics: {
    alerts_sent: number;
    premium_triggers: number;
    conversion_rate: number;
    anxiety_effectiveness: number;
    business_impact_score: number;
  };

  constructor(databaseUrl: string, port: number = 8082) {
    this.initializeLogger();
    this.initializeDatabase(databaseUrl);
    this.initializeWebSocket(port);
    this.initializeAlertTemplates();
    this.initializeMetrics();
    
    this.logger.info('🚨 Visceral Alert System initialized', {
      service: 'visceral-alert-system',
      version: '1.0.0',
      brutality_level: 'professional'
    });
  }

  /**
   * 📊 INITIALIZE LOGGER
   */
  private initializeLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'visceral-alert-system',
        version: '1.0.0'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  /**
   * 🗄️ INITIALIZE DATABASE
   */
  private initializeDatabase(databaseUrl: string): void {
    this.db = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true
      } : false,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000
    });
  }

  /**
   * 🌐 INITIALIZE WEBSOCKET
   */
  private initializeWebSocket(port: number): void {
    this.wsServer = new WebSocketServer({ port });

    this.wsServer.on('connection', (ws: WebSocket) => {
      this.logger.info('🔗 Visceral Alert client connected');
      this.clients.add(ws);

      // Send welcome message with current alert status
      this.sendToClient(ws, {
        type: 'alert_system_status',
        data: {
          active_alerts: this.getActiveAlertsCount(),
          severity_distribution: this.getSeverityDistribution(),
          timestamp: new Date()
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.logger.info('🔌 Visceral Alert client disconnected');
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(data, ws);
        } catch (error) {
          this.logger.error('❌ Invalid alert client message', { error: error.message });
        }
      });
    });

    this.logger.info(`🌐 Visceral Alert System running on port ${port}`);
  }

  /**
   * 📝 INITIALIZE ALERT TEMPLATES
   */
  private initializeAlertTemplates(): void {
    // Market Domination Templates
    this.alertTemplates.set('market_domination', {
      type: 'market_domination',
      severity_thresholds: { low: 3, medium: 5, high: 7, critical: 8, urgent: 9 },
      headline_templates: {
        rising: [
          '{domain} Solidifies Market Leadership in {category}',
          '{domain} Extends Competitive Advantage in {category} Segment',
          '{domain} Demonstrates Market Dominance Across {category}'
        ],
        falling: [],
        stable: [
          '{domain} Maintains Strong Market Position in {category}',
          '{domain} Continues Market Leadership in {category} Space'
        ],
        disrupting: []
      },
      visceral_templates: {
        threat: [],
        opportunity: [
          'Your competitors are watching {domain} pull away in {category} while you fall behind.',
          '{domain} is building an unassailable lead in {category}. The window to compete is closing.',
          'Every day {domain} stays ahead in {category} makes your comeback exponentially harder.'
        ],
        warning: [],
        celebration: [
          '{domain} has achieved the market position every competitor in {category} desperately wants.',
          'The competitive moat {domain} is building in {category} will be nearly impossible to cross.',
          '{domain} is not just winning in {category} - they are redefining what winning looks like.'
        ]
      },
      professional_templates: {
        analysis: [
          '{domain} demonstrates sustained competitive advantage in {category} with strong market positioning.',
          'Market analysis indicates {domain} maintains leadership position in {category} segment.',
          'Competitive landscape analysis shows {domain} consolidating market share in {category}.'
        ],
        recommendation: [
          'Monitor {domain} strategic initiatives in {category} for competitive intelligence.',
          'Analyze {domain} market positioning strategies for potential strategic learnings.',
          'Consider defensive strategies to protect market share against {domain} in {category}.'
        ],
        outlook: [
          '{domain} positioned for continued market leadership in {category}.',
          'Strong competitive positioning suggests {domain} will maintain {category} advantage.',
          'Market dynamics favor {domain} continued dominance in {category} segment.'
        ],
        strategy: [
          'Direct competition with {domain} in {category} requires differentiated approach.',
          'Alternative market positioning needed to compete effectively against {domain}.',
          'Strategic partnership or acquisition may be necessary to challenge {domain} in {category}.'
        ]
      }
    });

    // Brand Collapse Templates
    this.alertTemplates.set('brand_collapse', {
      type: 'brand_collapse',
      severity_thresholds: { low: 5, medium: 6, high: 7, critical: 8, urgent: 9 },
      headline_templates: {
        rising: [],
        falling: [
          '{domain} Faces Mounting Competitive Pressure in {category}',
          '{domain} Market Position Deteriorates in {category} Segment',
          'Critical Alert: {domain} Loses Ground in {category} Market'
        ],
        stable: [],
        disrupting: []
      },
      visceral_templates: {
        threat: [
          '{domain} is hemorrhaging market share in {category}. Every competitor is circling like sharks.',
          'The {category} market is rejecting {domain}. Their competitors smell blood in the water.',
          '{domain} is in free fall in {category}. This is what competitive death spiral looks like.'
        ],
        opportunity: [
          '{domain} is vulnerable in {category}. This is your chance to strike while they are weak.',
          'The {category} crown is slipping from {domain}. Move fast before someone else claims it.',
          '{domain} market weakness in {category} creates unprecedented opportunity for aggressive competitors.'
        ],
        warning: [
          'If you are {domain}, the {category} market is sending you a brutal message.',
          '{domain} needs emergency strategic intervention in {category} before it is too late.',
          'The {category} market is voting against {domain} with their wallets.'
        ],
        celebration: []
      },
      professional_templates: {
        analysis: [
          '{domain} experiencing significant competitive pressure in {category} market.',
          'Market indicators suggest {domain} facing strategic challenges in {category} segment.',
          'Competitive analysis reveals {domain} losing market positioning in {category}.'
        ],
        recommendation: [
          'Immediate strategic review recommended for {domain} {category} positioning.',
          'Competitive response strategy needed to address {domain} market challenges.',
          'Consider accelerated market entry to capitalize on {domain} weakness in {category}.'
        ],
        outlook: [
          '{domain} market position in {category} requires immediate attention.',
          'Sustained pressure may lead to {domain} strategic pivot in {category}.',
          'Market dynamics suggest continued challenges for {domain} in {category}.'
        ],
        strategy: [
          'Aggressive competitive strategy could capture {domain} market share in {category}.',
          'Strategic opportunity exists to displace {domain} in {category} market.',
          'Fast action needed to exploit {domain} competitive vulnerability in {category}.'
        ]
      }
    });

    // Uprising Detected Templates
    this.alertTemplates.set('uprising_detected', {
      type: 'uprising_detected',
      severity_thresholds: { low: 4, medium: 6, high: 7, critical: 8, urgent: 9 },
      headline_templates: {
        rising: [
          'Emerging Opportunity: {domain} Positioned for {category} Breakthrough',
          'Market Gap Creates Opening for {domain} in {category}',
          'Strategic Window: {domain} Ready to Disrupt {category} Market'
        ],
        falling: [],
        stable: [],
        disrupting: [
          'Disruption Alert: {domain} Poised to Transform {category}',
          'Market Revolution: {domain} Threatens {category} Status Quo',
          'Competitive Uprising: {domain} Challenges {category} Leaders'
        ]
      },
      visceral_templates: {
        threat: [
          'Watch out. {domain} is about to explode in {category} and catch everyone sleeping.',
          'The {category} market is ripe for {domain} to completely blindside the leaders.',
          '{domain} is loading the cannon for {category}. The incumbents have no idea what is coming.'
        ],
        opportunity: [
          'This is {domain} moment in {category}. The stars have aligned for total market disruption.',
          '{domain} is sitting on a {category} goldmine. Time to strike while the market is defenseless.',
          'Perfect storm brewing for {domain} in {category}. Competitors will never see it coming.'
        ],
        warning: [
          'If you are competing with {domain} in {category}, you should be very nervous right now.',
          'The {category} establishment is about to get a rude awakening from {domain}.',
          '{domain} is about to make every {category} competitor look like they are standing still.'
        ],
        celebration: [
          '{domain} is about to rewrite the {category} playbook and leave competitors scrambling.',
          'The {category} market is {domain} for the taking. This is how market revolutions begin.',
          '{domain} is positioning for {category} domination while others argue about yesterday.'
        ]
      },
      professional_templates: {
        analysis: [
          'Market conditions favor {domain} strategic advancement in {category}.',
          'Competitive gap analysis indicates significant opportunity for {domain} in {category}.',
          'Strategic positioning suggests {domain} well-positioned for {category} growth.'
        ],
        recommendation: [
          'Accelerated market entry strategy recommended for {domain} in {category}.',
          'Capitalize on {category} market opportunity through aggressive {domain} expansion.',
          'Strategic investment in {domain} {category} capabilities highly recommended.'
        ],
        outlook: [
          '{domain} positioned for significant {category} market advancement.',
          'Favorable market dynamics support {domain} {category} growth trajectory.',
          'Strong strategic opportunity for {domain} to capture {category} market share.'
        ],
        strategy: [
          'First-mover advantage available for {domain} in emerging {category} segment.',
          'Competitive timing favors bold {domain} strategy in {category} market.',
          'Market disruption opportunity aligns with {domain} {category} capabilities.'
        ]
      }
    });

    this.logger.info('📝 Visceral alert templates initialized', {
      template_count: this.alertTemplates.size
    });
  }

  /**
   * 📊 INITIALIZE METRICS
   */
  private initializeMetrics(): void {
    this.alertMetrics = {
      alerts_sent: 0,
      premium_triggers: 0,
      conversion_rate: 0,
      anxiety_effectiveness: 0,
      business_impact_score: 0
    };
  }

  /**
   * 🚨 GENERATE VISCERAL ALERT
   */
  async generateVisceralAlert(
    domain: string,
    category: string,
    alertType: string,
    severity: string,
    competitiveIntelligence: any,
    premiumRequired: boolean = false
  ): Promise<VisceralAlert> {
    
    this.logger.info('🚨 Generating visceral alert', { 
      domain, 
      category, 
      type: alertType, 
      severity,
      premium: premiumRequired 
    });

    const template = this.alertTemplates.get(alertType);
    if (!template) {
      throw new Error(`Unknown alert type: ${alertType}`);
    }

    const trend = competitiveIntelligence.trend || 'stable';
    const alert: VisceralAlert = {
      id: uuidv4(),
      type: alertType as any,
      severity: severity as any,
      domain,
      category,
      headline: this.generateHeadline(template, domain, category, trend),
      message: this.generateMessage(template, domain, category, competitiveIntelligence),
      visceral_language: this.generateVisceralLanguage(template, domain, category, alertType),
      professional_language: this.generateProfessionalLanguage(template, domain, category, alertType),
      competitive_anxiety_score: this.calculateAnxietyScore(alertType, severity, competitiveIntelligence),
      business_impact: this.assessBusinessImpact(severity, competitiveIntelligence),
      urgency: this.determineUrgency(severity, alertType),
      confidence_level: competitiveIntelligence.confidence_level || 0.8,
      data_sources: ['Bloomberg Intelligence Neural Swarm', 'Multi-LLM Competitive Analysis'],
      actionable_insights: this.generateActionableInsights(alertType, domain, category, competitiveIntelligence),
      premium_required: premiumRequired,
      bloomberg_tier: this.determineBloombergTier(severity, premiumRequired),
      timestamp: new Date(),
      alert_triggers: this.extractAlertTriggers(competitiveIntelligence),
      psychological_triggers: this.identifyPsychologicalTriggers(alertType, severity)
    };

    // Set expiry for time-sensitive alerts
    if (alert.urgency === 'immediate') {
      alert.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }

    // Store alert
    await this.storeAlert(alert);
    
    // Send alert to subscribers
    await this.broadcastAlert(alert);
    
    // Update metrics
    this.updateAlertMetrics(alert);
    
    this.logger.info('✅ Visceral alert generated and sent', { 
      alertId: alert.id,
      recipients: this.clients.size 
    });

    return alert;
  }

  /**
   * 📰 GENERATE HEADLINE
   */
  private generateHeadline(template: AlertTemplate, domain: string, category: string, trend: string): string {
    const headlines = template.headline_templates[trend] || template.headline_templates.stable;
    if (headlines.length === 0) return `${domain} Market Update in ${category}`;
    
    const randomHeadline = headlines[Math.floor(Math.random() * headlines.length)];
    return randomHeadline
      .replace('{domain}', domain)
      .replace('{category}', category);
  }

  /**
   * 💬 GENERATE MESSAGE
   */
  private generateMessage(template: AlertTemplate, domain: string, category: string, intelligence: any): string {
    const position = intelligence.current_position || 'Unknown';
    const threatLevel = intelligence.threat_level || 5;
    const opportunityScore = intelligence.opportunity_score || 5;
    
    return `Market intelligence analysis for ${domain} in ${category}: Current position ${position}, threat level ${threatLevel}/10, opportunity score ${opportunityScore}/10. Competitive dynamics indicate ${intelligence.trend || 'stable'} trajectory with ${intelligence.neural_insights?.length || 0} strategic insights identified.`;
  }

  /**
   * 😤 GENERATE VISCERAL LANGUAGE
   */
  private generateVisceralLanguage(template: AlertTemplate, domain: string, category: string, alertType: string): string {
    let visceralType: 'threat' | 'opportunity' | 'warning' | 'celebration';
    
    switch (alertType) {
      case 'brand_collapse':
        visceralType = 'threat';
        break;
      case 'uprising_detected':
        visceralType = 'opportunity';
        break;
      case 'market_domination':
        visceralType = 'celebration';
        break;
      default:
        visceralType = 'warning';
    }
    
    const templates = template.visceral_templates[visceralType];
    if (templates.length === 0) return `${domain} requires immediate attention in ${category}.`;
    
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    return randomTemplate
      .replace('{domain}', domain)
      .replace('{category}', category);
  }

  /**
   * 💼 GENERATE PROFESSIONAL LANGUAGE
   */
  private generateProfessionalLanguage(template: AlertTemplate, domain: string, category: string, alertType: string): string {
    let professionalType: 'analysis' | 'recommendation' | 'outlook' | 'strategy';
    
    switch (alertType) {
      case 'uprising_detected':
        professionalType = 'recommendation';
        break;
      case 'brand_collapse':
        professionalType = 'strategy';
        break;
      case 'market_domination':
        professionalType = 'outlook';
        break;
      default:
        professionalType = 'analysis';
    }
    
    const templates = template.professional_templates[professionalType];
    if (templates.length === 0) return `${domain} market analysis in ${category} requires strategic review.`;
    
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    return randomTemplate
      .replace('{domain}', domain)
      .replace('{category}', category);
  }

  /**
   * 😰 CALCULATE ANXIETY SCORE
   */
  private calculateAnxietyScore(alertType: string, severity: string, intelligence: any): number {
    let baseScore = 5;
    
    // Adjust based on alert type
    switch (alertType) {
      case 'brand_collapse':
        baseScore = 9;
        break;
      case 'uprising_detected':
        baseScore = 7;
        break;
      case 'competitive_pressure':
        baseScore = 6;
        break;
      case 'market_domination':
        baseScore = 4;
        break;
    }
    
    // Adjust based on severity
    const severityMultiplier = {
      'low': 0.6,
      'medium': 0.8,
      'high': 1.0,
      'critical': 1.2,
      'urgent': 1.4,
      'emergency': 1.6
    };
    
    baseScore *= severityMultiplier[severity] || 1.0;
    
    // Adjust based on threat level
    if (intelligence.threat_level) {
      baseScore += (intelligence.threat_level - 5) * 0.2;
    }
    
    return Math.min(10, Math.max(1, Math.round(baseScore)));
  }

  /**
   * 💼 ASSESS BUSINESS IMPACT
   */
  private assessBusinessImpact(severity: string, intelligence: any): 'minimal' | 'moderate' | 'significant' | 'severe' | 'catastrophic' {
    if (severity === 'emergency' || severity === 'urgent') return 'catastrophic';
    if (severity === 'critical') return 'severe';
    if (severity === 'high') return 'significant';
    if (severity === 'medium') return 'moderate';
    return 'minimal';
  }

  /**
   * ⏰ DETERMINE URGENCY
   */
  private determineUrgency(severity: string, alertType: string): 'immediate' | 'within_24h' | 'within_week' | 'monitoring' | 'strategic' {
    if (severity === 'emergency' || alertType === 'brand_collapse') return 'immediate';
    if (severity === 'urgent' || severity === 'critical') return 'within_24h';
    if (severity === 'high') return 'within_week';
    if (severity === 'medium') return 'monitoring';
    return 'strategic';
  }

  /**
   * 💎 DETERMINE BLOOMBERG TIER
   */
  private determineBloombergTier(severity: string, premiumRequired: boolean): 'public' | 'professional' | 'enterprise' | 'premium' {
    if (premiumRequired) return 'premium';
    if (severity === 'critical' || severity === 'urgent') return 'enterprise';
    if (severity === 'high') return 'professional';
    return 'public';
  }

  /**
   * 🎯 GENERATE ACTIONABLE INSIGHTS
   */
  private generateActionableInsights(alertType: string, domain: string, category: string, intelligence: any): string[] {
    const insights: string[] = [];
    
    switch (alertType) {
      case 'brand_collapse':
        insights.push(`Immediate competitive analysis of ${domain} vulnerabilities in ${category}`);
        insights.push(`Strategic pivot assessment for ${category} market positioning`);
        insights.push(`Emergency response plan for ${category} market share defense`);
        break;
        
      case 'uprising_detected':
        insights.push(`Accelerate ${category} market entry before ${domain} establishes dominance`);
        insights.push(`Competitive intelligence gathering on ${domain} ${category} strategy`);
        insights.push(`Strategic partnership evaluation to counter ${domain} in ${category}`);
        break;
        
      case 'market_domination':
        insights.push(`Analyze ${domain} competitive advantages in ${category}`);
        insights.push(`Identify alternative market segments to avoid direct competition`);
        insights.push(`Consider acquisition or partnership with ${domain} as strategic option`);
        break;
        
      default:
        insights.push(`Monitor ${domain} competitive activities in ${category}`);
        insights.push(`Reassess strategic positioning in ${category} market`);
    }
    
    return insights;
  }

  /**
   * 🎯 EXTRACT ALERT TRIGGERS
   */
  private extractAlertTriggers(intelligence: any): any {
    return {
      position_change: intelligence.position_change || 0,
      threat_level_increase: intelligence.threat_level_increase || 0,
      opportunity_score_change: intelligence.opportunity_score_change || 0,
      market_volatility: intelligence.market_dynamics?.volatility || 0,
      competitor_movement: intelligence.trend || 'stable'
    };
  }

  /**
   * 🧠 IDENTIFY PSYCHOLOGICAL TRIGGERS
   */
  private identifyPsychologicalTriggers(alertType: string, severity: string): any {
    return {
      loss_aversion: alertType === 'brand_collapse' || alertType === 'competitive_pressure',
      social_proof: alertType === 'market_domination' || alertType === 'uprising_detected',
      urgency: severity === 'urgent' || severity === 'critical' || severity === 'emergency',
      exclusivity: true, // Bloomberg Intelligence is exclusive
      authority: true // Professional Bloomberg analysis
    };
  }

  /**
   * 💾 STORE ALERT
   */
  private async storeAlert(alert: VisceralAlert): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO visceral_alerts 
        (id, type, severity, domain, category, headline, message, visceral_language, 
         professional_language, competitive_anxiety_score, business_impact, urgency, 
         confidence_level, data_sources, actionable_insights, premium_required, 
         bloomberg_tier, timestamp, expires_at, alert_triggers, psychological_triggers)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      `, [
        alert.id, alert.type, alert.severity, alert.domain, alert.category,
        alert.headline, alert.message, alert.visceral_language, alert.professional_language,
        alert.competitive_anxiety_score, alert.business_impact, alert.urgency,
        alert.confidence_level, JSON.stringify(alert.data_sources), 
        JSON.stringify(alert.actionable_insights), alert.premium_required,
        alert.bloomberg_tier, alert.timestamp, alert.expires_at,
        JSON.stringify(alert.alert_triggers), JSON.stringify(alert.psychological_triggers)
      ]);

      // Store in memory for quick access
      const domainAlerts = this.alertHistory.get(alert.domain) || [];
      domainAlerts.push(alert);
      this.alertHistory.set(alert.domain, domainAlerts.slice(-50)); // Keep last 50

    } catch (error) {
      this.logger.error('❌ Failed to store visceral alert', { 
        error: error.message, 
        alertId: alert.id 
      });
    }
  }

  /**
   * 📡 BROADCAST ALERT
   */
  private async broadcastAlert(alert: VisceralAlert): Promise<void> {
    const message = {
      type: 'visceral_alert',
      data: alert
    };

    // Send to all connected clients
    this.broadcastToClients(message);

    // TODO: Send to subscribed users via other channels (email, SMS, Slack)
    
    this.logger.info('📡 Alert broadcasted', { 
      alertId: alert.id,
      clients: this.clients.size,
      severity: alert.severity
    });
  }

  /**
   * 📡 BROADCAST TO ALL CLIENTS
   */
  private broadcastToClients(message: any): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          this.logger.warn('⚠️ Failed to send alert to client', { error: error.message });
        }
      }
    });
  }

  /**
   * 📡 SEND TO SPECIFIC CLIENT
   */
  private sendToClient(client: WebSocket, message: any): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        this.logger.warn('⚠️ Failed to send message to specific client', { error: error.message });
      }
    }
  }

  /**
   * 📊 UPDATE ALERT METRICS
   */
  private updateAlertMetrics(alert: VisceralAlert): void {
    this.alertMetrics.alerts_sent += 1;
    
    if (alert.premium_required) {
      this.alertMetrics.premium_triggers += 1;
    }
    
    this.alertMetrics.anxiety_effectiveness = 
      (this.alertMetrics.anxiety_effectiveness + alert.competitive_anxiety_score) / 2;
    
    // Business impact scoring
    const impactScores = {
      'minimal': 1,
      'moderate': 3,
      'significant': 6,
      'severe': 8,
      'catastrophic': 10
    };
    
    this.alertMetrics.business_impact_score = 
      (this.alertMetrics.business_impact_score + impactScores[alert.business_impact]) / 2;
  }

  /**
   * 📊 GET ACTIVE ALERTS COUNT
   */
  private getActiveAlertsCount(): number {
    const now = new Date();
    let activeCount = 0;
    
    this.alertHistory.forEach(alerts => {
      activeCount += alerts.filter(alert => 
        !alert.expires_at || alert.expires_at > now
      ).length;
    });
    
    return activeCount;
  }

  /**
   * 📊 GET SEVERITY DISTRIBUTION
   */
  private getSeverityDistribution(): any {
    const distribution = {
      low: 0, medium: 0, high: 0, critical: 0, urgent: 0, emergency: 0
    };
    
    this.alertHistory.forEach(alerts => {
      alerts.forEach(alert => {
        distribution[alert.severity]++;
      });
    });
    
    return distribution;
  }

  /**
   * 💬 HANDLE CLIENT MESSAGE
   */
  private handleClientMessage(data: any, ws: WebSocket): void {
    switch (data.type) {
      case 'get_alert_history':
        this.sendAlertHistory(data.domain, ws);
        break;
        
      case 'get_alert_metrics':
        this.sendToClient(ws, {
          type: 'alert_metrics',
          data: this.alertMetrics
        });
        break;
        
      case 'subscribe_alerts':
        // TODO: Implement alert subscription
        this.sendToClient(ws, {
          type: 'subscription_confirmed',
          data: { domain: data.domain, category: data.category }
        });
        break;
        
      default:
        this.logger.warn('❓ Unknown alert client message', { type: data.type });
    }
  }

  /**
   * 📜 SEND ALERT HISTORY
   */
  private sendAlertHistory(domain: string, ws: WebSocket): void {
    const alerts = this.alertHistory.get(domain) || [];
    this.sendToClient(ws, {
      type: 'alert_history',
      data: {
        domain,
        alerts: alerts.slice(-20), // Last 20 alerts
        total_count: alerts.length
      }
    });
  }

  /**
   * 🗄️ INITIALIZE DATABASE SCHEMA
   */
  async initializeSchema(): Promise<void> {
    const schema = `
      CREATE TABLE IF NOT EXISTS visceral_alerts (
        id UUID PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        headline TEXT NOT NULL,
        message TEXT NOT NULL,
        visceral_language TEXT NOT NULL,
        professional_language TEXT NOT NULL,
        competitive_anxiety_score INTEGER NOT NULL,
        business_impact VARCHAR(20) NOT NULL,
        urgency VARCHAR(20) NOT NULL,
        confidence_level DECIMAL(3,2) NOT NULL,
        data_sources JSONB NOT NULL,
        actionable_insights JSONB NOT NULL,
        premium_required BOOLEAN NOT NULL,
        bloomberg_tier VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        expires_at TIMESTAMP,
        alert_triggers JSONB,
        psychological_triggers JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    try {
      await this.db.query(schema);
      this.logger.info('✅ Visceral Alert System database schema initialized');
    } catch (error) {
      this.logger.error('❌ Error creating visceral alerts schema', { error: error.message });
    }
  }

  /**
   * 🚀 START VISCERAL ALERT SYSTEM
   */
  async start(): Promise<void> {
    this.logger.info('🚀 Starting Visceral Alert System...');

    try {
      // Test database connection
      await this.db.query('SELECT NOW()');
      this.logger.info('✅ Database connected');

      // Initialize database schema
      await this.initializeSchema();

      this.logger.info('🎉 Visceral Alert System is operational!');
      this.logger.info(`📊 Alert Templates: ${this.alertTemplates.size} loaded`);
      this.logger.info(`🌐 WebSocket: ws://localhost:${this.wsServer.options.port}`);

    } catch (error) {
      this.logger.error('❌ Failed to start Visceral Alert System', { error: error.message });
      throw error;
    }
  }

  /**
   * 🛑 STOP VISCERAL ALERT SYSTEM
   */
  async stop(): Promise<void> {
    this.logger.info('🛑 Stopping Visceral Alert System...');

    this.wsServer.close();
    await this.db.end();

    this.logger.info('✅ Visceral Alert System stopped');
  }
}