import { Pool } from 'pg';
import { VisceralAlert, CompetitiveCarnage } from './types';

export interface SentimentMetrics {
  overall_sentiment: 'euphoric' | 'bullish' | 'neutral' | 'bearish' | 'panic';
  sentiment_score: number; // -1 to 1
  momentum: 'accelerating' | 'stable' | 'decelerating';
  volatility: 'extreme' | 'high' | 'moderate' | 'low';
  fear_greed_index: number; // 0 to 100
  market_psychology: string;
  dominant_emotions: string[];
  trigger_events: VisceralAlert[];
}

export interface CategorySentiment {
  category: string;
  sentiment: SentimentMetrics;
  competitive_pressure: number;
  disruption_risk: number;
  opportunity_index: number;
  emotional_drivers: string[];
}

export interface DomainSentiment {
  domain: string;
  sentiment_score: number;
  emotional_state: 'dominating' | 'confident' | 'defensive' | 'panicking' | 'desperate';
  market_perception: string;
  trend_direction: 'ascending' | 'stable' | 'descending';
  psychological_profile: string;
}

export class MarketSentimentEngine {
  private pool: Pool;
  private sentimentHistory: Map<string, SentimentMetrics[]> = new Map();
  private emotionalLexicon = {
    domination: ['crushing', 'obliterating', 'annihilating', 'devastating', 'demolishing'],
    fear: ['bleeding', 'collapsing', 'panicking', 'desperate', 'imploding'],
    excitement: ['surging', 'exploding', 'rocketing', 'soaring', 'erupting'],
    anxiety: ['threatened', 'pressured', 'vulnerable', 'exposed', 'cornered'],
    confidence: ['leading', 'dominating', 'securing', 'establishing', 'maintaining']
  };

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async analyzMarketSentiment(alerts: VisceralAlert[]): Promise<SentimentMetrics> {
    const sentimentScore = this.calculateOverallSentiment(alerts);
    const sentiment = this.categorizeSentiment(sentimentScore);
    const momentum = this.analyzeMomentum(alerts);
    const volatility = this.analyzeVolatility(alerts);
    const fearGreedIndex = this.calculateFearGreedIndex(alerts);
    const dominantEmotions = this.extractDominantEmotions(alerts);
    
    const metrics: SentimentMetrics = {
      overall_sentiment: sentiment,
      sentiment_score: sentimentScore,
      momentum,
      volatility,
      fear_greed_index: fearGreedIndex,
      market_psychology: this.generateMarketPsychology(sentiment, momentum, volatility),
      dominant_emotions: dominantEmotions,
      trigger_events: this.identifyTriggerEvents(alerts)
    };
    
    // Store historical data
    this.storeHistoricalSentiment('overall', metrics);
    
    return metrics;
  }

  async analyzeCategorySentiment(alerts: VisceralAlert[]): Promise<CategorySentiment[]> {
    const categoryGroups = new Map<string, VisceralAlert[]>();
    
    alerts.forEach(alert => {
      if (!categoryGroups.has(alert.category)) {
        categoryGroups.set(alert.category, []);
      }
      categoryGroups.get(alert.category)!.push(alert);
    });
    
    const categorySentiments: CategorySentiment[] = [];
    
    for (const [category, categoryAlerts] of categoryGroups) {
      const sentiment = await this.analyzMarketSentiment(categoryAlerts);
      const competitivePressure = this.calculateCompetitivePressure(categoryAlerts);
      const disruptionRisk = this.calculateDisruptionRisk(categoryAlerts);
      const opportunityIndex = this.calculateOpportunityIndex(categoryAlerts);
      const emotionalDrivers = this.identifyEmotionalDrivers(categoryAlerts);
      
      categorySentiments.push({
        category,
        sentiment,
        competitive_pressure: competitivePressure,
        disruption_risk: disruptionRisk,
        opportunity_index: opportunityIndex,
        emotional_drivers: emotionalDrivers
      });
    }
    
    return categorySentiments.sort((a, b) => b.competitive_pressure - a.competitive_pressure);
  }

  async analyzeDomainSentiment(domain: string, alerts: VisceralAlert[]): Promise<DomainSentiment> {
    const domainAlerts = alerts.filter(alert => 
      alert.aggressor === domain || alert.victim.includes(domain)
    );
    
    const sentimentScore = this.calculateDomainSentimentScore(domain, domainAlerts);
    const emotionalState = this.determineDomainEmotionalState(domain, domainAlerts);
    const marketPerception = this.generateMarketPerception(domain, domainAlerts);
    const trendDirection = this.analyzeTrendDirection(domain, domainAlerts);
    const psychologicalProfile = this.generatePsychologicalProfile(domain, domainAlerts);
    
    return {
      domain,
      sentiment_score: sentimentScore,
      emotional_state: emotionalState,
      market_perception: marketPerception,
      trend_direction: trendDirection,
      psychological_profile: psychologicalProfile
    };
  }

  generateEmotionalIntelligenceReport(
    overallSentiment: SentimentMetrics,
    categorySentiments: CategorySentiment[],
    domainSentiments: DomainSentiment[]
  ): string {
    const report = `🧠 EMOTIONAL INTELLIGENCE MARKET ANALYSIS\n\n` +
      `OVERALL MARKET PSYCHOLOGY:\n` +
      `${this.getEmotionalEmoji(overallSentiment.overall_sentiment)} Sentiment: ${overallSentiment.overall_sentiment.toUpperCase()}\n` +
      `📊 Score: ${(overallSentiment.sentiment_score * 100).toFixed(0)}/100\n` +
      `⚡ Momentum: ${overallSentiment.momentum.toUpperCase()}\n` +
      `🎭 Dominant Emotions: ${overallSentiment.dominant_emotions.join(', ')}\n` +
      `😱📈 Fear/Greed Index: ${overallSentiment.fear_greed_index}/100\n\n` +
      
      `CATEGORY EMOTIONAL LANDSCAPE:\n` +
      categorySentiments.slice(0, 5).map(cs => 
        `• ${cs.category}: ${this.getEmotionalEmoji(cs.sentiment.overall_sentiment)} ` +
        `${cs.sentiment.overall_sentiment} (Pressure: ${(cs.competitive_pressure * 100).toFixed(0)}%)`
      ).join('\n') + '\n\n' +
      
      `MARKET PSYCHOLOGY INSIGHTS:\n` +
      `${overallSentiment.market_psychology}\n\n` +
      
      `EMOTIONAL TRIGGER EVENTS:\n` +
      overallSentiment.trigger_events.slice(0, 3).map(event => 
        `🚨 ${event.headline} (Emotional Impact: ${this.calculateEmotionalImpact(event)})`
      ).join('\n') + '\n\n' +
      
      `STRATEGIC IMPLICATIONS:\n` +
      this.generateEmotionalStrategicImplications(overallSentiment, categorySentiments);
    
    return report;
  }

  async trackEmotionalMomentum(): Promise<{
    momentum_score: number;
    acceleration: 'building' | 'peaking' | 'declining';
    emotional_cycle: 'fear' | 'uncertainty' | 'greed' | 'euphoria';
    cycle_stage: 'early' | 'mid' | 'late';
    predicted_sentiment: string;
  }> {
    const historicalData = this.getHistoricalSentiment('overall', 10);
    
    if (historicalData.length < 3) {
      return {
        momentum_score: 0.5,
        acceleration: 'building',
        emotional_cycle: 'uncertainty',
        cycle_stage: 'early',
        predicted_sentiment: 'Insufficient historical data'
      };
    }
    
    const momentumScore = this.calculateMomentumScore(historicalData);
    const acceleration = this.determineAcceleration(historicalData);
    const emotionalCycle = this.identifyEmotionalCycle(historicalData);
    const cycleStage = this.determineCycleStage(historicalData);
    const predictedSentiment = this.predictNextSentiment(historicalData);
    
    return {
      momentum_score: momentumScore,
      acceleration,
      emotional_cycle: emotionalCycle,
      cycle_stage: cycleStage,
      predicted_sentiment: predictedSentiment
    };
  }

  // Core calculation methods
  private calculateOverallSentiment(alerts: VisceralAlert[]): number {
    if (alerts.length === 0) return 0;
    
    let totalSentiment = 0;
    let weightedCount = 0;
    
    alerts.forEach(alert => {
      const weight = alert.confidence_score;
      let alertSentiment = 0;
      
      // Assign sentiment values based on intensity
      switch (alert.intensity) {
        case 'domination':
        case 'obliteration':
          alertSentiment = 0.8;
          break;
        case 'uprising':
        case 'rampage':
          alertSentiment = 0.6;
          break;
        case 'annihilation':
          alertSentiment = 0.2;
          break;
        case 'bloodbath':
        case 'collapse':
          alertSentiment = -0.6;
          break;
        default:
          alertSentiment = 0;
      }
      
      // Adjust for market position change
      alertSentiment += (alert.market_position_change / 20); // Normalize large changes
      
      totalSentiment += alertSentiment * weight;
      weightedCount += weight;
    });
    
    return weightedCount > 0 ? Math.max(-1, Math.min(1, totalSentiment / weightedCount)) : 0;
  }

  private categorizeSentiment(score: number): SentimentMetrics['overall_sentiment'] {
    if (score >= 0.6) return 'euphoric';
    if (score >= 0.2) return 'bullish';
    if (score >= -0.2) return 'neutral';
    if (score >= -0.6) return 'bearish';
    return 'panic';
  }

  private analyzeMomentum(alerts: VisceralAlert[]): SentimentMetrics['momentum'] {
    const recentAlerts = alerts.filter(alert => {
      const hoursAgo = (Date.now() - alert.timestamp.getTime()) / (1000 * 60 * 60);
      return hoursAgo <= 6; // Last 6 hours
    });
    
    const olderAlerts = alerts.filter(alert => {
      const hoursAgo = (Date.now() - alert.timestamp.getTime()) / (1000 * 60 * 60);
      return hoursAgo > 6 && hoursAgo <= 24; // 6-24 hours ago
    });
    
    const recentSentiment = this.calculateOverallSentiment(recentAlerts);
    const olderSentiment = this.calculateOverallSentiment(olderAlerts);
    
    const change = recentSentiment - olderSentiment;
    
    if (Math.abs(change) >= 0.3) return 'accelerating';
    if (Math.abs(change) <= 0.1) return 'stable';
    return 'decelerating';
  }

  private analyzeVolatility(alerts: VisceralAlert[]): SentimentMetrics['volatility'] {
    if (alerts.length < 5) return 'low';
    
    const sentimentValues = alerts.map(alert => {
      switch (alert.intensity) {
        case 'obliteration': return 1;
        case 'domination': return 0.8;
        case 'uprising': return 0.6;
        case 'rampage': return 0.4;
        case 'annihilation': return 0.2;
        case 'collapse': return -0.4;
        case 'bloodbath': return -0.8;
        default: return 0;
      }
    });
    
    const mean = sentimentValues.reduce((sum: number, val: number) => sum + val, 0) / sentimentValues.length;
    const variance = sentimentValues.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / sentimentValues.length;
    const standardDeviation = Math.sqrt(variance);
    
    if (standardDeviation >= 0.8) return 'extreme';
    if (standardDeviation >= 0.5) return 'high';
    if (standardDeviation >= 0.3) return 'moderate';
    return 'low';
  }

  private calculateFearGreedIndex(alerts: VisceralAlert[]): number {
    let fearPoints = 0;
    let greedPoints = 0;
    
    alerts.forEach(alert => {
      const weight = alert.confidence_score;
      
      if (alert.intensity === 'bloodbath' || alert.intensity === 'collapse') {
        fearPoints += weight * 20;
      } else if (alert.intensity === 'domination' || alert.intensity === 'obliteration') {
        greedPoints += weight * 20;
      } else if (alert.intensity === 'uprising' || alert.intensity === 'rampage') {
        greedPoints += weight * 15;
      }
    });
    
    const totalPoints = fearPoints + greedPoints;
    if (totalPoints === 0) return 50; // Neutral
    
    return Math.round((greedPoints / totalPoints) * 100);
  }

  private extractDominantEmotions(alerts: VisceralAlert[]): string[] {
    const emotionCounts = new Map<string, number>();
    
    alerts.forEach(alert => {
      // Analyze headline for emotional content
      const headline = alert.headline.toLowerCase();
      
      Object.entries(this.emotionalLexicon).forEach(([emotion, words]) => {
        words.forEach(word => {
          if (headline.includes(word)) {
            emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + alert.confidence_score);
          }
        });
      });
      
      // Add intensity-based emotions
      switch (alert.intensity) {
        case 'domination':
        case 'obliteration':
          emotionCounts.set('dominance', (emotionCounts.get('dominance') || 0) + alert.confidence_score);
          break;
        case 'bloodbath':
        case 'collapse':
          emotionCounts.set('fear', (emotionCounts.get('fear') || 0) + alert.confidence_score);
          break;
        case 'uprising':
        case 'rampage':
          emotionCounts.set('excitement', (emotionCounts.get('excitement') || 0) + alert.confidence_score);
          break;
      }
    });
    
    return Array.from(emotionCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([emotion, _]) => emotion);
  }

  private generateMarketPsychology(
    sentiment: SentimentMetrics['overall_sentiment'],
    momentum: SentimentMetrics['momentum'],
    volatility: SentimentMetrics['volatility']
  ): string {
    const psychologyMap = {
      euphoric: {
        accelerating: 'Extreme market euphoria building dangerous momentum. Bubble conditions emerging.',
        stable: 'Sustained euphoria indicates mature bull cycle. Watch for reversal signals.',
        decelerating: 'Euphoric sentiment losing steam. Potential distribution phase beginning.'
      },
      bullish: {
        accelerating: 'Bullish sentiment strengthening. Positive momentum building across markets.',
        stable: 'Healthy bullish conditions with stable conviction. Sustainable growth psychology.',
        decelerating: 'Bullish sentiment moderating. Consolidation phase likely.'
      },
      neutral: {
        accelerating: 'Market indecision resolving. Directional break imminent.',
        stable: 'Balanced market psychology. Waiting for catalyst events.',
        decelerating: 'Neutral sentiment becoming entrenched. Range-bound conditions expected.'
      },
      bearish: {
        accelerating: 'Bearish sentiment intensifying. Risk-off psychology spreading.',
        stable: 'Persistent bearish conditions. Defensive positioning prevalent.',
        decelerating: 'Bearish sentiment exhausting. Potential for sentiment reversal.'
      },
      panic: {
        accelerating: 'Market panic accelerating. Capitulation conditions possible.',
        stable: 'Sustained panic psychology. Fear-driven selling continuing.',
        decelerating: 'Panic sentiment moderating. Potential for stabilization.'
      }
    };
    
    const base = psychologyMap[sentiment]?.[momentum] || 'Market psychology unclear.';
    const volatilityNote = volatility === 'extreme' ? ' EXTREME volatility amplifying all psychological effects.' :
                          volatility === 'high' ? ' High volatility creating psychological uncertainty.' : '';
    
    return base + volatilityNote;
  }

  private identifyTriggerEvents(alerts: VisceralAlert[]): VisceralAlert[] {
    return alerts
      .filter(alert => alert.viral_potential > 0.7 || alert.executive_urgency === 'critical')
      .sort((a, b) => (b.viral_potential + b.confidence_score) - (a.viral_potential + a.confidence_score))
      .slice(0, 5);
  }

  private calculateCompetitivePressure(alerts: VisceralAlert[]): number {
    const pressureEvents = alerts.filter(alert => 
      alert.intensity === 'bloodbath' || 
      alert.intensity === 'collapse' || 
      alert.executive_urgency === 'critical'
    );
    
    return Math.min(pressureEvents.length / Math.max(alerts.length, 1), 1.0);
  }

  private calculateDisruptionRisk(alerts: VisceralAlert[]): number {
    const disruptionEvents = alerts.filter(alert => 
      alert.intensity === 'uprising' || 
      alert.intensity === 'rampage'
    );
    
    return Math.min(disruptionEvents.length / Math.max(alerts.length, 1), 1.0);
  }

  private calculateOpportunityIndex(alerts: VisceralAlert[]): number {
    const opportunityEvents = alerts.filter(alert => 
      alert.intensity === 'uprising' || 
      alert.intensity === 'domination' ||
      alert.confidence_score > 0.8
    );
    
    return Math.min(opportunityEvents.length / Math.max(alerts.length, 1), 1.0);
  }

  private identifyEmotionalDrivers(alerts: VisceralAlert[]): string[] {
    const drivers = new Set<string>();
    
    alerts.forEach(alert => {
      if (alert.intensity === 'domination') drivers.add('market_dominance');
      if (alert.intensity === 'bloodbath') drivers.add('competitive_fear');
      if (alert.intensity === 'uprising') drivers.add('disruption_excitement');
      if (alert.executive_urgency === 'critical') drivers.add('urgency_pressure');
      if (alert.viral_potential > 0.8) drivers.add('viral_momentum');
    });
    
    return Array.from(drivers);
  }

  // Domain-specific sentiment methods
  private calculateDomainSentimentScore(domain: string, alerts: VisceralAlert[]): number {
    let score = 0;
    let weight = 0;
    
    alerts.forEach(alert => {
      const alertWeight = alert.confidence_score;
      let alertScore = 0;
      
      if (alert.aggressor === domain) {
        // Domain is the aggressor (positive)
        switch (alert.intensity) {
          case 'domination':
          case 'obliteration':
            alertScore = 0.9;
            break;
          case 'uprising':
          case 'rampage':
            alertScore = 0.7;
            break;
          default:
            alertScore = 0.3;
        }
      } else if (alert.victim.includes(domain)) {
        // Domain is a victim (negative)
        switch (alert.intensity) {
          case 'bloodbath':
          case 'collapse':
            alertScore = -0.8;
            break;
          case 'annihilation':
            alertScore = -0.6;
            break;
          default:
            alertScore = -0.3;
        }
      }
      
      score += alertScore * alertWeight;
      weight += alertWeight;
    });
    
    return weight > 0 ? Math.max(-1, Math.min(1, score / weight)) : 0;
  }

  private determineDomainEmotionalState(domain: string, alerts: VisceralAlert[]): DomainSentiment['emotional_state'] {
    const score = this.calculateDomainSentimentScore(domain, alerts);
    
    if (score >= 0.6) return 'dominating';
    if (score >= 0.2) return 'confident';
    if (score >= -0.2) return 'defensive';
    if (score >= -0.6) return 'panicking';
    return 'desperate';
  }

  private generateMarketPerception(domain: string, alerts: VisceralAlert[]): string {
    const aggressorEvents = alerts.filter(a => a.aggressor === domain).length;
    const victimEvents = alerts.filter(a => a.victim.includes(domain)).length;
    
    if (aggressorEvents > victimEvents * 2) {
      return 'Market sees as dominant force and competitive threat';
    } else if (victimEvents > aggressorEvents * 2) {
      return 'Market perceives as vulnerable and under pressure';
    } else if (aggressorEvents > 0 && victimEvents > 0) {
      return 'Market views as active competitor in transition';
    } else {
      return 'Market perception unclear - limited competitive activity';
    }
  }

  private analyzeTrendDirection(domain: string, alerts: VisceralAlert[]): DomainSentiment['trend_direction'] {
    const recentScore = this.calculateDomainSentimentScore(domain, 
      alerts.filter(a => (Date.now() - a.timestamp.getTime()) / (1000 * 60 * 60) <= 12)
    );
    
    const olderScore = this.calculateDomainSentimentScore(domain,
      alerts.filter(a => {
        const hours = (Date.now() - a.timestamp.getTime()) / (1000 * 60 * 60);
        return hours > 12 && hours <= 48;
      })
    );
    
    const change = recentScore - olderScore;
    
    if (change >= 0.2) return 'ascending';
    if (change <= -0.2) return 'descending';
    return 'stable';
  }

  private generatePsychologicalProfile(domain: string, alerts: VisceralAlert[]): string {
    const state = this.determineDomainEmotionalState(domain, alerts);
    const perception = this.generateMarketPerception(domain, alerts);
    const trend = this.analyzeTrendDirection(domain, alerts);
    
    return `${state.charAt(0).toUpperCase() + state.slice(1)} emotional state with ${trend} trajectory. ${perception}`;
  }

  // Helper methods
  private getEmotionalEmoji(sentiment: SentimentMetrics['overall_sentiment']): string {
    const emojiMap = {
      euphoric: '🚀',
      bullish: '📈',
      neutral: '😐',
      bearish: '📉',
      panic: '😱'
    };
    return emojiMap[sentiment] || '📊';
  }

  private calculateEmotionalImpact(alert: VisceralAlert): string {
    const impact = alert.confidence_score * alert.viral_potential;
    if (impact >= 0.8) return 'EXTREME';
    if (impact >= 0.6) return 'HIGH';
    if (impact >= 0.4) return 'MODERATE';
    return 'LOW';
  }

  private generateEmotionalStrategicImplications(
    overall: SentimentMetrics,
    categories: CategorySentiment[]
  ): string {
    let implications = '';
    
    if (overall.overall_sentiment === 'euphoric') {
      implications += '• CAUTION: Euphoric sentiment may indicate bubble conditions\n';
      implications += '• Prepare for potential sentiment reversal and volatility spike\n';
    } else if (overall.overall_sentiment === 'panic') {
      implications += '• OPPORTUNITY: Panic sentiment often creates acquisition opportunities\n';
      implications += '• Consider contrarian positioning in oversold categories\n';
    }
    
    if (overall.volatility === 'extreme') {
      implications += '• RISK: Extreme volatility requires enhanced risk management\n';
      implications += '• Implement dynamic hedging strategies\n';
    }
    
    const highPressureCategories = categories.filter(c => c.competitive_pressure > 0.7);
    if (highPressureCategories.length > 0) {
      implications += `• PRESSURE: High competitive pressure detected in ${highPressureCategories.map(c => c.category).join(', ')}\n`;
    }
    
    return implications || '• Continue monitoring emotional market conditions';
  }

  // Historical data management
  private storeHistoricalSentiment(key: string, metrics: SentimentMetrics) {
    if (!this.sentimentHistory.has(key)) {
      this.sentimentHistory.set(key, []);
    }
    
    const history = this.sentimentHistory.get(key)!;
    history.push(metrics);
    
    // Keep only last 50 entries
    if (history.length > 50) {
      history.shift();
    }
  }

  private getHistoricalSentiment(key: string, count: number): SentimentMetrics[] {
    const history = this.sentimentHistory.get(key) || [];
    return history.slice(-count);
  }

  // Momentum tracking methods
  private calculateMomentumScore(history: SentimentMetrics[]): number {
    if (history.length < 2) return 0.5;
    
    const recent = history.slice(-3);
    const scores = recent.map(h => h.sentiment_score);
    
    let momentum = 0;
    for (let i = 1; i < scores.length; i++) {
      momentum += scores[i] - scores[i - 1];
    }
    
    return Math.max(0, Math.min(1, 0.5 + momentum));
  }

  private determineAcceleration(history: SentimentMetrics[]): 'building' | 'peaking' | 'declining' {
    if (history.length < 3) return 'building';
    
    const recent = history.slice(-3);
    const changes = [];
    
    for (let i = 1; i < recent.length; i++) {
      changes.push(recent[i].sentiment_score - recent[i - 1].sentiment_score);
    }
    
    if (changes.every(c => c > 0)) return 'building';
    if (changes.every(c => c < 0)) return 'declining';
    return 'peaking';
  }

  private identifyEmotionalCycle(history: SentimentMetrics[]): 'fear' | 'uncertainty' | 'greed' | 'euphoria' {
    if (history.length === 0) return 'uncertainty';
    
    const latest = history[history.length - 1];
    
    if (latest.overall_sentiment === 'panic' || latest.overall_sentiment === 'bearish') {
      return 'fear';
    } else if (latest.overall_sentiment === 'euphoric') {
      return 'euphoria';
    } else if (latest.overall_sentiment === 'bullish') {
      return 'greed';
    } else {
      return 'uncertainty';
    }
  }

  private determineCycleStage(history: SentimentMetrics[]): 'early' | 'mid' | 'late' {
    if (history.length < 5) return 'early';
    
    const recent = history.slice(-5);
    const trend = recent[recent.length - 1].sentiment_score - recent[0].sentiment_score;
    const volatility = recent[recent.length - 1].volatility;
    
    if (Math.abs(trend) < 0.2) return 'mid';
    if (volatility === 'extreme') return 'late';
    return Math.abs(trend) > 0.5 ? 'mid' : 'early';
  }

  private predictNextSentiment(history: SentimentMetrics[]): string {
    if (history.length < 3) return 'Insufficient data for prediction';
    
    const latest = history[history.length - 1];
    const momentum = this.calculateMomentumScore(history);
    
    if (latest.overall_sentiment === 'euphoric' && momentum > 0.8) {
      return 'WARNING: Potential sentiment reversal from extreme euphoria';
    } else if (latest.overall_sentiment === 'panic' && momentum < 0.2) {
      return 'OPPORTUNITY: Sentiment may be bottoming out';
    } else if (latest.momentum === 'accelerating') {
      return `TREND: ${latest.overall_sentiment} sentiment likely to continue`;
    } else {
      return `STABLE: ${latest.overall_sentiment} sentiment likely to persist`;
    }
  }
}