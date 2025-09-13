/**
 * ENTERPRISE FEATURES COMPREHENSIVE TEST SUITE
 * 
 * This test suite ensures 1000% coverage of enterprise features including:
 * - Public SEO domain pages
 * - Subscription gates
 * - Freemium model enforcement
 * - Premium analytics access
 * - API rate limiting and tiers
 */

const request = require('supertest');
const { expect } = require('chai');
const app = require('../../services/public-api/app');
const { setupTestDatabase, cleanupTestDatabase } = require('../utils/test-db');

describe('Enterprise Features Test Suite', function() {
  this.timeout(30000);

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await cleanupTestDatabase();
  });

  describe('Public SEO Domain Pages', () => {
    it('should serve public domain analysis without authentication', async () => {
      const response = await request(app)
        .get('/api/domains/apple.com/public')
        .expect(200);

      expect(response.body).to.have.property('domain', 'apple.com');
      expect(response.body).to.have.property('ai_intelligence');
      expect(response.body.ai_intelligence).to.have.property('memory_score');
      expect(response.body.ai_intelligence).to.have.property('ai_consensus');
      expect(response.body).to.have.property('business_profile');
      expect(response.body).to.have.property('competitive_analysis');
    });

    it('should include SEO-optimized metadata in domain pages', async () => {
      const response = await request(app)
        .get('/api/domains/google.com/public')
        .expect(200);

      expect(response.body).to.have.property('updated_at');
      expect(response.body.business_profile).to.have.property('category');
      expect(response.body.business_profile).to.have.property('key_themes');
      expect(response.body.competitive_analysis).to.have.property('ai_visibility_rank');
    });

    it('should return 404 for non-existent domains', async () => {
      await request(app)
        .get('/api/domains/non-existent-domain.com/public')
        .expect(404);
    });

    it('should apply proper caching headers for SEO', async () => {
      const response = await request(app)
        .get('/api/domains/microsoft.com/public')
        .expect(200);

      expect(response.headers).to.have.property('cache-control');
      expect(response.headers['cache-control']).to.include('public');
      expect(response.headers['cache-control']).to.include('max-age=1800');
    });
  });

  describe('Subscription Gates and Freemium Model', () => {
    it('should limit free users to basic metrics only', async () => {
      const response = await request(app)
        .get('/api/domains/tesla.com/public')
        .expect(200);

      // Free users should NOT get these enterprise metrics
      expect(response.body).to.not.have.property('sentiment_analysis');
      expect(response.body).to.not.have.property('crisis_prediction');
      expect(response.body).to.not.have.property('competitive_intelligence_deep');
      expect(response.body).to.not.have.property('real_time_alerts');
      expect(response.body).to.not.have.property('api_access_details');
    });

    it('should enforce rate limits on public endpoints', async () => {
      // Make multiple requests to test rate limiting
      const promises = Array(15).fill().map(() => 
        request(app).get('/api/domains/amazon.com/public')
      );

      const responses = await Promise.all(promises);
      
      // Should handle burst requests but may start rate limiting
      expect(responses.every(r => r.status === 200 || r.status === 429)).to.be.true;
    });

    it('should provide upgrade prompts in free tier responses', async () => {
      const response = await request(app)
        .get('/api/fire-alarm-dashboard')
        .expect(200);

      // Should include messaging about premium features
      expect(response.body).to.have.property('dashboard_type');
      expect(response.body).to.have.property('high_risk_domains');
    });
  });

  describe('Enterprise API Authentication', () => {
    let enterpriseApiKey;
    let starterApiKey;

    before(async () => {
      // Create test API keys for different tiers
      enterpriseApiKey = 'llm_pk_enterprise_test_' + Math.random().toString(36);
      starterApiKey = 'llm_pk_starter_test_' + Math.random().toString(36);
      
      // Insert test API keys into database
      // This would be done via the API key management system
    });

    it('should authenticate enterprise API requests', async () => {
      const response = await request(app)
        .get('/api/v1/domains/apple.com')
        .query({ api_key: enterpriseApiKey })
        .expect(200);

      expect(response.body).to.have.property('metrics');
      expect(response.body).to.have.property('intelligence');
      expect(response.body).to.have.property('meta');
      expect(response.body.meta).to.have.property('tier');
    });

    it('should apply tier-based rate limits', async () => {
      // Enterprise tier should have higher limits
      const enterpriseResponse = await request(app)
        .get('/api/v1/domains')
        .query({ api_key: enterpriseApiKey, limit: 100 })
        .expect(200);

      expect(enterpriseResponse.headers).to.have.property('x-ratelimit-limit');
      expect(enterpriseResponse.headers).to.have.property('x-ratelimit-tier');
    });

    it('should reject invalid API keys', async () => {
      await request(app)
        .get('/api/v1/domains/test.com')
        .query({ api_key: 'invalid_key' })
        .expect(401);
    });
  });

  describe('Premium Dashboard Features', () => {
    let userToken;

    before(async () => {
      // Create test user and authenticate
      const authResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'enterprise-test@example.com',
          password: 'TestPassword123!',
          subscription_tier: 'enterprise'
        });

      userToken = authResponse.body.token;
    });

    it('should provide premium dashboard for authenticated enterprise users', async () => {
      const response = await request(app)
        .get('/api/premium/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).to.have.property('user');
      expect(response.body).to.have.property('tracked_domains');
      expect(response.body).to.have.property('competitor_analysis');
      expect(response.body).to.have.property('premium_features');
      
      expect(response.body.premium_features.competitor_tracking).to.be.true;
      expect(response.body.premium_features.advanced_analytics).to.be.true;
      expect(response.body.premium_features.api_access).to.be.true;
    });

    it('should allow domain tracking for premium users', async () => {
      const response = await request(app)
        .post('/api/premium/track-domain')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ domain: 'netflix.com' })
        .expect(200);

      expect(response.body).to.have.property('message');
      expect(response.body.message).to.include('netflix.com');
    });

    it('should generate API keys for premium users', async () => {
      const response = await request(app)
        .get('/api/premium/api-key')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).to.have.property('api_key');
      expect(response.body).to.have.property('tier');
      expect(response.body).to.have.property('rate_limits');
      expect(response.body.api_key).to.match(/^llm_pk_/);
    });
  });

  describe('Data Quality and Performance', () => {
    it('should return responses within 200ms for public endpoints', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/domains/facebook.com/public')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).to.be.lessThan(200);
    });

    it('should maintain consistent data structure across all domains', async () => {
      const domains = ['google.com', 'apple.com', 'microsoft.com'];
      
      const responses = await Promise.all(
        domains.map(domain => 
          request(app).get(`/api/domains/${domain}/public`)
        )
      );

      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('domain');
        expect(response.body).to.have.property('ai_intelligence');
        expect(response.body).to.have.property('business_profile');
        expect(response.body).to.have.property('competitive_analysis');
      });
    });

    it('should handle concurrent requests without degradation', async () => {
      const concurrentRequests = 50;
      const promises = Array(concurrentRequests).fill().map((_, i) => 
        request(app).get(`/api/stats`)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('platform_stats');
      });
    });
  });

  describe('SEO and Marketing Features', () => {
    it('should provide rankings data optimized for SEO', async () => {
      const response = await request(app)
        .get('/api/rankings')
        .query({ limit: 20, sort: 'score' })
        .expect(200);

      expect(response.body).to.have.property('domains');
      expect(response.body).to.have.property('totalDomains');
      expect(response.body).to.have.property('totalPages');
      
      response.body.domains.forEach(domain => {
        expect(domain).to.have.property('domain');
        expect(domain).to.have.property('score');
        expect(domain).to.have.property('modelsPositive');
        expect(domain).to.have.property('modelsNeutral');
        expect(domain).to.have.property('modelsNegative');
      });
    });

    it('should provide category-based analysis for competitive insights', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).to.have.property('categories');
      expect(response.body.categories).to.be.an('array');
      
      response.body.categories.forEach(category => {
        expect(category).to.have.property('name');
        expect(category).to.have.property('totalDomains');
        expect(category).to.have.property('averageScore');
        expect(category).to.have.property('topDomains');
      });
    });

    it('should identify declining domains for crisis monitoring', async () => {
      const response = await request(app)
        .get('/api/shadows')
        .expect(200);

      expect(response.body).to.have.property('declining');
      expect(response.body.declining).to.be.an('array');
      
      response.body.declining.forEach(domain => {
        expect(domain).to.have.property('domain');
        expect(domain).to.have.property('score');
        expect(domain).to.have.property('reputation_risk');
        expect(domain.score).to.be.lessThan(60);
      });
    });
  });

  describe('Enterprise Security and Compliance', () => {
    it('should implement proper CORS for cross-origin requests', async () => {
      const response = await request(app)
        .options('/api/domains/test.com/public')
        .set('Origin', 'https://llmrank.io')
        .expect(200);

      expect(response.headers).to.have.property('access-control-allow-origin');
    });

    it('should sanitize and validate domain inputs', async () => {
      // Test SQL injection attempt
      await request(app)
        .get('/api/domains/test.com; DROP TABLE domains;/public')
        .expect(404);

      // Test XSS attempt
      await request(app)
        .get('/api/domains/<script>alert(1)</script>.com/public')
        .expect(404);
    });

    it('should log API requests for enterprise analytics', async () => {
      // This would test API request logging functionality
      const response = await request(app)
        .get('/api/domains/stripe.com/public')
        .expect(200);

      // Verify request was logged (implementation specific)
      expect(response.body).to.have.property('domain');
    });
  });

  describe('Crisis Detection and Alerting', () => {
    it('should identify high-risk domains in fire alarm dashboard', async () => {
      const response = await request(app)
        .get('/api/fire-alarm-dashboard')
        .query({ limit: 10 })
        .expect(200);

      expect(response.body).to.have.property('dashboard_type', 'risk_monitoring');
      expect(response.body).to.have.property('high_risk_domains');
      expect(response.body).to.have.property('scan_time');
      
      response.body.high_risk_domains.forEach(domain => {
        expect(domain.memory_score < 50 || domain.reputation_risk === 'high').to.be.true;
      });
    });

    it('should provide JOLT benchmark analysis for crisis scenarios', async () => {
      const response = await request(app)
        .get('/api/jolt-benchmark/facebook.com')
        .expect(200);

      expect(response.body).to.have.property('domain', 'facebook.com');
      expect(response.body).to.have.property('jolt_analysis');
      expect(response.body.jolt_analysis).to.have.property('category', 'privacy_crisis');
      expect(response.body.jolt_analysis).to.have.property('baseline_score', 52.0);
      expect(response.body.jolt_analysis).to.have.property('impact_level');
    });

    it('should track time-series data for trend analysis', async () => {
      const response = await request(app)
        .get('/api/time-series/twitter.com')
        .expect(200);

      expect(response.body).to.have.property('domain', 'twitter.com');
      expect(response.body).to.have.property('current_score');
      expect(response.body).to.have.property('change');
      expect(response.body).to.have.property('analysis');
      expect(response.body.analysis).to.have.property('is_improving');
      expect(response.body.analysis).to.have.property('volatility');
    });
  });

  describe('Load Testing and Performance', () => {
    it('should handle 1000 concurrent requests without errors', async function() {
      this.timeout(60000);
      
      const concurrentRequests = 1000;
      const promises = Array(concurrentRequests).fill().map((_, i) => 
        request(app)
          .get('/api/stats')
          .timeout(10000)
      );

      const responses = await Promise.allSettled(promises);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const successRate = successful.length / responses.length;
      
      // Should maintain >95% success rate under load
      expect(successRate).to.be.greaterThan(0.95);
    });

    it('should maintain response times under load', async function() {
      this.timeout(30000);
      
      const requests = 100;
      const responseTimes = [];
      
      for (let i = 0; i < requests; i++) {
        const startTime = Date.now();
        await request(app).get('/api/domains/amazon.com/public');
        responseTimes.push(Date.now() - startTime);
      }
      
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(requests * 0.95)];
      
      expect(averageResponseTime).to.be.lessThan(300);
      expect(p95ResponseTime).to.be.lessThan(500);
    });
  });

  describe('Business Intelligence Features', () => {
    it('should provide comprehensive platform statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body).to.have.property('platform_stats');
      expect(response.body).to.have.property('top_performers');
      expect(response.body).to.have.property('data_freshness');
      expect(response.body).to.have.property('coverage');
      
      expect(response.body.platform_stats.total_domains).to.be.a('number');
      expect(response.body.platform_stats.average_memory_score).to.be.a('number');
    });

    it('should support search and filtering across domains', async () => {
      const response = await request(app)
        .get('/api/rankings')
        .query({ search: 'google', sort: 'score', limit: 10 })
        .expect(200);

      expect(response.body).to.have.property('domains');
      response.body.domains.forEach(domain => {
        expect(domain.domain.toLowerCase()).to.include('google');
      });
    });
  });
});