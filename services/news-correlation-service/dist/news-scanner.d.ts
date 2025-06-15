import { NewsEvent } from './database';
export interface ScanResult {
    events: NewsEvent[];
    sources_scanned: string[];
    total_articles: number;
}
export declare class NewsScanner {
    private readonly crisisKeywords;
    private readonly eventTypeMap;
    scanGoogleNews(domains: string[]): Promise<NewsEvent[]>;
    private isRelevantCrisisNews;
    private classifyEventType;
    private calculateSentiment;
    private parseDate;
    private sleep;
    scanAllSources(domains: string[]): Promise<ScanResult>;
}
export declare const newsScanner: NewsScanner;
//# sourceMappingURL=news-scanner.d.ts.map