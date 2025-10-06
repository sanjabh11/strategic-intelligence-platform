-- Migration: Evidence Retrieval and Collective Intelligence Features
-- Creates tables and indexes for evidence-based analysis and collaborative intelligence
-- Provides foundation for CBR/Perplexity integration and real-time collaboration

-- Evidence Sources Table for Retrieval System
CREATE TABLE IF NOT EXISTS evidence_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT,
    snippet TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('academic', 'news', 'expert', 'historical', 'web')),
    credibility_score NUMERIC NOT NULL CHECK (credibility_score >= 0 AND credibility_score <= 1),
    temporal_distance INTEGER NOT NULL, -- Days since publication
    retrieval_count INTEGER DEFAULT 0,
    last_retrieved TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    citation_apa TEXT,
    citation_mla TEXT,
    citation_chicago TEXT,
    embedding VECTOR(768), -- For semantic search similarity
    metadata JSONB DEFAULT '{}', -- Flexible metadata storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evidence Citations Table
CREATE TABLE IF NOT EXISTS evidence_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    evidence_source_id UUID REFERENCES evidence_sources(id) ON DELETE CASCADE,
    citation_style TEXT NOT NULL CHECK (citation_style IN ('apa', 'mla', 'chicago')),
    usage_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Collective Intelligence Tables
CREATE TABLE IF NOT EXISTS collaborative_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    scenario_config JSONB NOT NULL DEFAULT '{}', -- Analysis scenario setup
    creator_id TEXT, -- Anonymous identifier for creator
    max_participants INTEGER DEFAULT 20,
    current_participants INTEGER DEFAULT 1,
    session_status TEXT NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'expired', 'cancelled')),
    realtime_collaboration BOOLEAN DEFAULT true,
    consensus_threshold NUMERIC DEFAULT 0.7, -- 0-1 consensus required
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours'),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL, -- Anonymous identifier
    participant_role TEXT DEFAULT 'analyst' CHECK (participant_role IN ('lead_analyst', 'analyst', 'observer', 'facilitator')),
    expertise_area TEXT[], -- Array of expertise domains
    contribution_score NUMERIC DEFAULT 0, -- Aggregate contribution score
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collective_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    insight_text TEXT NOT NULL,
    confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    insight_category TEXT CHECK (insight_category IN ('strategic', 'risk', 'opportunity', 'evidence_based', 'consensus')),
    supporting_evidence JSONB DEFAULT '[]',
    contributor_id TEXT NOT NULL,
    consensus_votes INTEGER DEFAULT 1,
    consensus_opinions INTEGER DEFAULT 0,
    consensus_level NUMERIC DEFAULT 0.5, -- 0-1 agreement level
    insight_votes JSONB DEFAULT '{}', -- Vote tracking by participant
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insight_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id UUID REFERENCES collective_insights(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    reaction_type TEXT CHECK (reaction_type IN ('agree', 'disagree', 'needs_evidence', 'brilliant')),
    reaction_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bayesian Belief Integration Tables
CREATE TABLE IF NOT EXISTS belief_evolution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    belief_node_id UUID, -- References belief_networks(id) when that table exists
    analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    evidence_source TEXT NOT NULL,
    evidence_value NUMERIC NOT NULL,
    belief_before JSONB NOT NULL,
    belief_after JSONB NOT NULL,
    information_gain NUMERIC NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time Collaboration Tables
CREATE TABLE IF NOT EXISTS collaborative_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'analysis_update', 'evidence_sharing', 'consensus_vote')),
    message_content TEXT NOT NULL,
    message_metadata JSONB DEFAULT '{}', -- For structured messages
    attachments JSONB DEFAULT '[]', -- Evidence attachments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all new tables
ALTER TABLE evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collective_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE belief_evolution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_messages ENABLE ROW LEVEL SECURITY;

-- Anonymous read policies (consistent with platform design)
DO $$
BEGIN
  -- Evidence tables
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'evidence_sources' AND policyname = 'read_anon_evidence') THEN
    CREATE POLICY read_anon_evidence ON evidence_sources FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'evidence_citations' AND policyname = 'read_anon_citations') THEN
    CREATE POLICY read_anon_citations ON evidence_citations FOR SELECT USING (true);
  END IF;

  -- Collaborative intelligence tables
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collaborative_sessions' AND policyname = 'read_anon_sessions') THEN
    CREATE POLICY read_anon_sessions ON collaborative_sessions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_participants' AND policyname = 'read_anon_participants') THEN
    CREATE POLICY read_anon_participants ON session_participants FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collective_insights' AND policyname = 'read_anon_insights') THEN
    CREATE POLICY read_anon_insights ON collective_insights FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insight_reactions' AND policyname = 'read_anon_reactions') THEN
    CREATE POLICY read_anon_reactions ON insight_reactions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collaborative_messages' AND policyname = 'read_anon_messages') THEN
    CREATE POLICY read_anon_messages ON collaborative_messages FOR SELECT USING (true);
  END IF;
END $$;

-- Insert policies for anonymous users
DO $$
BEGIN
  CREATE POLICY insert_anon_evidence ON evidence_sources FOR INSERT WITH CHECK (auth.role() = 'anon');
  CREATE POLICY insert_anon_citations ON evidence_citations FOR INSERT WITH CHECK (auth.role() = 'anon');
  CREATE POLICY insert_anon_sessions ON collaborative_sessions FOR INSERT WITH CHECK (auth.role() = 'anon');
  CREATE POLICY insert_anon_participants ON session_participants FOR INSERT WITH CHECK (auth.role() = 'anon');
  CREATE POLICY insert_anon_insights ON collective_insights FOR INSERT WITH CHECK (auth.role() = 'anon');
  CREATE POLICY insert_anon_reactions ON insight_reactions FOR INSERT WITH CHECK (auth.role() = 'anon');
  CREATE POLICY insert_anon_messages ON collaborative_messages FOR INSERT WITH CHECK (auth.role() = 'anon');
EXCEPTION WHEN OTHERS THEN
  -- Policy might already exist, continue
END $$;

-- Comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidence_sources_type ON evidence_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_evidence_sources_credibility ON evidence_sources(credibility_score);
CREATE INDEX IF NOT EXISTS idx_evidence_sources_temporal ON evidence_sources(temporal_distance);
CREATE INDEX IF NOT EXISTS idx_evidence_sources_embedding ON evidence_sources USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_evidence_citations_analysis ON evidence_citations(analysis_run_id);
CREATE INDEX IF NOT EXISTS idx_evidence_citations_evidence ON evidence_citations(evidence_source_id);

CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_status ON collaborative_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_created ON collaborative_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_expires ON collaborative_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_role ON session_participants(participant_role);

CREATE INDEX IF NOT EXISTS idx_collective_insights_session ON collective_insights(session_id);
CREATE INDEX IF NOT EXISTS idx_collective_insights_category ON collective_insights(insight_category);
CREATE INDEX IF NOT EXISTS idx_collective_insights_confidence ON collective_insights(confidence_score);
CREATE INDEX IF NOT EXISTS idx_collective_insights_consensus ON collective_insights(consensus_level);

CREATE INDEX IF NOT EXISTS idx_belief_evolution_belief_node ON belief_evolution_log(belief_node_id);
CREATE INDEX IF NOT EXISTS idx_belief_evolution_analysis ON belief_evolution_log(analysis_run_id);

CREATE INDEX IF NOT EXISTS idx_collaborative_messages_session ON collaborative_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_messages_type ON collaborative_messages(message_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_participants_active ON session_participants(session_id, last_active);
CREATE INDEX IF NOT EXISTS idx_insights_consensus_recent ON collective_insights(session_id, consensus_level, created_at);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_evidence_sources_fts ON evidence_sources USING gin(to_tsvector('english', title || ' ' || snippet));
CREATE INDEX IF NOT EXISTS idx_collective_insights_fts ON collective_insights USING gin(to_tsvector('english', insight_text));