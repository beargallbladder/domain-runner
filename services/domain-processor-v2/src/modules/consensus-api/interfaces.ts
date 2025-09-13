/**
 * LLM Consensus API Interfaces
 * Single API call returns what ALL LLMs think about a domain
 */

import { ProviderTier } from '../../types';

export interface ConsensusRequest {
  domain: string;
  promptType?: 'brand' | 'technical' | 'financial' | 'sentiment' | 'all';
  includeProviders?: string[]; // Specific providers to include
  excludeProviders?: string[]; // Specific providers to exclude
  timeout?: number; // Max time to wait for all responses (ms)
  includeMetadata?: boolean; // Include detailed metadata
  realtime?: boolean; // Force fresh responses vs cached
}

export interface ConsensusResponse {
  domain: string;
  timestamp: string;
  consensusScore: number; // 0-100 representing agreement level
  aggregatedContent: {
    summary: string;
    keyThemes: string[];
    sentiment: SentimentAnalysis;
    technicalCapabilities?: string[];
    marketPosition?: string;
    risks?: string[];
    opportunities?: string[];
  };
  providers: ProviderResponse[];
  metadata: ConsensusMetadata;
  memoryDrift?: MemoryDriftIndicator;
}

export interface ProviderResponse {
  provider: string;
  model: string;
  status: 'success' | 'failed' | 'timeout';
  content?: string;
  sentiment?: number; // -1 to 1
  confidence?: number; // 0 to 1
  responseTime: number;
  error?: string;
  divergenceScore?: number; // How much this differs from consensus
}

export interface SentimentAnalysis {
  overall: number; // -1 to 1
  breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  consensus: 'strong' | 'moderate' | 'weak' | 'mixed';
}

export interface ConsensusMetadata {
  totalProviders: number;
  successfulResponses: number;
  failedResponses: number;
  averageResponseTime: number;
  consensusStrength: 'unanimous' | 'strong' | 'moderate' | 'weak' | 'divergent';
  processingTime: number;
  cacheStatus: 'hit' | 'miss' | 'partial';
  version: string;
}

export interface MemoryDriftIndicator {
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  driftScore: number; // 0-100
  affectedProviders: string[];
  lastKnownAccurate?: string; // ISO date
  suggestedAction?: 'monitor' | 'refresh' | 'investigate' | 'urgent';
}

export interface ConsensusCache {
  key: string;
  domain: string;
  response: ConsensusResponse;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}

export interface ConsensusEngine {
  getConsensus(request: ConsensusRequest): Promise<ConsensusResponse>;
  getProviderStatuses(): Promise<Map<string, ProviderStatus>>;
  invalidateCache(domain: string): Promise<void>;
  getConsensusHistory(domain: string, limit?: number): Promise<ConsensusResponse[]>;
  subscribeToUpdates(domain: string, callback: (response: ConsensusResponse) => void): void;
  unsubscribe(domain: string, callback: Function): void;
}

export interface ProviderStatus {
  provider: string;
  available: boolean;
  healthScore: number;
  lastSuccess?: Date;
  lastError?: string;
  averageResponseTime: number;
  reliabilityScore: number; // 0-100
}

export interface ConsensusWebSocketMessage {
  type: 'consensus:update' | 'consensus:drift' | 'consensus:error' | 'consensus:status';
  domain?: string;
  data: any;
  timestamp: string;
}

export interface ConsensusAPIConfig {
  maxConcurrentRequests: number;
  defaultTimeout: number;
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
  driftDetectionEnabled: boolean;
  driftThreshold: number; // 0-100
  realtimeUpdates: boolean;
  providers: {
    [key: string]: {
      enabled: boolean;
      weight?: number; // Weight in consensus calculation
      timeout?: number; // Provider-specific timeout
    };
  };
}