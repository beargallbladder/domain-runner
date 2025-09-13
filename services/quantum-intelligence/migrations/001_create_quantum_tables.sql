-- Quantum Intelligence Tables Migration
-- This creates NEW tables only - does NOT modify any existing tables
-- Safe to run multiple times (idempotent)

-- 1. Quantum States Table
-- Stores quantum superposition states for each domain
CREATE TABLE IF NOT EXISTS quantum_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id),
    
    -- Quantum state representation
    quantum_coefficients FLOAT[] NOT NULL, -- Complex numbers as [real, imag, real, imag...]
    basis_states TEXT[] NOT NULL, -- ['positive', 'negative', 'neutral', 'emerging']
    measurement_probabilities JSONB NOT NULL, -- {"positive": 0.25, "negative": 0.5, ...}
    
    -- Quantum metrics
    uncertainty_score FLOAT NOT NULL, -- Shannon entropy normalized [0,1]
    coherence_time_hours FLOAT, -- How long state remains coherent
    decoherence_rate FLOAT, -- Rate of information loss
    
    -- Metadata
    llm_count INTEGER NOT NULL, -- Number of LLMs contributing
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- When to recalculate
    
    -- Prevent duplicate calculations
    UNIQUE(domain_id, computed_at)
);

-- 2. Quantum Entanglements Table
-- Stores pairwise brand entanglements
CREATE TABLE IF NOT EXISTS quantum_entanglements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_a_id UUID NOT NULL REFERENCES domains(id),
    domain_b_id UUID NOT NULL REFERENCES domains(id),
    
    -- Entanglement metrics
    entanglement_entropy FLOAT NOT NULL, -- Von Neumann entropy
    quantum_distance FLOAT NOT NULL, -- Fidelity-based distance [0,1]
    correlation_strength TEXT NOT NULL CHECK (correlation_strength IN ('strong', 'moderate', 'weak', 'none')),
    
    -- Shared quantum properties
    shared_eigenstates JSONB, -- Common perception patterns
    phase_correlation FLOAT, -- How aligned their phases are
    
    -- Metadata
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure A < B for unique pairs
    CONSTRAINT ensure_order CHECK (domain_a_id < domain_b_id),
    UNIQUE(domain_a_id, domain_b_id, computed_at)
);

-- 3. Quantum Anomalies Table
-- Detects unusual quantum behavior indicating viral potential
CREATE TABLE IF NOT EXISTS quantum_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id),
    
    -- Anomaly details
    anomaly_type TEXT NOT NULL CHECK (anomaly_type IN (
        'strong_collapse', -- Sudden consensus
        'phase_alignment', -- Unusual LLM agreement
        'entanglement_spike', -- Sudden correlation increase
        'decoherence_event', -- Information loss event
        'quantum_tunneling' -- Unexpected state transition
    )),
    
    -- Metrics
    strength FLOAT NOT NULL CHECK (strength >= 0 AND strength <= 1),
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Predictions
    cascade_probability FLOAT CHECK (cascade_probability >= 0 AND cascade_probability <= 1),
    time_to_event_hours INTEGER,
    
    -- Context
    description TEXT NOT NULL,
    recommendation TEXT,
    affected_models TEXT[], -- Which LLMs showed the anomaly
    
    -- Status tracking
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    outcome TEXT -- What actually happened
);

-- 4. Cascade Predictions Table
-- Stores viral cascade predictions for validation
CREATE TABLE IF NOT EXISTS cascade_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id),
    
    -- Prediction details
    trigger_type TEXT NOT NULL, -- What caused the prediction
    cascade_probability FLOAT NOT NULL CHECK (cascade_probability >= 0 AND cascade_probability <= 1),
    predicted_reach INTEGER, -- Estimated viral reach
    time_to_cascade_hours INTEGER NOT NULL,
    
    -- Quantum evidence
    quantum_state_id UUID REFERENCES quantum_states(id),
    anomaly_ids UUID[], -- Related anomalies
    entangled_domains UUID[], -- Domains that might be affected
    
    -- Validation
    predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prediction_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Outcome tracking
    actual_occurred BOOLEAN,
    actual_reach INTEGER,
    accuracy_score FLOAT,
    validated_at TIMESTAMP WITH TIME ZONE
);

-- 5. Quantum Analysis Log
-- Tracks all quantum calculations for debugging
CREATE TABLE IF NOT EXISTS quantum_analysis_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES domains(id),
    
    -- Operation details
    operation_type TEXT NOT NULL,
    input_data JSONB,
    output_data JSONB,
    
    -- Performance
    calculation_time_ms INTEGER,
    memory_used_mb FLOAT,
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'timeout')),
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quantum_states_domain_computed 
    ON quantum_states(domain_id, computed_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_quantum_states_uncertainty 
    ON quantum_states(uncertainty_score DESC);
    
CREATE INDEX IF NOT EXISTS idx_quantum_entanglements_domains 
    ON quantum_entanglements(domain_a_id, domain_b_id);
    
CREATE INDEX IF NOT EXISTS idx_quantum_entanglements_strength 
    ON quantum_entanglements(entanglement_entropy DESC);
    
CREATE INDEX IF NOT EXISTS idx_quantum_anomalies_domain_detected 
    ON quantum_anomalies(domain_id, detected_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_quantum_anomalies_unresolved 
    ON quantum_anomalies(resolved_at) WHERE resolved_at IS NULL;
    
CREATE INDEX IF NOT EXISTS idx_cascade_predictions_domain 
    ON cascade_predictions(domain_id, predicted_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_cascade_predictions_validation 
    ON cascade_predictions(prediction_window_end) WHERE actual_occurred IS NULL;

-- Views for easy querying
CREATE OR REPLACE VIEW quantum_domain_summary AS
SELECT 
    d.domain,
    qs.measurement_probabilities,
    qs.uncertainty_score,
    qs.computed_at,
    COUNT(DISTINCT qa.id) as active_anomalies,
    MAX(cp.cascade_probability) as max_cascade_risk
FROM domains d
LEFT JOIN quantum_states qs ON d.id = qs.domain_id
    AND qs.computed_at = (
        SELECT MAX(computed_at) 
        FROM quantum_states 
        WHERE domain_id = d.id
    )
LEFT JOIN quantum_anomalies qa ON d.id = qa.domain_id 
    AND qa.resolved_at IS NULL
LEFT JOIN cascade_predictions cp ON d.id = cp.domain_id
    AND cp.prediction_window_end > NOW()
    AND cp.actual_occurred IS NULL
GROUP BY d.id, d.domain, qs.measurement_probabilities, qs.uncertainty_score, qs.computed_at;

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO quantum_reader;
-- GRANT INSERT, UPDATE ON quantum_states, quantum_entanglements, quantum_anomalies, cascade_predictions, quantum_analysis_log TO quantum_writer;

-- Migration tracking
CREATE TABLE IF NOT EXISTS quantum_migrations (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL UNIQUE,
    description TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO quantum_migrations (version, description) 
VALUES (1, 'Initial quantum tables creation')
ON CONFLICT (version) DO NOTHING;