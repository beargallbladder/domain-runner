interface TeslaJOLTEvent {
    id: string;
    phase: 'government_entry' | 'political_exit' | 'tesla_return';
    detected_at: Date;
    confidence_score: number;
    news_signals: string[];
    market_signals: any[];
    jolt_intensity: number;
}
declare class TeslaJOLTMonitor {
    private pool;
    private newsAPIs;
    private marketAPIs;
    constructor();
    /**
     * PHASE 1: Government Entry Detection
     * Target: Detect when Musk joins Trump administration/DOGE
     */
    detectGovernmentEntry(): Promise<TeslaJOLTEvent | null>;
    /**
     * PHASE 2: Political Exit Detection
     * Target: Detect when Musk leaves government/feuds with Trump
     */
    detectPoliticalExit(): Promise<TeslaJOLTEvent | null>;
    /**
     * PHASE 3: Tesla Return Detection
     * Target: Detect when Musk recommits to Tesla full-time
     */
    detectTeslaReturn(): Promise<TeslaJOLTEvent | null>;
    /**
     * Calculate JOLT Immunity Index
     * How quickly Tesla's AI perception recovers from JOLT events
     */
    calculateJOLTImmunityIndex(joltEventId: string): Promise<number>;
    /**
     * Capture AI Perception Baseline
     * Take snapshot of all AI model perceptions before JOLT
     */
    capturePerceptionBaseline(joltEventId: string): Promise<void>;
    /**
     * Monitor Recovery Timeline
     * Track how long it takes for AI perception to return to baseline
     */
    monitorRecoveryTimeline(joltEventId: string): Promise<void>;
    /**
     * Generate Enterprise Case Study Data
     * Create business intelligence from JOLT analysis
     */
    generateCaseStudyData(joltEventId: string): Promise<any>;
    /**
     * Real-time Tesla JOLT Detection Engine
     * Continuously monitor for all three JOLT phases
     */
    startTeslaJOLTDetection(): Promise<void>;
    private calculateNewsIntensity;
    private getMarketVolatility;
    private generateJOLTId;
    private calculateJOLTIntensity;
    private storeJOLTEvent;
    private triggerDomainProcessing;
    private calculateVariance;
    private getDaysSinceJOLT;
    private getJOLTEventData;
    private calculatePerceptionDrift;
    private analyzeModelDivergence;
    private calculateBusinessImpact;
    private storeCaseStudyData;
    private detectSentimentShift;
    private getMarketData;
    private detectStockRecovery;
    private calculatePredictionAccuracy;
    private identifySimilarRisks;
    private generateMonitoringRecommendations;
    getRecentJOLTEvents(): Promise<TeslaJOLTEvent[]>;
}
export default TeslaJOLTMonitor;
//# sourceMappingURL=tesla-jolt-monitor.d.ts.map