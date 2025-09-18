// @ts-nocheck
// Supabase Edge Function: Information Value Assessment
// PRD-Compliant EVPI (Expected Value of Perfect Information) calculations
// Implements real-time information value optimization for strategic decisions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Information Value Interfaces
interface InformationNode {
  id: string;
  name: string;
  currentUncertainty: number; // 0-1 scale
  informationType: 'market' | 'competitor' | 'regulatory' | 'technological' | 'social';
  acquisitionCost: number;
  acquisitionTime: number; // hours
  reliability: number; // 0-1 scale
  dependencies: string[]; // Other information nodes this depends on
}

interface DecisionAlternative {
  id: string;
  name: string;
  expectedPayoff: number;
  payoffVariance: number;
  informationSensitivity: Record<string, number>; // How much each info affects this alternative
}

interface InformationValueRequest {
  runId: string;
  scenario: {
    title: string;
    description: string;
    timeHorizon: number; // hours until decision must be made
    stakeholders: string[];
  };
  decisionAlternatives: DecisionAlternative[];
  informationNodes: InformationNode[];
  currentBeliefs: Record<string, number>; // Current probability distributions
  analysisConfig: {
    riskTolerance: number; // 0-1 scale
    discountRate: number; // per hour
    maxInformationBudget: number;
    prioritizeSpeed: boolean;
  };
}

interface EVPIAnalysis {
  expectedValuePrior: number;
  expectedValuePerfectInformation: number;
  expectedValueOfPerfectInformation: number;
  expectedValuePartialInformation: Record<string, number>;
  optimalInformationStrategy: {
    informationToAcquire: string[];
    acquisitionSequence: Array<{
      nodeId: string;
      timing: number;
      expectedBenefit: number;
      cumulativeCost: number;
    }>;
    totalCost: number;
    netExpectedValue: number;
  };
  sensitivityAnalysis: {
    informationValueRanking: Array<{
      nodeId: string;
      marginalValue: number;
      costEffectiveness: number;
    }>;
    robustnessMetrics: {
      beliefStability: number;
      informationRedundancy: number;
      decisionSensitivity: number;
    };
  };
}

// Core Information Value Assessment Engine
class InformationValueEngine {
  private supabase: any;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  // Main EVPI computation function
  async computeInformationValue(request: InformationValueRequest): Promise<EVPIAnalysis> {
    // Step 1: Compute Expected Value under current beliefs (EV Prior)
    const evPrior = this.computeExpectedValuePrior(
      request.decisionAlternatives,
      request.currentBeliefs
    );

    // Step 2: Compute Expected Value of Perfect Information
    const evpi = await this.computeEVPI(
      request.decisionAlternatives,
      request.informationNodes,
      request.currentBeliefs
    );

    // Step 3: Compute Expected Value of Partial Information for each node
    const evppi = await this.computeEVPPI(
      request.decisionAlternatives,
      request.informationNodes,
      request.currentBeliefs
    );

    // Step 4: Optimize information acquisition strategy
    const optimalStrategy = await this.optimizeInformationStrategy(
      request.informationNodes,
      evppi,
      request.analysisConfig,
      request.scenario.timeHorizon
    );

    // Step 5: Perform sensitivity analysis
    const sensitivityAnalysis = this.performSensitivityAnalysis(
      request.decisionAlternatives,
      request.informationNodes,
      evppi,
      request.currentBeliefs
    );

    // Step 6: Store results for learning
    await this.storeInformationValueResults(request.runId, {
      evPrior,
      evpi: evpi.value,
      optimalStrategy,
      sensitivityAnalysis
    });

    return {
      expectedValuePrior: evPrior,
      expectedValuePerfectInformation: evpi.perfectValue,
      expectedValueOfPerfectInformation: evpi.value,
      expectedValuePartialInformation: evppi,
      optimalInformationStrategy: optimalStrategy,
      sensitivityAnalysis
    };
  }

  // Compute Expected Value under current beliefs
  private computeExpectedValuePrior(
    alternatives: DecisionAlternative[],
    beliefs: Record<string, number>
  ): number {
    if (alternatives.length === 0) return 0;

    // Find the alternative with highest expected payoff under current beliefs
    let maxExpectedPayoff = -Infinity;

    for (const alternative of alternatives) {
      let adjustedPayoff = alternative.expectedPayoff;

      // Adjust payoff based on current belief uncertainties
      for (const [beliefKey, uncertainty] of Object.entries(beliefs)) {
        const sensitivity = alternative.informationSensitivity[beliefKey] || 0;
        const uncertaintyPenalty = uncertainty * sensitivity * alternative.payoffVariance;
        adjustedPayoff -= uncertaintyPenalty;
      }

      maxExpectedPayoff = Math.max(maxExpectedPayoff, adjustedPayoff);
    }

    return maxExpectedPayoff;
  }

  // Compute Expected Value of Perfect Information
  private async computeEVPI(
    alternatives: DecisionAlternative[],
    informationNodes: InformationNode[],
    beliefs: Record<string, number>
  ): Promise<{ value: number; perfectValue: number }> {
    
    // Simulate perfect information scenario
    const perfectBeliefs: Record<string, number> = {};
    for (const node of informationNodes) {
      perfectBeliefs[node.id] = 0; // Perfect information = zero uncertainty
    }

    // Compute expected value with perfect information
    let perfectValue = 0;
    const scenarios = this.generateInformationScenarios(informationNodes, 100); // Monte Carlo

    for (const scenario of scenarios) {
      let maxPayoffInScenario = -Infinity;

      for (const alternative of alternatives) {
        let scenarioPayoff = alternative.expectedPayoff;

        // Apply scenario-specific information
        for (const [nodeId, nodeValue] of Object.entries(scenario)) {
          const sensitivity = alternative.informationSensitivity[nodeId] || 0;
          scenarioPayoff += sensitivity * nodeValue;
        }

        maxPayoffInScenario = Math.max(maxPayoffInScenario, scenarioPayoff);
      }

      perfectValue += maxPayoffInScenario * scenario.probability;
    }

    const evPrior = this.computeExpectedValuePrior(alternatives, beliefs);
    const evpiValue = perfectValue - evPrior;

    return {
      value: Math.max(0, evpiValue), // EVPI cannot be negative
      perfectValue
    };
  }

  // Compute Expected Value of Partial Perfect Information for each node
  private async computeEVPPI(
    alternatives: DecisionAlternative[],
    informationNodes: InformationNode[],
    beliefs: Record<string, number>
  ): Promise<Record<string, number>> {
    const evppi: Record<string, number> = {};
    const evPrior = this.computeExpectedValuePrior(alternatives, beliefs);

    for (const node of informationNodes) {
      // Create beliefs with perfect information for this node only
      const partialPerfectBeliefs = { ...beliefs };
      partialPerfectBeliefs[node.id] = 0; // Perfect info for this node

      // Compute expected value with partial perfect information
      let partialPerfectValue = 0;
      const scenarios = this.generatePartialInformationScenarios(node, 50);

      for (const scenario of scenarios) {
        let maxPayoffInScenario = -Infinity;

        for (const alternative of alternatives) {
          let scenarioPayoff = alternative.expectedPayoff;

          // Apply perfect information for this node
          const sensitivity = alternative.informationSensitivity[node.id] || 0;
          scenarioPayoff += sensitivity * scenario.nodeValue;

          // Apply uncertainty for other nodes
          for (const [beliefKey, uncertainty] of Object.entries(partialPerfectBeliefs)) {
            if (beliefKey !== node.id) {
              const otherSensitivity = alternative.informationSensitivity[beliefKey] || 0;
              const uncertaintyPenalty = uncertainty * otherSensitivity * alternative.payoffVariance;
              scenarioPayoff -= uncertaintyPenalty;
            }
          }

          maxPayoffInScenario = Math.max(maxPayoffInScenario, scenarioPayoff);
        }

        partialPerfectValue += maxPayoffInScenario * scenario.probability;
      }

      evppi[node.id] = Math.max(0, partialPerfectValue - evPrior);
    }

    return evppi;
  }

  // Optimize information acquisition strategy
  private async optimizeInformationStrategy(
    informationNodes: InformationNode[],
    evppi: Record<string, number>,
    config: InformationValueRequest['analysisConfig'],
    timeHorizon: number
  ): Promise<EVPIAnalysis['optimalInformationStrategy']> {
    
    // Calculate cost-effectiveness for each information node
    const costEffectiveness = informationNodes.map(node => ({
      nodeId: node.id,
      node,
      value: evppi[node.id] || 0,
      cost: node.acquisitionCost,
      time: node.acquisitionTime,
      effectiveness: (evppi[node.id] || 0) / Math.max(node.acquisitionCost, 0.01),
      timeEffectiveness: (evppi[node.id] || 0) / Math.max(node.acquisitionTime, 0.1)
    }));

    // Sort by effectiveness (value per cost)
    costEffectiveness.sort((a, b) => {
      if (config.prioritizeSpeed) {
        return b.timeEffectiveness - a.timeEffectiveness;
      }
      return b.effectiveness - a.effectiveness;
    });

    // Greedy selection with budget and time constraints
    const selectedNodes: string[] = [];
    const acquisitionSequence: Array<{
      nodeId: string;
      timing: number;
      expectedBenefit: number;
      cumulativeCost: number;
    }> = [];

    let totalCost = 0;
    let totalTime = 0;

    for (const item of costEffectiveness) {
      const newCost = totalCost + item.cost;
      const newTime = totalTime + item.time;

      // Check constraints
      if (newCost <= config.maxInformationBudget && newTime <= timeHorizon) {
        // Check dependencies
        const dependenciesMet = item.node.dependencies.every(dep => 
          selectedNodes.includes(dep)
        );

        if (dependenciesMet) {
          selectedNodes.push(item.nodeId);
          acquisitionSequence.push({
            nodeId: item.nodeId,
            timing: totalTime,
            expectedBenefit: item.value,
            cumulativeCost: newCost
          });

          totalCost = newCost;
          totalTime = newTime;
        }
      }
    }

    // Calculate net expected value
    const totalBenefit = acquisitionSequence.reduce((sum, item) => sum + item.expectedBenefit, 0);
    const discountedCost = totalCost * Math.exp(-config.discountRate * totalTime);
    const netExpectedValue = totalBenefit - discountedCost;

    return {
      informationToAcquire: selectedNodes,
      acquisitionSequence,
      totalCost,
      netExpectedValue
    };
  }

  // Perform sensitivity analysis
  private performSensitivityAnalysis(
    alternatives: DecisionAlternative[],
    informationNodes: InformationNode[],
    evppi: Record<string, number>,
    beliefs: Record<string, number>
  ): EVPIAnalysis['sensitivityAnalysis'] {
    
    // Rank information by marginal value
    const informationValueRanking = informationNodes.map(node => ({
      nodeId: node.id,
      marginalValue: evppi[node.id] || 0,
      costEffectiveness: (evppi[node.id] || 0) / Math.max(node.acquisitionCost, 0.01)
    })).sort((a, b) => b.marginalValue - a.marginalValue);

    // Compute robustness metrics
    const beliefStability = this.computeBeliefStability(beliefs, informationNodes);
    const informationRedundancy = this.computeInformationRedundancy(informationNodes);
    const decisionSensitivity = this.computeDecisionSensitivity(alternatives, beliefs);

    return {
      informationValueRanking,
      robustnessMetrics: {
        beliefStability,
        informationRedundancy,
        decisionSensitivity
      }
    };
  }

  // Generate information scenarios for Monte Carlo simulation
  private generateInformationScenarios(
    informationNodes: InformationNode[],
    numScenarios: number
  ): Array<Record<string, number> & { probability: number }> {
    const scenarios = [];

    for (let i = 0; i < numScenarios; i++) {
      const scenario: Record<string, number> & { probability: number } = {
        probability: 1 / numScenarios
      };

      for (const node of informationNodes) {
        // Generate random value based on node characteristics
        const baseValue = Math.random() * 2 - 1; // -1 to 1
        const reliabilityAdjusted = baseValue * node.reliability;
        scenario[node.id] = reliabilityAdjusted;
      }

      scenarios.push(scenario);
    }

    return scenarios;
  }

  // Generate partial information scenarios for EVPPI calculation
  private generatePartialInformationScenarios(
    node: InformationNode,
    numScenarios: number
  ): Array<{ nodeValue: number; probability: number }> {
    const scenarios = [];

    for (let i = 0; i < numScenarios; i++) {
      const nodeValue = (Math.random() * 2 - 1) * node.reliability;
      scenarios.push({
        nodeValue,
        probability: 1 / numScenarios
      });
    }

    return scenarios;
  }

  // Compute belief stability metric
  private computeBeliefStability(
    beliefs: Record<string, number>,
    informationNodes: InformationNode[]
  ): number {
    const uncertainties = Object.values(beliefs);
    if (uncertainties.length === 0) return 1.0;

    const avgUncertainty = uncertainties.reduce((sum, u) => sum + u, 0) / uncertainties.length;
    return Math.max(0, 1 - avgUncertainty);
  }

  // Compute information redundancy metric
  private computeInformationRedundancy(informationNodes: InformationNode[]): number {
    // Simple heuristic: more dependencies = more redundancy
    const totalDependencies = informationNodes.reduce((sum, node) => sum + node.dependencies.length, 0);
    const maxPossibleDependencies = informationNodes.length * (informationNodes.length - 1);
    
    return maxPossibleDependencies > 0 ? totalDependencies / maxPossibleDependencies : 0;
  }

  // Compute decision sensitivity metric
  private computeDecisionSensitivity(
    alternatives: DecisionAlternative[],
    beliefs: Record<string, number>
  ): number {
    if (alternatives.length < 2) return 0;

    // Compute payoff differences between alternatives
    const payoffs = alternatives.map(alt => alt.expectedPayoff);
    payoffs.sort((a, b) => b - a);

    const bestPayoff = payoffs[0];
    const secondBestPayoff = payoffs[1];
    const payoffGap = bestPayoff - secondBestPayoff;

    // Normalize by average payoff variance
    const avgVariance = alternatives.reduce((sum, alt) => sum + alt.payoffVariance, 0) / alternatives.length;
    
    return avgVariance > 0 ? payoffGap / avgVariance : 1.0;
  }

  // Store results for learning and future optimization
  private async storeInformationValueResults(
    runId: string,
    results: {
      evPrior: number;
      evpi: number;
      optimalStrategy: any;
      sensitivityAnalysis: any;
    }
  ): Promise<void> {
    try {
      await this.supabase
        .from('information_value_analysis')
        .insert({
          run_id: runId,
          ev_prior: results.evPrior,
          evpi_value: results.evpi,
          optimal_strategy: results.optimalStrategy,
          sensitivity_metrics: results.sensitivityAnalysis,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to store information value results:', error);
    }
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
    if (!body.runId || !body.scenario || !body.decisionAlternatives || !body.informationNodes) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId, scenario, decisionAlternatives, or informationNodes'
      });
    }

    // Initialize information value engine
    const engine = new InformationValueEngine(supabase);
    
    // Execute information value analysis
    const result = await engine.computeInformationValue(body);
    
    return jsonResponse(200, {
      ok: true,
      response: result
    });
    
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Information value assessment error:', e);
    return jsonResponse(500, { ok: false, message: msg })
  }
});
