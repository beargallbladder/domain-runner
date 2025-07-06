#!/usr/bin/env ts-node
interface AnomalyResult {
    detected: boolean;
    anomalies: Anomaly[];
    systemHealth: 'healthy' | 'degraded' | 'critical';
    recommendations: string[];
}
interface Anomaly {
    type: 'volume_drop' | 'model_failure' | 'quality_degradation' | 'coverage_gap';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedPeriod: {
        start: Date;
        end: Date;
    };
    metrics: any;
    classification: 'system_failure' | 'memory_decay' | 'mixed' | 'unknown';
}
declare class TensorAnomalyDetector {
    private pool;
    constructor();
    detectAnomalies(): Promise<AnomalyResult>;
    private getWeeklyStats;
    private detectVolumeAnomalies;
    private detectModelFailures;
    private detectQualityDegradation;
    private detectCoverageGaps;
    private classifySystemHealth;
    private generateRecommendations;
    close(): Promise<void>;
}
export { TensorAnomalyDetector, AnomalyResult, Anomaly };
//# sourceMappingURL=anomaly-detector.d.ts.map