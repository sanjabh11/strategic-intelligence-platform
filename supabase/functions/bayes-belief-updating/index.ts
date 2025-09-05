// @ts-nocheck
// Supabase Edge Function: bayes-belief-updating
// Deno runtime
// Endpoint: POST /functions/v1/bayes-belief-updating
// Advanced real-time Bayesian belief network updates for strategic intelligence

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

interface BayesianUpdateRequest {
  runId: string;
  beliefNodeId: string;
  newEvidence: {
    variable: string;
    observation: string | number;
    confidence: number; // 0-1 confidence in evidence
    timeStamp: string;
  };
  priorBeliefs?: Record<string, number>;
  networkParameters: {
    updatingRule: 'bayes' | 'jeffrey' | 'nonMyopic';
    discountFactor: number; // For temporal decay of beliefs
    convergenceThreshold: number;
  };
}

interface BayesianAnalysisResponse {
  runId: string;
  beliefNodeId: string;
  updatedBeliefs: Record<string, number>;
  evidenceIntegration: {
    accepted: boolean;
    rejectionReason?: string;
    evidenceValue: number; // Information value of evidence
  };
  networkEvolution: {
    beliefTrajectory: Array<{
      timeStep: string;
      beliefs: Record<string, number>;
      evidenceSource: string;
    }>;
    convergenceMetrics: {
      beliefStability: number;
      evidenceSensitivity: number;
      informationGain: number;
    };
  };
  strategicImplications: {
    decisionThresholds: Record<string, number>;
    riskAssessment: Record<string, number>;
    recommendationUpdates: Array<{
      action: string;
      oldConfidence: number;
      newConfidence: number;
      change: number;
    }>;
  };
}

// Advanced Bayesian belief updating with temporal dynamics
function updateBayesianBeliefs(
  currentBeliefs: Record<string, number>,
  evidence: BayesianUpdateRequest['newEvidence'],
  networkParams: BayesianUpdateRequest['networkParameters']
): BayesianAnalysisResponse['updatedBeliefs'] {

  const updatedBeliefs: Record<string, number> = { ...currentBeliefs };

  // Apply different updating rules based on evidence type and strength
  switch (networkParams.updatingRule) {
    case 'bayes':
      // Standard Bayesian updating
      const likelihood = evidence.confidence;
      const normalizingConstant = Object.values(currentBeliefs).reduce((sum, prob) => sum + prob, 0);

      // Update each belief with likelihood
      Object.keys(updatedBeliefs).forEach(key => {
        updatedBeliefs[key] = (updatedBeliefs[key] * likelihood) / normalizingConstant;
      });
      break;

    case 'jeffrey':
      // Jeffrey's rule for updating with uncertain evidence
      const evidenceStrength = evidence.confidence * networkParams.discountFactor;

      Object.keys(updatedBeliefs).forEach(key => {
        const jeffreyWeight = 0.7; // Mix of old (70%) and new (30%) beliefs
        updatedBeliefs[key] = jeffreyWeight * updatedBeliefs[key] + (1 - jeffreyWeight) * evidenceStrength;
      });
      break;

    case 'nonMyopic':
      // Advanced non-myopic updating (accounts for future information)
      const futureDiscount = 0.9; // Discount factor for anticipated future evidence
      const futureValueMultiplier = 1 / (1 - futureDiscount);

      Object.keys(updatedBeliefs).forEach(key => {
        updatedBeliefs[key] = updatedBeliefs[key] * (1 + (evidence.confidence * futureValueMultiplier));
      });

      // Renormalize
      const total = Object.values(updatedBeliefs).reduce((sum, prob) => sum + prob, 0);
      Object.keys(updatedBeliefs).forEach(key => {
        updatedBeliefs[key] /= total;
      });
      break;

    default:
      // Fallback to simple weighted average
      Object.keys(updatedBeliefs).forEach(key => {
        updatedBeliefs[key] = 0.8 * updatedBeliefs[key] + 0.2 * evidence.confidence;
      });
  }

  return updatedBeliefs;
}

function calculateEvidenceValue(
  evidence: BayesianUpdateRequest['newEvidence'],
  currentBeliefs: Record<string, number>
): number {
  // Calculate expected information value of evidence
  const entropyBefore = -Object.values(currentBeliefs).reduce((sum, p) =>
    sum + (p > 0 ? p * Math.log2(p) : 0), 0);

  // Simulate how much information this evidence provides
  const informationGain = entropyBefore * evidence.confidence;

  // Weight by confidence and recency (newer evidence more valuable)
  const temporalWeight = 0.8; // Could be based on time since last update
  const confidenceWeight = evidence.confidence;

  return informationGain * temporalWeight * confidenceWeight;
}

function analyzeStrategicImplications(
  updatedBeliefs: Record<string, number>,
  originalBeliefs?: Record<string, number>
): Record<string, any> {

  const decisionThresholds: Record<string, number> = {};
  const riskAssessment: Record<string, number> = {};
  const recommendationUpdates = [];

  // Calculate decision thresholds from belief distributions
  Object.keys(updatedBeliefs).forEach(key => {
    const belief = updatedBeliefs[key];
    decisionThresholds[key] = belief; // Simple threshold based on probability

    // Risk assessment based on belief variance
    const variance = belief * (1 - belief); // Binary outcome variance
    riskAssessment[key] = Math.sqrt(variance);
  });

  // Generate strategy recommendations based on belief changes
  if (originalBeliefs) {
    Object.keys(updatedBeliefs).forEach(key => {
      const oldBelief = originalBeliefs[key] || 0;
      const newBelief = updatedBeliefs[key];
      const change = Math.abs(newBelief - oldBelief);

      if (change > 0.1) { // Significant change threshold
        const action = newBelief > oldBelief ? 'Increase commitment' : 'Reassess position';

        recommendationUpdates.push({
          action: `${action} for ${key}`,
          oldConfidence: oldBelief,
          newConfidence: newBelief,
          change: change
        });
      }
    });
  }

  return {
    decisionThresholds,
    riskAssessment,
    recommendationUpdates
  };
}

async function persistBayesianUpdate(
  supabase: any,
  runId: string,
  beliefNodeId: string,
  updatedBeliefs: Record<string, number>,
  evidence: BayesianUpdateRequest['newEvidence']
) {
  // Update belief network in database
  await supabase
    .from('belief_networks')
    .update({
      belief_structure: updatedBeliefs,
      evolution_trajectory: supabase.rpc('jsonb_set', {
        target: supabase.from('belief_networks').select('evolution_trajectory').eq('id', beliefNodeId).single().data || {},
        path: `{${Date.now()}}`,
        new_value: {
          evidence: evidence,
          beliefs: updatedBeliefs,
          timestamp: new Date().toISOString()
        }
      })
    })
    .eq('id', beliefNodeId);

  // Log evidence for audit trail
  await supabase
    .from('analysis_runs')
    .update({
      processing_time_ms: supabase.rpc('increment_processing_time'),
      stability_score: calculateBeliefStability(updatedBeliefs)
    })
    .eq('id', runId);
}

function calculateBeliefStability(beliefs: Record<string, number>): number {
  // Calculate belief distribution stability (how concentrated beliefs are)
  const maxBelief = Math.max(...Object.values(beliefs));
  const entropy = -Object.values(beliefs).reduce((sum, p) =>
    sum + (p > 0 ? p * Math.log2(p) : 0), 0);

  // Convert to stability score (higher is more stable)
  return Math.min(1.0, maxBelief / (entropy + 1));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' });
  }

  try {
    const request: BayesianUpdateRequest = await req.json();

    if (!request.runId || !request.beliefNodeId || !request.newEvidence) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId, beliefNodeId, or newEvidence'
      });
    }

    // Connect to database
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

    // Retrieve current belief network
    const { data: beliefNetwork, error } = await supabase
      .from('belief_networks')
      .select('*')
      .eq('id', request.beliefNodeId)
      .single();

    if (error || !beliefNetwork) {
      return jsonResponse(404, {
        ok: false,
        message: 'Belief network not found'
      });
    }

    // Validate evidence quality
    const evidenceValue = calculateEvidenceValue(request.newEvidence, beliefNetwork.belief_structure || {});
    const evidenceThreshold = 0.1; // Minimum evidence quality threshold

    if (evidenceValue < evidenceThreshold) {
      return jsonResponse(200, {
        ok: false,
        message: 'Evidence quality too low - below minimum threshold',
        evidenceValue,
        threshold: evidenceThreshold
      });
    }

    // Update beliefs with Bayesian inference
    const updatedBeliefs = updateBayesianBeliefs(
      beliefNetwork.belief_structure || request.priorBeliefs || {},
      request.newEvidence,
      request.networkParameters
    );

    // Calculate strategic implications
    const originalBeliefs = beliefNetwork.belief_structure || {};
    const strategicImplications = analyzeStrategicImplications(updatedBeliefs, originalBeliefs);

    // Generate belief trajectory for evolution tracking
    const beliefTrajectory = [{
      timeStep: new Date().toISOString(),
      beliefs: updatedBeliefs,
      evidenceSource: request.newEvidence.variable
    }];

    // Calculate convergence metrics
    const beliefStability = calculateBeliefStability(updatedBeliefs);
    const informationGain = evidenceValue;
    const firstKey = Object.keys(originalBeliefs)[0] || '';
    const referenceBelief = originalBeliefs[firstKey] || 0;
    const evidenceSensitivity = Object.values(updatedBeliefs).reduce((sum, belief) =>
      sum + Math.abs(belief - referenceBelief), 0
    );

    const convergenceMetrics = {
      beliefStability,
      evidenceSensitivity: evidenceSensitivity / Object.keys(updatedBeliefs).length,
      informationGain
    };

    // Persist updates
    try {
      await persistBayesianUpdate(
        supabase,
        request.runId,
        request.beliefNodeId,
        updatedBeliefs,
        request.newEvidence
      );
    } catch (persistError) {
      console.error('Belief update persistence failed:', persistError);
      // Continue with response even if persistence fails
    }

    const response: BayesianAnalysisResponse = {
      runId: request.runId,
      beliefNodeId: request.beliefNodeId,
      updatedBeliefs,
      evidenceIntegration: {
        accepted: true,
        evidenceValue
      },
      networkEvolution: {
        beliefTrajectory,
        convergenceMetrics
      },
      strategicImplications
    };

    return jsonResponse(200, {
      ok: true,
      response
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bayesian belief updating failed';
    console.error('Bayesian update error:', error);
    return jsonResponse(500, {
      ok: false,
      message: msg
    });
  }
});