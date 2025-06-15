#!/usr/bin/env typescript
/**
 * COHORT INTELLIGENCE SYSTEM - COMPREHENSIVE COMPETITIVE ANALYSIS
 * ================================================================
 *
 * MISSION CRITICAL: Ensure tight, meaningful competitor cohorts are ALWAYS available
 *
 * This system creates ultra-precise competitive groupings like:
 * - Texas Instruments vs NXP vs Analog Devices (Semiconductor Companies)
 * - Stripe vs PayPal vs Square (Payment Processing)
 * - Distributors vs Distributors (Electronic Component Distribution)
 *
 * ARCHITECTURE PRINCIPLES:
 * 1. Scientific Neutrality - "Beacon of trust, not Fox News"
 * 2. Tight Cohorts - Maximum 8 companies per group for meaningful comparison
 * 3. Dynamic Discovery - Automatically find and classify new competitors
 * 4. Real-time Updates - Cohorts refresh as new domains are processed
 * 5. API-Ready - Frontend can consume cohorts immediately
 */
interface CohortMember {
    domain: string;
    score: number;
    ai_consensus: number;
    model_count: number;
    reputation_risk: number;
    updated_at: string;
    modelsPositive: number;
    modelsNeutral: number;
    modelsNegative: number;
    rank: number;
    gap_to_leader: number;
    competitive_position: 'EXCELLENT' | 'STRONG' | 'AVERAGE' | 'WEAK' | 'CRITICAL';
}
interface CohortAnalysis {
    cohort_name: string;
    total_companies: number;
    average_score: number;
    score_range: number;
    leader: CohortMember;
    laggard: CohortMember;
    members: CohortMember[];
    competitive_narrative: string;
    last_updated: string;
}
export declare class CohortIntelligenceSystem {
    private pool;
    private openaiClient;
    private anthropicClient;
    private readonly PRECISION_COHORTS;
    constructor();
    generateComprehensiveCohorts(): Promise<Record<string, CohortAnalysis>>;
    private getDomainsWithScores;
    private buildCohortMembers;
    private isDomainInCohort;
    private calculateCompetitivePosition;
    private analyzeCohort;
    private generateCompetitiveNarrative;
    private discoverMissingCompetitors;
    private extractDomainsFromResponse;
    private queueDomainsForProcessing;
    generateCohortAPI(): Promise<any>;
    ensureCohortTables(): Promise<void>;
    getSystemHealth(): Promise<any>;
    close(): Promise<void>;
}
export default CohortIntelligenceSystem;
//# sourceMappingURL=cohort-intelligence-system.d.ts.map