import { Pool } from 'pg';
declare const pool: Pool;
export interface NewsEvent {
    id?: number;
    domain: string;
    event_date: string;
    headline: string;
    source_url?: string;
    event_type: string;
    sentiment_score?: number;
    detected_at?: Date;
}
export interface PerceptionCorrelation {
    id?: number;
    news_event_id: number;
    domain: string;
    model_name: string;
    before_score: number;
    after_score: number;
    days_delta: number;
    correlation_strength: number;
    measured_at?: Date;
}
export declare class NewsCorrelationDatabase {
    storeNewsEvent(event: NewsEvent): Promise<number | null>;
    storeCorrelation(correlation: PerceptionCorrelation): Promise<void>;
    getMonitoredDomains(): Promise<string[]>;
    getRecentPerceptionData(domain: string, since: Date): Promise<any[]>;
}
export declare const db: NewsCorrelationDatabase;
export default pool;
//# sourceMappingURL=database.d.ts.map