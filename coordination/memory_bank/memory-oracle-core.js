"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryOracle = void 0;
const crypto_1 = require("crypto");
class MemoryOracle {
    constructor(pool, logger) {
        this.memoryCache = new Map();
        this.patternCache = new Map();
        this.predictionCache = new Map();
        this.pool = pool;
        this.logger = logger;
        this.initializeMemoryTables();
    }
    async initializeMemoryTables() {
        const memorySchema = `
      -- Competitive Memory Storage
      CREATE TABLE IF NOT EXISTS competitive_memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID REFERENCES domains(id),
        domain TEXT NOT NULL,
        memory_type TEXT NOT NULL CHECK (memory_type IN ('pattern', 'prediction', 'relationship', 'synthesis', 'alert')),
        content TEXT NOT NULL,
        confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
        source_models TEXT[],
        relationships TEXT[],
        patterns TEXT[],
        prediction_accuracy FLOAT,
        alert_priority TEXT CHECK (alert_priority IN ('low', 'medium', 'high', 'critical')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        effectiveness FLOAT DEFAULT 0.5,
        memory_weight FLOAT DEFAULT 1.0
      );

      -- Pattern Memory Storage
      CREATE TABLE IF NOT EXISTS pattern_memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pattern_type TEXT NOT NULL CHECK (pattern_type IN ('market_position', 'competitive_threat', 'brand_strategy', 'technical_approach', 'content_strategy')),
        pattern TEXT NOT NULL,
        domains TEXT[],
        confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
        occurrences INTEGER DEFAULT 1,
        effectiveness FLOAT DEFAULT 0.5,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        trend_direction TEXT CHECK (trend_direction IN ('rising', 'stable', 'declining')) DEFAULT 'stable',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Prediction Memory Storage
      CREATE TABLE IF NOT EXISTS prediction_memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prediction_type TEXT NOT NULL CHECK (prediction_type IN ('market_movement', 'competitive_threat', 'brand_shift', 'technical_evolution')),
        prediction TEXT NOT NULL,
        target_domain TEXT NOT NULL,
        confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
        timeframe TEXT CHECK (timeframe IN ('immediate', 'short_term', 'medium_term', 'long_term')),
        accuracy FLOAT,
        outcome TEXT,
        validated_at TIMESTAMP WITH TIME ZONE,
        based_on_patterns TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Relationship Memory Storage
      CREATE TABLE IF NOT EXISTS relationship_memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL CHECK (relationship_type IN ('competitor', 'supplier', 'partner', 'market_leader', 'follower', 'disruptor')),
        strength FLOAT CHECK (strength >= 0 AND strength <= 1),
        direction TEXT CHECK (direction IN ('bidirectional', 'source_to_target', 'target_to_source')),
        discovered TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_validated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1)
      );

      -- Synthesis Memory Storage
      CREATE TABLE IF NOT EXISTS synthesis_memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        synthesis_type TEXT NOT NULL CHECK (synthesis_type IN ('market_analysis', 'competitive_landscape', 'brand_positioning', 'threat_assessment')),
        synthesis TEXT NOT NULL,
        involved_domains TEXT[],
        source_memories TEXT[],
        confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
        bloomberg_rating TEXT CHECK (bloomberg_rating IN ('A+', 'A', 'B+', 'B', 'C')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP WITH TIME ZONE
      );

      -- Memory access tracking for neural learning
      CREATE TABLE IF NOT EXISTS memory_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id UUID NOT NULL,
        memory_type TEXT NOT NULL,
        access_context TEXT,
        effectiveness_feedback FLOAT,
        accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_competitive_memories_domain ON competitive_memories(domain);
      CREATE INDEX IF NOT EXISTS idx_competitive_memories_type ON competitive_memories(memory_type);
      CREATE INDEX IF NOT EXISTS idx_competitive_memories_confidence ON competitive_memories(confidence DESC);
      CREATE INDEX IF NOT EXISTS idx_pattern_memories_type ON pattern_memories(pattern_type);
      CREATE INDEX IF NOT EXISTS idx_pattern_memories_effectiveness ON pattern_memories(effectiveness DESC);
      CREATE INDEX IF NOT EXISTS idx_prediction_memories_target ON prediction_memories(target_domain);
      CREATE INDEX IF NOT EXISTS idx_prediction_memories_accuracy ON prediction_memories(accuracy DESC);
      CREATE INDEX IF NOT EXISTS idx_relationship_memories_source ON relationship_memories(source_id);
      CREATE INDEX IF NOT EXISTS idx_relationship_memories_target ON relationship_memories(target_id);
      CREATE INDEX IF NOT EXISTS idx_synthesis_memories_rating ON synthesis_memories(bloomberg_rating);
    `;
        try {
            await this.pool.query(memorySchema);
            this.logger.info('🧠 Memory Oracle: Database schema initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize memory schema:', error);
            throw error;
        }
    }
    // Store competitive intelligence memory with neural weighting
    async storeCompetitiveMemory(memory) {
        const id = this.generateMemoryId(memory.domain, memory.memoryType, memory.content);
        try {
            const query = `
        INSERT INTO competitive_memories (
          id, domain_id, domain, memory_type, content, confidence, 
          source_models, relationships, patterns, prediction_accuracy, 
          alert_priority, effectiveness, memory_weight
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          confidence = EXCLUDED.confidence,
          updated_at = CURRENT_TIMESTAMP,
          access_count = competitive_memories.access_count + 1,
          effectiveness = (competitive_memories.effectiveness + EXCLUDED.effectiveness) / 2
        RETURNING id
      `;
            const result = await this.pool.query(query, [
                id, memory.domainId, memory.domain, memory.memoryType,
                memory.content, memory.confidence, memory.sourceModels,
                memory.relationships, memory.patterns, memory.predictionAccuracy,
                memory.alertPriority, memory.effectiveness, memory.memoryWeight
            ]);
            // Cache for immediate access
            this.memoryCache.set(id, {
                ...memory,
                id,
                createdAt: new Date(),
                updatedAt: new Date(),
                accessCount: 1,
                lastAccessed: new Date()
            });
            this.logger.info(`🧠 Stored competitive memory: ${memory.memoryType} for ${memory.domain}`);
            return result.rows[0].id;
        }
        catch (error) {
            this.logger.error('Failed to store competitive memory:', error);
            throw error;
        }
    }
    // Neural pattern detection and storage
    async detectAndStorePatterns(domainResponses) {
        const detectedPatterns = [];
        try {
            // Analyze responses for patterns using neural heuristics
            const patterns = await this.analyzeForPatterns(domainResponses);
            for (const pattern of patterns) {
                const id = this.generateMemoryId(pattern.patternType, pattern.pattern);
                const query = `
          INSERT INTO pattern_memories (
            id, pattern_type, pattern, domains, confidence, 
            occurrences, effectiveness, trend_direction
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            occurrences = pattern_memories.occurrences + 1,
            confidence = (pattern_memories.confidence + EXCLUDED.confidence) / 2,
            effectiveness = (pattern_memories.effectiveness + EXCLUDED.effectiveness) / 2,
            last_seen = CURRENT_TIMESTAMP
          RETURNING *
        `;
                const result = await this.pool.query(query, [
                    id, pattern.patternType, pattern.pattern, pattern.domains,
                    pattern.confidence, pattern.occurrences, pattern.effectiveness,
                    pattern.trendDirection
                ]);
                const storedPattern = result.rows[0];
                detectedPatterns.push(this.mapToPatternMemory(storedPattern));
                this.patternCache.set(id, this.mapToPatternMemory(storedPattern));
            }
            this.logger.info(`🔍 Detected and stored ${detectedPatterns.length} patterns`);
            return detectedPatterns;
        }
        catch (error) {
            this.logger.error('Failed to detect patterns:', error);
            throw error;
        }
    }
    // Generate predictions based on pattern history
    async generatePredictions(targetDomain) {
        try {
            // Retrieve relevant patterns for prediction
            const patterns = await this.getRelevantPatterns(targetDomain);
            const predictions = [];
            for (const pattern of patterns) {
                if (pattern.effectiveness > 0.7 && pattern.confidence > 0.6) {
                    const prediction = await this.synthesizePrediction(pattern, targetDomain);
                    const id = this.generateMemoryId(prediction.predictionType, targetDomain, prediction.prediction);
                    const query = `
            INSERT INTO prediction_memories (
              id, prediction_type, prediction, target_domain, confidence,
              timeframe, based_on_patterns
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;
                    const result = await this.pool.query(query, [
                        id, prediction.predictionType, prediction.prediction,
                        prediction.targetDomain, prediction.confidence,
                        prediction.timeframe, prediction.basedOnPatterns
                    ]);
                    const storedPrediction = this.mapToPredictionMemory(result.rows[0]);
                    predictions.push(storedPrediction);
                    this.predictionCache.set(id, storedPrediction);
                }
            }
            this.logger.info(`🔮 Generated ${predictions.length} predictions for ${targetDomain}`);
            return predictions;
        }
        catch (error) {
            this.logger.error('Failed to generate predictions:', error);
            throw error;
        }
    }
    // Validate predictions and update accuracy
    async validatePrediction(predictionId, outcome, accuracy) {
        try {
            const query = `
        UPDATE prediction_memories 
        SET accuracy = $1, outcome = $2, validated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `;
            await this.pool.query(query, [accuracy, outcome, predictionId]);
            // Update neural learning weights based on accuracy
            await this.updateNeuralWeights(predictionId, accuracy);
            this.logger.info(`✅ Validated prediction ${predictionId} with accuracy ${accuracy}`);
        }
        catch (error) {
            this.logger.error('Failed to validate prediction:', error);
            throw error;
        }
    }
    // Bloomberg-style synthesis of competitive intelligence
    async synthesizeIntelligence(domains, synthesisType) {
        try {
            // Gather all relevant memories
            const memories = await this.getMemoriesForDomains(domains);
            const patterns = await this.getPatternsForDomains(domains);
            const relationships = await this.getRelationshipsForDomains(domains);
            // Synthesize using neural correlation
            const synthesis = await this.performIntelligenceSynthesis(memories, patterns, relationships, synthesisType);
            const id = this.generateMemoryId(synthesisType, ...domains);
            const bloombergRating = this.calculateBloombergRating(synthesis.confidence, memories.length);
            const query = `
        INSERT INTO synthesis_memories (
          id, synthesis_type, synthesis, involved_domains, source_memories,
          confidence, bloomberg_rating, valid_until
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
            const validUntil = new Date();
            validUntil.setHours(validUntil.getHours() + 24); // Valid for 24 hours
            const result = await this.pool.query(query, [
                id, synthesisType, synthesis.content, domains,
                memories.map(m => m.id), synthesis.confidence, bloombergRating, validUntil
            ]);
            const storedSynthesis = this.mapToSynthesisMemory(result.rows[0]);
            this.logger.info(`📊 Synthesized ${synthesisType} intelligence for ${domains.length} domains (Rating: ${bloombergRating})`);
            return storedSynthesis;
        }
        catch (error) {
            this.logger.error('Failed to synthesize intelligence:', error);
            throw error;
        }
    }
    // Memory-driven alert prioritization
    async prioritizeAlerts(alerts) {
        try {
            const prioritizedAlerts = [];
            for (const alert of alerts) {
                // Retrieve historical memory for this type of alert
                const historicalMemories = await this.getHistoricalAlertMemories(alert.type, alert.domain);
                // Calculate priority based on memory effectiveness
                const memoryScore = this.calculateMemoryEffectiveness(historicalMemories);
                const enhancedPriority = this.enhanceAlertPriority(alert.priority, memoryScore);
                prioritizedAlerts.push({
                    ...alert,
                    originalPriority: alert.priority,
                    memoryEnhancedPriority: enhancedPriority,
                    memoryScore,
                    supportingMemories: historicalMemories.slice(0, 3) // Top 3 supporting memories
                });
            }
            // Sort by memory-enhanced priority
            prioritizedAlerts.sort((a, b) => b.memoryEnhancedPriority - a.memoryEnhancedPriority);
            this.logger.info(`🚨 Prioritized ${alerts.length} alerts using memory intelligence`);
            return prioritizedAlerts;
        }
        catch (error) {
            this.logger.error('Failed to prioritize alerts:', error);
            throw error;
        }
    }
    // Private helper methods
    generateMemoryId(...components) {
        const content = components.join('|');
        return (0, crypto_1.createHash)('sha256').update(content).digest('hex').substring(0, 32);
    }
    async analyzeForPatterns(responses) {
        // Simplified pattern detection - in production, this would use ML
        const patterns = [];
        // Pattern detection heuristics
        const commonThemes = this.extractCommonThemes(responses);
        const marketPositions = this.extractMarketPositions(responses);
        const technicalApproaches = this.extractTechnicalApproaches(responses);
        patterns.push(...commonThemes, ...marketPositions, ...technicalApproaches);
        return patterns;
    }
    extractCommonThemes(responses) {
        // Implementation for theme extraction
        return [];
    }
    extractMarketPositions(responses) {
        // Implementation for market position extraction
        return [];
    }
    extractTechnicalApproaches(responses) {
        // Implementation for technical approach extraction
        return [];
    }
    async getRelevantPatterns(domain) {
        const query = `
      SELECT * FROM pattern_memories
      WHERE $1 = ANY(domains) OR pattern ILIKE $2
      ORDER BY effectiveness DESC, confidence DESC
      LIMIT 10
    `;
        const result = await this.pool.query(query, [domain, `%${domain}%`]);
        return result.rows.map(row => this.mapToPatternMemory(row));
    }
    async synthesizePrediction(pattern, targetDomain) {
        // Simplified prediction synthesis
        return {
            id: '',
            predictionType: 'competitive_threat',
            prediction: `Based on pattern analysis, ${targetDomain} may face competitive pressure in ${pattern.patternType}`,
            targetDomain,
            confidence: pattern.confidence * 0.8,
            timeframe: 'medium_term',
            basedOnPatterns: [pattern.id]
        };
    }
    async updateNeuralWeights(predictionId, accuracy) {
        // Update the effectiveness of patterns that contributed to this prediction
        const query = `
      UPDATE pattern_memories 
      SET effectiveness = (effectiveness + $1) / 2
      WHERE id IN (
        SELECT UNNEST(based_on_patterns) 
        FROM prediction_memories 
        WHERE id = $2
      )
    `;
        await this.pool.query(query, [accuracy, predictionId]);
    }
    async getMemoriesForDomains(domains) {
        const query = `
      SELECT * FROM competitive_memories
      WHERE domain = ANY($1)
      ORDER BY confidence DESC, effectiveness DESC
    `;
        const result = await this.pool.query(query, [domains]);
        return result.rows.map(row => this.mapToCompetitiveMemory(row));
    }
    async getPatternsForDomains(domains) {
        const query = `
      SELECT * FROM pattern_memories
      WHERE domains && $1
      ORDER BY effectiveness DESC
    `;
        const result = await this.pool.query(query, [domains]);
        return result.rows.map(row => this.mapToPatternMemory(row));
    }
    async getRelationshipsForDomains(domains) {
        const query = `
      SELECT * FROM relationship_memories
      WHERE source_id = ANY($1) OR target_id = ANY($1)
      ORDER BY confidence DESC
    `;
        const result = await this.pool.query(query, [domains]);
        return result.rows.map(row => this.mapToRelationshipMemory(row));
    }
    async performIntelligenceSynthesis(memories, patterns, relationships, synthesisType) {
        // Simplified synthesis - in production, this would use advanced ML
        const confidence = Math.min(memories.reduce((sum, m) => sum + m.confidence, 0) / memories.length || 0, patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length || 0);
        const content = `Synthesized ${synthesisType} based on ${memories.length} memories, ${patterns.length} patterns, and ${relationships.length} relationships.`;
        return { content, confidence };
    }
    calculateBloombergRating(confidence, memoryCount) {
        const score = confidence * 0.7 + (Math.min(memoryCount / 10, 1)) * 0.3;
        if (score >= 0.9)
            return 'A+';
        if (score >= 0.8)
            return 'A';
        if (score >= 0.7)
            return 'B+';
        if (score >= 0.6)
            return 'B';
        return 'C';
    }
    async getHistoricalAlertMemories(alertType, domain) {
        const query = `
      SELECT * FROM competitive_memories
      WHERE memory_type = 'alert' AND domain = $1
      AND content ILIKE $2
      ORDER BY effectiveness DESC
      LIMIT 5
    `;
        const result = await this.pool.query(query, [domain, `%${alertType}%`]);
        return result.rows.map(row => this.mapToCompetitiveMemory(row));
    }
    calculateMemoryEffectiveness(memories) {
        if (memories.length === 0)
            return 0.5;
        return memories.reduce((sum, m) => sum + m.effectiveness, 0) / memories.length;
    }
    enhanceAlertPriority(originalPriority, memoryScore) {
        return Math.min(10, originalPriority * (1 + memoryScore));
    }
    // Mapping functions
    mapToCompetitiveMemory(row) {
        return {
            id: row.id,
            domainId: row.domain_id,
            domain: row.domain,
            memoryType: row.memory_type,
            content: row.content,
            confidence: row.confidence,
            sourceModels: row.source_models || [],
            relationships: row.relationships || [],
            patterns: row.patterns || [],
            predictionAccuracy: row.prediction_accuracy,
            alertPriority: row.alert_priority,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            accessCount: row.access_count,
            lastAccessed: row.last_accessed,
            effectiveness: row.effectiveness,
            memoryWeight: row.memory_weight
        };
    }
    mapToPatternMemory(row) {
        return {
            id: row.id,
            patternType: row.pattern_type,
            pattern: row.pattern,
            domains: row.domains || [],
            confidence: row.confidence,
            occurrences: row.occurrences,
            effectiveness: row.effectiveness,
            lastSeen: row.last_seen,
            trendDirection: row.trend_direction,
            predictions: [] // Would be populated in a separate query
        };
    }
    mapToPredictionMemory(row) {
        return {
            id: row.id,
            predictionType: row.prediction_type,
            prediction: row.prediction,
            targetDomain: row.target_domain,
            confidence: row.confidence,
            timeframe: row.timeframe,
            accuracy: row.accuracy,
            outcome: row.outcome,
            validatedAt: row.validated_at,
            basedOnPatterns: row.based_on_patterns || []
        };
    }
    mapToRelationshipMemory(row) {
        return {
            id: row.id,
            sourceId: row.source_id,
            targetId: row.target_id,
            relationshipType: row.relationship_type,
            strength: row.strength,
            direction: row.direction,
            discovered: row.discovered,
            lastValidated: row.last_validated,
            confidence: row.confidence
        };
    }
    mapToSynthesisMemory(row) {
        return {
            id: row.id,
            synthesisType: row.synthesis_type,
            synthesis: row.synthesis,
            involvedDomains: row.involved_domains || [],
            sourceMemories: row.source_memories || [],
            confidence: row.confidence,
            bloombergRating: row.bloomberg_rating,
            createdAt: row.created_at,
            validUntil: row.valid_until
        };
    }
}
exports.MemoryOracle = MemoryOracle;
