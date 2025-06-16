// ============================================================================
// 🧪 CORRELATION ENGINE UNIT TESTS
// ============================================================================

import { CorrelationEngine } from '../correlation-engine';
import { NewsEvent } from '../database';

// Mock database
jest.mock('../database', () => ({
  db: {
    getMonitoredDomains: jest.fn(),
    getRecentPerceptionData: jest.fn(),
    storeCorrelation: jest.fn(),
  }
}));

describe('CorrelationEngine', () => {
  let correlationEngine: CorrelationEngine;
  
  beforeEach(() => {
    correlationEngine = new CorrelationEngine();
    jest.clearAllMocks();
  });

  describe('calculatePerceptionScore', () => {
    it('should return neutral score for empty responses', () => {
      const score = correlationEngine['calculatePerceptionScore']([]);
      expect(score).toBe(5.0);
    });

    it('should increase score for positive words', () => {
      const responses = [
        { response_text: 'excellent company with great leadership' }
      ];
      const score = correlationEngine['calculatePerceptionScore'](responses);
      expect(score).toBeGreaterThan(5.0);
    });

    it('should decrease score for negative words', () => {
      const responses = [
        { response_text: 'scandal and crisis at this troubled company' }
      ];
      const score = correlationEngine['calculatePerceptionScore'](responses);
      expect(score).toBeLessThan(5.0);
    });

    it('should handle mixed sentiment', () => {
      const responses = [
        { response_text: 'great company but facing some crisis' }
      ];
      const score = correlationEngine['calculatePerceptionScore'](responses);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateCorrelationStrength', () => {
    const mockEvent: NewsEvent = {
      domain: 'test.com',
      event_date: '2024-01-01',
      headline: 'Test scandal',
      event_type: 'scandal',
      sentiment_score: -0.8
    };

    it('should return higher strength for larger score differences', () => {
      const strength1 = correlationEngine['calculateCorrelationStrength'](8.0, 3.0, mockEvent);
      const strength2 = correlationEngine['calculateCorrelationStrength'](8.0, 7.5, mockEvent);
      
      expect(strength1).toBeGreaterThan(strength2);
    });

    it('should factor in event sentiment', () => {
      const neutralEvent = { ...mockEvent, sentiment_score: 0 };
      const negativeEvent = { ...mockEvent, sentiment_score: -0.8 };
      
      const strength1 = correlationEngine['calculateCorrelationStrength'](8.0, 3.0, neutralEvent);
      const strength2 = correlationEngine['calculateCorrelationStrength'](8.0, 3.0, negativeEvent);
      
      expect(strength2).toBeGreaterThan(strength1);
    });

    it('should cap strength at 1.0', () => {
      const strength = correlationEngine['calculateCorrelationStrength'](10.0, 0.0, mockEvent);
      expect(strength).toBeLessThanOrEqual(1.0);
    });

    it('should handle undefined sentiment score', () => {
      const eventWithoutSentiment = { ...mockEvent, sentiment_score: undefined };
      const strength = correlationEngine['calculateCorrelationStrength'](8.0, 3.0, eventWithoutSentiment);
      
      expect(strength).toBeGreaterThanOrEqual(0);
      expect(strength).toBeLessThanOrEqual(1.0);
    });
  });
}); 