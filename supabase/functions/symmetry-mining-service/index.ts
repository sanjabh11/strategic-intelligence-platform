// @ts-nocheck
// Supabase Edge Function: symmetry-mining-service
// Deno runtime
// Endpoint: POST /functions/v1/symmetry-mining-service
// Advanced cross-domain strategic pattern mining with analogies

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

interface SymmetryRequest {
  runId: string;
  currentScenario: {
    players: Array<{id: string; name: string; actions: string[]}>;
    domain: string;
    key_elements: string[];
  };
  symmetryCriteria: {
    structuralMatching: number; // 0-1 similarity threshold
    domainDistance: string[]; // domains to search
    temporalScope: string[]; // time periods to consider
  };
}

interface StrategicAnalogy {
  analogy_id: string;
  source_domain: string;
  target_domain: string;
  similarity_score: number;
  structural_mapping: {
    players: Record<string, string>; // current -> analogous
    actions: Record<string, string>;
    payoffs: Record<string, string>;
  };
  historical_outcome: {
    success_rate: number;
    similar_scenarios: number;
    key_lessons: string[];
  };
  adaptation_guidance: {
    direct_transfer: number; // 0-1 confidence of direct applicability
    modification_needed: string[];
    success_factors: string[];
  };
  analogies: Array<{
    original_strategy: string;
    analogous_strategy: string;
    domain_context: string;
    confidence: number;
  }>;
}

interface SymmetryAnalysisResponse {
  runId: string;
  symmetry_analysis: {
    core_pattern: string;
    domain_matches: StrategicAnalogy[];
    cross_domain_insights: string[];
    recommended_strategies: Array<{
      strategy: string;
      justification: string;
      confidence: number;
      sourceDomains: string[];
    }>;
    strategic_warnings: string[];
  };
}

// Advanced symmetry mining with cross-domain pattern recognition
function analyzeStrategicSymmetries(
  request: SymmetryRequest
): SymmetryAnalysisResponse {

  // Simulate advanced cross-domain pattern matching
  // In production, this would use vector similarity search against historical patterns

  const patternSignatures = [
    {
      pattern: "prisoners_dilemma_coordination",
      domains: ["business_war", "international_diplomacy", "labor_negotiations"],
      successRate: 0.73,
      keyElements: ["mutual_benefit", "communication_blockage", "trust_issues"]
    },
    {
      pattern: "resource_allocation_game",
      domains: ["corporate_mergers", "political_coalitions", "academic_funding"],
      successRate: 0.68,
      keyElements: ["limited_resources", "power_imbalance", "negotiation_complexity"]
    },
    {
      pattern: "information_asymmetric_auction",
      domains: ["corporate_acquisitions", "political_campaigns", "licensing_deals"],
      successRate: 0.71,
      keyElements: ["hidden_information", "competitive_bidding", "quality_assessment"]
    }
  ];

  const analogies: StrategicAnalogy[] = [];
  const insights = [];
  const warnings = [];
  const recommendations = [];

  // Match current scenario against known patterns
  for (const signature of patternSignatures) {
    // Simple matching based on domain and key elements overlap
    const domainMatch = signature.domains.includes(request.currentScenario.domain) ||
                        request.symmetryCriteria.domainDistance.some(d => signature.domains.includes(d));

    const elementOverlap = signature.keyElements.filter(
      el => request.currentScenario.key_elements.some(key =>
        el.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(el.toLowerCase())
      )
    ).length;

    if (domainMatch || elementOverlap >= signature.keyElements.length * 0.6) {
      const similarity = Math.min(1.0,
        (domainMatch ? 0.4 : 0) + (elementOverlap / signature.keyElements.length) * 0.6
      );

      if (similarity >= request.symmetryCriteria.structuralMatching) {
        // Generate strategic analogy
        const analogy: StrategicAnalogy = {
          analogy_id: `${signature.pattern}_${Date.now()}`,
          source_domain: signature.domains[0],
          target_domain: request.currentScenario.domain,
          similarity_score: similarity,
          structural_mapping: {
            players: {
              [request.currentScenario.players[0].id]: "dominant_player_analog",
              [request.currentScenario.players[1]?.id || "opponent"]: "challenged_player_analog"
            },
            actions: Object.fromEntries(
              request.currentScenario.players.flatMap(p =>
                p.actions.map(action => [action, `${action}_analogous`])
              )
            ),
            payoffs: {
              "mutual_cooperation": "win_win_outcome",
              "defection_advantage": "short_term_gain",
              "mutual_defection": "lose_lose_outcome"
            }
          },
          historical_outcome: {
            success_rate: signature.successRate,
            similar_scenarios: Math.floor(signature.successRate * 100),
            key_lessons: [
              "Communication breakthrough leads to 40% better outcomes",
              "Repeated interactions improve cooperation rates by 25%",
              "Power imbalances can be addressed through side payments"
            ]
          },
          adaptation_guidance: {
            direct_transfer: similarity,
            modification_needed: [
              "Account for cultural differences in negotiation styles",
              "Consider time pressures specific to domain",
              "Adapt communication protocols for digital vs in-person"
            ],
            success_factors: [
              "Clear incentive alignment",
              "Reliable commitment mechanisms",
              "Transparency in decision-making processes"
            ]
          },
          analogies: [
            {
              original_strategy: "graduated_tit_for_tat",
              analogous_strategy: "incremental_concessions_approach",
              domain_context: signature.domains[0],
              confidence: similarity * signature.successRate
            },
            {
              original_strategy: "credible_commitments",
              analogous_strategy: "binding_reputation_mechanisms",
              domain_context: signature.domains[0],
              confidence: similarity * (1 - signature.successRate)
            }
          ]
        };

        analogies.push(analogy);

        // Generate insights for this analogy
        insights.push(
          `${signature.pattern.replace("_", " ").toUpperCase()} pattern detected (${(similarity * 100).toFixed(0)}% similarity). Historical success rate: ${(signature.successRate * 100).toFixed(0)}%`
        );
      }
    }
  }

  // Generate strategic warnings
  warnings.push(
    "High uncertainty in cross-domain transfer - validate analogies with domain experts",
    "Success rates are historical and may not account for current context changes"
  );

  // Generate strategy recommendations
  const topAnalogies = analogies.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, 3);

  for (const analogy of topAnalogies) {
    for (const strategy of analogy.analogies.slice(0, 1)) { // Take only top strategy per analogy
      if (strategy.confidence > 0.5) {
        recommendations.push({
          strategy: strategy.analogous_strategy,
          justification: `Based on ${analogy.source_domain} ${strategy.original_strategy} pattern. Similarity: ${(analogy.similarity_score * 100).toFixed(0)}%, Expected success: ${(strategy.confidence * 100).toFixed(0)}%`,
          confidence: strategy.confidence,
          sourceDomains: [analogy.source_domain]
        });
      }
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      strategy: "collaborative_exploration",
      justification: "No strong analogies found - recommend iterative, low-commitment exploration of joint solutions",
      confidence: 0.6,
      sourceDomains: ["general_game_theory"]
    });
  }

  return {
    runId: request.runId,
    symmetry_analysis: {
      core_pattern: analogies[0]?.structural_mapping.payoffs.mutual_cooperation || "unclear_pattern",
      domain_matches: analogies,
      cross_domain_insights: insights,
      recommended_strategies: recommendations,
      strategic_warnings: warnings
    }
  };
}

async function persistSymmetryAnalysis(
  supabase: any,
  runId: string,
  analysis: SymmetryAnalysisResponse
) {
  if (analysis.symmetry_analysis.domain_matches.length === 0) return;

  // Persist strategic patterns to database
  const patterns = [];

  for (const match of analysis.symmetry_analysis.domain_matches) {
    patterns.push({
      run_id: runId,
      signature_hash: match.analogy_id,
      abstraction_level: Math.floor(match.similarity_score * 10),
      success_domains: [match.source_domain, ...match.target_domain ? [match.target_domain] : []],
      failure_domains: [],
      structural_invariants: match.structural_mapping,
      adaptation_vector: Array.from({length: 128}, () => Math.random() - 0.5), // Generate random vector for MVP
      confidence_score: match.similarity_score,
      success_rate: match.historical_outcome.success_rate,
      usage_count: 1
    });
  }

  if (patterns.length > 0) {
    const { error } = await supabase
      .from('strategic_patterns')
      .insert(patterns);

    if (error) {
      console.error('Failed to persist strategic patterns:', error);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' });
  }

  try {
    const request: SymmetryRequest = await req.json();

    // Validate input
    if (!request.runId || !request.currentScenario || !request.symmetryCriteria) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId, currentScenario, or symmetryCriteria'
      });
    }

    // Perform symmetry analysis
    const analysis = analyzeStrategicSymmetries(request);

    // Persist to database (optional)
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`;
    const writeKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (supabaseUrl && writeKey) {
      const supabase = createClient(supabaseUrl, writeKey);

      try {
        await persistSymmetryAnalysis(supabase, request.runId, analysis);
      } catch (persistError) {
        console.error('Symmetry analysis persistence failed:', persistError);
        // Continue with response even if persistence fails
      }
    }

    return jsonResponse(200, {
      ok: true,
      analysis
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Symmetry mining failed';
    return jsonResponse(500, {
      ok: false,
      message: msg
    });
  }
});