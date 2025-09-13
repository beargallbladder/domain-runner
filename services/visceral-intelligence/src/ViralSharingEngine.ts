import { VisceralAlert, ShareableContent, CompetitiveCarnage } from './types';
import { VisceralLanguageEngine } from './VisceralLanguageEngine';

export class ViralSharingEngine {
  private languageEngine: VisceralLanguageEngine;
  
  constructor() {
    this.languageEngine = new VisceralLanguageEngine();
  }

  generateTwitterThread(alert: VisceralAlert): string[] {
    const tweets: string[] = [];
    
    // Main tweet - hook with emoji and urgency
    tweets.push(
      `🚨 MARKET ALERT: ${alert.headline}\n\n` +
      `${this.getIntensityEmoji(alert.intensity)} ${alert.damage_assessment}\n\n` +
      `Thread 🧵👇`
    );
    
    // Context tweet
    tweets.push(
      `📊 THE BREAKDOWN:\n` +
      `Category: ${alert.category}\n` +
      `Market Position Shift: ${alert.market_position_change > 0 ? '+' : ''}${alert.market_position_change}\n` +
      `Confidence: ${(alert.confidence_score * 100).toFixed(0)}%\n` +
      `Viral Potential: ${this.getViralRating(alert.viral_potential)}`
    );
    
    // Impact tweet
    if (alert.victim.length > 1) {
      tweets.push(
        `💥 WHO'S AFFECTED:\n` +
        `${alert.victim.slice(0, 4).map(v => `• ${v}`).join('\n')}\n` +
        `${alert.victim.length > 4 ? `...and ${alert.victim.length - 4} more` : ''}\n\n` +
        `Market verdict: ${alert.intensity.toUpperCase()}`
      );
    }
    
    // Call to action
    tweets.push(
      `🔥 Want deeper intelligence on this market shift?\n\n` +
      `Get real-time competitive analysis at llmrank.io\n\n` +
      `#MarketIntelligence #CompetitiveAnalysis #${alert.category.replace(/\s+/g, '')}`
    );
    
    return tweets;
  }

  generateLinkedInPost(alert: VisceralAlert): string {
    const professionalTone = this.convertToProfessionalLanguage(alert.headline);
    
    return `🎯 COMPETITIVE INTELLIGENCE UPDATE\n\n` +
           `${professionalTone}\n\n` +
           `📈 KEY INSIGHTS:\n` +
           `• Market Category: ${alert.category}\n` +
           `• Position Change: ${alert.market_position_change > 0 ? 'Positive' : 'Negative'} shift of ${Math.abs(alert.market_position_change)} positions\n` +
           `• Confidence Level: ${(alert.confidence_score * 100).toFixed(0)}%\n` +
           `• Executive Priority: ${alert.executive_urgency.toUpperCase()}\n\n` +
           `💡 Market dynamics are shifting rapidly in ${alert.category}. Organizations need real-time competitive intelligence to stay ahead.\n\n` +
           `What's your strategy for monitoring competitive threats?\n\n` +
           `#CompetitiveIntelligence #MarketAnalysis #BusinessStrategy #${alert.category.replace(/\s+/g, '')}\n\n` +
           `🔗 Advanced competitive analysis: llmrank.io`;
  }

  generateInstagramStory(alert: VisceralAlert): {
    text: string;
    background: string;
    stickers: string[];
  } {
    return {
      text: `${this.getIntensityEmoji(alert.intensity)} MARKET SHIFT ALERT\n\n` +
            `${alert.aggressor} vs Competition\n\n` +
            `Category: ${alert.category}\n` +
            `Impact: ${alert.intensity.toUpperCase()}\n\n` +
            `Swipe up for full analysis ↗️`,
      background: this.getIntensityBackground(alert.intensity),
      stickers: [
        '🔥', '📈', '⚡', '🚨', '💪'
      ]
    };
  }

  generateSlackMessage(alert: VisceralAlert, channelType: 'executive' | 'marketing' | 'competitive'): string {
    switch (channelType) {
      case 'executive':
        return `🚨 *EXECUTIVE ALERT - ${alert.executive_urgency.toUpperCase()} PRIORITY*\n\n` +
               `*Market Event:* ${alert.headline}\n` +
               `*Category:* ${alert.category}\n` +
               `*Impact Assessment:* ${alert.damage_assessment}\n` +
               `*Confidence:* ${(alert.confidence_score * 100).toFixed(0)}%\n\n` +
               `*Immediate Action Required:* ${alert.executive_urgency === 'critical' ? 'YES' : 'Monitor'}\n\n` +
               `<https://llmrank.io/analysis/${alert.id}|View Full Analysis>`;
               
      case 'marketing':
        return `📢 *MARKETING OPPORTUNITY ALERT*\n\n` +
               `${this.getIntensityEmoji(alert.intensity)} ${alert.headline}\n\n` +
               `*Viral Potential:* ${this.getViralRating(alert.viral_potential)}\n` +
               `*Share-worthy because:*\n` +
               `• ${alert.intensity} level market event\n` +
               `• ${alert.confidence_score > 0.8 ? 'High' : 'Medium'} confidence data\n` +
               `• ${alert.viral_potential > 0.7 ? 'Excellent' : 'Good'} engagement potential\n\n` +
               `*Suggested content:* Thread, LinkedIn post, press mention\n\n` +
               `<https://llmrank.io/share/${alert.id}|Generate Content>`;
               
      case 'competitive':
        return `🎯 *COMPETITIVE INTELLIGENCE UPDATE*\n\n` +
               `*Event:* ${alert.headline}\n` +
               `*Players:*\n` +
               `• Aggressor: ${alert.aggressor}\n` +
               `• Affected: ${alert.victim.join(', ')}\n\n` +
               `*Market Analysis:*\n` +
               `• Position change: ${alert.market_position_change}\n` +
               `• Trend: ${alert.intensity}\n` +
               `• Category: ${alert.category}\n\n` +
               `*Next Steps:* ${this.generateNextSteps(alert)}\n\n` +
               `<https://llmrank.io/competitive/${alert.category}|Category Analysis>`;
               
      default:
        return this.generateSlackMessage(alert, 'competitive');
    }
  }

  generateEmailAlert(alert: VisceralAlert, recipientType: 'ceo' | 'cmo' | 'competitive_analyst'): {
    subject: string;
    html: string;
    plainText: string;
  } {
    const subject = this.generateEmailSubject(alert, recipientType);
    
    switch (recipientType) {
      case 'ceo':
        return {
          subject,
          html: this.generateCEOEmailHTML(alert),
          plainText: this.generateCEOEmailPlain(alert)
        };
        
      case 'cmo':
        return {
          subject,
          html: this.generateCMOEmailHTML(alert),
          plainText: this.generateCMOEmailPlain(alert)
        };
        
      case 'competitive_analyst':
        return {
          subject,
          html: this.generateAnalystEmailHTML(alert),
          plainText: this.generateAnalystEmailPlain(alert)
        };
        
      default:
        return this.generateEmailAlert(alert, 'competitive_analyst');
    }
  }

  generatePressReleaseDraft(alert: VisceralAlert): string {
    if (alert.aggressor.includes('your-domain')) { // If it's about the user's domain winning
      return `FOR IMMEDIATE RELEASE\n\n` +
             `${alert.aggressor} Achieves Significant Market Position in ${alert.category}\n\n` +
             `Company demonstrates strong competitive performance with ${Math.abs(alert.market_position_change)} position advancement\n\n` +
             `[CITY, DATE] - Recent market analysis reveals ${alert.aggressor} has achieved notable progress in the ${alert.category} sector. ` +
             `The company's strategic initiatives have resulted in improved market positioning, reflecting strong execution and market response.\n\n` +
             `"This market recognition validates our strategic approach and commitment to innovation in ${alert.category}," said [SPOKESPERSON NAME], [TITLE] at ${alert.aggressor}. ` +
             `"We continue to focus on delivering exceptional value to our customers and stakeholders."\n\n` +
             `The analysis, based on comprehensive market data, indicates sustained momentum in key performance indicators. ` +
             `${alert.aggressor} continues to invest in strategic initiatives aimed at long-term growth and market leadership.\n\n` +
             `About ${alert.aggressor}:\n` +
             `[COMPANY BOILERPLATE]\n\n` +
             `Media Contact:\n` +
             `[CONTACT INFORMATION]\n\n` +
             `###`;
    }
    
    return `MARKET ANALYSIS BRIEF\n\n` +
           `Significant Competitive Shift Observed in ${alert.category} Market\n\n` +
           `Independent analysis reveals notable market dynamics affecting industry positioning\n\n` +
           `[DATE] - Market intelligence analysis has identified significant competitive movement in the ${alert.category} sector. ` +
           `The data indicates ${alert.headline.toLowerCase()}, suggesting evolving market dynamics and competitive pressures.\n\n` +
           `Key findings include:\n` +
           `• Market position changes affecting multiple competitors\n` +
           `• Confidence level of ${(alert.confidence_score * 100).toFixed(0)}% in observed trends\n` +
           `• ${alert.executive_urgency} priority level for industry participants\n\n` +
           `Industry observers note this represents typical market evolution as companies compete for market share and customer attention. ` +
           `Organizations in this space may benefit from enhanced competitive monitoring and strategic positioning adjustments.\n\n` +
           `The analysis methodology incorporates multiple data sources and algorithmic assessment to provide objective market insights.\n\n` +
           `###`;
  }

  // Helper methods
  private getIntensityEmoji(intensity: VisceralAlert['intensity']): string {
    const emojiMap = {
      'obliteration': '💀',
      'domination': '🔥',
      'bloodbath': '🩸',
      'rampage': '🚀',
      'uprising': '📈',
      'collapse': '📉',
      'annihilation': '💥'
    };
    return emojiMap[intensity] || '⚡';
  }

  private getViralRating(viralPotential: number): string {
    if (viralPotential >= 0.8) return '🔥 EXTREMELY HIGH';
    if (viralPotential >= 0.6) return '📈 HIGH';
    if (viralPotential >= 0.4) return '📊 MODERATE';
    return '📋 LOW';
  }

  private getIntensityBackground(intensity: VisceralAlert['intensity']): string {
    const backgroundMap = {
      'obliteration': 'linear-gradient(45deg, #000000, #434343)',
      'domination': 'linear-gradient(45deg, #ff6d00, #f57c00)',
      'bloodbath': 'linear-gradient(45deg, #d32f2f, #b71c1c)',
      'rampage': 'linear-gradient(45deg, #7b1fa2, #4a148c)',
      'uprising': 'linear-gradient(45deg, #00e676, #00c853)',
      'collapse': 'linear-gradient(45deg, #ff1744, #d50000)',
      'annihilation': 'linear-gradient(45deg, #ff9800, #e65100)'
    };
    return backgroundMap[intensity] || 'linear-gradient(45deg, #2196f3, #1565c0)';
  }

  private convertToProfessionalLanguage(headline: string): string {
    return headline
      .replace(/OBLITERATES|CRUSHES|ANNIHILATES|DEMOLISHES|DESTROYS|SLAUGHTERS/g, 'significantly outperforms')
      .replace(/BLEEDING|HEMORRHAGING|COLLAPSING|CRASHING|IMPLODING/g, 'experiencing challenges')
      .replace(/SURGING|EXPLODING|ROCKETING|TEARING UP|RAMPAGING/g, 'demonstrating strong growth')
      .replace(/getting DESTROYED|getting crushed/g, 'facing competitive pressure')
      .replace(/FREEFALL|NOSEDIVING|PLUMMETING/g, 'declining performance');
  }

  private generateNextSteps(alert: VisceralAlert): string {
    if (alert.executive_urgency === 'critical') {
      return 'Immediate strategic review recommended';
    }
    if (alert.executive_urgency === 'high') {
      return 'Monitor closely, prepare response options';
    }
    return 'Continue monitoring, update in next review cycle';
  }

  private generateEmailSubject(alert: VisceralAlert, recipientType: string): string {
    const urgencyPrefix = alert.executive_urgency === 'critical' ? '[URGENT] ' : 
                         alert.executive_urgency === 'high' ? '[HIGH PRIORITY] ' : '';
    
    if (recipientType === 'ceo') {
      return `${urgencyPrefix}Competitive Alert: ${alert.category} Market Shift`;
    }
    if (recipientType === 'cmo') {
      return `${urgencyPrefix}Marketing Opportunity: ${alert.intensity.toUpperCase()} in ${alert.category}`;
    }
    return `${urgencyPrefix}Market Intelligence: ${alert.headline}`;
  }

  private generateCEOEmailHTML(alert: VisceralAlert): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(45deg, #1565c0, #0d47a1); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Executive Market Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Competitive Intelligence Brief</p>
        </div>
        
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #d32f2f; margin-top: 0;">${this.getIntensityEmoji(alert.intensity)} ${alert.headline}</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565c0;">Impact Assessment</h3>
            <p><strong>Category:</strong> ${alert.category}</p>
            <p><strong>Market Position Change:</strong> ${alert.market_position_change > 0 ? '+' : ''}${alert.market_position_change} positions</p>
            <p><strong>Confidence Level:</strong> ${(alert.confidence_score * 100).toFixed(0)}%</p>
            <p><strong>Executive Priority:</strong> <span style="color: ${alert.executive_urgency === 'critical' ? '#d32f2f' : '#f57c00'}; font-weight: bold;">${alert.executive_urgency.toUpperCase()}</span></p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565c0;">Damage Assessment</h3>
            <p>${alert.damage_assessment}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://llmrank.io/analysis/${alert.id}" style="background: #1565c0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Full Analysis</a>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>LLMRank.io Competitive Intelligence Platform</p>
          <p style="opacity: 0.8;">Professional. Authoritative. Absolutely Visceral.</p>
        </div>
      </div>
    `;
  }

  private generateCEOEmailPlain(alert: VisceralAlert): string {
    return `EXECUTIVE MARKET ALERT - ${alert.executive_urgency.toUpperCase()} PRIORITY\n\n` +
           `${alert.headline}\n\n` +
           `IMPACT ASSESSMENT:\n` +
           `Category: ${alert.category}\n` +
           `Market Position Change: ${alert.market_position_change > 0 ? '+' : ''}${alert.market_position_change} positions\n` +
           `Confidence Level: ${(alert.confidence_score * 100).toFixed(0)}%\n` +
           `Executive Priority: ${alert.executive_urgency.toUpperCase()}\n\n` +
           `DAMAGE ASSESSMENT:\n` +
           `${alert.damage_assessment}\n\n` +
           `View Full Analysis: https://llmrank.io/analysis/${alert.id}\n\n` +
           `--\n` +
           `LLMRank.io Competitive Intelligence Platform\n` +
           `Professional. Authoritative. Absolutely Visceral.`;
  }

  private generateCMOEmailHTML(alert: VisceralAlert): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(45deg, #ff6d00, #f57c00); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Marketing Intelligence Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Viral Content Opportunity</p>
        </div>
        
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #ff6d00; margin-top: 0;">${this.getIntensityEmoji(alert.intensity)} ${alert.headline}</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #ff6d00;">Viral Potential Analysis</h3>
            <p><strong>Viral Rating:</strong> ${this.getViralRating(alert.viral_potential)}</p>
            <p><strong>Share-worthy Factor:</strong> ${alert.confidence_score > 0.8 ? 'High' : 'Medium'} confidence event</p>
            <p><strong>Engagement Potential:</strong> ${alert.viral_potential > 0.7 ? 'Excellent' : 'Good'}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #ff6d00;">Recommended Content</h3>
            <ul>
              <li>Twitter Thread (${alert.viral_potential > 0.6 ? 'Recommended' : 'Optional'})</li>
              <li>LinkedIn Professional Post (${alert.confidence_score > 0.7 ? 'Recommended' : 'Optional'})</li>
              <li>Press Release Draft (${alert.executive_urgency === 'critical' ? 'Recommended' : 'Optional'})</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://llmrank.io/share/${alert.id}" style="background: #ff6d00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Generate Content</a>
          </div>
        </div>
      </div>
    `;
  }

  private generateCMOEmailPlain(alert: VisceralAlert): string {
    return `MARKETING INTELLIGENCE ALERT - VIRAL OPPORTUNITY\n\n` +
           `${alert.headline}\n\n` +
           `VIRAL POTENTIAL ANALYSIS:\n` +
           `Viral Rating: ${this.getViralRating(alert.viral_potential)}\n` +
           `Share-worthy Factor: ${alert.confidence_score > 0.8 ? 'High' : 'Medium'} confidence event\n` +
           `Engagement Potential: ${alert.viral_potential > 0.7 ? 'Excellent' : 'Good'}\n\n` +
           `RECOMMENDED CONTENT:\n` +
           `• Twitter Thread (${alert.viral_potential > 0.6 ? 'Recommended' : 'Optional'})\n` +
           `• LinkedIn Professional Post (${alert.confidence_score > 0.7 ? 'Recommended' : 'Optional'})\n` +
           `• Press Release Draft (${alert.executive_urgency === 'critical' ? 'Recommended' : 'Optional'})\n\n` +
           `Generate Content: https://llmrank.io/share/${alert.id}`;
  }

  private generateAnalystEmailHTML(alert: VisceralAlert): string {
    return `
      <div style="font-family: 'Courier New', monospace; max-width: 700px; margin: 0 auto; background: #1a1a1a; color: #00ff00;">
        <div style="background: #000; color: #00ff00; padding: 20px; text-align: center; border: 2px solid #00ff00;">
          <h1 style="margin: 0; font-size: 20px;">COMPETITIVE INTELLIGENCE TERMINAL</h1>
          <p style="margin: 10px 0 0 0;">CLASSIFIED - EYES ONLY</p>
        </div>
        
        <div style="padding: 20px; font-size: 14px; line-height: 1.6;">
          <pre style="color: #00ff00; background: #000; padding: 15px; border: 1px solid #00ff00;">
EVENT_ID: ${alert.id}
TIMESTAMP: ${alert.timestamp.toISOString()}
CLASSIFICATION: ${alert.intensity.toUpperCase()}
CONFIDENCE: ${(alert.confidence_score * 100).toFixed(1)}%
PRIORITY: ${alert.executive_urgency.toUpperCase()}

SITUATION_REPORT:
${alert.headline}

AFFECTED_ENTITIES:
TARGET: ${alert.aggressor}
CASUALTIES: ${alert.victim.join(', ')}

DAMAGE_ASSESSMENT:
${alert.damage_assessment}

MARKET_INTEL:
Category: ${alert.category}
Position_Delta: ${alert.market_position_change}
Viral_Coefficient: ${alert.viral_potential.toFixed(3)}

THREAT_LEVEL: ${alert.executive_urgency === 'critical' ? 'DEFCON 1' : 
                alert.executive_urgency === 'high' ? 'DEFCON 2' : 'DEFCON 3'}
          </pre>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://llmrank.io/competitive/${alert.category}" style="background: #00ff00; color: #000; padding: 10px 20px; text-decoration: none; font-weight: bold;">ACCESS_FULL_INTEL</a>
          </div>
        </div>
      </div>
    `;
  }

  private generateAnalystEmailPlain(alert: VisceralAlert): string {
    return `COMPETITIVE INTELLIGENCE TERMINAL - CLASSIFIED\n` +
           `===============================================\n\n` +
           `EVENT_ID: ${alert.id}\n` +
           `TIMESTAMP: ${alert.timestamp.toISOString()}\n` +
           `CLASSIFICATION: ${alert.intensity.toUpperCase()}\n` +
           `CONFIDENCE: ${(alert.confidence_score * 100).toFixed(1)}%\n` +
           `PRIORITY: ${alert.executive_urgency.toUpperCase()}\n\n` +
           `SITUATION_REPORT:\n` +
           `${alert.headline}\n\n` +
           `AFFECTED_ENTITIES:\n` +
           `TARGET: ${alert.aggressor}\n` +
           `CASUALTIES: ${alert.victim.join(', ')}\n\n` +
           `DAMAGE_ASSESSMENT:\n` +
           `${alert.damage_assessment}\n\n` +
           `MARKET_INTEL:\n` +
           `Category: ${alert.category}\n` +
           `Position_Delta: ${alert.market_position_change}\n` +
           `Viral_Coefficient: ${alert.viral_potential.toFixed(3)}\n\n` +
           `THREAT_LEVEL: ${alert.executive_urgency === 'critical' ? 'DEFCON 1' : 
                           alert.executive_urgency === 'high' ? 'DEFCON 2' : 'DEFCON 3'}\n\n` +
           `ACCESS_FULL_INTEL: https://llmrank.io/competitive/${alert.category}`;
  }
}