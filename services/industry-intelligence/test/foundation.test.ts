// ============================================================================
// INDUSTRY INTELLIGENCE - FOUNDATIONAL TESTS
// ============================================================================

import { IndustryIntelligenceService } from '../src/IndustryIntelligenceService';

describe('Industry Intelligence Service - Foundation', () => {
  let service: IndustryIntelligenceService;

  beforeAll(async () => {
    service = new IndustryIntelligenceService();
    await service.initialize();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  test('should initialize successfully', () => {
    expect(service).toBeDefined();
    expect(service.getVersion()).toBe('1.0.0');
  });

  test('should have healthy status after initialization', () => {
    const health = service.getHealthStatus();
    expect(health.status).toBe('healthy');
    expect(health.config_loaded).toBe(true);
    expect(health.benchmarks_loaded).toBe(true);
    expect(health.service).toBe('industry-intelligence');
  });

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  test('should load industry configurations', () => {
    const industries = service.getIndustries();
    expect(Object.keys(industries)).toContain('technology');
    expect(Object.keys(industries)).toContain('financial_services');
    expect(Object.keys(industries)).toContain('healthcare');
    expect(Object.keys(industries)).toContain('consumer_goods');
  });

  test('should retrieve specific industry', () => {
    const tech = service.getIndustry('technology');
    expect(tech).toBeDefined();
    expect(tech?.name).toBe('Technology');
    expect(tech?.ai_relevance).toBe('critical');
    expect(tech?.sectors).toContain('ai');
  });

  test('should return null for non-existent industry', () => {
    const nonExistent = service.getIndustry('non_existent_industry');
    expect(nonExistent).toBeNull();
  });

  // ============================================================================
  // JOLT BENCHMARK TESTS
  // ============================================================================

  test('should load JOLT benchmarks', () => {
    const benchmarks = service.getJoltBenchmarks();
    expect(Object.keys(benchmarks)).toContain('facebook_meta');
    expect(Object.keys(benchmarks)).toContain('google_alphabet');
    expect(Object.keys(benchmarks)).toContain('twitter_x');
  });

  test('should identify JOLT domains correctly', () => {
    expect(service.isJoltDomain('facebook.com')).toBe(true);
    expect(service.isJoltDomain('google.com')).toBe(true);
    expect(service.isJoltDomain('twitter.com')).toBe(true);
    expect(service.isJoltDomain('random-domain.com')).toBe(false);
  });

  test('should get JOLT metadata for known domains', () => {
    const facebookMeta = service.getJoltMetadata('facebook.com');
    expect(facebookMeta).toBeDefined();
    expect(facebookMeta?.industry).toBe('technology');
    expect(facebookMeta?.type).toBe('brand_transition');
    expect(facebookMeta?.severity).toBe('high');
  });

  test('should return null for non-JOLT domains', () => {
    const metadata = service.getJoltMetadata('random-domain.com');
    expect(metadata).toBeNull();
  });

  test('should calculate additional prompt counts', () => {
    const facebookPrompts = service.getAdditionalPromptCount('facebook.com');
    const googlePrompts = service.getAdditionalPromptCount('google.com');
    const randomPrompts = service.getAdditionalPromptCount('random-domain.com');

    expect(facebookPrompts).toBeGreaterThan(0);
    expect(googlePrompts).toBeGreaterThan(0);
    expect(randomPrompts).toBe(0);
  });

  // ============================================================================
  // INDUSTRY BENCHMARK TESTS
  // ============================================================================

  test('should load industry benchmarks', () => {
    const benchmarks = service.getIndustryBenchmarks();
    expect(Object.keys(benchmarks)).toContain('technology');
    expect(Object.keys(benchmarks)).toContain('financial_services');
  });

  test('should retrieve specific industry benchmark', () => {
    const techBenchmark = service.getIndustryBenchmark('technology');
    expect(techBenchmark).toBeDefined();
    expect(techBenchmark?.avg_memory_score).toBeGreaterThan(0);
    expect(techBenchmark?.jolt_success_rate).toBeGreaterThan(0);
    expect(techBenchmark?.ai_adaptability).toBe('high');
  });

  // ============================================================================
  // COMPARISON TESTS
  // ============================================================================

  test('should compare domains to benchmarks', () => {
    const comparisons = service.compareToBenchmarks('test-domain.com', 75, 'technology');
    expect(Array.isArray(comparisons)).toBe(true);
    
    if (comparisons.length > 0) {
      expect(comparisons[0]).toHaveProperty('benchmark_name');
      expect(comparisons[0]).toHaveProperty('score_difference');
      expect(comparisons[0]).toHaveProperty('similarity_factors');
      expect(comparisons[0]).toHaveProperty('outcome_prediction');
    }
  });

  test('should return empty array for unknown industry', () => {
    const comparisons = service.compareToBenchmarks('test-domain.com', 75, 'unknown_industry');
    expect(comparisons).toEqual([]);
  });

  // ============================================================================
  // UTILITY TESTS
  // ============================================================================

  test('should track uptime', () => {
    const uptime = service.getUptime();
    expect(uptime).toBeGreaterThanOrEqual(0);
  });

  test('should provide version info', () => {
    const version = service.getVersion();
    expect(version).toBe('1.0.0');
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  test('should handle uninitialized service calls gracefully', () => {
    const uninitializedService = new IndustryIntelligenceService();
    
    expect(() => uninitializedService.getIndustries()).toThrow('not initialized');
    expect(() => uninitializedService.getJoltBenchmarks()).toThrow('not initialized');
  });
}); 