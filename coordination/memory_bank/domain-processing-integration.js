"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainProcessingIntegration = void 0;
class DomainProcessingIntegration {
    constructor(pool, logger, memoryOracle, neuralLearning, intelligenceGraph, alertSystem) {
        // Processing configuration
        this.BATCH_SIZE = 10;
        this.PROCESSING_TIMEOUT = 300000; // 5 minutes
        this.MIN_CONFIDENCE_THRESHOLD = 0.6;
        this.MEMORY_EXTRACTION_PROMPTS = [
            'business_analysis',
            'content_strategy',
            'technical_assessment',
            'competitive_positioning',
            'market_opportunity'
        ];
        this.pool = pool;
        this.logger = logger;
        this.memoryOracle = memoryOracle;
        this.neuralLearning = neuralLearning;
        this.intelligenceGraph = intelligenceGraph;
        this.alertSystem = alertSystem;
    }
    // Process domain responses and extract intelligence memories
    async processDomainIntelligence(domainId) {
        try {
            this.logger.info(`🧠 Processing domain intelligence for ${domainId}`);
            // Get domain and its responses
            const domainData = await this.getDomainData(domainId);
            if (!domainData) {
                throw new Error(`Domain ${domainId} not found`);
            }
            const responses = await this.getDomainResponses(domainId);
            if (responses.length === 0) {
                this.logger.warn(`No responses found for domain ${domainId}`);
                return { memories: [], patterns: [], predictions: [], insights: [], alerts: [] };
            }
            // Extract competitive memories from responses
            const memories = await this.extractCompetitiveMemories(domainData, responses);
            // Detect patterns from the responses
            const patterns = await this.memoryOracle.detectAndStorePatterns(responses);
            // Generate predictions based on extracted intelligence
            const predictions = await this.memoryOracle.generatePredictions(domainData.domain);
            // Generate synthesis insights
            const insights = await this.generateSynthesisInsights(domainData.domain, memories);
            // Check for alerts based on the new intelligence
            const alerts = await this.checkForAlerts(domainData, memories, patterns);
            // Update neural learning with processing feedback
            await this.updateNeuralLearning(domainData, memories, patterns);
            // Update intelligence graph
            await this.updateIntelligenceGraph(domainData, memories, patterns);
            this.logger.info(`✅ Processed ${memories.length} memories, ${patterns.length} patterns, ${predictions.length} predictions for ${domainData.domain}`);
            return {
                memories,
                patterns,
                predictions,
                insights,
                alerts
            };
        }
        catch (error) {
            this.logger.error(`Failed to process domain intelligence for ${domainId}:`, error);
            throw error;
        }
    }
    // Extract competitive memories from domain responses
    async extractCompetitiveMemories(domainData, responses) {
        const memories = [];
        try {
            // Group responses by prompt type for analysis
            const responsesByPrompt = this.groupResponsesByPrompt(responses);
            for (const [promptType, promptResponses] of responsesByPrompt) {
                // Analyze responses for different memory types
                const businessMemories = await this.extractBusinessMemories(domainData, promptType, promptResponses);
                const competitiveMemories = await this.extractCompetitiveRelationshipMemories(domainData, promptType, promptResponses);
                const technicalMemories = await this.extractTechnicalMemories(domainData, promptType, promptResponses);
                const strategicMemories = await this.extractStrategicMemories(domainData, promptType, promptResponses);
                memories.push(...businessMemories, ...competitiveMemories, ...technicalMemories, ...strategicMemories);
            }
            // Store all memories in the memory oracle
            for (const memory of memories) {
                await this.memoryOracle.storeCompetitiveMemory(memory);
            }
            return memories;
        }
        catch (error) {
            this.logger.error('Failed to extract competitive memories:', error);
            throw error;
        }
    }
    // Extract business intelligence memories
    async extractBusinessMemories(domainData, promptType, responses) {
        const memories = [];
        for (const response of responses) {
            // Analyze response for business insights
            const businessInsights = this.analyzeBusinessInsights(response.response);
            if (businessInsights.length > 0) {
                for (const insight of businessInsights) {
                    const memory = {
                        domainId: domainData.id,
                        domain: domainData.domain,
                        memoryType: 'synthesis',
                        content: insight.content,
                        confidence: insight.confidence,
                        sourceModels: [response.model],
                        relationships: insight.relationships || [],
                        patterns: insight.patterns || [],
                        effectiveness: 0.7,
                        memoryWeight: 1.0
                    };
                    memories.push(memory);
                }
            }
        }
        return memories;
    }
    // Extract competitive relationship memories
    async extractCompetitiveRelationshipMemories(domainData, promptType, responses) {
        const memories = [];
        for (const response of responses) {
            // Analyze response for competitive relationships
            const competitors = this.extractCompetitorMentions(response.response);
            const partnerships = this.extractPartnershipMentions(response.response);
            const marketPosition = this.extractMarketPosition(response.response);
            // Create memories for competitive relationships
            if (competitors.length > 0) {
                const memory = {
                    domainId: domainData.id,
                    domain: domainData.domain,
                    memoryType: 'relationship',
                    content: `Competitive relationships: ${competitors.join(', ')}`,
                    confidence: 0.8,
                    sourceModels: [response.model],
                    relationships: competitors,
                    patterns: ['competitive_landscape'],
                    effectiveness: 0.8,
                    memoryWeight: 1.2 // Higher weight for competitive intelligence
                };
                memories.push(memory);
            }
            // Create memories for market positioning
            if (marketPosition) {
                const memory = {
                    domainId: domainData.id,
                    domain: domainData.domain,
                    memoryType: 'pattern',
                    content: marketPosition.description,
                    confidence: marketPosition.confidence,
                    sourceModels: [response.model],
                    relationships: [],
                    patterns: ['market_positioning'],
                    effectiveness: 0.75,
                    memoryWeight: 1.1
                };
                memories.push(memory);
            }
        }
        return memories;
    }
    // Extract technical memories
    async extractTechnicalMemories(domainData, promptType, responses) {
        const memories = [];
        if (promptType === 'technical_assessment') {
            for (const response of responses) {
                const techStack = this.extractTechStack(response.response);
                const techInnovations = this.extractTechInnovations(response.response);
                const techVulnerabilities = this.extractTechVulnerabilities(response.response);
                // Technology stack memory
                if (techStack.length > 0) {
                    const memory = {
                        domainId: domainData.id,
                        domain: domainData.domain,
                        memoryType: 'pattern',
                        content: `Technology stack: ${techStack.join(', ')}`,
                        confidence: 0.9,
                        sourceModels: [response.model],
                        relationships: [],
                        patterns: ['technology_adoption'],
                        effectiveness: 0.85,
                        memoryWeight: 1.0
                    };
                    memories.push(memory);
                }
                // Technical innovations memory
                if (techInnovations.length > 0) {
                    const memory = {
                        domainId: domainData.id,
                        domain: domainData.domain,
                        memoryType: 'prediction',
                        content: `Technical innovations: ${techInnovations.join(', ')}`,
                        confidence: 0.7,
                        sourceModels: [response.model],
                        relationships: [],
                        patterns: ['innovation_trajectory'],
                        effectiveness: 0.7,
                        memoryWeight: 1.3 // Higher weight for innovation signals
                    };
                    memories.push(memory);
                }
            }
        }
        return memories;
    }
    // Extract strategic memories
    async extractStrategicMemories(domainData, promptType, responses) {
        const memories = [];
        for (const response of responses) {
            const strategicInitiatives = this.extractStrategicInitiatives(response.response);
            const marketOpportunities = this.extractMarketOpportunities(response.response);
            const threats = this.extractThreats(response.response);
            // Strategic initiatives memory
            if (strategicInitiatives.length > 0) {
                const memory = {
                    domainId: domainData.id,
                    domain: domainData.domain,
                    memoryType: 'synthesis',
                    content: `Strategic initiatives: ${strategicInitiatives.join(', ')}`,
                    confidence: 0.75,
                    sourceModels: [response.model],
                    relationships: [],
                    patterns: ['strategic_direction'],
                    effectiveness: 0.8,
                    memoryWeight: 1.2
                };
                memories.push(memory);
            }
            // Market opportunities memory
            if (marketOpportunities.length > 0) {
                const memory = {
                    domainId: domainData.id,
                    domain: domainData.domain,
                    memoryType: 'prediction',
                    content: `Market opportunities: ${marketOpportunities.join(', ')}`,
                    confidence: 0.65,
                    sourceModels: [response.model],
                    relationships: [],
                    patterns: ['market_opportunity'],
                    effectiveness: 0.7,
                    memoryWeight: 1.1
                };
                memories.push(memory);
            }
        }
        return memories;
    }
    // Generate synthesis insights from extracted memories
    async generateSynthesisInsights(domain, memories) {
        try {
            if (memories.length < 3) {
                return []; // Need minimum memories for synthesis
            }
            // Group memories by type for synthesis
            const memoryGroups = this.groupMemoriesByType(memories);
            const insights = [];
            // Competitive landscape synthesis
            if (memoryGroups.relationship && memoryGroups.relationship.length > 0) {
                const competitiveSynthesis = await this.memoryOracle.synthesizeIntelligence([domain], 'competitive_landscape');
                insights.push(competitiveSynthesis);
            }
            // Market positioning synthesis
            if (memoryGroups.pattern && memoryGroups.pattern.length > 0) {
                const positioningSynthesis = await this.memoryOracle.synthesizeIntelligence([domain], 'brand_positioning');
                insights.push(positioningSynthesis);
            }
            // Threat assessment synthesis
            if (memoryGroups.prediction && memoryGroups.prediction.length > 0) {
                const threatSynthesis = await this.memoryOracle.synthesizeIntelligence([domain], 'threat_assessment');
                insights.push(threatSynthesis);
            }
            return insights;
        }
        catch (error) {
            this.logger.error('Failed to generate synthesis insights:', error);
            return [];
        }
    }
    // Check for alerts based on new intelligence
    async checkForAlerts(domainData, memories, patterns) {
        const alerts = [];
        try {
            // Check for competitive threat alerts
            const threatMemories = memories.filter(m => m.memoryType === 'relationship' && m.confidence > 0.8);
            if (threatMemories.length > 0) {
                for (const memory of threatMemories) {
                    const alert = await this.alertSystem.processAlert({
                        alertType: 'competitive_threat',
                        domain: domainData.domain,
                        title: `Competitive threat detected for ${domainData.domain}`,
                        description: memory.content,
                        severity: 'high',
                        confidence: memory.confidence,
                        impactMagnitude: 0.8
                    });
                    alerts.push(alert);
                }
            }
            // Check for pattern emergence alerts
            const highConfidencePatterns = patterns.filter(p => p.confidence > 0.85);
            if (highConfidencePatterns.length > 0) {
                for (const pattern of highConfidencePatterns) {
                    const alert = await this.alertSystem.processAlert({
                        alertType: 'pattern_emergence',
                        domain: domainData.domain,
                        title: `New pattern detected: ${pattern.patternType}`,
                        description: pattern.pattern,
                        severity: 'medium',
                        confidence: pattern.confidence,
                        impactMagnitude: pattern.effectiveness
                    });
                    alerts.push(alert);
                }
            }
            // Check for market opportunity alerts
            const opportunityMemories = memories.filter(m => m.patterns.includes('market_opportunity') && m.confidence > 0.7);
            if (opportunityMemories.length > 0) {
                for (const memory of opportunityMemories) {
                    const alert = await this.alertSystem.processAlert({
                        alertType: 'opportunity_identified',
                        domain: domainData.domain,
                        title: `Market opportunity identified for ${domainData.domain}`,
                        description: memory.content,
                        severity: 'medium',
                        confidence: memory.confidence,
                        impactMagnitude: 0.7
                    });
                    alerts.push(alert);
                }
            }
            return alerts;
        }
        catch (error) {
            this.logger.error('Failed to check for alerts:', error);
            return [];
        }
    }
    // Update neural learning with processing feedback
    async updateNeuralLearning(domainData, memories, patterns) {
        try {
            // Train neural system based on memory extraction success
            const successRate = memories.length > 0 ? 1.0 : 0.0;
            await this.neuralLearning.trainFromFeedback('memory', domainData.id, successRate * 2 - 1, // Convert to -1 to 1 scale
            `Domain processing for ${domainData.domain}`, 1.0);
            // Train pattern detection based on pattern quality
            for (const pattern of patterns) {
                await this.neuralLearning.trainFromFeedback('pattern', pattern.id, pattern.effectiveness * 2 - 1, `Pattern detection for ${domainData.domain}`, pattern.confidence);
            }
        }
        catch (error) {
            this.logger.error('Failed to update neural learning:', error);
        }
    }
    // Update intelligence graph with new data
    async updateIntelligenceGraph(domainData, memories, patterns) {
        try {
            // Trigger graph rebuild to incorporate new intelligence
            await this.intelligenceGraph.buildIntelligenceGraph();
            // Detect new insights based on updated graph
            await this.intelligenceGraph.detectGraphInsights();
        }
        catch (error) {
            this.logger.error('Failed to update intelligence graph:', error);
        }
    }
    // Process batch of domains for efficiency
    async processDomainBatch(domainIds) {
        const results = new Map();
        const batches = this.chunkArray(domainIds, this.BATCH_SIZE);
        for (const batch of batches) {
            const batchPromises = batch.map(async (domainId) => {
                try {
                    const result = await this.processDomainIntelligence(domainId);
                    results.set(domainId, result);
                    return { domainId, success: true };
                }
                catch (error) {
                    this.logger.error(`Failed to process domain ${domainId}:`, error);
                    results.set(domainId, { memories: [], patterns: [], predictions: [], insights: [], alerts: [] });
                    return { domainId, success: false, error: error.message };
                }
            });
            await Promise.allSettled(batchPromises);
            // Small delay between batches to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.logger.info(`📊 Processed ${domainIds.length} domains in batches`);
        return results;
    }
    // Helper methods for text analysis (simplified implementations)
    analyzeBusinessInsights(response) {
        // Simplified implementation - in production would use NLP/ML
        const insights = [];
        if (response.toLowerCase().includes('revenue') || response.toLowerCase().includes('profit')) {
            insights.push({
                content: 'Business model analysis indicates revenue-focused strategy',
                confidence: 0.7,
                patterns: ['revenue_strategy']
            });
        }
        if (response.toLowerCase().includes('market share') || response.toLowerCase().includes('competition')) {
            insights.push({
                content: 'Competitive positioning analysis shows market awareness',
                confidence: 0.8,
                patterns: ['competitive_awareness']
            });
        }
        return insights;
    }
    extractCompetitorMentions(response) {
        // Simplified implementation - would use entity recognition
        const competitors = [];
        const lowerResponse = response.toLowerCase();
        // Common competitor indicators
        if (lowerResponse.includes('amazon'))
            competitors.push('amazon');
        if (lowerResponse.includes('google'))
            competitors.push('google');
        if (lowerResponse.includes('microsoft'))
            competitors.push('microsoft');
        if (lowerResponse.includes('apple'))
            competitors.push('apple');
        return competitors;
    }
    extractPartnershipMentions(response) {
        // Implementation for partnership extraction
        return [];
    }
    extractMarketPosition(response) {
        if (response.toLowerCase().includes('market leader') || response.toLowerCase().includes('dominant')) {
            return {
                description: 'Market leadership position indicated',
                confidence: 0.8
            };
        }
        return null;
    }
    extractTechStack(response) {
        const techStack = [];
        const lowerResponse = response.toLowerCase();
        // Common technologies
        if (lowerResponse.includes('react'))
            techStack.push('React');
        if (lowerResponse.includes('python'))
            techStack.push('Python');
        if (lowerResponse.includes('aws'))
            techStack.push('AWS');
        if (lowerResponse.includes('kubernetes'))
            techStack.push('Kubernetes');
        return techStack;
    }
    extractTechInnovations(response) {
        // Implementation for tech innovation extraction
        return [];
    }
    extractTechVulnerabilities(response) {
        // Implementation for vulnerability extraction
        return [];
    }
    extractStrategicInitiatives(response) {
        // Implementation for strategic initiative extraction
        return [];
    }
    extractMarketOpportunities(response) {
        // Implementation for market opportunity extraction
        return [];
    }
    extractThreats(response) {
        // Implementation for threat extraction
        return [];
    }
    // Utility methods
    groupResponsesByPrompt(responses) {
        const groups = new Map();
        for (const response of responses) {
            if (!groups.has(response.promptType)) {
                groups.set(response.promptType, []);
            }
            groups.get(response.promptType).push(response);
        }
        return groups;
    }
    groupMemoriesByType(memories) {
        const groups = {};
        for (const memory of memories) {
            if (!groups[memory.memoryType]) {
                groups[memory.memoryType] = [];
            }
            groups[memory.memoryType].push(memory);
        }
        return groups;
    }
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    // Database query methods
    async getDomainData(domainId) {
        const query = `SELECT * FROM domains WHERE id = $1`;
        const result = await this.pool.query(query, [domainId]);
        return result.rows[0];
    }
    async getDomainResponses(domainId) {
        const query = `
      SELECT id, domain_id, model, prompt_type, response, created_at
      FROM domain_responses 
      WHERE domain_id = $1 
      ORDER BY created_at DESC
    `;
        const result = await this.pool.query(query, [domainId]);
        return result.rows.map(row => ({
            id: row.id,
            domainId: row.domain_id,
            model: row.model,
            promptType: row.prompt_type,
            response: row.response,
            createdAt: row.created_at
        }));
    }
}
exports.DomainProcessingIntegration = DomainProcessingIntegration;
