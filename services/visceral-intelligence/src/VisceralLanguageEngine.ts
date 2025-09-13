import { VisceralAlert, CompetitiveCarnage, ShareableContent } from './types';

export class VisceralLanguageEngine {
  private readonly DOMINATION_TERMS = [
    'OBLITERATES', 'CRUSHES', 'ANNIHILATES', 'DEMOLISHES', 'DESTROYS', 
    'SLAUGHTERS', 'DEVASTATES', 'PULVERIZES', 'EVISCERATES', 'DOMINATES'
  ];

  private readonly DECLINE_TERMS = [
    'BLEEDING', 'HEMORRHAGING', 'COLLAPSING', 'CRASHING', 'IMPLODING',
    'FREEFALL', 'NOSEDIVING', 'PLUMMETING', 'DISINTEGRATING', 'EVAPORATING'
  ];

  private readonly UPRISING_TERMS = [
    'SURGING', 'EXPLODING', 'ROCKETING', 'TEARING UP', 'RAMPAGING',
    'STORMING', 'BLAZING', 'ERUPTING', 'UNLEASHING', 'CONQUERING'
  ];

  private readonly COMPETITIVE_EMOJIS = {
    domination: '🔥',
    destruction: '💀',
    uprising: '🚀',
    bloodbath: '🩸',
    warning: '⚠️',
    celebration: '🏆',
    shock: '💥',
    fear: '😱'
  };

  generateVisceralHeadline(carnage: CompetitiveCarnage, context: CompetitiveCarnage[]): string {
    const { domain, category, rank_change, score_change, carnage_level } = carnage;
    
    if (carnage_level === 'dominating' || carnage_level === 'annihilating') {
      const term = this.getRandomTerm(this.DOMINATION_TERMS);
      const victims = context.filter(c => c.rank_change < -2).map(c => c.domain).slice(0, 2);
      return `${domain} ${term} competition in ${category}${victims.length > 0 ? ` - ${victims.join(', ')} getting DESTROYED` : ''}`;
    }
    
    if (carnage_level === 'getting_destroyed' || carnage_level === 'bleeding') {
      const term = this.getRandomTerm(this.DECLINE_TERMS);
      const aggressor = context.find(c => c.rank_change > 2)?.domain || 'competitors';
      return `${domain} ${term} in ${category} - ${aggressor} pulling ahead`;
    }
    
    if (carnage_level === 'rising' && rank_change > 3) {
      const term = this.getRandomTerm(this.UPRISING_TERMS);
      return `${domain} ${term} through ${category} rankings - NEWCOMER RAMPAGE`;
    }
    
    return `${domain} shifts position in ${category} - Market dynamics changing`;
  }

  generateDamageAssessment(carnage: CompetitiveCarnage, marketContext: CompetitiveCarnage[]): string {
    const { rank_change, score_change, market_share_impact } = carnage;
    
    const assessments = [];
    
    if (Math.abs(rank_change) >= 5) {
      assessments.push(`${Math.abs(rank_change)} position ${rank_change > 0 ? 'surge' : 'collapse'}`);
    }
    
    if (Math.abs(score_change) >= 10) {
      assessments.push(`${score_change > 0 ? '+' : ''}${score_change.toFixed(1)}% performance shift`);
    }
    
    if (Math.abs(market_share_impact) >= 5) {
      assessments.push(`${market_share_impact > 0 ? 'gaining' : 'losing'} ${Math.abs(market_share_impact).toFixed(1)}% market share`);
    }
    
    const competitorImpact = marketContext.filter(c => 
      c.domain !== carnage.domain && Math.abs(c.rank_change) >= 2
    ).length;
    
    if (competitorImpact >= 3) {
      assessments.push(`${competitorImpact} competitors affected`);
    }
    
    return assessments.length > 0 ? assessments.join(' • ') : 'Market position stabilizing';
  }

  generateShareableContent(alert: VisceralAlert, type: ShareableContent['type']): ShareableContent {
    let content: ShareableContent;
    
    switch (type) {
      case 'victory_brag':
        content = {
          type,
          headline: `${this.COMPETITIVE_EMOJIS.celebration} MARKET DOMINATION ALERT`,
          content: `We just ${this.getRandomTerm(this.DOMINATION_TERMS)} the competition!\n\n` +
                  `${alert.headline}\n\n` +
                  `${alert.damage_assessment}\n\n` +
                  `The market has spoken. ${this.COMPETITIVE_EMOJIS.domination}`,
          visual_elements: {
            background_color: 'linear-gradient(45deg, #00e676, #00c853)',
            animation: 'domination-glow',
            emoji: this.COMPETITIVE_EMOJIS.celebration
          },
          cta_premium: '[SHARE THE CARNAGE] [EXPORT DOMINATION REPORT]',
          viral_hooks: [
            'Competition status: OBLITERATED',
            'Market verdict: TOTAL DOMINATION',
            'Competitors better watch their back'
          ]
        };
        break;
        
      case 'threat_warning':
        content = {
          type,
          headline: `${this.COMPETITIVE_EMOJIS.warning} THREAT DETECTED`,
          content: `Someone just LEAPFROGGED you in ${alert.category}\n\n` +
                  `${this.COMPETITIVE_EMOJIS.fear} Want to see who's eating your lunch?\n\n` +
                  `💡 Hint: ${alert.aggressor} and they're MOVING FAST`,
          visual_elements: {
            background_color: 'linear-gradient(45deg, #ff1744, #d50000)',
            animation: 'threat-pulse',
            emoji: this.COMPETITIVE_EMOJIS.warning
          },
          cta_premium: '[UPGRADE TO SEE THE DAMAGE]',
          viral_hooks: [
            'Your competition is NOT sleeping',
            'Market disruption in progress',
            'Time to respond: CRITICAL'
          ]
        };
        break;
        
      case 'market_carnage':
        content = {
          type,
          headline: `${this.COMPETITIVE_EMOJIS.bloodbath} MARKET BLOODBATH`,
          content: `${alert.headline}\n\n` +
                  `THE CARNAGE:\n` +
                  `${alert.damage_assessment}\n\n` +
                  `Market verdict: ${alert.intensity.toUpperCase()}`,
          visual_elements: {
            background_color: 'linear-gradient(45deg, #ff6d00, #f57c00)',
            animation: 'carnage-shake',
            emoji: this.COMPETITIVE_EMOJIS.bloodbath
          },
          cta_premium: '[SEE FULL CARNAGE REPORT]',
          viral_hooks: [
            'Industry shake-up in progress',
            'No one is safe',
            'Market dynamics changing FAST'
          ]
        };
        break;
        
      case 'domination_report':
        content = {
          type,
          headline: `${this.COMPETITIVE_EMOJIS.domination} COMPETITIVE INTELLIGENCE`,
          content: `MARKET POSITION UPDATE:\n\n` +
                  `${alert.headline}\n\n` +
                  `Impact Assessment: ${alert.damage_assessment}\n\n` +
                  `Confidence: ${(alert.confidence_score * 100).toFixed(0)}%`,
          visual_elements: {
            background_color: 'linear-gradient(45deg, #1a237e, #3949ab)',
            animation: 'intelligence-glow',
            emoji: this.COMPETITIVE_EMOJIS.domination
          },
          cta_premium: '[GET FULL INTELLIGENCE REPORT]',
          viral_hooks: [
            'Professional intelligence',
            'Data-driven insights',
            'Strategic advantage confirmed'
          ]
        };
        break;
    }
    
    return content;
  }

  generateBloombergStyleSummary(alerts: VisceralAlert[]): string {
    const dominationEvents = alerts.filter(a => a.intensity === 'domination' || a.intensity === 'annihilation');
    const bloodbathEvents = alerts.filter(a => a.intensity === 'bloodbath' || a.intensity === 'collapse');
    const uprisingEvents = alerts.filter(a => a.intensity === 'uprising' || a.intensity === 'rampage');
    
    let summary = `MARKET INTELLIGENCE BRIEF - ${new Date().toLocaleDateString()}\n\n`;
    
    if (dominationEvents.length > 0) {
      summary += `${this.COMPETITIVE_EMOJIS.domination} MARKET DOMINATION (${dominationEvents.length} events):\n`;
      dominationEvents.slice(0, 3).forEach(alert => {
        summary += `• ${alert.aggressor} CRUSHING ${alert.category} - ${alert.damage_assessment}\n`;
      });
      summary += '\n';
    }
    
    if (bloodbathEvents.length > 0) {
      summary += `${this.COMPETITIVE_EMOJIS.destruction} MARKET CARNAGE (${bloodbathEvents.length} events):\n`;
      bloodbathEvents.slice(0, 3).forEach(alert => {
        summary += `• ${alert.victim.join(', ')} BLEEDING in ${alert.category}\n`;
      });
      summary += '\n';
    }
    
    if (uprisingEvents.length > 0) {
      summary += `${this.COMPETITIVE_EMOJIS.uprising} RISING THREATS (${uprisingEvents.length} events):\n`;
      uprisingEvents.slice(0, 3).forEach(alert => {
        summary += `• ${alert.aggressor} SURGING in ${alert.category} - Watch closely\n`;
      });
      summary += '\n';
    }
    
    summary += `Market volatility: ${alerts.length > 10 ? 'EXTREME' : alerts.length > 5 ? 'HIGH' : 'MODERATE'}\n`;
    summary += `Disruption probability: ${uprisingEvents.length > 3 ? 'CRITICAL' : 'MONITORED'}\n\n`;
    summary += `This is Bloomberg for AI: Professional. Authoritative. Absolutely VISCERAL.`;
    
    return summary;
  }

  private getRandomTerm(terms: string[]): string {
    return terms[Math.floor(Math.random() * terms.length)];
  }

  formatRankingWithCarnage(carnage: CompetitiveCarnage): string {
    const trendEmoji = this.getTrendEmoji(carnage.trend_direction);
    const statusEmoji = this.getStatusEmoji(carnage.carnage_level);
    
    return `#${carnage.current_rank} ${carnage.domain}: ${carnage.score.toFixed(1)} ${trendEmoji} ` +
           `(${carnage.score_change > 0 ? '+' : ''}${carnage.score_change.toFixed(1)}% QoQ) ${statusEmoji} ${carnage.carnage_level.replace('_', ' ').toUpperCase()}`;
  }

  private getTrendEmoji(trend: CompetitiveCarnage['trend_direction']): string {
    switch (trend) {
      case 'unstoppable': return '🔥';
      case 'rocket_ship': return '🚀';
      case 'growth': return '↗️';
      case 'sideways': return '→';
      case 'decline': return '↘️';
      case 'freefall': return '💀';
      default: return '📊';
    }
  }

  private getStatusEmoji(carnage: CompetitiveCarnage['carnage_level']): string {
    switch (carnage) {
      case 'annihilating': return '🔥';
      case 'dominating': return '💪';
      case 'rising': return '📈';
      case 'stable': return '🟢';
      case 'bleeding': return '🩸';
      case 'getting_destroyed': return '💀';
      default: return '📊';
    }
  }
}