/**
 * Memory Drift Alert System Interfaces
 * Real-time notifications when LLM memories diverge from reality
 */

export interface DriftAlert {
  id: string;
  domain: string;
  severity: DriftSeverity;
  type: DriftType;
  score: number; // 0-100, higher = more drift
  detectedAt: Date;
  affectedProviders: ProviderDrift[];
  realitySnapshot: RealityData;
  memorySnapshot: MemoryData;
  divergenceAnalysis: DivergenceAnalysis;
  recommendedActions: RecommendedAction[];
  status: AlertStatus;
  resolution?: DriftResolution;
}

export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';

export type DriftType = 
  | 'temporal'      // LLM memory is outdated
  | 'factual'       // LLM has incorrect facts
  | 'sentiment'     // LLM sentiment differs from reality
  | 'existence'     // LLM thinks something exists/doesn't exist incorrectly
  | 'relationship'  // LLM has wrong relationships/connections
  | 'capability'    // LLM has wrong understanding of capabilities
  | 'financial'     // LLM has outdated financial information
  | 'personnel'     // LLM has outdated personnel information
  | 'product'       // LLM has outdated product information
  | 'comprehensive' // Multiple types of drift detected;

export type AlertStatus = 'active' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';

export interface ProviderDrift {
  provider: string;
  model: string;
  driftScore: number;
  lastAccurateDate?: Date;
  specificDrifts: SpecificDrift[];
  confidence: number; // How confident we are in the drift detection
}

export interface SpecificDrift {
  type: DriftType;
  description: string;
  llmBelief: string;
  reality: string;
  evidence: string[];
  severity: DriftSeverity;
}

export interface RealityData {
  source: RealitySource;
  timestamp: Date;
  facts: FactualData[];
  confidence: number;
  verificationMethod: string;
}

export type RealitySource = 
  | 'official_website'
  | 'sec_filing'
  | 'press_release'
  | 'news_article'
  | 'social_media'
  | 'api_data'
  | 'verified_database'
  | 'multiple_sources';

export interface FactualData {
  category: string;
  fact: string;
  source: string;
  sourceUrl?: string;
  extractedAt: Date;
  confidence: number;
}

export interface MemoryData {
  aggregatedBelief: string;
  providerBeliefs: Map<string, string>;
  consensusLevel: number; // 0-100, how much providers agree
  extractedAt: Date;
  themes: string[];
}

export interface DivergenceAnalysis {
  primaryDivergence: string; // Main area of drift
  divergencePattern: DivergencePattern;
  timelineAnalysis: TimelineAnalysis;
  impactAssessment: ImpactAssessment;
  correlatedDrifts: string[]; // Other domains with similar drift
}

export type DivergencePattern = 
  | 'gradual_decay'    // Memory slowly becoming outdated
  | 'sudden_shift'     // Abrupt change in reality
  | 'partial_update'   // Some providers updated, others didn't
  | 'complete_miss'    // All providers missed an update
  | 'conflicting'      // Providers have conflicting information
  | 'hallucination';   // Information that never existed

export interface TimelineAnalysis {
  realityChangeDate?: Date;
  firstDriftDetected: Date;
  driftVelocity: number; // Rate of drift increase
  projectedFullDrift?: Date; // When all providers will be wrong
}

export interface ImpactAssessment {
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  affectedQueries: number; // Estimated queries with wrong info
  reputationRisk: number; // 0-100
  financialRisk: number; // 0-100
  legalRisk: number; // 0-100
}

export interface RecommendedAction {
  type: ActionType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  automatable: boolean;
  estimatedTime?: string;
  resources?: string[];
}

export type ActionType = 
  | 'content_update'
  | 'api_correction'
  | 'manual_intervention'
  | 'provider_retraining'
  | 'cache_invalidation'
  | 'public_correction'
  | 'monitoring_increase'
  | 'escalation';

export interface DriftResolution {
  resolvedAt: Date;
  resolvedBy: string;
  method: ResolutionMethod;
  verificationStatus: 'pending' | 'verified' | 'failed';
  notes?: string;
}

export type ResolutionMethod = 
  | 'content_published'
  | 'api_updated'
  | 'provider_refreshed'
  | 'manual_correction'
  | 'auto_corrected'
  | 'false_positive_marked';

export interface DriftMonitoringConfig {
  enabled: boolean;
  checkInterval: number; // ms
  domains: DomainMonitoringConfig[];
  alertChannels: AlertChannel[];
  thresholds: DriftThresholds;
  realitySources: RealitySourceConfig[];
}

export interface DomainMonitoringConfig {
  domain: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  checkFrequency: number; // Override global interval
  specificChecks?: DriftType[]; // Only check certain types
  customThresholds?: Partial<DriftThresholds>;
}

export interface AlertChannel {
  type: 'webhook' | 'email' | 'slack' | 'pagerduty' | 'sms';
  config: any;
  severityFilter?: DriftSeverity[]; // Only send certain severities
  typeFilter?: DriftType[]; // Only send certain types
}

export interface DriftThresholds {
  low: number;    // Score threshold for low severity
  medium: number; // Score threshold for medium severity
  high: number;   // Score threshold for high severity
  critical: number; // Score threshold for critical severity
  consensusThreshold: number; // Min consensus to trust LLM memory
}

export interface RealitySourceConfig {
  type: RealitySource;
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  rateLimit?: number;
  priority: number; // Which source to trust more
}

export interface DriftCheckResult {
  domain: string;
  timestamp: Date;
  driftDetected: boolean;
  driftScore: number;
  alerts: DriftAlert[];
  performanceMetrics: {
    checkDuration: number;
    providersChecked: number;
    realitySourcesUsed: number;
  };
}

export interface DriftAlertEngine {
  // Core monitoring
  checkDomain(domain: string): Promise<DriftCheckResult>;
  checkAllDomains(): Promise<DriftCheckResult[]>;
  
  // Alert management
  getActiveAlerts(): Promise<DriftAlert[]>;
  getAlert(alertId: string): Promise<DriftAlert | null>;
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>;
  resolveAlert(alertId: string, resolution: DriftResolution): Promise<void>;
  
  // Subscription management
  subscribe(channel: AlertChannel): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  
  // Configuration
  updateConfig(config: Partial<DriftMonitoringConfig>): Promise<void>;
  addDomain(config: DomainMonitoringConfig): Promise<void>;
  removeDomain(domain: string): Promise<void>;
  
  // Analytics
  getDriftTrends(domain: string, days: number): Promise<DriftTrend[]>;
  getDriftReport(startDate: Date, endDate: Date): Promise<DriftReport>;
  getMostDriftedDomains(limit: number): Promise<DomainDriftSummary[]>;
  
  // Real-time
  streamAlerts(callback: (alert: DriftAlert) => void): void;
  getEngineStatus(): Promise<EngineStatus>;
}

export interface DriftTrend {
  date: Date;
  averageDriftScore: number;
  alertCount: number;
  topDriftTypes: DriftType[];
  resolutionTime?: number; // Average time to resolve
}

export interface DriftReport {
  period: { start: Date; end: Date };
  totalAlerts: number;
  alertsBySeverity: Record<DriftSeverity, number>;
  alertsByType: Record<DriftType, number>;
  averageDriftScore: number;
  averageResolutionTime: number;
  topDriftedDomains: DomainDriftSummary[];
  providerAccuracy: Record<string, number>;
}

export interface DomainDriftSummary {
  domain: string;
  totalAlerts: number;
  averageDriftScore: number;
  mostCommonDriftType: DriftType;
  lastChecked: Date;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface EngineStatus {
  running: boolean;
  lastCheck: Date;
  nextCheck: Date;
  activeMonitors: number;
  queuedChecks: number;
  recentErrors: string[];
  performance: {
    averageCheckTime: number;
    checksPerHour: number;
    alertsPerHour: number;
  };
}

export interface DriftWebSocketMessage {
  type: 'drift:detected' | 'drift:resolved' | 'drift:updated' | 'status:update';
  data: any;
  timestamp: Date;
}