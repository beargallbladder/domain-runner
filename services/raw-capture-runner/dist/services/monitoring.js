"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = void 0;
const database_1 = require("../config/database");
const events_1 = require("events");
class MonitoringService extends events_1.EventEmitter {
    constructor() {
        super();
        this.metricsBuffer = new Map();
        this.lastFlush = new Date();
        this.flushInterval = setInterval(() => this.flushMetrics(), 60000); // Flush every minute
    }
    static getInstance() {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }
    // Increment a metric counter
    async incrementMetric(name, value = 1) {
        const current = this.metricsBuffer.get(name) || 0;
        this.metricsBuffer.set(name, current + value);
    }
    // Record response time
    async recordLatency(operation, latencyMs) {
        await this.logMetric('latency', {
            operation,
            latencyMs,
            timestamp: new Date().toISOString()
        });
    }
    // Log an error
    async logError(error, context) {
        await this.logMetric('error', {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    }
    // Log domain processing
    async logDomainProcessing(domainId, status, details) {
        await this.logMetric('domain_processing', {
            domainId,
            status,
            details,
            timestamp: new Date().toISOString()
        });
    }
    // Get processing statistics
    async getStats(timeframe = '24h') {
        const timeframeMap = {
            '1h': 'INTERVAL \'1 hour\'',
            '24h': 'INTERVAL \'24 hours\'',
            '7d': 'INTERVAL \'7 days\''
        };
        const stats = await (0, database_1.query)(`
      SELECT
        COUNT(*) as total_responses,
        AVG(token_count) as avg_tokens,
        AVG(latency_ms) as avg_latency,
        COUNT(DISTINCT domain_id) as unique_domains,
        COUNT(NULLIF(error, '')) as error_count
      FROM responses
      WHERE created_at > NOW() - ${timeframeMap[timeframe]}
    `);
        const domainStats = await (0, database_1.query)(`
      SELECT
        status,
        COUNT(*) as count
      FROM domains
      WHERE last_processed_at > NOW() - ${timeframeMap[timeframe]}
      GROUP BY status
    `);
        return {
            responses: stats.rows[0],
            domains: domainStats.rows
        };
    }
    // Private method to log metrics to database
    async logMetric(type, data) {
        await (0, database_1.query)('INSERT INTO processing_logs (event_type, details) VALUES ($1, $2)', [type, data]);
        // Emit event for real-time monitoring
        this.emit('metric', { type, data });
        // Check for alerts
        await this.checkAlerts(type, data);
    }
    // Private method to flush metrics to database
    async flushMetrics() {
        const metrics = Object.fromEntries(this.metricsBuffer);
        if (Object.keys(metrics).length > 0) {
            await this.logMetric('metrics_flush', {
                metrics,
                period_start: this.lastFlush.toISOString(),
                period_end: new Date().toISOString()
            });
        }
        this.metricsBuffer.clear();
        this.lastFlush = new Date();
    }
    // Private method to check for alert conditions
    async checkAlerts(type, data) {
        // Error rate alert
        if (type === 'error') {
            const errorCount = await (0, database_1.query)(`
        SELECT COUNT(*) as count
        FROM processing_logs
        WHERE event_type = 'error'
        AND created_at > NOW() - INTERVAL '5 minutes'
      `);
            if (errorCount.rows[0].count > 10) {
                this.emit('alert', {
                    level: 'critical',
                    message: 'High error rate detected',
                    count: errorCount.rows[0].count,
                    timestamp: new Date().toISOString()
                });
            }
        }
        // Latency alert
        if (type === 'latency' && data.latencyMs > 5000) {
            this.emit('alert', {
                level: 'warning',
                message: 'High latency detected',
                latency: data.latencyMs,
                operation: data.operation,
                timestamp: new Date().toISOString()
            });
        }
    }
    // Cleanup
    async cleanup() {
        clearInterval(this.flushInterval);
    }
}
exports.MonitoringService = MonitoringService;
