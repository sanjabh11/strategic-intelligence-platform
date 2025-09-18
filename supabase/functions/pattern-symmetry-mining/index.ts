// @ts-nocheck
// Supabase Edge Function: pattern-symmetry-mining
// Deno runtime
// Endpoint: POST /functions/v1/pattern-symmetry-mining
// SymmetryMiningEngine implementation for PRD cross-domain intelligence

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function jsonResponse(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// Interfaces matching PRD requirements
interface SymmetryMiningRequest {
  runId: string;
  currentScenario: {
    title: string;
    description: string;
    domain: string;
    stakeholders: string[];
    strategicElements: {
      players: number;
      actions: string[];
      information: 'complete' | 'incomplete';
      payoffStructure: string;
    };
  };
  analysisConfig: {
    abstractionLevel: number; // 1-10 PRD requirement
    maxAnalogies: number;
    similarityThreshold: number;
    domainsToSearch: string[]; // PRD cross-domain requirement
    returnStructuredResults: boolean;
  };
  existingPatternBase?: {
    knownSuccessfulPatterns: any[];
    domainSuccessRates: Record<string, number>;
  };
}

interface StrategicAnalogy {
  id: string;
  sourceDomain: string;
  targetDomain: string;
  structuralSimilarity: number; // 0-1
  successProbability: number; // Historical success rate of this pattern
  structuralMatch: {
    playerStructure: string; // e.g., "prisoner's dilemma", "coordination game"
    strategicDynamics: string; // e.g., "cooperation dominant", "threat effective"
    informationalStructure: string; // e.g., "asymmetric information"
  };
  analogousStrategies: Array<{
    originalStrategy: string;
    adaptedStrategy: string;
    adaptationContext: string;
    historicalSuccessRate: number;
    confidence: number;
  }>;
  metaStrategicPrinciples: {
    corePrinciple: string; // Fundamental strategic truth
    domainIndependence: number; // 0-1 how universally applicable
    evidenceStrength: number; // How well verified
  };
  implementationGuidance: {
    immediateActions: string[];
    adaptationSteps: string[];
    riskIndicators: string[];
    successPredictions: Array<{
      condition: string;
      probability: number;
      explanation: string;
    }>;
  };
}

interface SymmetryMiningResponse {
  runId: string;
  patternDiscovery: {
    analogies: StrategicAnalogy[];
    abstractionInsights: {
      currentAbstractionLevel: number;
      structuralComplexity: number;
      recommendedAbstractionShifts: number[];
    };
    metaPatternRecognition: {
      emergingThemes: string[];
      strategicUniversals: string[];
      domainClusters: Record<string, string[]>;
    };
  };
  strategicRecommendations: Array<{
    recommendation: string;
    confidence: number; // PRD confidence requirements
    analogousPrecedents: string[];
    implementationPriority: number;
    expectedImpact: number;
  }>;
  analysisMetadata: {
    patternsSearched: number;
    analogiesFound: number;
    computationTimeMs: number;
    confidenceAssessment: {
      analogiesQuality: number;
      recommendationsReliability: number;
      uncertaintyFactors: string[];
    };
  };
}

// SymmetryMiningEngine - Core class for cross-domain intelligence
class SymmetryMiningEngine {
  private abstractionLevel: number;
  private historicalPatterns: Map<string, any[]>;

  constructor(abstractionLevel: number = 7) {
    this.abstractionLevel = Math.max(1, Math.min(10, abstractionLevel));
    this.historicalPatterns = this.loadHistoricalPatternBase();
  }

  // Load historical patterns from various strategic domains (PRD requirement)
  private loadHistoricalPatternBase(): Map<string, any[]> {
    const patterns = new Map<string, any[]>();

    // Military patterns (Sun Tzu, Clausewitz, modern warfare)
    patterns.set('military', [
      {
        name: 'Phalanx Formation',
        playerStructure: 'coalition_formation',
        strategicDynamics: 'defensive_alliance',
        informationalStructure: 'asymmetric',
        historicalSuccessRate: 0.85,
        outcome: 'territorial_consolidation'
      },
      {
        name: 'Blitzkrieg',
        playerStructure: 'asymmetric_power',
        strategicDynamics: 'rapid_decision',
        informationalStructure: 'surprise',
        historicalSuccessRate: 0.72,
        outcome: 'breakthrough_success'
      }
    ]);

    // Business strategy patterns (Porter, Christensen, etc.)
    patterns.set('business', [
      {
        name: 'Blue Ocean Strategy',
        playerStructure: 'market_creation',
        strategicDynamics: 'cooperative_innovation',
        informationalStructure: 'symmetric',
        historicalSuccessRate: 0.68,
        outcome: 'market_dominance'
      },
      {
        name: 'First Mover Advantage',
        playerStructure: 'rival_competition',
        strategicDynamics: 'preemptive_action',
        informationalStructure: 'asymmetric',
        historicalSuccessRate: 0.61,
        outcome: 'market_capture'
      }
    ]);

    // Evolutionary biology patterns (game theory origins)
    patterns.set('evolution', [
      {
        name: 'Iterated Prisoners Dilemma',
        playerStructure: 'cooperation_equilibrium',
        strategicDynamics: 'tit_for_tat',
        informationalStructure: 'iterative_memory',
        historicalSuccessRate: 0.78,
        outcome: 'evolutionary_stability'
      },
      {
        name: 'Red Queen Hypothesis',
        playerStructure: 'arms_race',
        strategicDynamics: 'continuous_adaptation',
        informationalStructure: 'blind_selection',
        historicalSuccessRate: 0.91,
        outcome: 'fitness_optimization'
      }
    ]);

    // Political patterns
    patterns.set('politics', [
      {
        name: 'Veto Power Equilibrium',
        playerStructure: 'blocking_coalitions',
        strategicDynamics: 'bargaining_deadlock',
        informationalStructure: 'incomplete',
        historicalSuccessRate: 0.89,
        outcome: 'status_quo_maintenance'
      }
    ]);

    // Sports patterns (competitive dynamics)
    patterns.set('sports', [
      {
        name: 'Zone Defense',
        playerStructure: 'territorial_control',
        strategicDynamics: 'area_denial',
        informationalStructure: 'spatial_challenge',
        historicalSuccessRate: 0.76,
        outcome: 'defensive_stability'
      }
    ]);

    return patterns;
  }

  // Main pattern mining algorithm (PRD core requirement)
  async discoverStrategicParallels(
    scenario: SymmetryMiningRequest['currentScenario']
  ): Promise<SymmetryMiningResponse> {

    const startTime = Date.now();

    // Generate scenario signature for pattern matching
    const scenarioSignature = this.generateScenarioSignature(scenario);

    // Search pattern base for structural matches
    const analogies = await this.searchPatternBase(scenarioSignature, scenario);

    // Extract meta-strategic principles
    const metaPrinciples = this.extractMetaPrinciples(analogies);

    // Generate strategic recommendations
    const recommendations = this.generateStrategicRecommendations(analogies, scenario);

    const computationTime = Date.now() - startTime;

    return {
      runId: '', // Set by caller
      patternDiscovery: {
        analogies: analogies.slice(0, 5), // Top 5 analogies
        abstractionInsights: {
          currentAbstractionLevel: this.abstractionLevel,
          structuralComplexity: this.computeStructuralComplexity(scenario),
          recommendedAbstractionShifts: this.computeAbstractionShifts(scenario)
        },
        metaPatternRecognition: {
          emergingThemes: this.extractEmergingThemes(analogies),
          strategicUniversals: metaPrinciples,
          domainClusters: this.computeDomainClusters()
        }
      },
      strategicRecommendations: recommendations,
      analysisMetadata: {
        patternsSearched: this.computeTotalPatterns(),
        analogiesFound: analogies.length,
        computationTimeMs: computationTime,
        confidenceAssessment: {
          analogiesQuality: Math.min(1.0, analogies.length / 10),
          recommendationsReliability: this.computeRecommendationsReliability(analogies),
          uncertaintyFactors: this.identifyUncertaintyFactors(scenario)
        }
      }
    };
  }

  // Generate mathematical signature of scenario for pattern matching
  private generateScenarioSignature(scenario: SymmetryMiningRequest['currentScenario']): any {
    return {
      players: scenario.strategicElements.players,
      informationStructure: scenario.strategicElements.information,
      payoffStructure: scenario.strategicElements.payoffStructure,
      stakeholderComplexity: scenario.stakeholders.length,
      actionSpace: scenario.strategicElements.actions.length,
      domainFingerprint: this.computeDomainFingerprint(scenario.domain),
      abstractionLevel: this.abstractionLevel
    };
  }

  // Compute domain-specific fingerprint
  private computeDomainFingerprint(domain: string): string {
    const domainMappings: Record<string, string> = {
      'business': 'economic_incentive',
      'military': 'power_asymmetric',
      'politics': 'coercion_mechanism',
      'sports': 'competitive_excellence',
      'evolution': 'survival_optimization'
    };
    return domainMappings[domain] || 'universal_competition';
  }

  // Search historical pattern base for structural analogs
  private async searchPatternBase(
    scenarioSignature: any,
    scenario: SymmetryMiningRequest['currentScenario']
  ): Promise<StrategicAnalogy[]> {

    const analogies: StrategicAnalogy[] = [];

    for (const [domain, patterns] of this.historicalPatterns.entries()) {
      if (domain === scenario.domain && this.abstractionLevel < 8) {
        // Skip same-domain matches at lower abstraction levels
        continue;
      }

      for (const pattern of patterns) {
        const similarity = this.computeStructuralSimilarity(scenarioSignature, pattern);

        if (similarity >= 0.6) { // Similarity threshold
          const analogy = this.constructStrategicAnalogy(
            scenario,
            pattern,
            domain,
            similarity
          );
          analogies.push(analogy);
        }
      }
    }

    // Sort by similarity and success rate
    return analogies.sort((a, b) => {
      const scoreA = a.structuralSimilarity * 0.6 + a.successProbability * 0.4;
      const scoreB = b.structuralSimilarity * 0.6 + b.successProbability * 0.4;
      return scoreB - scoreA;
    });
  }

  // Compute structural similarity between scenario and pattern
  private computeStructuralSimilarity(signature: any, pattern: any): number {
    let similarity = 0;
    let factors = 0;

    // Player structure alignment
    if (signature.players === pattern.players ||
        Math.abs(signature.players - pattern.players) <= 1) {
      similarity += 0.25;
    }
    factors++;

    // Information structure match
    if (signature.informationStructure === pattern.informationalStructure ||
        signature.informationStructure === 'incomplete') {
      similarity += 0.25;
    }
    factors++;

    // Strategic dynamics alignment
    const dynamicsSimilarity = this.computeStringSimilarity(
      signature.payoffStructure, pattern.strategicDynamics
    );
    similarity += dynamicsSimilarity * 0.25;
    factors++;

    // Domain fingerprint learning transfer potential
    if (signature.domainFingerprint !== pattern.domainFingerprint) {
      similarity += 0.25; // Cross-domain bonus
    }
    factors++;

    return similarity / factors;
  }

  // Simple string similarity for strategic concepts
  private computeStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;

    // Check for common strategic concepts
    const commonConcepts = [
      'competition', 'cooperation', 'power', 'information',
      'decision', 'optimization', 'equilibrium', 'advantage'
    ];

    const concepts1 = commonConcepts.filter(c => str1.toLowerCase().includes(c));
    const concepts2 = commonConcepts.filter(c => str2.toLowerCase().includes(c));

    const intersection = concepts1.filter(c => concepts2.includes(c)).length;
    const union = new Set([...concepts1, ...concepts2]).size;

    return union > 0 ? intersection / union : 0;
  }

  // Construct strategic analogy from pattern match
  private constructStrategicAnalogy(
    scenario: SymmetryMiningRequest['currentScenario'],
    pattern: any,
    sourceDomain: string,
    similarity: number
  ): StrategicAnalogy {

    const analogousStrategies = this.generateStrategyAdaptations(scenario, pattern);

    const implementationGuidance = this.generateImplementationGuidance(scenario, pattern);

    return {
      id: `analogy-${crypto.randomUUID().substring(0, 8)}`,
      sourceDomain,
      targetDomain: scenario.domain,
      structuralSimilarity: similarity,
      successProbability: pattern.historicalSuccessRate || 0.5,
      structuralMatch: {
        playerStructure: pattern.playerStructure,
        strategicDynamics: pattern.strategicDynamics,
        informationalStructure: pattern.informationalStructure
      },
      analogousStrategies,
      metaStrategicPrinciples: {
        corePrinciple: `Strategic principle: "${pattern.outcome}" transcends domain boundaries`,
        domainIndependence: this.computeDomainIndependence(pattern),
        evidenceStrength: pattern.historicalSuccessRate || 0.5
      },
      implementationGuidance
    };
  }

  // Generate strategy adaptations across domains
  private generateStrategyAdaptations(
    scenario: SymmetryMiningRequest['currentScenario'],
    pattern: any
  ): StrategicAnalogy['analogousStrategies'] {

    const adaptations: StrategicAnalogy['analogousStrategies'] = [];

    // Pattern-based strategy recommendations
    if (pattern.strategicDynamics?.includes('cooperation')) {
      adaptations.push({
        originalStrategy: pattern.name,
        adaptedStrategy: 'Establish cooperative frameworks',
        adaptationContext: 'Adapted from historical cooperative equilibria',
        historicalSuccessRate: pattern.historicalSuccessRate || 0.7,
        confidence: 0.75
      });
    }

    if (pattern.strategicDynamics?.includes('preemptive')) {
      adaptations.push({
        originalStrategy: 'First mover advantage',
        adaptedStrategy: 'Implement proactive positioning',
        adaptationContext: 'Learning from preemptive action precedents',
        historicalSuccessRate: pattern.historicalSuccessRate || 0.65,
        confidence: 0.70
      });
    }

    return adaptations;
  }

  // Generate implementation guidance (PRD requirement)
  private generateImplementationGuidance(
    scenario: SymmetryMiningRequest['currentScenario'],
    pattern: any
  ): StrategicAnalogy['implementationGuidance'] {

    return {
      immediateActions: [
        'Map current strategic structure to analogous historical patterns',
        'Identify immediate strategic opportunities from pattern recognition',
        'Develop contingency plans based on historical outcomes'
      ],
      adaptationSteps: [
        'Analyze pattern limitations and context-specific variations',
        'Customize strategy adaptations to current stakeholder dynamics',
        'Test strategy variants against historical success criteria'
      ],
      riskIndicators: [
        'Context differences too significant for pattern transfer',
        'Historical pattern success rates over-state current applicability',
        'Dynamic changes in strategic environment undermine pattern validity'
      ],
      successPredictions: [
        {
          condition: 'Similar stakeholder dynamics',
          probability: 0.85,
          explanation: 'Pattern structure matches closely with historical context'
        },
        {
          condition: 'Significant context differences',
          probability: 0.45,
          explanation: 'Adaptation challenges increase uncertainty'
        }
      ]
    };
  }

  // Compute domain independence score
  private computeDomainIndependence(pattern: any): number {
    // Simple heuristic based on pattern type
    const domainIndependentConcepts = [
      'cooperation', 'competition', 'equilibrium', 'optimization'
    ];

    return domainIndependentConcepts.some(concept =>
      pattern.name?.toLowerCase().includes(concept) ||
      pattern.strategicDynamics?.includes(concept)
    ) ? 0.8 : 0.4;
  }

  // Extract meta-strategic principles
  private extractMetaPrinciples(analogies: StrategicAnalogy[]): string[] {
    const principles = new Set<string>();

    for (const analogy of analogies) {
      if (analogy.metaStrategicPrinciples?.corePrinciple) {
        principles.add(analogy.metaStrategicPrinciples.corePrinciple);
      }
    }

    // Add universal strategic principles
    principles.add('Strategic structures repeat across domains');
    principles.add('Historical patterns provide predictive power');
    principles.add('Domain adaptation requires structural understanding');

    return Array.from(principles).slice(0, 3);
  }

  // Generate strategic recommendations (PRD requirement)
  private generateStrategicRecommendations(
    analogies: StrategicAnalogy[],
    scenario: SymmetryMiningRequest['currentScenario']
  ): SymmetryMiningResponse['strategicRecommendations'] {

    const recommendations: SymmetryMiningResponse['strategicRecommendations'] = [];

    if (analogies.length === 0) {
      recommendations.push({
        recommendation: 'Continue strategic analysis with standard methods',
        confidence: 0.6,
        analogousPrecedents: [],
        implementationPriority: 1,
        expectedImpact: 0.5
      });
      return recommendations;
    }

    // Analyze most relevant analogy
    const primaryAnalogy = analogies[0];

    recommendations.push({
      recommendation: `Apply ${primaryAnalogy.structuralMatch.strategicDynamics} strategy adapted from ${primaryAnalogy.sourceDomain} domain`,
      confidence: Math.min(1.0, primaryAnalogy.structuralSimilarity * 0.8),
      analogousPrecedents: analogies.slice(0, 2).map(a => a.sourceDomain),
      implementationPriority: 1,
      expectedImpact: primaryAnalogy.successProbability
    });

    if (analogies.length >= 2) {
      const secondaryAnalogy = analogies[1];
      if (secondaryAnalogy.structuralSimilarity >= 0.7) {
        recommendations.push({
          recommendation: `Consider hybrid approach combining ${primaryAnalogy.sourceDomain} and ${secondaryAnalogy.sourceDomain} strategies`,
          confidence: Math.min(1.0, (primaryAnalogy.structuralSimilarity + secondaryAnalogy.structuralSimilarity) / 2 * 0.75),
          analogousPrecedents: [primaryAnalogy.sourceDomain, secondaryAnalogy.sourceDomain],
          implementationPriority: 2,
          expectedImpact: (primaryAnalogy.successProbability + secondaryAnalogy.successProbability) / 2
        });
      }
    }

    return recommendations.slice(0, 3);
  }

  // Compute structural complexity of scenario
  private computeStructuralComplexity(scenario: SymmetryMiningRequest['currentScenario']): number {
    return (scenario.strategicElements.players +
            scenario.strategicElements.actions.length +
            scenario.stakeholders.length +
            (scenario.strategicElements.information === 'complete' ? 0 : 1)) / 10;
  }

  // Compute recommended abstraction shifts
  private computeAbstractionShifts(scenario: SymmetryMiningRequest['currentScenario']): number[] {
    const shifts: number[] = [];

    if (this.abstractionLevel < 7) {
      shifts.push(8); // Higher abstraction often better for cross-domain
    }
    if (this.abstractionLevel > 4) {
      shifts.push(3); // Sometimes detail matters
    }

    return shifts;
  }

  // Extract emerging themes
  private extractEmergingThemes(analogies: StrategicAnalogy[]): string[] {
    const themes = new Map<string, number>();

    for (const analogy of analogies) {
      const theme = analogy.sourceDomain;
      themes.set(theme, (themes.get(theme) || 0) + 1);
    }

    return Array.from(themes.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([theme]) => theme);
  }

  // Compute domain clusters
  private computeDomainClusters(): Record<string, string[]> {
    const clusters: Record<string, string[]> = {
      strategic: ['military', 'politics', 'business'],
      competitive: ['sports', 'evolution', 'business'],
      cooperative: ['politics', 'evolution', 'business']
    };

    return clusters;
  }

  // Compute total patterns searched
  private computeTotalPatterns(): number {
    let total = 0;
    for (const patterns of this.historicalPatterns.values()) {
      total += patterns.length;
    }
    return total;
  }

  // Compute recommendations reliability
  private computeRecommendationsReliability(analogies: StrategicAnalogy[]): number {
    if (analogies.length === 0) return 0.2;

    const avgSimilarity = analogies.reduce((sum, a) => sum + a.structuralSimilarity, 0) / analogies.length;
    const avgSuccessRate = analogies.reduce((sum, a) => sum + a.successProbability, 0) / analogies.length;

    return Math.min(1.0, (avgSimilarity * 0.6 + avgSuccessRate * 0.4) + analogies.length * 0.1);
  }

  // Identify uncertainty factors
  private identifyUncertaintyFactors(scenario: SymmetryMiningRequest['currentScenario']): string[] {
    const factors: string[] = [];

    if (scenario.strategicElements.information === 'incomplete') {
      factors.push('Limited information structure affects pattern reliability');
    }

    if (scenario.stakeholders.length < 2) {
      factors.push('Few stakeholders reduce strategic complexity matching');
    }

    if (analogies.length < 3) {
      factors.push('Limited analogy pool increases recommendation uncertainty');
    }

    return factors;
  }
}

// Main edge function handler
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Messages': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }});
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method Not Allowed' });
  }

  try {
    const request: SymmetryMiningRequest = await req.json();

    if (!request.runId || !request.currentScenario) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId or currentScenario'
      });
    }

    // Initialize Symmetry Mining Engine
    const engine = new SymmetryMiningEngine(request.analysisConfig.abstractionLevel);

    // Perform cross-domain pattern mining
    const response = await engine.discoverStrategicParallels(request.currentScenario);
    response.runId = request.runId;

    // Persist pattern analysis results to database
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`;
    const writeKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && writeKey) {
      const supabase = createClient(supabaseUrl, writeKey);

      try {
        // Attempt to fetch a real feature vector from analysis_features for this run
        let featureVector: number[] | null = null
        try {
          const { data: feat } = await supabase
            .from('analysis_features')
            .select('feature_vector')
            .eq('run_id', request.runId)
            .maybeSingle()
          if (feat && Array.isArray(feat.feature_vector)) {
            featureVector = feat.feature_vector as number[]
          }
        } catch (_) {
          // If unavailable, proceed without adaptation_vector (no placeholder)
          featureVector = null
        }

        // Store pattern analysis results without placeholders
        const rows = response.patternDiscovery.analogies.map(analogy => {
          const base: any = {
            signature_hash: crypto.randomUUID(),
            abstraction_level: request.analysisConfig.abstractionLevel,
            confidence_score: analogy.structuralSimilarity,
            structural_invariants: {
              source_domain: analogy.sourceDomain,
              target_domain: analogy.targetDomain,
              success_probability: analogy.successProbability
            }
          }
          if (featureVector && featureVector.length > 0) {
            base.adaptation_vector = featureVector
          }
          return base
        })

        await supabase.from('strategic_patterns').insert(rows)
      } catch (persistError) {
        console.error('Pattern persistence failed:', persistError);
      }
    }

    return jsonResponse(200, {
      ok: true,
      response
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Symmetry mining failed';
    console.error('Symmetry mining error:', error);
    return jsonResponse(500, {
      ok: false,
      message: msg
    });
  }
});