"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeuralLearningSystem = void 0;
class NeuralLearningSystem {
    constructor(pool, logger, memoryOracle) {
        this.learningWeights = new Map();
        this.learningHistory = [];
        // Neural network parameters
        this.LEARNING_RATE_ALPHA = 0.1;
        this.MOMENTUM_BETA = 0.9;
        this.DECAY_RATE = 0.95;
        this.EXPLORATION_EPSILON = 0.1;
        this.pool = pool;
        this.logger = logger;
        this.memoryOracle = memoryOracle;
        this.initializeNeuralTables();
        this.startLearningCycle();
    }
    async initializeNeuralTables() {
        const neuralSchema = `
      -- Neural weights for learning components
      CREATE TABLE IF NOT EXISTS neural_weights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        component_type TEXT NOT NULL CHECK (component_type IN ('pattern', 'prediction', 'memory', 'synthesis', 'relationship')),
        component_id TEXT NOT NULL,
        weight FLOAT DEFAULT 1.0,
        learning_rate FLOAT DEFAULT 0.1,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        performance_history FLOAT[],
        adaptation_speed TEXT CHECK (adaptation_speed IN ('fast', 'medium', 'slow')) DEFAULT 'medium',
        UNIQUE(component_type, component_id)
      );

      -- Learning events for training
      CREATE TABLE IF NOT EXISTS learning_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type TEXT NOT NULL CHECK (event_type IN ('prediction_validation', 'pattern_confirmation', 'memory_access', 'synthesis_feedback', 'alert_outcome')),
        component_id TEXT NOT NULL,
        feedback FLOAT CHECK (feedback >= -1 AND feedback <= 1),
        context TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        impact_magnitude FLOAT DEFAULT 1.0
      );

      -- Learning metrics tracking
      CREATE TABLE IF NOT EXISTS learning_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_type TEXT NOT NULL,
        metric_value FLOAT NOT NULL,
        measurement_window TEXT NOT NULL, -- 'hour', 'day', 'week', 'month'
        window_start TIMESTAMP WITH TIME ZONE NOT NULL,
        window_end TIMESTAMP WITH TIME ZONE NOT NULL,
        component_breakdown JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Intelligence quality scores
      CREATE TABLE IF NOT EXISTS intelligence_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain TEXT NOT NULL,
        accuracy_score FLOAT DEFAULT 0.5,
        relevance_score FLOAT DEFAULT 0.5,
        timeliness_score FLOAT DEFAULT 0.5,
        depth_score FLOAT DEFAULT 0.5,
        actionability_score FLOAT DEFAULT 0.5,
        overall_score FLOAT DEFAULT 0.5,
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        model_contributions JSONB
      );

      -- Adaptive learning parameters
      CREATE TABLE IF NOT EXISTS learning_parameters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parameter_name TEXT NOT NULL UNIQUE,
        parameter_value FLOAT NOT NULL,
        auto_tuned BOOLEAN DEFAULT true,
        last_tuned TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        performance_impact FLOAT DEFAULT 0
      );

      -- Indexes for neural learning
      CREATE INDEX IF NOT EXISTS idx_neural_weights_component ON neural_weights(component_type, component_id);
      CREATE INDEX IF NOT EXISTS idx_learning_events_timestamp ON learning_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_learning_events_component ON learning_events(component_id);
      CREATE INDEX IF NOT EXISTS idx_learning_metrics_window ON learning_metrics(measurement_window, window_start);
      CREATE INDEX IF NOT EXISTS idx_intelligence_scores_domain ON intelligence_scores(domain);
    `;
        try {
            await this.pool.query(neuralSchema);
            await this.initializeDefaultParameters();
            this.logger.info('🧮 Neural Learning System: Database schema initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize neural learning schema:', error);
            throw error;
        }
    }
    async initializeDefaultParameters() {
        const defaultParams = [
            { name: 'learning_rate_alpha', value: this.LEARNING_RATE_ALPHA },
            { name: 'momentum_beta', value: this.MOMENTUM_BETA },
            { name: 'decay_rate', value: this.DECAY_RATE },
            { name: 'exploration_epsilon', value: this.EXPLORATION_EPSILON },
            { name: 'confidence_threshold', value: 0.7 },
            { name: 'pattern_similarity_threshold', value: 0.8 },
            { name: 'memory_relevance_threshold', value: 0.6 }
        ];
        for (const param of defaultParams) {
            await this.pool.query(`INSERT INTO learning_parameters (parameter_name, parameter_value) 
         VALUES ($1, $2) ON CONFLICT (parameter_name) DO NOTHING`, [param.name, param.value]);
        }
    }
    // Train the neural system with new intelligence feedback
    async trainFromFeedback(componentType, componentId, feedback, context, impactMagnitude = 1.0) {
        try {
            // Record learning event
            const learningEvent = {
                id: this.generateLearningId(),
                eventType: this.mapComponentToEventType(componentType),
                componentId,
                feedback,
                context,
                timestamp: new Date(),
                impactMagnitude
            };
            await this.recordLearningEvent(learningEvent);
            // Update neural weights using backpropagation-inspired algorithm
            await this.updateNeuralWeights(componentType, componentId, feedback, impactMagnitude);
            // Trigger adaptive parameter tuning
            await this.adaptiveTuning(componentType, feedback);
            this.logger.info(`🧠 Neural learning: Updated weights for ${componentType}/${componentId} with feedback ${feedback}`);
        }
        catch (error) {
            this.logger.error('Failed to train from feedback:', error);
            throw error;
        }
    }
    // Continuously improve prediction accuracy
    async improvePredictionAccuracy() {
        try {
            // Get recent predictions and their outcomes
            const recentPredictions = await this.getRecentPredictions();
            for (const prediction of recentPredictions) {
                if (prediction.accuracy !== undefined) {
                    // Calculate learning signal
                    const expectedAccuracy = await this.getExpectedAccuracy(prediction);
                    const learningSignal = prediction.accuracy - expectedAccuracy;
                    // Update pattern weights that contributed to this prediction
                    for (const patternId of prediction.basedOnPatterns) {
                        await this.trainFromFeedback('pattern', patternId, learningSignal, `Prediction accuracy update for ${prediction.targetDomain}`, Math.abs(learningSignal));
                    }
                    // Update prediction component weights
                    await this.trainFromFeedback('prediction', prediction.id, prediction.accuracy * 2 - 1, // Convert 0-1 to -1 to 1
                    `Direct accuracy feedback`, 1.0);
                }
            }
            this.logger.info('📈 Improved prediction accuracy through neural learning');
        }
        catch (error) {
            this.logger.error('Failed to improve prediction accuracy:', error);
            throw error;
        }
    }
    // Enhance pattern detection quality
    async enhancePatternDetection() {
        try {
            // Analyze pattern effectiveness over time
            const patterns = await this.getAllPatterns();
            for (const pattern of patterns) {
                // Calculate effectiveness trend
                const effectivenessTrend = await this.calculateEffectivenessTrend(pattern.id);
                // Adjust pattern weights based on trend
                const learningSignal = effectivenessTrend.slope; // Positive if improving, negative if declining
                await this.trainFromFeedback('pattern', pattern.id, learningSignal, `Pattern effectiveness trend analysis`, Math.abs(learningSignal));
                // Update pattern detection sensitivity
                await this.adjustPatternSensitivity(pattern.patternType, effectivenessTrend);
            }
            this.logger.info('🔍 Enhanced pattern detection through neural adaptation');
        }
        catch (error) {
            this.logger.error('Failed to enhance pattern detection:', error);
            throw error;
        }
    }
    // Optimize memory relevance scoring
    async optimizeMemoryRelevance() {
        try {
            // Analyze memory access patterns
            const memoryAccessData = await this.getMemoryAccessAnalytics();
            for (const memory of memoryAccessData) {
                // Calculate relevance score based on access patterns and effectiveness
                const relevanceScore = this.calculateRelevanceScore(memory);
                const currentWeight = await this.getNeuralWeight('memory', memory.id);
                // Learning signal based on the difference between expected and actual relevance
                const learningSignal = relevanceScore - currentWeight.weight;
                await this.trainFromFeedback('memory', memory.id, learningSignal, `Memory relevance optimization`, Math.abs(learningSignal));
            }
            this.logger.info('🎯 Optimized memory relevance through neural learning');
        }
        catch (error) {
            this.logger.error('Failed to optimize memory relevance:', error);
            throw error;
        }
    }
    // Adaptive synthesis quality improvement
    async improveSynthesisQuality() {
        try {
            // Get synthesis feedback data
            const syntheses = await this.getRecentSyntheses();
            for (const synthesis of syntheses) {
                // Evaluate synthesis quality using multiple metrics
                const qualityMetrics = await this.evaluateSynthesisQuality(synthesis);
                // Train component weights based on quality
                const learningSignal = qualityMetrics.overallScore * 2 - 1; // Convert to -1 to 1
                await this.trainFromFeedback('synthesis', synthesis.id, learningSignal, `Synthesis quality improvement`, 1.0);
                // Update source memory weights based on their contribution
                for (const memoryId of synthesis.sourceMemories) {
                    const contributionWeight = qualityMetrics.overallScore * 0.5; // Scaled contribution
                    await this.trainFromFeedback('memory', memoryId, contributionWeight, `Synthesis contribution feedback`, 0.5);
                }
            }
            this.logger.info('📊 Improved synthesis quality through neural feedback');
        }
        catch (error) {
            this.logger.error('Failed to improve synthesis quality:', error);
            throw error;
        }
    }
    // Calculate comprehensive learning metrics
    async calculateLearningMetrics(timeWindow) {
        try {
            const windowStart = this.getWindowStart(timeWindow);
            const windowEnd = new Date();
            const metrics = {
                predictionAccuracy: await this.calculatePredictionAccuracy(windowStart, windowEnd),
                patternEffectiveness: await this.calculatePatternEffectiveness(windowStart, windowEnd),
                memoryRelevance: await this.calculateMemoryRelevance(windowStart, windowEnd),
                synthesisQuality: await this.calculateSynthesisQuality(windowStart, windowEnd),
                alertPrecision: await this.calculateAlertPrecision(windowStart, windowEnd),
                overallIntelligenceScore: 0 // Will be calculated below
            };
            // Calculate overall intelligence score as weighted average
            metrics.overallIntelligenceScore = (metrics.predictionAccuracy * 0.25 +
                metrics.patternEffectiveness * 0.2 +
                metrics.memoryRelevance * 0.2 +
                metrics.synthesisQuality * 0.2 +
                metrics.alertPrecision * 0.15);
            // Store metrics for historical tracking
            await this.storeLearningMetrics(metrics, timeWindow, windowStart, windowEnd);
            this.logger.info(`📊 Calculated learning metrics for ${timeWindow}: Overall score ${metrics.overallIntelligenceScore.toFixed(3)}`);
            return metrics;
        }
        catch (error) {
            this.logger.error('Failed to calculate learning metrics:', error);
            throw error;
        }
    }
    // Start continuous learning cycle
    startLearningCycle() {
        // Run learning improvements every hour
        setInterval(async () => {
            try {
                await this.improvePredictionAccuracy();
                await this.enhancePatternDetection();
                await this.optimizeMemoryRelevance();
                await this.improveSynthesisQuality();
                // Calculate and log metrics
                const metrics = await this.calculateLearningMetrics('hour');
                this.logger.info(`🎯 Hourly learning cycle completed. Intelligence score: ${metrics.overallIntelligenceScore.toFixed(3)}`);
            }
            catch (error) {
                this.logger.error('Learning cycle error:', error);
            }
        }, 60 * 60 * 1000); // Every hour
        // Run comprehensive analysis daily
        setInterval(async () => {
            try {
                await this.performAdaptiveTuning();
                await this.calculateLearningMetrics('day');
                this.logger.info('📈 Daily comprehensive learning analysis completed');
            }
            catch (error) {
                this.logger.error('Daily learning analysis error:', error);
            }
        }, 24 * 60 * 60 * 1000); // Every day
        this.logger.info('🔄 Neural learning cycle started');
    }
    // Private helper methods
    generateLearningId() {
        return `learning_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    mapComponentToEventType(componentType) {
        const mapping = {
            pattern: 'pattern_confirmation',
            prediction: 'prediction_validation',
            memory: 'memory_access',
            synthesis: 'synthesis_feedback',
            relationship: 'pattern_confirmation'
        };
        return mapping[componentType];
    }
    async recordLearningEvent(event) {
        const query = `
      INSERT INTO learning_events (
        id, event_type, component_id, feedback, context, timestamp, impact_magnitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
        await this.pool.query(query, [
            event.id, event.eventType, event.componentId, event.feedback,
            event.context, event.timestamp, event.impactMagnitude
        ]);
    }
    async updateNeuralWeights(componentType, componentId, feedback, impactMagnitude) {
        // Get current weight
        const currentWeight = await this.getNeuralWeight(componentType, componentId);
        // Apply learning algorithm (gradient descent with momentum)
        const learningRate = currentWeight.learningRate * impactMagnitude;
        const weightUpdate = learningRate * feedback;
        const newWeight = Math.max(0.1, Math.min(2.0, currentWeight.weight + weightUpdate));
        // Update performance history
        const updatedHistory = [...currentWeight.performanceHistory, feedback].slice(-10); // Keep last 10
        const query = `
      UPDATE neural_weights 
      SET weight = $1, performance_history = $2, last_updated = CURRENT_TIMESTAMP
      WHERE component_type = $3 AND component_id = $4
    `;
        await this.pool.query(query, [newWeight, updatedHistory, componentType, componentId]);
        // Update cache
        this.learningWeights.set(`${componentType}:${componentId}`, {
            ...currentWeight,
            weight: newWeight,
            performanceHistory: updatedHistory,
            lastUpdated: new Date()
        });
    }
    async getNeuralWeight(componentType, componentId) {
        const cacheKey = `${componentType}:${componentId}`;
        if (this.learningWeights.has(cacheKey)) {
            return this.learningWeights.get(cacheKey);
        }
        const query = `
      SELECT * FROM neural_weights 
      WHERE component_type = $1 AND component_id = $2
    `;
        const result = await this.pool.query(query, [componentType, componentId]);
        if (result.rows.length === 0) {
            // Create default weight
            const defaultWeight = {
                id: this.generateLearningId(),
                componentType,
                componentId,
                weight: 1.0,
                learningRate: this.LEARNING_RATE_ALPHA,
                lastUpdated: new Date(),
                performanceHistory: [],
                adaptationSpeed: 'medium'
            };
            await this.createNeuralWeight(defaultWeight);
            return defaultWeight;
        }
        const weight = this.mapToNeuralWeight(result.rows[0]);
        this.learningWeights.set(cacheKey, weight);
        return weight;
    }
    async createNeuralWeight(weight) {
        const query = `
      INSERT INTO neural_weights (
        id, component_type, component_id, weight, learning_rate,
        performance_history, adaptation_speed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
        await this.pool.query(query, [
            weight.id, weight.componentType, weight.componentId, weight.weight,
            weight.learningRate, weight.performanceHistory, weight.adaptationSpeed
        ]);
    }
    async adaptiveTuning(componentType, feedback) {
        // Implement adaptive parameter tuning based on feedback
        if (Math.abs(feedback) > 0.8) {
            // High magnitude feedback suggests we might need to adjust learning parameters
            const currentLearningRate = await this.getParameter('learning_rate_alpha');
            const adjustment = feedback > 0 ? 1.05 : 0.95; // Increase if positive, decrease if negative
            const newLearningRate = Math.max(0.01, Math.min(0.3, currentLearningRate * adjustment));
            await this.updateParameter('learning_rate_alpha', newLearningRate);
        }
    }
    async performAdaptiveTuning() {
        // Comprehensive parameter tuning based on recent performance
        const recentMetrics = await this.calculateLearningMetrics('day');
        // Adjust parameters based on overall performance
        if (recentMetrics.overallIntelligenceScore < 0.7) {
            // Performance is low, increase exploration
            await this.updateParameter('exploration_epsilon', Math.min(0.3, this.EXPLORATION_EPSILON * 1.1));
        }
        else if (recentMetrics.overallIntelligenceScore > 0.9) {
            // Performance is high, reduce exploration
            await this.updateParameter('exploration_epsilon', Math.max(0.05, this.EXPLORATION_EPSILON * 0.9));
        }
    }
    async getParameter(name) {
        const query = `SELECT parameter_value FROM learning_parameters WHERE parameter_name = $1`;
        const result = await this.pool.query(query, [name]);
        return result.rows[0]?.parameter_value || 0;
    }
    async updateParameter(name, value) {
        const query = `
      UPDATE learning_parameters 
      SET parameter_value = $1, last_tuned = CURRENT_TIMESTAMP 
      WHERE parameter_name = $2
    `;
        await this.pool.query(query, [value, name]);
    }
    // Metric calculation methods (simplified implementations)
    async calculatePredictionAccuracy(start, end) {
        const query = `
      SELECT AVG(accuracy) as avg_accuracy 
      FROM prediction_memories 
      WHERE validated_at BETWEEN $1 AND $2 AND accuracy IS NOT NULL
    `;
        const result = await this.pool.query(query, [start, end]);
        return result.rows[0]?.avg_accuracy || 0.5;
    }
    async calculatePatternEffectiveness(start, end) {
        const query = `
      SELECT AVG(effectiveness) as avg_effectiveness 
      FROM pattern_memories 
      WHERE last_seen BETWEEN $1 AND $2
    `;
        const result = await this.pool.query(query, [start, end]);
        return result.rows[0]?.avg_effectiveness || 0.5;
    }
    async calculateMemoryRelevance(start, end) {
        const query = `
      SELECT AVG(effectiveness) as avg_relevance 
      FROM competitive_memories 
      WHERE last_accessed BETWEEN $1 AND $2
    `;
        const result = await this.pool.query(query, [start, end]);
        return result.rows[0]?.avg_relevance || 0.5;
    }
    async calculateSynthesisQuality(start, end) {
        const query = `
      SELECT AVG(confidence) as avg_quality 
      FROM synthesis_memories 
      WHERE created_at BETWEEN $1 AND $2
    `;
        const result = await this.pool.query(query, [start, end]);
        return result.rows[0]?.avg_quality || 0.5;
    }
    async calculateAlertPrecision(start, end) {
        // Simplified implementation - would need alert outcome tracking
        return 0.75; // Placeholder
    }
    getWindowStart(timeWindow) {
        const now = new Date();
        switch (timeWindow) {
            case 'hour':
                return new Date(now.getTime() - 60 * 60 * 1000);
            case 'day':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case 'week':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case 'month':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
    }
    async storeLearningMetrics(metrics, timeWindow, windowStart, windowEnd) {
        const queries = Object.entries(metrics).map(([metricType, value]) => ({
            query: `
        INSERT INTO learning_metrics (
          metric_type, metric_value, measurement_window, window_start, window_end
        ) VALUES ($1, $2, $3, $4, $5)
      `,
            params: [metricType, value, timeWindow, windowStart, windowEnd]
        }));
        for (const { query, params } of queries) {
            await this.pool.query(query, params);
        }
    }
    // Additional helper methods (simplified)
    async getRecentPredictions() {
        // Implementation would fetch recent predictions
        return [];
    }
    async getExpectedAccuracy(prediction) {
        // Implementation would calculate expected accuracy based on pattern weights
        return 0.7;
    }
    async getAllPatterns() {
        // Implementation would fetch all patterns
        return [];
    }
    async calculateEffectivenessTrend(patternId) {
        // Implementation would calculate trend
        return { slope: 0.1 };
    }
    async adjustPatternSensitivity(patternType, trend) {
        // Implementation would adjust pattern detection sensitivity
    }
    async getMemoryAccessAnalytics() {
        // Implementation would get memory access data
        return [];
    }
    calculateRelevanceScore(memory) {
        // Implementation would calculate relevance score
        return 0.7;
    }
    async getRecentSyntheses() {
        // Implementation would fetch recent syntheses
        return [];
    }
    async evaluateSynthesisQuality(synthesis) {
        // Implementation would evaluate synthesis quality
        return { overallScore: 0.8 };
    }
    mapToNeuralWeight(row) {
        return {
            id: row.id,
            componentType: row.component_type,
            componentId: row.component_id,
            weight: row.weight,
            learningRate: row.learning_rate,
            lastUpdated: row.last_updated,
            performanceHistory: row.performance_history || [],
            adaptationSpeed: row.adaptation_speed
        };
    }
}
exports.NeuralLearningSystem = NeuralLearningSystem;
