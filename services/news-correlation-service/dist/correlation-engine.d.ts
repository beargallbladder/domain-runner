export interface CorrelationResult {
    correlations_created: number;
    events_processed: number;
    domains_analyzed: string[];
}
export declare class CorrelationEngine {
    processCorrelations(): Promise<CorrelationResult>;
    private getRecentEvents;
    private findPerceptionCorrelations;
    private calculateModelScores;
    private calculatePerceptionScore;
    private calculateCorrelationStrength;
}
export declare const correlationEngine: CorrelationEngine;
//# sourceMappingURL=correlation-engine.d.ts.map