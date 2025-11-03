/*!
Sentinel Drift Detection System (PRD_05)
Simplified version for initial deployment (without ML dependencies)
TODO: Add rust-bert embeddings with libtorch dependencies
*/

use anyhow::Result;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug)]
pub struct DriftAnalysis {
    pub drift_id: Uuid,
    pub domain: String,
    pub model: String,
    pub prompt_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub similarity_prev: f32,
    pub drift_score: f32,
    pub status: String,
    pub explanation: String,
}

pub struct SentinelDetector {
    threshold_stable: f32,
    threshold_decayed: f32,
}

impl SentinelDetector {
    pub async fn new() -> Result<Self> {
        Ok(Self {
            threshold_stable: 0.3,
            threshold_decayed: 0.7,
        })
    }

    pub async fn compute_drift(
        &self,
        current_answer: &str,
        baseline_answer: &str,
        domain: &str,
        model: &str,
        prompt_id: Uuid,
    ) -> DriftAnalysis {
        // Handle empty/malformed cases
        if current_answer.trim().len() < 10 {
            return DriftAnalysis {
                drift_id: Uuid::new_v4(),
                domain: domain.to_string(),
                model: model.to_string(),
                prompt_id,
                timestamp: Utc::now(),
                similarity_prev: 0.0,
                drift_score: 1.0,
                status: "decayed".to_string(),
                explanation: "Current answer is empty or too short".to_string(),
            };
        }

        if baseline_answer.trim().len() < 10 {
            return DriftAnalysis {
                drift_id: Uuid::new_v4(),
                domain: domain.to_string(),
                model: model.to_string(),
                prompt_id,
                timestamp: Utc::now(),
                similarity_prev: 1.0,
                drift_score: 0.0,
                status: "stable".to_string(),
                explanation: "No baseline available (first measurement)".to_string(),
            };
        }

        // Use Jaccard similarity on word tokens (simplified version)
        // TODO: Replace with rust-bert embeddings for production
        let similarity = jaccard_similarity(current_answer, baseline_answer);
        let similarity = similarity.clamp(0.0, 1.0);

        // Compute drift score
        let drift_score = 1.0 - similarity;

        // Classify based on thresholds
        let (status, explanation) = if drift_score < self.threshold_stable {
            (
                "stable".to_string(),
                format!("Answer is consistent with baseline (similarity: {:.2})", similarity),
            )
        } else if drift_score < self.threshold_decayed {
            (
                "drifting".to_string(),
                format!("Answer shows moderate drift from baseline (similarity: {:.2})", similarity),
            )
        } else {
            (
                "decayed".to_string(),
                format!("Answer has significantly decayed from baseline (similarity: {:.2})", similarity),
            )
        };

        DriftAnalysis {
            drift_id: Uuid::new_v4(),
            domain: domain.to_string(),
            model: model.to_string(),
            prompt_id,
            timestamp: Utc::now(),
            similarity_prev: similarity,
            drift_score,
            status,
            explanation,
        }
    }
}

/// Simplified Jaccard similarity on word tokens
/// TODO: Replace with semantic embeddings (rust-bert) for production
fn jaccard_similarity(a: &str, b: &str) -> f32 {
    use std::collections::HashSet;

    let words_a: HashSet<&str> = a.split_whitespace().collect();
    let words_b: HashSet<&str> = b.split_whitespace().collect();

    if words_a.is_empty() && words_b.is_empty() {
        return 1.0;
    }

    if words_a.is_empty() || words_b.is_empty() {
        return 0.0;
    }

    let intersection = words_a.intersection(&words_b).count();
    let union = words_a.union(&words_b).count();

    if union == 0 {
        return 0.0;
    }

    intersection as f32 / union as f32
}
