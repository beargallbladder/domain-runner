import { db, NewsEvent, PerceptionCorrelation } from './database';

export interface CorrelationResult {
  correlations_created: number;
  events_processed: number;
  domains_analyzed: string[];
}

export class CorrelationEngine {
  
  // Main correlation processing method
  async processCorrelations(): Promise<CorrelationResult> {
    console.log('🔗 Starting event-perception correlation analysis...');
    
    const domains = await db.getMonitoredDomains();
    let correlationsCreated = 0;
    let eventsProcessed = 0;
    
    for (const domain of domains) {
      try {
        const recentEvents = await this.getRecentEvents(domain, 30); // Last 30 days
        
        for (const event of recentEvents) {
          const correlations = await this.findPerceptionCorrelations(event);
          
          for (const correlation of correlations) {
            await db.storeCorrelation(correlation);
            correlationsCreated++;
          }
          
          eventsProcessed++;
        }
      } catch (error) {
        console.warn(`⚠️  Correlation processing failed for ${domain}:`, error);
      }
    }
    
    return {
      correlations_created: correlationsCreated,
      events_processed: eventsProcessed,
      domains_analyzed: domains
    };
  }
  
  // Get recent news events for a domain with proper error handling
  private async getRecentEvents(domain: string, days: number): Promise<(NewsEvent & { id: number })[]> {
    try {
      if (!domain || days <= 0) {
        return [];
      }
      
      const pool = require('./database').default;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const result = await pool.query(`
        SELECT * FROM news_events 
        WHERE domain = $1 
        AND event_date >= $2
        AND id NOT IN (
          SELECT DISTINCT news_event_id FROM perception_correlations 
          WHERE news_event_id IS NOT NULL
        )
        ORDER BY event_date DESC
        LIMIT 50
      `, [domain, cutoffDate.toISOString().split('T')[0]]);
      
      return result.rows || [];
    } catch (error) {
      console.error(`Failed to get recent events for ${domain}:`, error);
      return [];
    }
  }
  
  // Find perception changes that correlate with a news event
  private async findPerceptionCorrelations(event: NewsEvent & { id: number }): Promise<PerceptionCorrelation[]> {
    const correlations: PerceptionCorrelation[] = [];
    
    // Get perception data before and after the event
    const eventDate = new Date(event.event_date);
    const beforeDate = new Date(eventDate);
    beforeDate.setDate(beforeDate.getDate() - 7); // 7 days before
    
    const afterDate = new Date(eventDate);
    afterDate.setDate(afterDate.getDate() + 7); // 7 days after
    
    const beforeData = await db.getRecentPerceptionData(event.domain, beforeDate);
    const afterData = await db.getRecentPerceptionData(event.domain, eventDate);
    
    // Group by model for comparison
    const modelScores = this.calculateModelScores(beforeData, afterData, eventDate);
    
    for (const [modelName, scores] of Object.entries(modelScores)) {
      if (scores.before !== null && scores.after !== null) {
        const correlation: PerceptionCorrelation = {
          news_event_id: event.id,
          domain: event.domain,
          model_name: modelName,
          before_score: scores.before,
          after_score: scores.after,
          days_delta: scores.daysDelta,
          correlation_strength: this.calculateCorrelationStrength(scores.before, scores.after, event)
        };
        
        correlations.push(correlation);
      }
    }
    
    return correlations;
  }
  
  // Calculate perception scores before/after event for each model
  private calculateModelScores(
    beforeData: any[], 
    afterData: any[], 
    eventDate: Date
  ): Record<string, { before: number | null; after: number | null; daysDelta: number }> {
    const modelScores: Record<string, { before: number | null; after: number | null; daysDelta: number }> = {};
    
    // Get unique models
    const allModels = [...new Set([
      ...beforeData.map(d => d.model_name),
      ...afterData.map(d => d.model_name)
    ])];
    
    for (const model of allModels) {
      const beforeModelData = beforeData.filter(d => d.model_name === model);
      const afterModelData = afterData.filter(d => d.model_name === model);
      
      const beforeScore = beforeModelData.length > 0 ? 
        this.calculatePerceptionScore(beforeModelData) : null;
      
      const afterScore = afterModelData.length > 0 ? 
        this.calculatePerceptionScore(afterModelData) : null;
      
      // Calculate days between event and after measurement
      const daysDelta = afterModelData.length > 0 ? 
        Math.round((new Date(afterModelData[0].created_at).getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      modelScores[model] = {
        before: beforeScore,
        after: afterScore, 
        daysDelta: Math.max(0, daysDelta)
      };
    }
    
    return modelScores;
  }
  
  // Calculate a perception score from LLM responses
  private calculatePerceptionScore(responses: any[]): number {
    // Simple scoring based on response sentiment and length
    let totalScore = 0;
    let count = 0;
    
    for (const response of responses) {
      const text = response.response_text || '';
      
      // Basic sentiment analysis of response
      const positiveWords = ['excellent', 'great', 'successful', 'leading', 'innovative', 'trusted'];
      const negativeWords = ['crisis', 'scandal', 'failing', 'troubled', 'controversial', 'risky'];
      
      let score = 5.0; // Neutral baseline
      
      const lowerText = text.toLowerCase();
      positiveWords.forEach(word => {
        if (lowerText.includes(word)) score += 0.5;
      });
      
      negativeWords.forEach(word => {
        if (lowerText.includes(word)) score -= 0.5;
      });
      
      // Response length factor (longer = more detailed = potentially more negative)
      if (text.length > 500) score -= 0.2;
      if (text.length > 1000) score -= 0.3;
      
      totalScore += Math.max(0, Math.min(10, score));
      count++;
    }
    
    return count > 0 ? totalScore / count : 5.0;
  }
  
  // Calculate how strong the correlation is between event and perception change
  private calculateCorrelationStrength(beforeScore: number, afterScore: number, event: NewsEvent): number {
    const scoreDiff = Math.abs(afterScore - beforeScore);
    const eventSentiment = Math.abs(event.sentiment_score || 0);
    
    // Stronger correlation if:
    // 1. Larger perception change
    // 2. More negative event sentiment
    // 3. Event type matches perception change direction
    
    let strength = 0;
    
    // Score difference factor (0-0.6)
    strength += Math.min(0.6, scoreDiff / 10);
    
    // Event sentiment factor (0-0.3)
    strength += Math.min(0.3, eventSentiment);
    
    // Direction match factor (0-0.1)
    const expectedNegative = (event.sentiment_score || 0) < 0;
    const actualNegative = afterScore < beforeScore;
    if (expectedNegative === actualNegative) {
      strength += 0.1;
    }
    
    return Math.min(1.0, strength);
  }
}

export const correlationEngine = new CorrelationEngine(); 