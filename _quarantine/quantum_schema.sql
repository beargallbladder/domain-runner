
-- Quantum forecast cards table
CREATE TABLE IF NOT EXISTS quantum_forecast_cards (
    card_id VARCHAR(255) PRIMARY KEY,
    domain_id UUID NOT NULL,
    card_data JSONB NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Quantum entanglements table
CREATE TABLE IF NOT EXISTS quantum_entanglements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_a_id UUID NOT NULL,
    domain_b_id UUID NOT NULL,
    entanglement_entropy REAL NOT NULL,
    correlation_strength VARCHAR(20) NOT NULL,
    measurement_timestamp TIMESTAMP DEFAULT NOW(),
    UNIQUE(domain_a_id, domain_b_id)
);

-- Quantum anomalies table
CREATE TABLE IF NOT EXISTS quantum_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL,
    anomaly_type VARCHAR(50) NOT NULL,
    strength REAL NOT NULL,
    confidence REAL NOT NULL,
    detected_at TIMESTAMP DEFAULT NOW(),
    quantum_signature JSONB
);

-- Quantum states table
CREATE TABLE IF NOT EXISTS quantum_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL,
    state_vector JSONB NOT NULL,
    uncertainty REAL NOT NULL,
    measurement_timestamp TIMESTAMP DEFAULT NOW(),
    UNIQUE(domain_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quantum_forecast_cards_domain_id ON quantum_forecast_cards(domain_id);
CREATE INDEX IF NOT EXISTS idx_quantum_forecast_cards_tier ON quantum_forecast_cards(tier);
CREATE INDEX IF NOT EXISTS idx_quantum_entanglements_entropy ON quantum_entanglements(entanglement_entropy);
CREATE INDEX IF NOT EXISTS idx_quantum_anomalies_domain_id ON quantum_anomalies(domain_id);
CREATE INDEX IF NOT EXISTS idx_quantum_anomalies_detected_at ON quantum_anomalies(detected_at);
CREATE INDEX IF NOT EXISTS idx_quantum_states_domain_id ON quantum_states(domain_id);
            