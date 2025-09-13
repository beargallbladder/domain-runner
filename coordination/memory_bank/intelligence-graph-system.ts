import { Pool } from 'pg';
import winston from 'winston';
import { MemoryOracle, CompetitiveMemory, PatternMemory, RelationshipMemory } from './memory-oracle-core';

export interface IntelligenceNode {
  id: string;
  nodeType: 'domain' | 'pattern' | 'prediction' | 'synthesis' | 'market_segment' | 'technology' | 'brand_position';
  entityId: string;
  label: string;
  properties: Record<string, any>;
  confidence: number;
  importance: number;
  lastUpdated: Date;
  connections: string[];
}

export interface IntelligenceEdge {
  id: string;
  sourceId: string;
  targetId: string;
  edgeType: 'competitor' | 'influences' | 'predicts' | 'correlates' | 'conflicts' | 'supports' | 'evolves_to';
  strength: number;
  confidence: number;
  direction: 'directed' | 'undirected';
  properties: Record<string, any>;
  discovered: Date;
  lastValidated: Date;
  evidenceCount: number;
}

export interface GraphCluster {
  id: string;
  clusterType: 'competitive_group' | 'market_niche' | 'technology_stack' | 'brand_family' | 'threat_vector';
  nodes: string[];
  centralNode: string;
  cohesionScore: number;
  influence: number;
  properties: Record<string, any>;
}

export interface GraphPath {
  path: string[];
  pathType: 'competitive_threat' | 'market_opportunity' | 'technology_flow' | 'influence_chain';
  strength: number;
  confidence: number;
  significance: number;
}

export interface GraphInsight {
  id: string;
  insightType: 'emerging_cluster' | 'weakening_connection' | 'new_pathway' | 'anomaly' | 'trend_shift';
  description: string;
  affectedNodes: string[];
  affectedEdges: string[];
  confidence: number;
  actionability: number;
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  discoveredAt: Date;
}

export class IntelligenceGraphSystem {
  private pool: Pool;
  private logger: winston.Logger;
  private memoryOracle: MemoryOracle;
  private nodeCache: Map<string, IntelligenceNode> = new Map();
  private edgeCache: Map<string, IntelligenceEdge> = new Map();
  private clusterCache: Map<string, GraphCluster> = new Map();

  constructor(pool: Pool, logger: winston.Logger, memoryOracle: MemoryOracle) {
    this.pool = pool;
    this.logger = logger;
    this.memoryOracle = memoryOracle;
    this.initializeGraphTables();
    this.startGraphAnalysisCycle();
  }

  private async initializeGraphTables() {
    const graphSchema = `
      -- Intelligence graph nodes
      CREATE TABLE IF NOT EXISTS intelligence_nodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        node_type TEXT NOT NULL CHECK (node_type IN ('domain', 'pattern', 'prediction', 'synthesis', 'market_segment', 'technology', 'brand_position')),
        entity_id TEXT NOT NULL,
        label TEXT NOT NULL,
        properties JSONB DEFAULT '{}',
        confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
        importance FLOAT DEFAULT 0.5,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        connections TEXT[],
        UNIQUE(node_type, entity_id)
      );

      -- Intelligence graph edges
      CREATE TABLE IF NOT EXISTS intelligence_edges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id UUID REFERENCES intelligence_nodes(id),
        target_id UUID REFERENCES intelligence_nodes(id),
        edge_type TEXT NOT NULL CHECK (edge_type IN ('competitor', 'influences', 'predicts', 'correlates', 'conflicts', 'supports', 'evolves_to')),
        strength FLOAT CHECK (strength >= 0 AND strength <= 1),
        confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
        direction TEXT CHECK (direction IN ('directed', 'undirected')) DEFAULT 'directed',
        properties JSONB DEFAULT '{}',
        discovered TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_validated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        evidence_count INTEGER DEFAULT 1,
        UNIQUE(source_id, target_id, edge_type)
      );

      -- Graph clusters for competitive analysis
      CREATE TABLE IF NOT EXISTS graph_clusters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cluster_type TEXT NOT NULL CHECK (cluster_type IN ('competitive_group', 'market_niche', 'technology_stack', 'brand_family', 'threat_vector')),
        nodes TEXT[],
        central_node UUID REFERENCES intelligence_nodes(id),
        cohesion_score FLOAT CHECK (cohesion_score >= 0 AND cohesion_score <= 1),
        influence FLOAT DEFAULT 0.5,
        properties JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Graph insights for strategic intelligence
      CREATE TABLE IF NOT EXISTS graph_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        insight_type TEXT NOT NULL CHECK (insight_type IN ('emerging_cluster', 'weakening_connection', 'new_pathway', 'anomaly', 'trend_shift')),
        description TEXT NOT NULL,
        affected_nodes TEXT[],
        affected_edges TEXT[],
        confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
        actionability FLOAT CHECK (actionability >= 0 AND actionability <= 1),
        timeframe TEXT CHECK (timeframe IN ('immediate', 'short_term', 'medium_term', 'long_term')),
        discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        validated BOOLEAN DEFAULT false,
        impact_score FLOAT DEFAULT 0.5
      );

      -- Graph evolution tracking
      CREATE TABLE IF NOT EXISTS graph_evolution (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evolution_type TEXT NOT NULL CHECK (evolution_type IN ('node_added', 'edge_added', 'cluster_formed', 'cluster_dissolved', 'strength_changed')),
        entity_id TEXT NOT NULL,
        old_state JSONB,
        new_state JSONB,
        change_magnitude FLOAT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        trigger_event TEXT
      );

      -- Graph analytics cache
      CREATE TABLE IF NOT EXISTS graph_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_name TEXT NOT NULL,
        metric_value FLOAT NOT NULL,
        scope TEXT NOT NULL, -- 'global', 'cluster', 'node', 'edge'
        scope_id TEXT,
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        validity_period INTERVAL DEFAULT INTERVAL '1 hour'
      );

      -- Indexes for graph performance
      CREATE INDEX IF NOT EXISTS idx_intelligence_nodes_type ON intelligence_nodes(node_type);
      CREATE INDEX IF NOT EXISTS idx_intelligence_nodes_importance ON intelligence_nodes(importance DESC);
      CREATE INDEX IF NOT EXISTS idx_intelligence_edges_source ON intelligence_edges(source_id);
      CREATE INDEX IF NOT EXISTS idx_intelligence_edges_target ON intelligence_edges(target_id);
      CREATE INDEX IF NOT EXISTS idx_intelligence_edges_type ON intelligence_edges(edge_type);
      CREATE INDEX IF NOT EXISTS idx_intelligence_edges_strength ON intelligence_edges(strength DESC);
      CREATE INDEX IF NOT EXISTS idx_graph_clusters_type ON graph_clusters(cluster_type);
      CREATE INDEX IF NOT EXISTS idx_graph_insights_type ON graph_insights(insight_type);
      CREATE INDEX IF NOT EXISTS idx_graph_insights_confidence ON graph_insights(confidence DESC);
      CREATE INDEX IF NOT EXISTS idx_graph_evolution_timestamp ON graph_evolution(timestamp DESC);
    `;

    try {
      await this.pool.query(graphSchema);
      this.logger.info('🕸️ Intelligence Graph System: Database schema initialized');
    } catch (error) {
      this.logger.error('Failed to initialize graph schema:', error);
      throw error;
    }
  }

  // Build comprehensive intelligence graph from memory data
  async buildIntelligenceGraph(): Promise<void> {
    try {
      this.logger.info('🏗️ Building comprehensive intelligence graph...');

      // Create nodes from domains, patterns, and memories
      await this.createDomainNodes();
      await this.createPatternNodes();
      await this.createPredictionNodes();
      await this.createSynthesisNodes();

      // Create edges from relationships and correlations
      await this.createCompetitiveEdges();
      await this.createInfluenceEdges();
      await this.createCorrelationEdges();
      await this.createPredictionEdges();

      // Analyze graph structure
      await this.analyzeClusters();
      await this.calculateNodeImportance();
      await this.detectGraphInsights();

      this.logger.info('✅ Intelligence graph construction completed');

    } catch (error) {
      this.logger.error('Failed to build intelligence graph:', error);
      throw error;
    }
  }

  // Create domain nodes from the domains table
  private async createDomainNodes(): Promise<void> {
    const query = `
      SELECT d.id, d.domain, d.cohort, d.is_jolt, d.jolt_type,
             COUNT(dr.id) as response_count,
             AVG(CASE WHEN dr.response IS NOT NULL THEN 1.0 ELSE 0.0 END) as completeness
      FROM domains d
      LEFT JOIN domain_responses dr ON d.id = dr.domain_id
      GROUP BY d.id, d.domain, d.cohort, d.is_jolt, d.jolt_type
    `;

    const result = await this.pool.query(query);

    for (const row of result.rows) {
      const properties = {
        cohort: row.cohort,
        isJolt: row.is_jolt,
        joltType: row.jolt_type,
        responseCount: row.response_count,
        completeness: row.completeness
      };

      const importance = this.calculateDomainImportance(row);
      const confidence = Math.min(row.completeness, 1.0);

      await this.createOrUpdateNode('domain', row.id, row.domain, properties, confidence, importance);
    }

    this.logger.info(`📍 Created domain nodes`);
  }

  // Create pattern nodes from pattern memories
  private async createPatternNodes(): Promise<void> {
    const query = `SELECT * FROM pattern_memories ORDER BY effectiveness DESC`;
    const result = await this.pool.query(query);

    for (const row of result.rows) {
      const properties = {
        patternType: row.pattern_type,
        occurrences: row.occurrences,
        effectiveness: row.effectiveness,
        trendDirection: row.trend_direction,
        domains: row.domains
      };

      const importance = row.effectiveness * (1 + Math.log(row.occurrences + 1) / 10);
      
      await this.createOrUpdateNode('pattern', row.id, row.pattern, properties, row.confidence, importance);
    }

    this.logger.info(`🔍 Created pattern nodes`);
  }

  // Create prediction nodes from prediction memories
  private async createPredictionNodes(): Promise<void> {
    const query = `SELECT * FROM prediction_memories ORDER BY confidence DESC`;
    const result = await this.pool.query(query);

    for (const row of result.rows) {
      const properties = {
        predictionType: row.prediction_type,
        targetDomain: row.target_domain,
        timeframe: row.timeframe,
        accuracy: row.accuracy,
        outcome: row.outcome,
        basedOnPatterns: row.based_on_patterns
      };

      const importance = row.confidence * (row.accuracy || 0.5);
      
      await this.createOrUpdateNode('prediction', row.id, row.prediction, properties, row.confidence, importance);
    }

    this.logger.info(`🔮 Created prediction nodes`);
  }

  // Create synthesis nodes from synthesis memories
  private async createSynthesisNodes(): Promise<void> {
    const query = `SELECT * FROM synthesis_memories ORDER BY confidence DESC`;
    const result = await this.pool.query(query);

    for (const row of result.rows) {
      const properties = {
        synthesisType: row.synthesis_type,
        involvedDomains: row.involved_domains,
        sourceMemories: row.source_memories,
        bloombergRating: row.bloomberg_rating
      };

      const importance = this.calculateSynthesisImportance(row);
      
      await this.createOrUpdateNode('synthesis', row.id, row.synthesis, properties, row.confidence, importance);
    }

    this.logger.info(`📊 Created synthesis nodes`);
  }

  // Create competitive relationship edges
  private async createCompetitiveEdges(): Promise<void> {
    const query = `
      SELECT rm.*, 
             sn.id as source_node_id, 
             tn.id as target_node_id
      FROM relationship_memories rm
      JOIN intelligence_nodes sn ON rm.source_id = sn.entity_id AND sn.node_type = 'domain'
      JOIN intelligence_nodes tn ON rm.target_id = tn.entity_id AND tn.node_type = 'domain'
      WHERE rm.relationship_type IN ('competitor', 'market_leader', 'follower', 'disruptor')
    `;

    const result = await this.pool.query(query);

    for (const row of result.rows) {
      const properties = {
        relationshipType: row.relationship_type,
        direction: row.direction,
        discovered: row.discovered,
        lastValidated: row.last_validated
      };

      await this.createOrUpdateEdge(
        row.source_node_id,
        row.target_node_id,
        'competitor',
        row.strength,
        row.confidence,
        'directed',
        properties
      );
    }

    this.logger.info(`🤝 Created competitive edges`);
  }

  // Create influence edges from patterns to domains
  private async createInfluenceEdges(): Promise<void> {
    const query = `
      SELECT pm.id as pattern_id, pm.domains, pm.effectiveness, pm.confidence,
             pn.id as pattern_node_id
      FROM pattern_memories pm
      JOIN intelligence_nodes pn ON pm.id = pn.entity_id AND pn.node_type = 'pattern'
      WHERE pm.domains IS NOT NULL AND array_length(pm.domains, 1) > 0
    `;

    const result = await this.pool.query(query);

    for (const row of result.rows) {
      for (const domain of row.domains) {
        const domainNodeQuery = `
          SELECT id FROM intelligence_nodes 
          WHERE node_type = 'domain' AND label = $1
        `;
        const domainResult = await this.pool.query(domainNodeQuery, [domain]);

        if (domainResult.rows.length > 0) {
          const properties = {
            effectiveness: row.effectiveness,
            patternInfluence: true
          };

          await this.createOrUpdateEdge(
            row.pattern_node_id,
            domainResult.rows[0].id,
            'influences',
            row.effectiveness,
            row.confidence,
            'directed',
            properties
          );
        }
      }
    }

    this.logger.info(`💫 Created influence edges`);
  }

  // Create correlation edges from co-occurring patterns
  private async createCorrelationEdges(): Promise<void> {
    // Find patterns that often appear together
    const query = `
      SELECT p1.id as pattern1_id, p2.id as pattern2_id,
             p1n.id as node1_id, p2n.id as node2_id,
             (p1.effectiveness + p2.effectiveness) / 2 as avg_effectiveness,
             (p1.confidence + p2.confidence) / 2 as avg_confidence
      FROM pattern_memories p1
      JOIN pattern_memories p2 ON p1.id < p2.id
      JOIN intelligence_nodes p1n ON p1.id = p1n.entity_id AND p1n.node_type = 'pattern'
      JOIN intelligence_nodes p2n ON p2.id = p2n.entity_id AND p2n.node_type = 'pattern'
      WHERE p1.domains && p2.domains -- Arrays have common elements
      AND array_length(p1.domains & p2.domains, 1) >= 2 -- At least 2 common domains
    `;

    const result = await this.pool.query(query);

    for (const row of result.rows) {
      const commonDomains = await this.getCommonDomains(row.pattern1_id, row.pattern2_id);
      const correlationStrength = Math.min(commonDomains.length / 5, 1); // Max at 5 common domains

      const properties = {
        correlationType: 'pattern_co_occurrence',
        commonDomains: commonDomains.length,
        avgEffectiveness: row.avg_effectiveness
      };

      await this.createOrUpdateEdge(
        row.node1_id,
        row.node2_id,
        'correlates',
        correlationStrength,
        row.avg_confidence,
        'undirected',
        properties
      );
    }

    this.logger.info(`🔗 Created correlation edges`);
  }

  // Create prediction edges from predictions to targets
  private async createPredictionEdges(): Promise<void> {
    const query = `
      SELECT pm.*, 
             pn.id as prediction_node_id,
             dn.id as domain_node_id
      FROM prediction_memories pm
      JOIN intelligence_nodes pn ON pm.id = pn.entity_id AND pn.node_type = 'prediction'
      JOIN intelligence_nodes dn ON pm.target_domain = dn.label AND dn.node_type = 'domain'
    `;

    const result = await this.pool.query(query);

    for (const row of result.rows) {
      const properties = {
        predictionType: row.prediction_type,
        timeframe: row.timeframe,
        accuracy: row.accuracy,
        basedOnPatterns: row.based_on_patterns
      };

      await this.createOrUpdateEdge(
        row.prediction_node_id,
        row.domain_node_id,
        'predicts',
        row.confidence,
        row.confidence,
        'directed',
        properties
      );
    }

    this.logger.info(`🎯 Created prediction edges`);
  }

  // Analyze and identify clusters in the graph
  async analyzeClusters(): Promise<GraphCluster[]> {
    try {
      const clusters: GraphCluster[] = [];

      // Competitive clusters (domains that compete with each other)
      const competitiveClusters = await this.findCompetitiveClusters();
      clusters.push(...competitiveClusters);

      // Pattern clusters (patterns that frequently co-occur)
      const patternClusters = await this.findPatternClusters();
      clusters.push(...patternClusters);

      // Technology clusters (domains with similar technical approaches)
      const techClusters = await this.findTechnologyClusters();
      clusters.push(...techClusters);

      // Store clusters in database
      for (const cluster of clusters) {
        await this.storeCluster(cluster);
      }

      this.logger.info(`🕸️ Analyzed ${clusters.length} graph clusters`);
      return clusters;

    } catch (error) {
      this.logger.error('Failed to analyze clusters:', error);
      throw error;
    }
  }

  // Calculate node importance using PageRank-style algorithm
  async calculateNodeImportance(): Promise<void> {
    try {
      const nodes = await this.getAllNodes();
      const edges = await this.getAllEdges();

      // Simple PageRank implementation
      const importance = new Map<string, number>();
      const damping = 0.85;
      const iterations = 20;

      // Initialize all nodes with equal importance
      for (const node of nodes) {
        importance.set(node.id, 1.0 / nodes.length);
      }

      // Iterative PageRank calculation
      for (let i = 0; i < iterations; i++) {
        const newImportance = new Map<string, number>();

        for (const node of nodes) {
          let sum = 0;
          
          // Sum importance from incoming edges
          for (const edge of edges) {
            if (edge.targetId === node.id) {
              const sourceImportance = importance.get(edge.sourceId) || 0;
              const outgoingEdges = edges.filter(e => e.sourceId === edge.sourceId).length;
              sum += (sourceImportance / outgoingEdges) * edge.strength;
            }
          }

          newImportance.set(node.id, (1 - damping) / nodes.length + damping * sum);
        }

        // Update importance values
        for (const [nodeId, value] of newImportance) {
          importance.set(nodeId, value);
        }
      }

      // Update database with calculated importance
      for (const [nodeId, importanceValue] of importance) {
        await this.updateNodeImportance(nodeId, importanceValue);
      }

      this.logger.info('📊 Calculated node importance using PageRank algorithm');

    } catch (error) {
      this.logger.error('Failed to calculate node importance:', error);
      throw error;
    }
  }

  // Detect strategic insights from graph analysis
  async detectGraphInsights(): Promise<GraphInsight[]> {
    try {
      const insights: GraphInsight[] = [];

      // Detect emerging clusters
      const emergingClusters = await this.detectEmergingClusters();
      insights.push(...emergingClusters);

      // Detect weakening connections
      const weakeningConnections = await this.detectWeakeningConnections();
      insights.push(...weakeningConnections);

      // Detect new pathways
      const newPathways = await this.detectNewPathways();
      insights.push(...newPathways);

      // Detect anomalies
      const anomalies = await this.detectAnomalies();
      insights.push(...anomalies);

      // Store insights
      for (const insight of insights) {
        await this.storeInsight(insight);
      }

      this.logger.info(`💡 Detected ${insights.length} graph insights`);
      return insights;

    } catch (error) {
      this.logger.error('Failed to detect graph insights:', error);
      throw error;
    }
  }

  // Find shortest paths between nodes for strategic analysis
  async findStrategicPaths(
    sourceId: string,
    targetId: string,
    pathType: GraphPath['pathType']
  ): Promise<GraphPath[]> {
    try {
      // Simplified Dijkstra's algorithm implementation
      const paths: GraphPath[] = [];
      const edges = await this.getAllEdges();
      
      // Build adjacency list
      const adjacencyList = new Map<string, { nodeId: string; weight: number; edge: IntelligenceEdge }[]>();
      
      for (const edge of edges) {
        if (!adjacencyList.has(edge.sourceId)) {
          adjacencyList.set(edge.sourceId, []);
        }
        adjacencyList.get(edge.sourceId)!.push({
          nodeId: edge.targetId,
          weight: 1 - edge.strength, // Convert strength to cost
          edge
        });
      }

      // Find shortest path
      const path = this.dijkstra(adjacencyList, sourceId, targetId);
      
      if (path.length > 0) {
        const pathStrength = this.calculatePathStrength(path, edges);
        const pathConfidence = this.calculatePathConfidence(path, edges);
        
        paths.push({
          path,
          pathType,
          strength: pathStrength,
          confidence: pathConfidence,
          significance: pathStrength * pathConfidence
        });
      }

      return paths;

    } catch (error) {
      this.logger.error('Failed to find strategic paths:', error);
      throw error;
    }
  }

  // Get competitive intelligence for a specific domain
  async getCompetitiveIntelligence(domainId: string): Promise<{
    directCompetitors: IntelligenceNode[];
    influencingPatterns: IntelligenceNode[];
    predictions: IntelligenceNode[];
    strategicPaths: GraphPath[];
    clusterMembership: GraphCluster[];
  }> {
    try {
      // Find direct competitors
      const directCompetitors = await this.getDirectCompetitors(domainId);
      
      // Find influencing patterns
      const influencingPatterns = await this.getInfluencingPatterns(domainId);
      
      // Find relevant predictions
      const predictions = await this.getRelevantPredictions(domainId);
      
      // Find strategic paths to key competitors
      const strategicPaths: GraphPath[] = [];
      for (const competitor of directCompetitors.slice(0, 3)) { // Top 3 competitors
        const paths = await this.findStrategicPaths(domainId, competitor.id, 'competitive_threat');
        strategicPaths.push(...paths);
      }
      
      // Find cluster membership
      const clusterMembership = await this.getClusterMembership(domainId);

      return {
        directCompetitors,
        influencingPatterns,
        predictions,
        strategicPaths,
        clusterMembership
      };

    } catch (error) {
      this.logger.error('Failed to get competitive intelligence:', error);
      throw error;
    }
  }

  // Start continuous graph analysis cycle
  private startGraphAnalysisCycle(): void {
    // Rebuild graph every 4 hours
    setInterval(async () => {
      try {
        await this.buildIntelligenceGraph();
        this.logger.info('🔄 Automated graph rebuild completed');
      } catch (error) {
        this.logger.error('Automated graph rebuild failed:', error);
      }
    }, 4 * 60 * 60 * 1000);

    // Analyze insights every hour
    setInterval(async () => {
      try {
        await this.detectGraphInsights();
        this.logger.info('💡 Automated insight detection completed');
      } catch (error) {
        this.logger.error('Automated insight detection failed:', error);
      }
    }, 60 * 60 * 1000);

    this.logger.info('🔄 Graph analysis cycle started');
  }

  // Helper methods (implementations would be more complex in production)
  private async createOrUpdateNode(
    nodeType: IntelligenceNode['nodeType'],
    entityId: string,
    label: string,
    properties: Record<string, any>,
    confidence: number,
    importance: number
  ): Promise<string> {
    const query = `
      INSERT INTO intelligence_nodes (node_type, entity_id, label, properties, confidence, importance)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (node_type, entity_id) 
      DO UPDATE SET 
        label = EXCLUDED.label,
        properties = EXCLUDED.properties,
        confidence = EXCLUDED.confidence,
        importance = EXCLUDED.importance,
        last_updated = CURRENT_TIMESTAMP
      RETURNING id
    `;

    const result = await this.pool.query(query, [nodeType, entityId, label, properties, confidence, importance]);
    return result.rows[0].id;
  }

  private async createOrUpdateEdge(
    sourceId: string,
    targetId: string,
    edgeType: IntelligenceEdge['edgeType'],
    strength: number,
    confidence: number,
    direction: IntelligenceEdge['direction'],
    properties: Record<string, any>
  ): Promise<string> {
    const query = `
      INSERT INTO intelligence_edges (source_id, target_id, edge_type, strength, confidence, direction, properties)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (source_id, target_id, edge_type)
      DO UPDATE SET
        strength = (intelligence_edges.strength + EXCLUDED.strength) / 2,
        confidence = (intelligence_edges.confidence + EXCLUDED.confidence) / 2,
        properties = EXCLUDED.properties,
        last_validated = CURRENT_TIMESTAMP,
        evidence_count = intelligence_edges.evidence_count + 1
      RETURNING id
    `;

    const result = await this.pool.query(query, [sourceId, targetId, edgeType, strength, confidence, direction, properties]);
    return result.rows[0].id;
  }

  private calculateDomainImportance(domainData: any): number {
    let importance = 0.5;
    
    if (domainData.is_jolt) importance += 0.3;
    if (domainData.response_count > 10) importance += 0.2;
    if (domainData.completeness > 0.8) importance += 0.2;
    
    return Math.min(importance, 1.0);
  }

  private calculateSynthesisImportance(synthesis: any): number {
    const ratingScores = { 'A+': 1.0, 'A': 0.9, 'B+': 0.8, 'B': 0.7, 'C': 0.6 };
    const ratingScore = ratingScores[synthesis.bloomberg_rating] || 0.5;
    const domainCount = synthesis.involved_domains?.length || 1;
    
    return Math.min(ratingScore * (1 + Math.log(domainCount) / 10), 1.0);
  }

  // Simplified implementations for helper methods
  private async getCommonDomains(pattern1Id: string, pattern2Id: string): Promise<string[]> {
    // Implementation would find common domains between patterns
    return [];
  }

  private async findCompetitiveClusters(): Promise<GraphCluster[]> {
    // Implementation would use graph clustering algorithms
    return [];
  }

  private async findPatternClusters(): Promise<GraphCluster[]> {
    // Implementation would cluster patterns by co-occurrence
    return [];
  }

  private async findTechnologyClusters(): Promise<GraphCluster[]> {
    // Implementation would cluster by technical similarity
    return [];
  }

  private async storeCluster(cluster: GraphCluster): Promise<void> {
    const query = `
      INSERT INTO graph_clusters (cluster_type, nodes, central_node, cohesion_score, influence, properties)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `;
    
    await this.pool.query(query, [
      cluster.clusterType, cluster.nodes, cluster.centralNode,
      cluster.cohesionScore, cluster.influence, cluster.properties
    ]);
  }

  private async getAllNodes(): Promise<IntelligenceNode[]> {
    const query = `SELECT * FROM intelligence_nodes`;
    const result = await this.pool.query(query);
    return result.rows.map(this.mapToIntelligenceNode);
  }

  private async getAllEdges(): Promise<IntelligenceEdge[]> {
    const query = `SELECT * FROM intelligence_edges`;
    const result = await this.pool.query(query);
    return result.rows.map(this.mapToIntelligenceEdge);
  }

  private async updateNodeImportance(nodeId: string, importance: number): Promise<void> {
    const query = `UPDATE intelligence_nodes SET importance = $1 WHERE id = $2`;
    await this.pool.query(query, [importance, nodeId]);
  }

  private async detectEmergingClusters(): Promise<GraphInsight[]> {
    // Implementation would detect new clustering patterns
    return [];
  }

  private async detectWeakeningConnections(): Promise<GraphInsight[]> {
    // Implementation would detect declining edge strengths
    return [];
  }

  private async detectNewPathways(): Promise<GraphInsight[]> {
    // Implementation would detect new connection patterns
    return [];
  }

  private async detectAnomalies(): Promise<GraphInsight[]> {
    // Implementation would detect unusual graph patterns
    return [];
  }

  private async storeInsight(insight: GraphInsight): Promise<void> {
    const query = `
      INSERT INTO graph_insights (
        insight_type, description, affected_nodes, affected_edges,
        confidence, actionability, timeframe
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    await this.pool.query(query, [
      insight.insightType, insight.description, insight.affectedNodes,
      insight.affectedEdges, insight.confidence, insight.actionability, insight.timeframe
    ]);
  }

  private dijkstra(
    adjacencyList: Map<string, { nodeId: string; weight: number; edge: IntelligenceEdge }[]>,
    start: string,
    end: string
  ): string[] {
    // Simplified Dijkstra implementation
    // In production, would use proper priority queue and handle cycles
    return [];
  }

  private calculatePathStrength(path: string[], edges: IntelligenceEdge[]): number {
    // Calculate aggregate strength along path
    return 0.7;
  }

  private calculatePathConfidence(path: string[], edges: IntelligenceEdge[]): number {
    // Calculate aggregate confidence along path
    return 0.8;
  }

  private async getDirectCompetitors(domainId: string): Promise<IntelligenceNode[]> {
    const query = `
      SELECT n.* FROM intelligence_nodes n
      JOIN intelligence_edges e ON n.id = e.target_id
      WHERE e.source_id = $1 AND e.edge_type = 'competitor'
      ORDER BY e.strength DESC LIMIT 10
    `;
    
    const result = await this.pool.query(query, [domainId]);
    return result.rows.map(this.mapToIntelligenceNode);
  }

  private async getInfluencingPatterns(domainId: string): Promise<IntelligenceNode[]> {
    const query = `
      SELECT n.* FROM intelligence_nodes n
      JOIN intelligence_edges e ON n.id = e.source_id
      WHERE e.target_id = $1 AND e.edge_type = 'influences' AND n.node_type = 'pattern'
      ORDER BY e.strength DESC LIMIT 10
    `;
    
    const result = await this.pool.query(query, [domainId]);
    return result.rows.map(this.mapToIntelligenceNode);
  }

  private async getRelevantPredictions(domainId: string): Promise<IntelligenceNode[]> {
    const query = `
      SELECT n.* FROM intelligence_nodes n
      JOIN intelligence_edges e ON n.id = e.source_id
      WHERE e.target_id = $1 AND e.edge_type = 'predicts' AND n.node_type = 'prediction'
      ORDER BY e.confidence DESC LIMIT 5
    `;
    
    const result = await this.pool.query(query, [domainId]);
    return result.rows.map(this.mapToIntelligenceNode);
  }

  private async getClusterMembership(domainId: string): Promise<GraphCluster[]> {
    const query = `
      SELECT * FROM graph_clusters
      WHERE $1 = ANY(nodes)
      ORDER BY cohesion_score DESC
    `;
    
    const result = await this.pool.query(query, [domainId]);
    return result.rows.map(this.mapToGraphCluster);
  }

  // Mapping functions
  private mapToIntelligenceNode = (row: any): IntelligenceNode => ({
    id: row.id,
    nodeType: row.node_type,
    entityId: row.entity_id,
    label: row.label,
    properties: row.properties || {},
    confidence: row.confidence,
    importance: row.importance,
    lastUpdated: row.last_updated,
    connections: row.connections || []
  });

  private mapToIntelligenceEdge = (row: any): IntelligenceEdge => ({
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    edgeType: row.edge_type,
    strength: row.strength,
    confidence: row.confidence,
    direction: row.direction,
    properties: row.properties || {},
    discovered: row.discovered,
    lastValidated: row.last_validated,
    evidenceCount: row.evidence_count
  });

  private mapToGraphCluster = (row: any): GraphCluster => ({
    id: row.id,
    clusterType: row.cluster_type,
    nodes: row.nodes || [],
    centralNode: row.central_node,
    cohesionScore: row.cohesion_score,
    influence: row.influence,
    properties: row.properties || {}
  });
}