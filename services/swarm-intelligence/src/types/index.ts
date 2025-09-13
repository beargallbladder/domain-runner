// 🧠 SWARM INTELLIGENCE TYPES - The Foundation of Legendary AI

export interface SwarmAgent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];
  lastActivity: Date;
  performance: AgentPerformance;
  memory: AgentMemory;
}

export enum AgentType {
  INSIGHT = 'insight',
  COHORT = 'cohort',
  CODE_MAP = 'code_map',
  PROFILER = 'profiler',
  VALIDATOR = 'validator',
  GUARDRAIL = 'guardrail',
  COORDINATOR = 'coordinator',
  LIVE_RECOVERY = 'live_recovery',
  PREDICTIVE = 'predictive',
  CONTEXT_MEMORY = 'context_memory',
  AUTO_FIX = 'auto_fix',
  LEARNING = 'learning',
  CHAOS = 'chaos',
  OPTIMIZATION = 'optimization',
  BUSINESS_INTELLIGENCE = 'business_intelligence'
}

export enum AgentStatus {
  ACTIVE = 'active',
  PROCESSING = 'processing',
  WAITING = 'waiting',
  ERROR = 'error',
  SLEEPING = 'sleeping',
  LEARNING = 'learning'
}

export interface AgentPerformance {
  tasksCompleted: number;
  successRate: number;
  averageResponseTime: number;
  insightsGenerated: number;
  errorsDetected: number;
  improvementsSuggested: number;
}

export interface AgentMemory {
  patterns: PatternMemory[];
  relationships: RelationshipMemory[];
  failures: FailureMemory[];
  successes: SuccessMemory[];
  contextualInsights: ContextualInsight[];
}

export interface PatternMemory {
  id: string;
  pattern: string;
  frequency: number;
  confidence: number;
  domains: string[];
  lastSeen: Date;
  actionable: boolean;
}

export interface RelationshipMemory {
  id: string;
  domainA: string;
  domainB: string;
  relationshipType: RelationshipType;
  strength: number;
  evidence: string[];
  discoveredAt: Date;
  validated: boolean;
}

export enum RelationshipType {
  COMPETITOR = 'competitor',
  PARTNER = 'partner',
  SUPPLIER = 'supplier',
  SUBSTITUTE = 'substitute',
  COMPLEMENTARY = 'complementary',
  ECOSYSTEM = 'ecosystem',
  MARKET_LEADER = 'market_leader',
  DISRUPTOR = 'disruptor'
}

export interface FailureMemory {
  id: string;
  error: string;
  context: any;
  timestamp: Date;
  resolved: boolean;
  solution?: string;
  preventionStrategy?: string;
}

export interface SuccessMemory {
  id: string;
  action: string;
  outcome: string;
  metrics: any;
  timestamp: Date;
  replicable: boolean;
  scalable: boolean;
}

export interface ContextualInsight {
  id: string;
  domain: string;
  insight: string;
  confidence: number;
  evidence: string[];
  actionable: boolean;
  businessValue: BusinessValue;
  timestamp: Date;
}

export enum BusinessValue {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  CRITICAL = 'critical'
}

export interface CompetitiveCohort {
  id: string;
  name: string;
  domains: string[];
  sharedTraits: string[];
  competitiveDynamics: string;
  marketPosition: MarketPosition;
  trends: CohortTrend[];
  threats: string[];
  opportunities: string[];
  lastAnalyzed: Date;
}

export enum MarketPosition {
  LEADER = 'leader',
  CHALLENGER = 'challenger',
  FOLLOWER = 'follower',
  NICHE = 'niche',
  EMERGING = 'emerging',
  DECLINING = 'declining'
}

export interface CohortTrend {
  metric: string;
  direction: TrendDirection;
  magnitude: number;
  timeframe: string;
  confidence: number;
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

export interface SwarmTask {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  assignedAgent: string;
  status: TaskStatus;
  input: any;
  output?: any;
  startTime: Date;
  endTime?: Date;
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
}

export enum TaskType {
  ANALYZE_RELATIONSHIPS = 'analyze_relationships',
  CREATE_COHORTS = 'create_cohorts',
  GENERATE_INSIGHTS = 'generate_insights',
  VALIDATE_DATA = 'validate_data',
  OPTIMIZE_PERFORMANCE = 'optimize_performance',
  DETECT_ANOMALIES = 'detect_anomalies',
  PREDICT_TRENDS = 'predict_trends',
  FIX_ISSUES = 'fix_issues',
  LEARN_PATTERNS = 'learn_patterns',
  GENERATE_REPORTS = 'generate_reports'
}

export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface SwarmIntelligenceMetrics {
  totalAgents: number;
  activeAgents: number;
  tasksCompleted: number;
  insightsGenerated: number;
  relationshipsDiscovered: number;
  cohortsCreated: number;
  issuesFixed: number;
  performanceImprovement: number;
  dataQuality: number;
  systemHealth: number;
}

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface SwarmConfig {
  database: DatabaseConnection;
  agents: AgentConfig[];
  scheduling: SchedulingConfig;
  monitoring: MonitoringConfig;
  intelligence: IntelligenceConfig;
}

export interface AgentConfig {
  type: AgentType;
  enabled: boolean;
  maxConcurrency: number;
  retryPolicy: RetryPolicy;
  memoryLimit: number;
  learningRate: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffTime: number;
}

export interface SchedulingConfig {
  intervalMinutes: number;
  batchSize: number;
  priorityWeights: Record<TaskPriority, number>;
}

export interface MonitoringConfig {
  metricsInterval: number;
  alertThresholds: AlertThresholds;
  dashboardPort: number;
}

export interface AlertThresholds {
  errorRate: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface IntelligenceConfig {
  minConfidenceThreshold: number;
  relationshipStrengthThreshold: number;
  cohortSimilarityThreshold: number;
  insightValidationThreshold: number;
} 