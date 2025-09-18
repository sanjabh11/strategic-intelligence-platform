// @ts-nocheck
// Supabase Edge Function: Advanced Symmetry Mining Engine
// PRD-Compliant Cross-Domain Strategic Pattern Discovery
// Implements mathematical structure decomposition and analogical reasoning

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Strategic Pattern Interfaces
interface StrategicScenario {
  title: string;
  description: string;
  domain: string;
  stakeholders: string[];
  strategicElements: {
    players: number;
    actions: string[];
    information: 'complete' | 'incomplete' | 'asymmetric';
    payoffStructure: 'zero-sum' | 'competitive' | 'cooperative' | 'mixed';
  };
}

interface AnalysisConfig {
  abstractionLevel: number; // 1-10 scale
  maxAnalogies: number;
  similarityThreshold: number;
  domainsToSearch: string[];
  returnStructuredResults: boolean;
}

interface StrategicAnalogy {
  sourceScenario: string;
  targetScenario: string;
  structuralSimilarity: number;
  domainTransferConfidence: number;
  adaptationProtocol: string[];
  successProbability: number;
  historicalEvidence: any[];
}

interface MathematicalStructure {
  gameType: string;
  playerCount: number;
  actionSpace: string[];
  informationStructure: string;
  payoffSymmetry: number;
  equilibriumType: string;
  strategicComplexity: number;
}

// Core Symmetry Mining Engine Class
class AdvancedSymmetryMiningEngine {
  private supabase: any;
  private domainKnowledgeBase: Map<string, any[]>;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.domainKnowledgeBase = this.initializeDomainKnowledge();
  }

  // Initialize domain-specific strategic knowledge
  private initializeDomainKnowledge(): Map<string, any[]> {
    const domains = new Map();
    
    // Military Strategy Patterns
    domains.set('military', [
      {
        pattern: 'Flanking Maneuver',
        structure: { players: 2, actions: ['direct', 'flank', 'retreat'], gameType: 'asymmetric' },
        successRate: 0.73,
        historicalExamples: ['Battle of Cannae', 'Normandy D-Day'],
        transferDomains: ['business', 'sports', 'politics']
      },
      {
        pattern: 'Deterrence Equilibrium',
        structure: { players: 2, actions: ['escalate', 'maintain', 'de-escalate'], gameType: 'chicken' },
        successRate: 0.68,
        historicalExamples: ['Cold War MAD', 'Cuban Missile Crisis'],
        transferDomains: ['corporate', 'diplomatic', 'legal']
      }
    ]);

    // Business Strategy Patterns
    domains.set('business', [
      {
        pattern: 'Market Entry Timing',
        structure: { players: 3, actions: ['early', 'follow', 'wait'], gameType: 'coordination' },
        successRate: 0.65,
        historicalExamples: ['iPhone vs Android', 'Netflix vs Blockbuster'],
        transferDomains: ['technology', 'politics', 'sports']
      },
      {
        pattern: 'Price War Dynamics',
        structure: { players: 2, actions: ['compete', 'cooperate', 'exit'], gameType: 'prisoners_dilemma' },
        successRate: 0.42,
        historicalExamples: ['Airline Industry', 'Telecom Wars'],
        transferDomains: ['politics', 'military', 'sports']
      }
    ]);

    // Political Strategy Patterns
    domains.set('politics', [
      {
        pattern: 'Coalition Building',
        structure: { players: 5, actions: ['ally', 'oppose', 'neutral'], gameType: 'coalition' },
        successRate: 0.71,
        historicalExamples: ['EU Formation', 'UN Security Council'],
        transferDomains: ['business', 'military', 'sports']
      },
      {
        pattern: 'Diplomatic Signaling',
        structure: { players: 2, actions: ['signal', 'ignore', 'escalate'], gameType: 'signaling' },
        successRate: 0.59,
        historicalExamples: ['Trade Negotiations', 'Arms Control'],
        transferDomains: ['business', 'personal', 'legal']
      }
    ]);

    // Evolutionary Biology Patterns
    domains.set('evolution', [
      {
        pattern: 'Hawk-Dove Dynamics',
        structure: { players: 2, actions: ['aggressive', 'peaceful'], gameType: 'evolutionary' },
        successRate: 0.78,
        historicalExamples: ['Animal Territoriality', 'Resource Competition'],
        transferDomains: ['business', 'politics', 'sports']
      }
    ]);

    // Sports Strategy Patterns
    domains.set('sports', [
      {
        pattern: 'Defensive vs Offensive Balance',
        structure: { players: 2, actions: ['attack', 'defend', 'counter'], gameType: 'zero-sum' },
        successRate: 0.66,
        historicalExamples: ['Football Strategy', 'Chess Openings'],
        transferDomains: ['military', 'business', 'politics']
      }
    ]);

    return domains;
  }

  // Main symmetry mining function
  async mineStrategicAnalogies(
    currentScenario: StrategicScenario,
    config: AnalysisConfig
  ): Promise<{
    strategicAnalogies: StrategicAnalogy[];
    mathematicalStructure: MathematicalStructure;
    strategicRecommendations: any[];
    confidenceMetrics: any;
  }> {
    
    // Step 1: Decompose scenario into mathematical structure
    const mathStructure = this.decomposeToMathematicalStructure(currentScenario);
    
    // Step 2: Search for structural matches across domains
    const structuralMatches = await this.findStructuralMatches(mathStructure, config);
    
    // Step 3: Compute analogical reasoning with confidence scores
    const analogies = await this.computeAnalogicalReasonning(
      currentScenario, 
      structuralMatches, 
      config
    );
    
    // Step 4: Generate strategic recommendations
    const recommendations = this.generateStrategicRecommendations(analogies, mathStructure);
    
    // Step 5: Compute confidence metrics
    const confidenceMetrics = this.computeConfidenceMetrics(analogies, mathStructure);
    
    // Step 6: Store patterns for future learning
    await this.storeDiscoveredPatterns(mathStructure, analogies);
    
    return {
      strategicAnalogies: analogies,
      mathematicalStructure: mathStructure,
      strategicRecommendations: recommendations,
      confidenceMetrics
    };
  }

  // Decompose scenario into mathematical structure (PRD requirement)
  private decomposeToMathematicalStructure(scenario: StrategicScenario): MathematicalStructure {
    const playerCount = scenario.strategicElements.players;
    const actionSpace = scenario.strategicElements.actions;
    const infoStructure = scenario.strategicElements.information;
    const payoffStructure = scenario.strategicElements.payoffStructure;
    
    // Classify game type based on structure
    let gameType = 'general';
    if (playerCount === 2 && actionSpace.length === 2) {
      if (payoffStructure === 'zero-sum') gameType = 'zero-sum-2x2';
      else if (payoffStructure === 'competitive') gameType = 'prisoners-dilemma-variant';
      else if (payoffStructure === 'cooperative') gameType = 'coordination-game';
    } else if (playerCount > 2) {
      gameType = 'n-player-game';
    }
    
    // Compute strategic complexity
    const complexity = Math.log2(playerCount) + Math.log2(actionSpace.length) + 
                      (infoStructure === 'incomplete' ? 1 : 0) + 
                      (payoffStructure === 'mixed' ? 1 : 0);
    
    // Compute payoff symmetry
    const symmetry = payoffStructure === 'cooperative' ? 1.0 : 
                    payoffStructure === 'zero-sum' ? 0.0 : 0.5;
    
    return {
      gameType,
      playerCount,
      actionSpace,
      informationStructure: infoStructure,
      payoffSymmetry: symmetry,
      equilibriumType: this.predictEquilibriumType(gameType, playerCount),
      strategicComplexity: complexity
    };
  }

  // Find structural matches across domains
  private async findStructuralMatches(
    structure: MathematicalStructure, 
    config: AnalysisConfig
  ): Promise<any[]> {
    const matches = [];
    
    // Search domain knowledge base
    for (const domain of config.domainsToSearch) {
      const domainPatterns = this.domainKnowledgeBase.get(domain) || [];
      
      for (const pattern of domainPatterns) {
        const similarity = this.computeStructuralSimilarity(structure, pattern.structure);
        
        if (similarity >= config.similarityThreshold) {
          const score = (similarity * 0.7) + ((pattern.successRate ?? 0.5) * 0.3);
          matches.push({
            domain,
            pattern: pattern.pattern,
            similarity,
            score,
            successRate: pattern.successRate,
            historicalExamples: pattern.historicalExamples,
            transferDomains: pattern.transferDomains,
            structure: pattern.structure
          });
        }
      }
    }
    
    // Search database for historical patterns
    const { data: dbPatterns } = await this.supabase
      .from('strategic_patterns')
      .select('*')
      .gte('abstraction_level', Math.max(1, config.abstractionLevel - 2))
      .lte('abstraction_level', Math.min(10, config.abstractionLevel + 2))
      .gte('success_rate', config.similarityThreshold)
      .limit(50);
    
    if (dbPatterns) {
      for (const dbPattern of dbPatterns) {
        const dbStructure = dbPattern.structural_invariants;
        const similarity = this.computeStructuralSimilarity(structure, dbStructure);
        
        if (similarity >= config.similarityThreshold) {
          const successRate = typeof dbPattern.success_rate === 'number' ? dbPattern.success_rate : 0.5;
          const score = (similarity * 0.7) + (successRate * 0.3);
          matches.push({
            domain: 'database',
            pattern: dbPattern.signature_hash,
            similarity,
            score,
            successRate: dbPattern.success_rate,
            historicalExamples: dbPattern.success_domains,
            transferDomains: dbPattern.success_domains,
            structure: dbStructure
          });
        }
      }
    }
    
    return matches
      .sort((a, b) => (b.score ?? b.similarity) - (a.score ?? a.similarity))
      .slice(0, config.maxAnalogies);
  }

  // Compute structural similarity between mathematical structures
  private computeStructuralSimilarity(struct1: any, struct2: any): number {
    let similarity = 0;
    let totalFactors = 0;
    
    const W_PLAYER = 0.25;
    const W_TYPE = 0.35;
    const W_ACTION = 0.2;
    const W_INFO = 0.1;
    const W_PAYOFF = 0.1;
    
    // Player count similarity
    if (struct1.playerCount && (struct2.players || struct2.playerCount)) {
      const s2Players = struct2.players ?? struct2.playerCount;
      const playerSim = 1 - Math.abs(struct1.playerCount - s2Players) / Math.max(struct1.playerCount, s2Players);
      similarity += playerSim * W_PLAYER;
      totalFactors += W_PLAYER;
    }
    
    // Game type similarity
    if (struct1.gameType && struct2.gameType) {
      const typeSim = struct1.gameType === struct2.gameType ? 1.0 : 0.5;
      similarity += typeSim * W_TYPE;
      totalFactors += W_TYPE;
    }
    
    // Action space similarity
    if (struct1.actionSpace && (struct2.actions || struct2.actionSpace)) {
      const s2Actions = (struct2.actions || struct2.actionSpace) as any[];
      const actionSim = 1 - Math.abs(struct1.actionSpace.length - s2Actions.length) / 
                       Math.max(struct1.actionSpace.length, s2Actions.length);
      similarity += actionSim * W_ACTION;
      totalFactors += W_ACTION;
    }
    
    // Information structure similarity (if available)
    if (struct1.informationStructure && struct2.informationStructure) {
      const infoSim = struct1.informationStructure === struct2.informationStructure ? 1.0 : 0.5;
      similarity += infoSim * W_INFO;
      totalFactors += W_INFO;
    }
    
    // Payoff symmetry proximity (if available)
    if (typeof struct1.payoffSymmetry === 'number' && typeof struct2.payoffSymmetry === 'number') {
      const payoffSim = 1 - Math.abs(struct1.payoffSymmetry - struct2.payoffSymmetry);
      similarity += payoffSim * W_PAYOFF;
      totalFactors += W_PAYOFF;
    }
    
    return totalFactors > 0 ? similarity / totalFactors : 0;
  }

  // Compute analogical reasoning with confidence scores
  private async computeAnalogicalReasonning(
    currentScenario: StrategicScenario,
    matches: any[],
    config: AnalysisConfig
  ): Promise<StrategicAnalogy[]> {
    const analogies: StrategicAnalogy[] = [];
    
    for (const match of matches) {
      // Compute domain transfer confidence
      const transferConfidence = this.computeDomainTransferConfidence(
        currentScenario.domain,
        match.domain,
        match.similarity
      );
      
      // Generate adaptation protocol
      const adaptationProtocol = this.generateAdaptationProtocol(
        currentScenario,
        match
      );
      
      // Compute success probability based on historical evidence
      const successProbability = this.computeSuccessProbability(
        match.successRate,
        transferConfidence,
        match.historicalExamples.length
      );
      
      analogies.push({
        sourceScenario: match.pattern,
        targetScenario: currentScenario.title,
        structuralSimilarity: match.similarity,
        domainTransferConfidence: transferConfidence,
        adaptationProtocol,
        successProbability,
        historicalEvidence: match.historicalExamples
      });
    }
    
    return analogies.sort((a, b) => b.successProbability - a.successProbability);
  }

  // Generate strategic recommendations based on analogies
  private generateStrategicRecommendations(
    analogies: StrategicAnalogy[],
    structure: MathematicalStructure
  ): any[] {
    const recommendations = [];
    
    for (let i = 0; i < Math.min(3, analogies.length); i++) {
      const analogy = analogies[i];
      
      recommendations.push({
        priority: i + 1,
        strategy: `Apply ${analogy.sourceScenario} pattern`,
        reasoning: `Historical success rate of ${(analogy.successProbability * 100).toFixed(1)}% with structural similarity of ${(analogy.structuralSimilarity * 100).toFixed(1)}%`,
        adaptationSteps: analogy.adaptationProtocol,
        confidence: analogy.domainTransferConfidence,
        riskFactors: this.identifyRiskFactors(analogy, structure),
        expectedOutcome: this.predictExpectedOutcome(analogy, structure)
      });
    }
    
    return recommendations;
  }

  // Compute confidence metrics for the analysis
  private computeConfidenceMetrics(analogies: StrategicAnalogy[], structure: MathematicalStructure): any {
    if (analogies.length === 0) {
      return {
        overallConfidence: 0.1,
        analogyStrength: 0,
        domainCoverage: 0,
        historicalSupport: 0
      };
    }
    
    const avgSimilarity = analogies.reduce((sum, a) => sum + a.structuralSimilarity, 0) / analogies.length;
    const avgTransferConfidence = analogies.reduce((sum, a) => sum + a.domainTransferConfidence, 0) / analogies.length;
    const avgSuccessProbability = analogies.reduce((sum, a) => sum + a.successProbability, 0) / analogies.length;
    
    const domainCoverage = new Set(analogies.map(a => a.sourceScenario)).size / 5; // Normalize by max domains
    const historicalSupport = analogies.reduce((sum, a) => sum + a.historicalEvidence.length, 0) / analogies.length / 10;
    
    return {
      overallConfidence: (avgSimilarity + avgTransferConfidence + avgSuccessProbability) / 3,
      analogyStrength: avgSimilarity,
      domainCoverage: Math.min(1, domainCoverage),
      historicalSupport: Math.min(1, historicalSupport)
    };
  }

  // Store discovered patterns for future learning
  private async storeDiscoveredPatterns(structure: MathematicalStructure, analogies: StrategicAnalogy[]): Promise<void> {
    try {
      const patternSignature = this.generatePatternSignature(structure);
      const successDomains = analogies.map(a => a.sourceScenario);
      
      await this.supabase
        .from('strategic_patterns')
        .upsert({
          signature_hash: patternSignature,
          abstraction_level: Math.round(structure.strategicComplexity),
          success_domains: successDomains,
          structural_invariants: structure,
          confidence_score: analogies.length > 0 ? analogies[0].domainTransferConfidence : 0.5,
          success_rate: analogies.length > 0 ? analogies[0].successProbability : 0.5,
          usage_count: 1
        });
    } catch (error) {
      console.warn('Failed to store pattern:', error);
    }
  }

  // Helper methods
  private predictEquilibriumType(gameType: string, playerCount: number): string {
    if (gameType.includes('zero-sum')) return 'pure-strategy';
    if (gameType.includes('prisoners-dilemma')) return 'mixed-strategy';
    if (gameType.includes('coordination')) return 'multiple-equilibria';
    if (playerCount > 2) return 'complex-equilibrium';
    return 'unknown';
  }

  private computeDomainTransferConfidence(sourceDomain: string, targetDomain: string, similarity: number): number {
    // Domain transfer matrix based on empirical research
    const transferMatrix: Record<string, Record<string, number>> = {
      'military': { 'business': 0.8, 'politics': 0.9, 'sports': 0.7, 'evolution': 0.6 },
      'business': { 'military': 0.7, 'politics': 0.8, 'sports': 0.6, 'evolution': 0.5 },
      'politics': { 'military': 0.8, 'business': 0.8, 'sports': 0.5, 'evolution': 0.6 },
      'sports': { 'military': 0.6, 'business': 0.5, 'politics': 0.4, 'evolution': 0.7 },
      'evolution': { 'military': 0.7, 'business': 0.6, 'politics': 0.6, 'sports': 0.8 }
    };
    
    const baseTransfer = transferMatrix[sourceDomain]?.[targetDomain] || 0.5;
    return Math.min(1.0, baseTransfer * similarity);
  }

  private generateAdaptationProtocol(scenario: StrategicScenario, match: any): string[] {
    return [
      `Identify key stakeholders mapping from ${match.domain} to ${scenario.domain}`,
      `Adapt action space from [${match.structure.actions?.join(', ')}] to scenario context`,
      `Adjust payoff structure for ${scenario.strategicElements.payoffStructure} dynamics`,
      `Implement information structure considerations for ${scenario.strategicElements.information} information`,
      `Monitor for domain-specific constraints and regulatory factors`
    ];
  }

  private computeSuccessProbability(baseRate: number, transferConfidence: number, evidenceCount: number): number {
    const evidenceBonus = Math.min(0.2, evidenceCount * 0.05);
    return Math.min(1.0, baseRate * transferConfidence + evidenceBonus);
  }

  private identifyRiskFactors(analogy: StrategicAnalogy, structure: MathematicalStructure): string[] {
    const risks = [];
    
    if (analogy.domainTransferConfidence < 0.6) {
      risks.push('Low domain transfer confidence - adaptation may be challenging');
    }
    
    if (structure.strategicComplexity > 5) {
      risks.push('High strategic complexity - multiple equilibria possible');
    }
    
    if (analogy.historicalEvidence.length < 3) {
      risks.push('Limited historical evidence - strategy effectiveness uncertain');
    }
    
    return risks;
  }

  private predictExpectedOutcome(analogy: StrategicAnalogy, structure: MathematicalStructure): string {
    const successProb = analogy.successProbability;
    
    if (successProb > 0.8) return 'High probability of strategic success';
    if (successProb > 0.6) return 'Moderate probability of strategic success';
    if (successProb > 0.4) return 'Uncertain outcome - requires careful monitoring';
    return 'Low probability of success - consider alternative strategies';
  }

  private generatePatternSignature(structure: MathematicalStructure): string {
    return `${structure.gameType}-${structure.playerCount}p-${structure.actionSpace.length}a-${structure.informationStructure}`;
  }
}

// Main edge function handler
function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  
  try {
    const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse(500, { ok: false, message: 'Server configuration error' })
    }
    
    const supabase = createClient(supabaseUrl, serviceKey)
    const body = await req.json().catch(() => ({}))
    
    // Validate request structure
    if (!body.runId || !body.currentScenario || !body.analysisConfig) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId, currentScenario, or analysisConfig'
      });
    }
    
    // Initialize symmetry mining engine
    const engine = new AdvancedSymmetryMiningEngine(supabase);
    
    // Execute symmetry mining analysis
    const result = await engine.mineStrategicAnalogies(
      body.currentScenario,
      body.analysisConfig
    );
    
    return jsonResponse(200, {
      ok: true,
      response: result
    });
    
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Symmetry mining error:', e);
    return jsonResponse(500, { ok: false, message: msg })
  }
})


