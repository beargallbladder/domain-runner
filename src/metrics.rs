use prometheus::{Encoder, IntCounter, Histogram, Registry, TextEncoder};
use std::sync::Arc;

/// Metrics collector for observability
#[derive(Clone)]
pub struct Metrics {
    pub requests_total: IntCounter,
    pub drift_detected: IntCounter,
    pub response_time: Histogram,
    registry: Arc<Registry>,
}

impl Metrics {
    pub fn new() -> Self {
        let registry = Registry::new();

        let requests_total = IntCounter::new(
            "domain_runner_requests_total",
            "Total number of requests processed"
        ).expect("metric creation");

        let drift_detected = IntCounter::new(
            "domain_runner_drift_detected_total",
            "Total number of drift detections"
        ).expect("metric creation");

        let response_time = Histogram::with_opts(
            prometheus::HistogramOpts::new(
                "domain_runner_response_time_seconds",
                "Response time in seconds"
            )
        ).expect("metric creation");

        registry.register(Box::new(requests_total.clone())).expect("metric registration");
        registry.register(Box::new(drift_detected.clone())).expect("metric registration");
        registry.register(Box::new(response_time.clone())).expect("metric registration");

        Self {
            requests_total,
            drift_detected,
            response_time,
            registry: Arc::new(registry),
        }
    }

    /// Export metrics in Prometheus format
    pub fn export(&self) -> String {
        let encoder = TextEncoder::new();
        let metric_families = self.registry.gather();
        let mut buffer = vec![];
        encoder.encode(&metric_families, &mut buffer).unwrap();
        String::from_utf8(buffer).unwrap()
    }
}

impl Default for Metrics {
    fn default() -> Self {
        Self::new()
    }
}