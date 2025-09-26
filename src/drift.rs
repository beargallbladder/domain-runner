use crate::domain::{DriftScore, DriftStatus};
use crate::error::Result;
use chrono::Utc;
use nalgebra::{DVector, Vector3};
use uuid::Uuid;

/// Drift detection engine with explicit calculations
pub struct DriftEngine {
    self_weight: f32,
    peer_weight: f32,
    canonical_weight: f32,
}

impl DriftEngine {
    pub fn new() -> Self {
        Self {
            self_weight: 0.4,
            peer_weight: 0.35,
            canonical_weight: 0.25,
        }
    }

    /// Calculate cosine similarity between two embeddings
    /// This is explicit - no hidden behavior
    pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        assert_eq!(a.len(), b.len(), "Embeddings must have same dimension");

        let a_vec = DVector::from_row_slice(a);
        let b_vec = DVector::from_row_slice(b);

        let dot_product = a_vec.dot(&b_vec);
        let norm_a = a_vec.norm();
        let norm_b = b_vec.norm();

        if norm_a == 0.0 || norm_b == 0.0 {
            return 0.0;
        }

        // Normalize to 0-1 range
        let similarity = dot_product / (norm_a * norm_b);
        (similarity + 1.0) / 2.0
    }

    /// Calculate drift score from individual components
    /// Every weight and calculation is explicit
    pub fn calculate_drift_score(
        &self,
        self_similarity: f32,
        peer_similarity: f32,
        canonical_similarity: f32,
    ) -> f32 {
        // Validate inputs are in [0, 1]
        assert!(
            (0.0..=1.0).contains(&self_similarity),
            "Self similarity must be in [0, 1]"
        );
        assert!(
            (0.0..=1.0).contains(&peer_similarity),
            "Peer similarity must be in [0, 1]"
        );
        assert!(
            (0.0..=1.0).contains(&canonical_similarity),
            "Canonical similarity must be in [0, 1]"
        );

        // Weighted average - explicit calculation
        let drift_score = self_similarity * self.self_weight
            + peer_similarity * self.peer_weight
            + canonical_similarity * self.canonical_weight;

        // Ensure result is in [0, 1]
        drift_score.clamp(0.0, 1.0)
    }

    /// Determine drift status from score
    pub fn classify_drift(&self, drift_score: f32) -> DriftStatus {
        match drift_score {
            s if s >= 0.8 => DriftStatus::Stable,
            s if s >= 0.5 => DriftStatus::Drifting,
            _ => DriftStatus::Decayed,
        }
    }

    /// Calculate drift between consecutive embeddings
    pub fn calculate_temporal_drift(&self, embeddings: &[Vec<f32>]) -> Vec<f32> {
        if embeddings.len() < 2 {
            return vec![];
        }

        embeddings
            .windows(2)
            .map(|pair| {
                let similarity = Self::cosine_similarity(&pair[0], &pair[1]);
                1.0 - similarity // Convert similarity to drift
            })
            .collect()
    }

    /// Create a drift score record
    pub fn create_drift_score(
        &self,
        domain: String,
        prompt_id: String,
        model: String,
        current_embedding: &[f32],
        previous_embedding: &[f32],
    ) -> DriftScore {
        let similarity = Self::cosine_similarity(current_embedding, previous_embedding);
        let drift = 1.0 - similarity;
        let status = self.classify_drift(similarity);

        let explanation = match status {
            DriftStatus::Stable => Some("Response remains consistent".to_string()),
            DriftStatus::Drifting => {
                Some(format!("Drift detected: {:.2}% change", drift * 100.0))
            }
            DriftStatus::Decayed => Some(format!(
                "Severe drift: {:.2}% deviation from baseline",
                drift * 100.0
            )),
        };

        DriftScore {
            drift_id: Uuid::new_v4(),
            domain,
            prompt_id,
            model,
            ts_iso: Utc::now(),
            similarity_prev: similarity,
            drift_score: drift,
            status,
            explanation,
        }
    }

    /// Calculate ensemble drift across multiple models
    pub fn calculate_ensemble_drift(&self, model_drifts: &[f32]) -> f32 {
        if model_drifts.is_empty() {
            return 0.0;
        }

        let sum: f32 = model_drifts.iter().sum();
        let mean = sum / model_drifts.len() as f32;

        // Calculate standard deviation
        let variance: f32 = model_drifts
            .iter()
            .map(|d| (d - mean).powi(2))
            .sum::<f32>()
            / model_drifts.len() as f32;

        let std_dev = variance.sqrt();

        // High variance indicates inconsistent drift across models
        if std_dev > 0.2 {
            // Models disagree - potential issue
            mean + std_dev
        } else {
            // Models agree - use average
            mean
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert_eq!(DriftEngine::cosine_similarity(&a, &b), 1.0);

        let c = vec![0.0, 1.0, 0.0];
        assert_eq!(DriftEngine::cosine_similarity(&a, &c), 0.5);
    }

    #[test]
    fn test_drift_classification() {
        let engine = DriftEngine::new();

        assert_eq!(engine.classify_drift(0.9), DriftStatus::Stable);
        assert_eq!(engine.classify_drift(0.6), DriftStatus::Drifting);
        assert_eq!(engine.classify_drift(0.3), DriftStatus::Decayed);
    }

    #[test]
    fn test_drift_score_calculation() {
        let engine = DriftEngine::new();
        let score = engine.calculate_drift_score(0.8, 0.7, 0.9);
        assert!((0.0..=1.0).contains(&score));
        assert!((score - 0.79).abs() < 0.01); // Approximately 0.79
    }
}