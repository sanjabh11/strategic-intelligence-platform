// @ts-nocheck
// Supabase Edge Function: Brier Weighted Consensus
// Monetization Feature F2: Consensus Oracle with Reputation-Weighted Feeds
// Aggregates forecasts using Brier score weighting to surface "Superforecaster" consensus

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Prediction {
    user_id: string;
    probability: number;
    confidence: number;
    reasoning?: string;
    created_at: string;
}

interface ForecastScore {
    user_id: string;
    brier_score: number;
    total_predictions: number;
    resolved_predictions: number;
}

interface WeightedConsensusResult {
    communityConsensus: number;
    superforecasterConsensus: number;
    consensusGap: number;
    participantCount: number;
    superforecasterCount: number;
    brierWeightedMean: number;
    confidenceWeightedMean: number;
    topForecasters: Array<{
        user_id: string;
        probability: number;
        brier_score: number;
        weight: number;
    }>;
    reliability: {
        score: number;
        sampleSize: string;
        expertAgreement: number;
    };
}

async function getForecasterScores(
    supabase: any,
    userIds: string[]
): Promise<Record<string, ForecastScore>> {
    const { data: scores } = await supabase
        .from('forecast_scores')
        .select('user_id, brier_score, total_predictions, resolved_predictions')
        .in('user_id', userIds);

    const scoreMap: Record<string, ForecastScore> = {};
    for (const score of (scores || [])) {
        scoreMap[score.user_id] = score;
    }

    return scoreMap;
}

function calculateBrierWeight(brierScore: number | null, resolvedPredictions: number): number {
    // Lower Brier score = better = higher weight
    // New users (no Brier) get weight 1.0
    // Perfect Brier (0) gets weight 10.0
    // Average Brier (0.25) gets weight 2.0
    // Poor Brier (0.5+) gets weight 0.5

    if (brierScore === null || resolvedPredictions < 5) {
        return 1.0; // Default weight for new users
    }

    // Transform Brier score to weight: w = 1 / (0.1 + brier_score)
    const baseWeight = 1 / (0.1 + brierScore);

    // Apply experience factor (more predictions = more reliable weight)
    const experienceFactor = Math.min(2.0, 1 + Math.log(resolvedPredictions) / 5);

    return Math.min(10, baseWeight * experienceFactor);
}

async function calculateWeightedConsensus(
    supabase: any,
    forecastId: string
): Promise<WeightedConsensusResult> {
    // Get all predictions for this forecast
    const { data: predictions } = await supabase
        .from('forecast_predictions')
        .select('user_id, probability, confidence, reasoning, created_at')
        .eq('forecast_id', forecastId);

    if (!predictions || predictions.length === 0) {
        return {
            communityConsensus: 0.5,
            superforecasterConsensus: 0.5,
            consensusGap: 0,
            participantCount: 0,
            superforecasterCount: 0,
            brierWeightedMean: 0.5,
            confidenceWeightedMean: 0.5,
            topForecasters: [],
            reliability: { score: 0, sampleSize: 'none', expertAgreement: 0 }
        };
    }

    // Get Brier scores for all participants
    const userIds = predictions.map((p: Prediction) => p.user_id);
    const scores = await getForecasterScores(supabase, userIds);

    // Calculate weights and weighted predictions
    const weightedPredictions = predictions.map((p: Prediction) => {
        const score = scores[p.user_id];
        const brierWeight = calculateBrierWeight(
            score?.brier_score ?? null,
            score?.resolved_predictions ?? 0
        );
        const confidenceWeight = Math.max(0.5, p.confidence);

        return {
            user_id: p.user_id,
            probability: p.probability,
            brier_score: score?.brier_score ?? null,
            brier_weight: brierWeight,
            confidence_weight: confidenceWeight,
            combined_weight: brierWeight * confidenceWeight
        };
    });

    // Simple community average
    const communityConsensus = predictions.reduce(
        (sum: number, p: Prediction) => sum + p.probability, 0
    ) / predictions.length;

    // Brier-weighted average
    const totalBrierWeight = weightedPredictions.reduce((sum, p) => sum + p.brier_weight, 0);
    const brierWeightedMean = weightedPredictions.reduce(
        (sum, p) => sum + p.probability * p.brier_weight, 0
    ) / totalBrierWeight;

    // Confidence-weighted average
    const totalConfidenceWeight = weightedPredictions.reduce(
        (sum, p) => sum + p.confidence_weight, 0
    );
    const confidenceWeightedMean = weightedPredictions.reduce(
        (sum, p) => sum + p.probability * p.confidence_weight, 0
    ) / totalConfidenceWeight;

    // Identify superforecasters (top 10% by Brier weight)
    const sortedByWeight = [...weightedPredictions].sort((a, b) => b.brier_weight - a.brier_weight);
    const superforecasterCutoff = Math.max(1, Math.ceil(sortedByWeight.length * 0.1));
    const superforecasters = sortedByWeight.slice(0, superforecasterCutoff);

    // Superforecaster consensus (only top 10%)
    const superTotal = superforecasters.reduce((sum, p) => sum + p.brier_weight, 0);
    const superforecasterConsensus = superforecasters.reduce(
        (sum, p) => sum + p.probability * p.brier_weight, 0
    ) / superTotal;

    // Calculate consensus gap (difference between community and superforecasters)
    const consensusGap = Math.abs(superforecasterConsensus - communityConsensus);

    // Calculate expert agreement (variance among superforecasters)
    const superMean = superforecasterConsensus;
    const superVariance = superforecasters.reduce(
        (sum, p) => sum + Math.pow(p.probability - superMean, 2), 0
    ) / superforecasters.length;
    const expertAgreement = 1 - Math.min(1, Math.sqrt(superVariance) * 2);

    // Reliability score
    let sampleSize: string;
    let reliabilityScore: number;

    if (predictions.length < 5) {
        sampleSize = 'very_low';
        reliabilityScore = 0.2;
    } else if (predictions.length < 20) {
        sampleSize = 'low';
        reliabilityScore = 0.4;
    } else if (predictions.length < 50) {
        sampleSize = 'medium';
        reliabilityScore = 0.6;
    } else if (predictions.length < 100) {
        sampleSize = 'high';
        reliabilityScore = 0.8;
    } else {
        sampleSize = 'very_high';
        reliabilityScore = 0.95;
    }

    // Adjust reliability by expert agreement
    reliabilityScore *= (0.5 + expertAgreement * 0.5);

    return {
        communityConsensus: Math.round(communityConsensus * 1000) / 1000,
        superforecasterConsensus: Math.round(superforecasterConsensus * 1000) / 1000,
        consensusGap: Math.round(consensusGap * 1000) / 1000,
        participantCount: predictions.length,
        superforecasterCount: superforecasters.length,
        brierWeightedMean: Math.round(brierWeightedMean * 1000) / 1000,
        confidenceWeightedMean: Math.round(confidenceWeightedMean * 1000) / 1000,
        topForecasters: superforecasters.slice(0, 5).map(p => ({
            user_id: p.user_id,
            probability: p.probability,
            brier_score: p.brier_score,
            weight: Math.round(p.brier_weight * 100) / 100
        })),
        reliability: {
            score: Math.round(reliabilityScore * 100) / 100,
            sampleSize,
            expertAgreement: Math.round(expertAgreement * 100) / 100
        }
    };
}

function jsonResponse(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
        },
    });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true });
    if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' });

    try {
        const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr';
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceKey) {
            return jsonResponse(500, { ok: false, message: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, serviceKey);
        const body = await req.json().catch(() => ({}));

        if (!body.forecastId) {
            return jsonResponse(400, {
                ok: false,
                message: 'Missing required field: forecastId'
            });
        }

        const result = await calculateWeightedConsensus(supabase, body.forecastId);
        const persistAggregate = body.persistAggregate === true;

        if (persistAggregate && result.participantCount > 0) {
            await supabase
                .from('forecasts')
                .update({
                    current_probability: result.brierWeightedMean,
                    prediction_count: result.participantCount
                })
                .eq('id', body.forecastId)
                .catch(() => null);
        }

        return jsonResponse(200, {
            ok: true,
            response: result
        });

    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Brier consensus error:', e);
        return jsonResponse(500, { ok: false, message: msg });
    }
});
