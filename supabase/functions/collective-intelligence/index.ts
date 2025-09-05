// @ts-nocheck
// Supabase Edge Function: collective-intelligence
// Deno runtime
// Endpoint: POST /functions/v1/collective-intelligence
// Advanced real-time collaborative strategic analysis and insight aggregation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

interface CollaborativeSessionRequest {
  action: 'create_session' | 'join_session' | 'leave_session' | 'contribute_insight' | 'vote_insight' | 'update_analysis' | 'get_analytics';
  sessionConfig?: {
    title: string;
    description: string;
    scenarioText: string;
    maxParticipants: number;
    requiresExpertise?: string[];
  };
  sessionId?: string;
  participantId: string;
  insightData?: {
    insightText: string;
    confidenceScore: number;
    category: 'strategic' | 'risk' | 'opportunity' | 'evidence_based' | 'consensus';
    supportingEvidence?: string[];
  };
  voteData?: {
    insightId: string;
    reactionType: 'agree' | 'disagree' | 'needs_evidence' | 'brilliant';
    reactionComment?: string;
  };
  analysisUpdate?: {
    analysisSnapshot: Record<string, any>;
    confidence: number;
    participantContributions: string[];
  };
}

interface CollaborativeResponse {
  sessionId: string;
  participantId: string;
  action: string;
  result: {
    session?: CollaborativeSession;
    insights?: CollectiveInsight[];
    analytics?: SessionAnalytics;
    participants?: SessionParticipant[];
    success: boolean;
    message: string;
  };
}

interface CollaborativeSession {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  maxParticipants: number;
  currentParticipants: number;
  sessionStatus: 'active' | 'completed' | 'expired';
  consensusThreshold: number;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
  scenarioConfig: Record<string, any>;
}

interface CollectiveInsight {
  id: string;
  insightText: string;
  confidenceScore: number;
  category: string;
  supportingEvidence: string[];
  contributorId: string;
  consensusVotes: number;
  consensusOpinions: number;
  consensusLevel: number;
  reactions: InsightReaction[];
  createdAt: string;
}

interface SessionParticipant {
  id: string;
  sessionId: string;
  participantId: string;
  participantRole: string;
  expertiseArea: string[];
  contributionScore: number;
  joinedAt: string;
  lastActive: string;
}

interface InsightReaction {
  id: string;
  participantId: string;
  reactionType: string;
  reactionComment?: string;
  createdAt: string;
}

interface SessionAnalytics {
  totalInsights: number;
  consensusLevel: number;
  participationRate: number;
  expertiseDiversity: number;
  insightQualityDistribution: Record<string, number>;
  temporalParticipation: Array<{hour: number; participants: number}>;
  collaborationMetrics: {
    averageResponseTime: number;
    consensusEvolution: Array<{timePoint: string; consensusLevel: number}>;
    expertiseSynergy: number;
  };
}

// Advanced collaborative intelligence processing
class CollectiveIntelligenceEngine {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async createSession(request: CollaborativeSessionRequest): Promise<CollaborativeSession> {
    if (!request.sessionConfig) {
      throw new Error('Session configuration required for creation');
    }

    // Generate unique participant ID if not provided
    const participantId = request.participantId || this.generateParticipantId();

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

    // Create session
    const { data: session, error } = await this.supabase
      .from('collaborative_sessions')
      .insert({
        id: sessionId,
        title: request.sessionConfig.title,
        description: request.sessionConfig.description,
        scenario_config: {
          scenarioText: request.sessionConfig.scenarioText,
          requiresExpertise: request.sessionConfig.requiresExpertise || []
        },
        creator_id: participantId,
        max_participants: request.sessionConfig.maxParticipants,
        current_participants: 1,
        session_status: 'active',
        consensus_threshold: 0.7,
        expires_at: expiresAt,
        last_activity: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as first participant
    await this.supabase
      .from('session_participants')
      .insert({
        session_id: sessionId,
        participant_id: participantId,
        participant_role: 'lead_analyst',
        expertise_area: request.sessionConfig.requiresExpertise || ['general_strategy'],
        joined_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      });

    return this.formatSession(session);
  }

  async joinSession(sessionId: string, participantId: string): Promise<CollaborativeSession> {
    // Check if session exists and is still active
    const { data: session, error: sessionError } = await this.supabase
      .from('collaborative_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('session_status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found or expired');
    }

    if (session.current_participants >= session.max_participants) {
      throw new Error('Session is full');
    }

    // Check if participant already joined
    const { data: existingParticipant } = await this.supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('participant_id', participantId)
      .single();

    if (existingParticipant) {
      throw new Error('Participant already joined this session');
    }

    // Add participant
    await this.supabase
      .from('session_participants')
      .insert({
        session_id: sessionId,
        participant_id: participantId,
        participant_role: 'analyst',
        expertise_area: ['strategy_analysis'], // Default expertise
        joined_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      });

    // Update session participant count
    await this.supabase
      .from('collaborative_sessions')
      .update({
        current_participants: session.current_participants + 1,
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Get updated session
    const { data: updatedSession } = await this.supabase
      .from('collaborative_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    return this.formatSession(updatedSession);
  }

  async contributeInsight(sessionId: string, participantId: string, insightData: any): Promise<CollectiveInsight> {
    // Validate participation
    await this.validateParticipant(sessionId, participantId);

    // Create insight
    const insightId = crypto.randomUUID();
    const { data: insight, error } = await this.supabase
      .from('collective_insights')
      .insert({
        id: insightId,
        session_id: sessionId,
        insight_text: insightData.insightText,
        confidence_score: insightData.confidenceScore,
        insight_category: insightData.category,
        supporting_evidence: insightData.supportingEvidence || [],
        contributor_id: participantId,
        consensus_votes: 1, // Self-vote
        consensus_opinions: 1,
        consensus_level: insightData.confidenceScore, // Initial consensus = confidence
        insight_votes: {[participantId]: {type: 'agree', contribution: insightData.confidenceScore}},
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Update session activity
    await this.updateSessionActivity(sessionId);

    // Add initial self-reaction
    await this.supabase
      .from('insight_reactions')
      .insert({
        insight_id: insightId,
        participant_id: participantId,
        reaction_type: 'agree',
        reaction_comment: 'Initial contributor endorsement',
        created_at: new Date().toISOString()
      });

    return this.formatInsight(insight);
  }

  async voteOnInsight(sessionId: string, participantId: string, voteData: any): Promise<CollectiveInsight> {
    await this.validateParticipant(sessionId, participantId);

    // Get current insight
    const { data: insight } = await this.supabase
      .from('collective_insights')
      .select('*')
      .eq('id', voteData.insightId)
      .single();

    if (!insight) throw new Error('Insight not found');

    // Check if participant already voted
    const existingVote = insight.insight_votes?.[participantId];
    if (existingVote) {
      throw new Error('Participant already voted on this insight');
    }

    // Add reaction
    await this.supabase
      .from('insight_reactions')
      .insert({
        insight_id: voteData.insightId,
        participant_id: participantId,
        reaction_type: voteData.reactionType,
        reaction_comment: voteData.reactionComment,
        created_at: new Date().toISOString()
      });

    // Update insight consensus
    const agreementWeight = voteData.reactionType === 'agree' ? 1 :
                          voteData.reactionType === 'disagree' ? -1 : 0;

    const newConsensusVotes = insight.consensus_votes + (agreementWeight >= 0 ? 1 : 0);
    const newConsensusOpinions = insight.consensus_opinions + 1;
    const newConsensusLevel = newConsensusVotes / newConsensusOpinions;

    // Update insight votes tracking
    const updatedVotes = {
      ...insight.insight_votes,
      [participantId]: {
        type: voteData.reactionType,
        contribution: agreementWeight,
        comment: voteData.reactionComment
      }
    };

    // Update insight
    await this.supabase
      .from('collective_insights')
      .update({
        consensus_votes: newConsensusVotes,
        consensus_opinions: newConsensusOpinions,
        consensus_level: newConsensusLevel,
        insight_votes: updatedVotes,
        last_updated: new Date().toISOString()
      })
      .eq('id', voteData.insightId);

    // Update session activity
    await this.updateSessionActivity(sessionId);

    // Return updated insight
    const { data: updatedInsight } = await this.supabase
      .from('collective_insights')
      .select('*')
      .eq('id', voteData.insightId)
      .single();

    return this.formatInsight(updatedInsight);
  }

  async getSessionAnalytics(sessionId: string): Promise<SessionAnalytics> {
    // Get session insights
    const { data: insights } = await this.supabase
      .from('collective_insights')
      .select('*')
      .eq('session_id', sessionId);

    // Get participants
    const { data: participants } = await this.supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId);

    // Calculate analytics
    const totalInsights = insights?.length || 0;

    const consensusLevel = insights ?
      insights.reduce((sum: number, i: any) => sum + i.consensus_level, 0) / insights.length : 0;

    const participationRate = participants?.length || 0;

    const expertiseDiversity = new Set(
      participants?.flatMap((p: any) => p.expertise_area) || []
    ).size;

    const insightQualityDistribution = insights?.reduce((dist: Record<string, number>, i: any) => {
      const quality = i.confidence_score > 0.8 ? 'high' :
                     i.confidence_score > 0.6 ? 'medium' : 'low';
      dist[quality] = (dist[quality] || 0) + 1;
      return dist;
    }, {}) || {};

    // Temporal participation (simplified)
    const temporalParticipation = participants?.reduce((acc: Array<{hour: number, participants: number}>, p: any) => {
      const hour = new Date(p.last_active).getHours();
      const existing = acc.find(h => h.hour === hour);
      if (existing) {
        existing.participants++;
      } else {
        acc.push({hour, participants: 1});
      }
      return acc;
    }, []) || [];

    // Consensus evolution (simplified)
    const consensusEvolution = insights?.map((i: any) => ({
      timePoint: i.created_at,
      consensusLevel: i.consensus_level
    })) || [];

    // Calculate collaboration metrics
    const averageResponseTime = 0; // Would calculate from messages/reactions
    const expertiseSynergy = Math.min(1.0, expertiseDiversity / (participants?.length || 1));

    return {
      totalInsights,
      consensusLevel,
      participationRate,
      expertiseDiversity,
      insightQualityDistribution,
      temporalParticipation,
      collaborationMetrics: {
        averageResponseTime,
        consensusEvolution,
        expertiseSynergy
      }
    };
  }

  private formatSession(session: any): CollaborativeSession {
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      creatorId: session.creator_id,
      maxParticipants: session.max_participants,
      currentParticipants: session.current_participants,
      sessionStatus: session.session_status,
      consensusThreshold: session.consensus_threshold,
      lastActivity: session.last_activity,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      scenarioConfig: session.scenario_config
    };
  }

  private formatInsight(insight: any): CollectiveInsight {
    return {
      id: insight.id,
      insightText: insight.insight_text,
      confidenceScore: insight.confidence_score,
      category: insight.insight_category,
      supportingEvidence: insight.supporting_evidence,
      contributorId: insight.contributor_id,
      consensusVotes: insight.consensus_votes,
      consensusOpinions: insight.consensus_opinions,
      consensusLevel: insight.consensus_level,
      reactions: [], // Would populate from insight_reactions table
      createdAt: insight.created_at
    };
  }

  private async validateParticipant(sessionId: string, participantId: string) {
    const { data: participant } = await this.supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('participant_id', participantId)
      .single();

    if (!participant) {
      throw new Error('Participant not authorized for this session');
    }
  }

  private async updateSessionActivity(sessionId: string) {
    await this.supabase
      .from('collaborative_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);
  }

  private generateParticipantId(): string {
    return 'anon_' + crypto.randomUUID().substring(0, 8);
  }
}

// Main handler
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' });
  }

  try {
    const request: CollaborativeSessionRequest = await req.json();

    if (!request.participantId) {
      return jsonResponse(400, {
        ok: false,
        message: 'participantId required'
      });
    }

    // Initialize database connection
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`;
    const writeKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !writeKey) {
      return jsonResponse(500, {
        ok: false,
        message: 'Server configuration error'
      });
    }

    const supabase = createClient(supabaseUrl, writeKey);
    const engine = new CollectiveIntelligenceEngine(supabase);

    let result: any = { success: true, message: 'Operation completed' };

    // Route to appropriate handler
    switch (request.action) {
      case 'create_session':
        const session = await engine.createSession(request);
        result.session = session;
        break;

      case 'join_session':
        if (!request.sessionId) throw new Error('sessionId required for join');
        const joinedSession = await engine.joinSession(request.sessionId, request.participantId);
        result.session = joinedSession;
        break;

      case 'contribute_insight':
        if (!request.sessionId || !request.insightData) {
          throw new Error('sessionId and insightData required');
        }
        const insight = await engine.contributeInsight(request.sessionId, request.participantId, request.insightData);
        result.insights = [insight];
        break;

      case 'vote_insight':
        if (!request.sessionId || !request.voteData) {
          throw new Error('sessionId and voteData required');
        }
        const updatedInsight = await engine.voteOnInsight(request.sessionId, request.participantId, request.voteData);
        result.insights = [updatedInsight];
        break;

      case 'get_analytics':
        if (!request.sessionId) throw new Error('sessionId required for analytics');
        const analytics = await engine.getSessionAnalytics(request.sessionId);
        result.analytics = analytics;
        break;

      case 'update_analysis':
        // Would implement analysis snapshot updates
        result.message = 'Analysis update feature coming soon';
        break;

      default:
        throw new Error(`Unknown action: ${request.action}`);
    }

    return jsonResponse(200, {
      sessionId: request.sessionId,
      participantId: request.participantId,
      action: request.action,
      result
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Collective intelligence operation failed';
    console.error('Collective intelligence error:', error);
    return jsonResponse(500, {
      ok: false,
      message: msg,
      action: req.method === 'POST' ? 'unknown' : 'invalid_method'
    });
  }
});