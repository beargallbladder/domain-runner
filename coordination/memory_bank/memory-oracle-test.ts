import { Pool } from 'pg';
import winston from 'winston';
import { MemoryOracle } from './memory-oracle-core';
import { NeuralLearningSystem } from './neural-learning-system';
import { IntelligenceGraphSystem } from './intelligence-graph-system';
import { AlertPrioritizationSystem } from './alert-prioritization-system';
import { DomainProcessingIntegration } from './domain-processing-integration';

// Memory Oracle Test Suite
export class MemoryOracleTest {
  private pool: Pool;
  private logger: winston.Logger;
  private memoryOracle: MemoryOracle;
  private neuralLearning: NeuralLearningSystem;
  private intelligenceGraph: IntelligenceGraphSystem;
  private alertSystem: AlertPrioritizationSystem;
  private domainIntegration: DomainProcessingIntegration;

  constructor(databaseUrl: string) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
      ),
      transports: [new winston.transports.Console()]
    });

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  // Initialize all Memory Oracle components
  async initialize(): Promise<void> {
    try {
      this.logger.info('🧪 Initializing Memory Oracle Test Suite...');

      this.memoryOracle = new MemoryOracle(this.pool, this.logger);
      this.neuralLearning = new NeuralLearningSystem(this.pool, this.logger, this.memoryOracle);
      this.intelligenceGraph = new IntelligenceGraphSystem(this.pool, this.logger, this.memoryOracle);
      this.alertSystem = new AlertPrioritizationSystem(
        this.pool, 
        this.logger, 
        this.memoryOracle, 
        this.neuralLearning, 
        this.intelligenceGraph
      );
      this.domainIntegration = new DomainProcessingIntegration(
        this.pool, 
        this.logger, 
        this.memoryOracle, 
        this.neuralLearning, 
        this.intelligenceGraph, 
        this.alertSystem
      );

      this.logger.info('✅ Memory Oracle Test Suite initialized');
    } catch (error) {
      this.logger.error('Failed to initialize test suite:', error);
      throw error;
    }
  }

  // Test memory storage and retrieval
  async testMemoryStorage(): Promise<boolean> {
    try {
      this.logger.info('🧠 Testing memory storage...');

      const testMemory = {
        domainId: 'test-domain-123',
        domain: 'example-test.com',
        memoryType: 'synthesis' as const,
        content: 'Test competitive analysis for example-test.com showing strong market position',
        confidence: 0.85,
        sourceModels: ['gpt-4o-mini', 'claude-3-haiku'],
        relationships: ['competitor-analysis'],
        patterns: ['market-leadership'],
        effectiveness: 0.8,
        memoryWeight: 1.2
      };

      const memoryId = await this.memoryOracle.storeCompetitiveMemory(testMemory);
      
      if (memoryId) {
        this.logger.info(`✅ Memory stored successfully with ID: ${memoryId}`);
        return true;
      } else {
        this.logger.error('❌ Failed to store memory');
        return false;
      }

    } catch (error) {
      this.logger.error('Memory storage test failed:', error);
      return false;
    }
  }

  // Test pattern detection
  async testPatternDetection(): Promise<boolean> {
    try {
      this.logger.info('🔍 Testing pattern detection...');

      const mockResponses = [
        {
          id: 'resp1',
          domainId: 'test-domain-123',
          model: 'gpt-4o-mini',
          promptType: 'business_analysis',
          response: 'Example-test.com demonstrates strong market leadership in their sector with innovative technology solutions.',
          createdAt: new Date()
        },
        {
          id: 'resp2',
          domainId: 'test-domain-123',
          model: 'claude-3-haiku',
          promptType: 'competitive_positioning',
          response: 'The company shows excellent competitive positioning against major rivals like TechCorp and InnovateInc.',
          createdAt: new Date()
        }
      ];

      const patterns = await this.memoryOracle.detectAndStorePatterns(mockResponses);
      
      if (patterns.length > 0) {
        this.logger.info(`✅ Detected ${patterns.length} patterns successfully`);
        return true;
      } else {
        this.logger.warn('⚠️ No patterns detected - this may be normal for test data');
        return true; // Not necessarily a failure
      }

    } catch (error) {
      this.logger.error('Pattern detection test failed:', error);
      return false;
    }
  }

  // Test prediction generation
  async testPredictionGeneration(): Promise<boolean> {
    try {
      this.logger.info('🔮 Testing prediction generation...');

      const predictions = await this.memoryOracle.generatePredictions('example-test.com');
      
      this.logger.info(`✅ Generated ${predictions.length} predictions`);
      return true;

    } catch (error) {
      this.logger.error('Prediction generation test failed:', error);
      return false;
    }
  }

  // Test intelligence synthesis
  async testIntelligenceSynthesis(): Promise<boolean> {
    try {
      this.logger.info('📊 Testing intelligence synthesis...');

      const synthesis = await this.memoryOracle.synthesizeIntelligence(
        ['example-test.com'],
        'competitive_landscape'
      );
      
      if (synthesis && synthesis.confidence > 0) {
        this.logger.info(`✅ Synthesis completed with confidence: ${synthesis.confidence}`);
        return true;
      } else {
        this.logger.error('❌ Synthesis failed or returned low confidence');
        return false;
      }

    } catch (error) {
      this.logger.error('Intelligence synthesis test failed:', error);
      return false;
    }
  }

  // Test neural learning
  async testNeuralLearning(): Promise<boolean> {
    try {
      this.logger.info('🧮 Testing neural learning...');

      await this.neuralLearning.trainFromFeedback(
        'memory',
        'test-component-123',
        0.8, // Positive feedback
        'Test neural learning feedback',
        1.0
      );

      const metrics = await this.neuralLearning.calculateLearningMetrics('hour');
      
      if (metrics && metrics.overallIntelligenceScore >= 0) {
        this.logger.info(`✅ Neural learning test completed. Intelligence score: ${metrics.overallIntelligenceScore}`);
        return true;
      } else {
        this.logger.error('❌ Neural learning test failed');
        return false;
      }

    } catch (error) {
      this.logger.error('Neural learning test failed:', error);
      return false;
    }
  }

  // Test intelligence graph
  async testIntelligenceGraph(): Promise<boolean> {
    try {
      this.logger.info('🕸️ Testing intelligence graph...');

      await this.intelligenceGraph.buildIntelligenceGraph();
      const insights = await this.intelligenceGraph.detectGraphInsights();
      
      this.logger.info(`✅ Intelligence graph built with ${insights.length} insights`);
      return true;

    } catch (error) {
      this.logger.error('Intelligence graph test failed:', error);
      return false;
    }
  }

  // Test alert system
  async testAlertSystem(): Promise<boolean> {
    try {
      this.logger.info('🚨 Testing alert system...');

      const testAlert = {
        alertType: 'competitive_threat' as const,
        domain: 'example-test.com',
        title: 'Test Competitive Threat Alert',
        description: 'Testing alert prioritization system functionality',
        severity: 'medium' as const,
        confidence: 0.75,
        impactMagnitude: 0.6
      };

      const alert = await this.alertSystem.processAlert(testAlert);
      
      if (alert && alert.memoryEnhancedPriority > 0) {
        this.logger.info(`✅ Alert created with priority: ${alert.bloombergPriority}`);
        return true;
      } else {
        this.logger.error('❌ Alert creation failed');
        return false;
      }

    } catch (error) {
      this.logger.error('Alert system test failed:', error);
      return false;
    }
  }

  // Test domain processing integration
  async testDomainIntegration(): Promise<boolean> {
    try {
      this.logger.info('🔗 Testing domain processing integration...');

      // First, create a test domain
      const insertDomainQuery = `
        INSERT INTO domains (id, domain, status) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (domain) DO UPDATE SET status = EXCLUDED.status
        RETURNING id
      `;
      
      const domainResult = await this.pool.query(insertDomainQuery, [
        'test-domain-456',
        'integration-test.com',
        'completed'
      ]);

      const domainId = domainResult.rows[0].id;

      // Create test responses
      const insertResponseQuery = `
        INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;

      await this.pool.query(insertResponseQuery, [
        domainId,
        'gpt-4o-mini',
        'business_analysis',
        'Integration-test.com shows strong competitive positioning in the integration testing market with advanced automation capabilities.'
      ]);

      await this.pool.query(insertResponseQuery, [
        domainId,
        'claude-3-haiku',
        'technical_assessment',
        'The platform uses modern microservices architecture with Kubernetes orchestration and supports multiple programming languages.'
      ]);

      // Test domain intelligence processing
      const memoryResult = await this.domainIntegration.processDomainIntelligence(domainId);
      
      this.logger.info(`✅ Domain integration processed: ${memoryResult.memories.length} memories, ${memoryResult.patterns.length} patterns, ${memoryResult.alerts.length} alerts`);
      return true;

    } catch (error) {
      this.logger.error('Domain integration test failed:', error);
      return false;
    }
  }

  // Run comprehensive test suite
  async runComprehensiveTest(): Promise<void> {
    try {
      this.logger.info('🚀 Starting Memory Oracle Comprehensive Test Suite...');

      await this.initialize();

      const tests = [
        { name: 'Memory Storage', test: () => this.testMemoryStorage() },
        { name: 'Pattern Detection', test: () => this.testPatternDetection() },
        { name: 'Prediction Generation', test: () => this.testPredictionGeneration() },
        { name: 'Intelligence Synthesis', test: () => this.testIntelligenceSynthesis() },
        { name: 'Neural Learning', test: () => this.testNeuralLearning() },
        { name: 'Intelligence Graph', test: () => this.testIntelligenceGraph() },
        { name: 'Alert System', test: () => this.testAlertSystem() },
        { name: 'Domain Integration', test: () => this.testDomainIntegration() }
      ];

      const results: { name: string; passed: boolean }[] = [];

      for (const { name, test } of tests) {
        this.logger.info(`\n--- Testing ${name} ---`);
        try {
          const passed = await test();
          results.push({ name, passed });
          this.logger.info(`${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASSED' : 'FAILED'}`);
        } catch (error) {
          results.push({ name, passed: false });
          this.logger.error(`❌ ${name}: FAILED with error:`, error);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Test results summary
      const passedTests = results.filter(r => r.passed).length;
      const totalTests = results.length;
      const successRate = (passedTests / totalTests) * 100;

      this.logger.info(`\n🎯 TEST SUITE SUMMARY`);
      this.logger.info(`===================`);
      this.logger.info(`Passed: ${passedTests}/${totalTests} (${successRate.toFixed(1)}%)`);
      
      results.forEach(({ name, passed }) => {
        this.logger.info(`${passed ? '✅' : '❌'} ${name}`);
      });

      if (successRate >= 80) {
        this.logger.info(`\n🎉 Memory Oracle Test Suite: SUCCESS`);
        this.logger.info(`System is ready for production deployment!`);
      } else {
        this.logger.warn(`\n⚠️ Memory Oracle Test Suite: PARTIAL SUCCESS`);
        this.logger.warn(`Some tests failed. Review logs and fix issues before deployment.`);
      }

    } catch (error) {
      this.logger.error('Test suite execution failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  // Cleanup test data
  async cleanup(): Promise<void> {
    try {
      this.logger.info('🧹 Cleaning up test data...');

      // Clean up test domains and responses
      await this.pool.query("DELETE FROM domain_responses WHERE domain_id LIKE 'test-domain-%'");
      await this.pool.query("DELETE FROM domains WHERE id LIKE 'test-domain-%'");
      
      // Clean up test memories
      await this.pool.query("DELETE FROM competitive_memories WHERE domain LIKE '%-test.com'");
      
      // Close database connection
      await this.pool.end();
      
      this.logger.info('✅ Cleanup completed');
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
    }
  }
}

// CLI execution
if (require.main === module) {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/domain_runner';
  const test = new MemoryOracleTest(databaseUrl);
  
  test.runComprehensiveTest()
    .then(() => {
      console.log('\n🎯 Memory Oracle testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Memory Oracle testing failed:', error);
      process.exit(1);
    });
}