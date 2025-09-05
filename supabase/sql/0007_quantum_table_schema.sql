-- Mirror of sql/0007_quantum_table_schema.sql
-- Quantum foundational table schemas for revolutionary platform capabilities

-- Quantum Strategic States Table
CREATE TABLE quantum_strategic_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    coherent_strategies JSONB NOT NULL, -- Array of {action: string, amplitude: number}[]
    probability_amplitudes NUMERIC[] NOT NULL, -- Quantum probability weights array
    entanglement_matrix NUMERIC[][], -- 2D array of strategy interdependencies
    decoherence_timeline TIMESTAMP WITH TIME ZONE, -- When quantum uncertainty resolves
    observer_effects JSONB DEFAULT '{}', -- How external monitoring changes strategies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-Domain Strategic Patterns Table
CREATE TABLE strategic_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature_hash TEXT NOT NULL, -- Unique mathematical fingerprint
    abstraction_level INTEGER NOT NULL CHECK (abstraction_level >= 1 AND abstraction_level <= 10),
    success_domains TEXT[] NOT NULL DEFAULT '{}',
    failure_domains TEXT[] DEFAULT '{}',
    structural_invariants JSONB NOT NULL, -- Core mathematical structure preservation rules
    adaptation_vector VECTOR(128), -- pgvector embedding for pattern matching
    confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    success_rate NUMERIC DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recursive Belief Networks Table
CREATE TABLE belief_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    max_belief_depth INTEGER NOT NULL DEFAULT 3,
    belief_structure JSONB NOT NULL, -- Nested belief representation
    convergence_threshold NUMERIC DEFAULT 0.01,
    update_frequency NUMERIC DEFAULT 0.1, -- Probability of belief updates per iteration
    evolution_trajectory JSONB DEFAULT '{}', -- Historical belief evolution
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quantum_strategic_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE belief_networks ENABLE ROW LEVEL SECURITY;

-- Anonymous read/insert policies
CREATE POLICY read_anon_qss ON quantum_strategic_states FOR SELECT USING (true);
CREATE POLICY insert_anon_qss ON quantum_strategic_states FOR INSERT WITH CHECK (auth.role() = 'anon');
CREATE POLICY read_anon_patterns ON strategic_patterns FOR SELECT USING (true);
CREATE POLICY insert_anon_patterns ON strategic_patterns FOR INSERT WITH CHECK (auth.role() = 'anon');
CREATE POLICY read_anon_beliefs ON belief_networks FOR SELECT USING (true);
CREATE POLICY insert_anon_beliefs ON belief_networks FOR INSERT WITH CHECK (auth.role() = 'anon');

-- Performance indexes
CREATE INDEX idx_quantum_states_run_id ON quantum_strategic_states(run_id);
CREATE INDEX idx_quantum_states_player ON quantum_strategic_states(player_id);
CREATE INDEX idx_strategic_patterns_signature ON strategic_patterns(signature_hash);
CREATE INDEX idx_strategic_patterns_abstraction ON strategic_patterns(abstraction_level);
CREATE INDEX idx_strategic_patterns_success_rate ON strategic_patterns(success_rate);
CREATE INDEX idx_belief_networks_run_id ON belief_networks(run_id);
CREATE INDEX idx_belief_networks_depth ON belief_networks(max_belief_depth);

-- Vector search for strategic patterns
CREATE INDEX idx_strategic_patterns_vector ON strategic_patterns USING ivfflat (adaptation_vector vector_l2_ops) WITH (lists = 100);