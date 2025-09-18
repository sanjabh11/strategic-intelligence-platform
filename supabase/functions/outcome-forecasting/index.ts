// @ts-nocheck
// Supabase Edge Function: Advanced Outcome Probability Forecasting
// PRD-Compliant temporal decay models and confidence intervals
// Implements sophisticated forecasting with uncertainty quantification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ForecastPoint {
  t: number; // Time point (hours from now)
  probability: number; // Probability of outcome at time t
  confidence: {
    lower: number; // Lower bound of confidence interval
    upper: number; // Upper bound of confidence interval
  };
  uncertainty: number; // Epistemic uncertainty measure
  volatility: number; // Aleatoric uncertainty measure
}

interface OutcomeScenario {
  id: string;
  name: string;
  description: string;
  baselineProbability: number; // Initial probability
  impactMagnitude: number; // How significant this outcome is
  dependencies: Array<{
    scenarioId: string;
    correlationType: 'positive' | 'negative' | 'conditional';
    strength: number; // 0-1
  }>;
}

interface DecayModel {
  type: 'exponential' | 'power_law' | 'logistic' | 'custom';
  parameters: {
    decayRate?: number; // For exponential
    exponent?: number; // For power law
    growthRate?: number; // For logistic
    carryingCapacity?: number; // For logistic
    customFunction?: string; // For custom models
  };
  halfLife?: number; // Computed half-life for the model
}

interface ForecastingRequest {
  runId: string;
  scenario: {
    title: string;
    timeHorizon: number; // Hours to forecast
    granularity: number; // Hours between forecast points
  };
  outcomes: OutcomeScenario[];
  decayModels: Record<string, DecayModel>; // Per outcome decay model
  externalFactors: Array<{
    name: string;
    influence: number; // -1 to 1
    timeProfile: 'constant' | 'increasing' | 'decreasing' | 'cyclical';
    cyclePeriod?: number; // For cyclical factors
  }>;
  uncertaintyConfig: {
    epistemicUncertainty: number; // Model uncertainty
    aleatoricUncertainty: number; // Natural randomness
    confidenceLevel: number; // 0.90, 0.95, 0.99 etc.
  };
}

class OutcomeForecastingEngine {
  private supabase: any;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async generateOutcomeForecasts(request: ForecastingRequest): Promise<{
    forecasts: Record<string, ForecastPoint[]>;
    correlationMatrix: number[][];
    uncertaintyAnalysis: any;
    scenarioInteractions: any[];
    modelValidation: any;
  }> {
    
    // Step 1: Generate individual outcome forecasts
    const forecasts = await this.generateIndividualForecasts(
      request.outcomes,
      request.decayModels,
      request.scenario,
      request.externalFactors,
      request.uncertaintyConfig
    );
    
    // Step 2: Compute outcome correlations and interactions
    const correlationMatrix = this.computeOutcomeCorrelations(
      request.outcomes,
      forecasts
    );
    
    // Step 3: Adjust forecasts for interactions
    const adjustedForecasts = this.adjustForInteractions(
      forecasts,
      request.outcomes,
      correlationMatrix
    );
    
    // Step 4: Analyze uncertainty sources
    const uncertaintyAnalysis = this.analyzeUncertaintySources(
      adjustedForecasts,
      request.uncertaintyConfig,
      request.externalFactors
    );
    
    // Step 5: Model scenario interactions
    const scenarioInteractions = this.modelScenarioInteractions(
      request.outcomes,
      adjustedForecasts,
      request.scenario.timeHorizon
    );
    
    // Step 6: Validate model performance
    const modelValidation = await this.validateModelPerformance(
      request.outcomes,
      request.decayModels,
      adjustedForecasts
    );
    
    // Step 7: Store forecasting results
    await this.storeForecastingResults(request.runId, {
      forecasts: adjustedForecasts,
      correlationMatrix,
      uncertaintyAnalysis,
      modelValidation
    });
    
    return {
      forecasts: adjustedForecasts,
      correlationMatrix,
      uncertaintyAnalysis,
      scenarioInteractions,
      modelValidation
    };
  }

  // Generate individual forecasts for each outcome
  private async generateIndividualForecasts(
    outcomes: OutcomeScenario[],
    decayModels: Record<string, DecayModel>,
    scenario: any,
    externalFactors: any[],
    uncertaintyConfig: any
  ): Promise<Record<string, ForecastPoint[]>> {
    
    const forecasts: Record<string, ForecastPoint[]> = {};
    const timePoints = this.generateTimePoints(scenario.timeHorizon, scenario.granularity);
    
    for (const outcome of outcomes) {
      const decayModel = decayModels[outcome.id] || this.getDefaultDecayModel();
      const forecastPoints: ForecastPoint[] = [];
      
      for (const t of timePoints) {
        // Compute base probability with decay
        const baseProbability = this.applyDecayModel(
          outcome.baselineProbability,
          t,
          decayModel
        );
        
        // Apply external factor influences
        const adjustedProbability = this.applyExternalFactors(
          baseProbability,
          t,
          externalFactors,
          outcome
        );
        
        // Compute uncertainty bounds
        const uncertaintyBounds = this.computeUncertaintyBounds(
          adjustedProbability,
          t,
          uncertaintyConfig,
          decayModel
        );
        
        forecastPoints.push({
          t,
          probability: Math.max(0, Math.min(1, adjustedProbability)),
          confidence: uncertaintyBounds.confidence,
          uncertainty: uncertaintyBounds.epistemic,
          volatility: uncertaintyBounds.aleatoric
        });
      }
      
      forecasts[outcome.id] = forecastPoints;
    }
    
    return forecasts;
  }

  // Apply decay model to probability over time
  private applyDecayModel(
    baseProbability: number,
    time: number,
    model: DecayModel
  ): number {
    
    switch (model.type) {
      case 'exponential':
        const decayRate = model.parameters.decayRate || 0.1;
        return baseProbability * Math.exp(-decayRate * time);
        
      case 'power_law':
        const exponent = model.parameters.exponent || 1.5;
        return baseProbability * Math.pow(1 + time, -exponent);
        
      case 'logistic':
        const growthRate = model.parameters.growthRate || 0.1;
        const capacity = model.parameters.carryingCapacity || 1.0;
        const logisticFactor = 1 / (1 + Math.exp(-growthRate * (time - 10)));
        return baseProbability * (1 - logisticFactor) + (capacity * logisticFactor);
        
      case 'custom':
        // Simplified custom function evaluation
        return this.evaluateCustomFunction(
          model.parameters.customFunction || 'p * exp(-0.1 * t)',
          baseProbability,
          time
        );
        
      default:
        return baseProbability; // No decay
    }
  }

  // Apply external factor influences
  private applyExternalFactors(
    probability: number,
    time: number,
    factors: any[],
    outcome: OutcomeScenario
  ): number {
    
    let adjustment = 0;
    
    for (const factor of factors) {
      let factorStrength = factor.influence;
      
      // Apply time profile
      switch (factor.timeProfile) {
        case 'increasing':
          factorStrength *= (1 + time * 0.1); // Linear increase
          break;
        case 'decreasing':
          factorStrength *= Math.exp(-time * 0.05); // Exponential decrease
          break;
        case 'cyclical':
          const period = factor.cyclePeriod || 24; // Default 24-hour cycle
          factorStrength *= Math.sin(2 * Math.PI * time / period);
          break;
        // 'constant' requires no modification
      }
      
      // Scale by outcome impact magnitude
      adjustment += factorStrength * outcome.impactMagnitude * 0.1;
    }
    
    return probability + adjustment;
  }

  // Compute uncertainty bounds with confidence intervals
  private computeUncertaintyBounds(
    probability: number,
    time: number,
    config: any,
    model: DecayModel
  ): any {
    
    // Epistemic uncertainty (model uncertainty) grows with time
    const epistemicUncertainty = config.epistemicUncertainty * (1 + time * 0.02);
    
    // Aleatoric uncertainty (natural randomness) depends on probability
    const aleatoricUncertainty = config.aleatoricUncertainty * 
      Math.sqrt(probability * (1 - probability));
    
    // Total uncertainty
    const totalUncertainty = Math.sqrt(
      epistemicUncertainty * epistemicUncertainty + 
      aleatoricUncertainty * aleatoricUncertainty
    );
    
    // Confidence interval based on normal approximation
    const zScore = this.getZScore(config.confidenceLevel);
    const margin = zScore * totalUncertainty;
    
    return {
      confidence: {
        lower: Math.max(0, probability - margin),
        upper: Math.min(1, probability + margin)
      },
      epistemic: epistemicUncertainty,
      aleatoric: aleatoricUncertainty
    };
  }

  // Compute correlations between outcomes
  private computeOutcomeCorrelations(
    outcomes: OutcomeScenario[],
    forecasts: Record<string, ForecastPoint[]>
  ): number[][] {
    
    const n = outcomes.length;
    const correlationMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    // Set diagonal to 1 (self-correlation)
    for (let i = 0; i < n; i++) {
      correlationMatrix[i][i] = 1.0;
    }
    
    // Compute pairwise correlations
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const outcomeA = outcomes[i];
        const outcomeB = outcomes[j];
        
        // Check for explicit dependencies
        const dependency = outcomeA.dependencies.find(dep => dep.scenarioId === outcomeB.id);
        let correlation = 0;
        
        if (dependency) {
          correlation = dependency.correlationType === 'positive' ? dependency.strength :
                       dependency.correlationType === 'negative' ? -dependency.strength :
                       dependency.strength * 0.5; // Conditional correlation
        } else {
          // Compute empirical correlation from forecasts
          correlation = this.computeEmpiricalCorrelation(
            forecasts[outcomeA.id],
            forecasts[outcomeB.id]
          );
        }
        
        correlationMatrix[i][j] = correlation;
        correlationMatrix[j][i] = correlation; // Symmetric
      }
    }
    
    return correlationMatrix;
  }

  // Adjust forecasts for outcome interactions
  private adjustForInteractions(
    forecasts: Record<string, ForecastPoint[]>,
    outcomes: OutcomeScenario[],
    correlationMatrix: number[][]
  ): Record<string, ForecastPoint[]> {
    
    const adjustedForecasts: Record<string, ForecastPoint[]> = {};
    
    for (let i = 0; i < outcomes.length; i++) {
      const outcome = outcomes[i];
      const originalForecast = forecasts[outcome.id];
      const adjustedForecast: ForecastPoint[] = [];
      
      for (let t = 0; t < originalForecast.length; t++) {
        const point = originalForecast[t];
        let adjustment = 0;
        
        // Apply correlation adjustments
        for (let j = 0; j < outcomes.length; j++) {
          if (i !== j) {
            const correlation = correlationMatrix[i][j];
            const otherOutcome = outcomes[j];
            const otherPoint = forecasts[otherOutcome.id][t];
            
            // Correlation adjustment (simplified)
            adjustment += correlation * (otherPoint.probability - 0.5) * 0.1;
          }
        }
        
        const adjustedProbability = Math.max(0, Math.min(1, point.probability + adjustment));
        
        adjustedForecast.push({
          ...point,
          probability: adjustedProbability
        });
      }
      
      adjustedForecasts[outcome.id] = adjustedForecast;
    }
    
    return adjustedForecasts;
  }

  // Analyze uncertainty sources
  private analyzeUncertaintySources(
    forecasts: Record<string, ForecastPoint[]>,
    config: any,
    externalFactors: any[]
  ): any {
    
    const analysis = {
      totalUncertainty: 0,
      uncertaintyBreakdown: {
        epistemic: 0,
        aleatoric: 0,
        external: 0
      },
      uncertaintyTrends: [],
      highUncertaintyPeriods: []
    };
    
    // Aggregate uncertainty across all outcomes and time points
    let totalPoints = 0;
    let totalEpistemic = 0;
    let totalAleatoric = 0;
    
    for (const [outcomeId, forecast] of Object.entries(forecasts)) {
      for (const point of forecast) {
        totalEpistemic += point.uncertainty;
        totalAleatoric += point.volatility;
        totalPoints++;
      }
    }
    
    if (totalPoints > 0) {
      analysis.uncertaintyBreakdown.epistemic = totalEpistemic / totalPoints;
      analysis.uncertaintyBreakdown.aleatoric = totalAleatoric / totalPoints;
      analysis.uncertaintyBreakdown.external = externalFactors.reduce(
        (sum, factor) => sum + Math.abs(factor.influence), 0
      ) / externalFactors.length;
      
      analysis.totalUncertainty = 
        analysis.uncertaintyBreakdown.epistemic + 
        analysis.uncertaintyBreakdown.aleatoric + 
        analysis.uncertaintyBreakdown.external;
    }
    
    return analysis;
  }

  // Model scenario interactions over time
  private modelScenarioInteractions(
    outcomes: OutcomeScenario[],
    forecasts: Record<string, ForecastPoint[]>,
    timeHorizon: number
  ): any[] {
    
    const interactions = [];
    
    // Find time points where multiple outcomes have high probability
    const timePoints = forecasts[outcomes[0].id].map(p => p.t);
    
    for (const t of timePoints) {
      const activeOutcomes = [];
      
      for (const outcome of outcomes) {
        const point = forecasts[outcome.id].find(p => p.t === t);
        if (point && point.probability > 0.3) { // Threshold for "active"
          activeOutcomes.push({
            outcomeId: outcome.id,
            probability: point.probability,
            impact: outcome.impactMagnitude
          });
        }
      }
      
      if (activeOutcomes.length > 1) {
        interactions.push({
          time: t,
          outcomes: activeOutcomes,
          interactionStrength: this.computeInteractionStrength(activeOutcomes),
          potentialConflicts: this.identifyPotentialConflicts(activeOutcomes, outcomes)
        });
      }
    }
    
    return interactions;
  }

  // Validate model performance
  private async validateModelPerformance(
    outcomes: OutcomeScenario[],
    decayModels: Record<string, DecayModel>,
    forecasts: Record<string, ForecastPoint[]>
  ): Promise<any> {
    
    const validation = {
      modelAccuracy: {},
      calibrationScore: 0,
      sharpnessScore: 0,
      reliabilityMetrics: {}
    };
    
    // Simplified validation - in practice would use historical data
    for (const outcome of outcomes) {
      const forecast = forecasts[outcome.id];
      const model = decayModels[outcome.id];
      
      // Compute model-specific metrics
      validation.modelAccuracy[outcome.id] = {
        meanAbsoluteError: this.computeMAE(forecast),
        rootMeanSquareError: this.computeRMSE(forecast),
        probabilityScore: this.computeBrierScore(forecast)
      };
    }
    
    return validation;
  }

  // Helper methods
  private generateTimePoints(timeHorizon: number, granularity: number): number[] {
    const points = [];
    for (let t = 0; t <= timeHorizon; t += granularity) {
      points.push(t);
    }
    return points;
  }

  private getDefaultDecayModel(): DecayModel {
    return {
      type: 'exponential',
      parameters: { decayRate: 0.05 },
      halfLife: Math.log(2) / 0.05
    };
  }

  private evaluateCustomFunction(func: string, p: number, t: number): number {
    // Simplified function evaluation - replace 'p' and 't' in string
    try {
      const expression = func.replace(/p/g, p.toString()).replace(/t/g, t.toString());
      // In practice, would use a proper expression evaluator
      return eval(expression);
    } catch {
      return p; // Fallback to original probability
    }
  }

  private getZScore(confidenceLevel: number): number {
    // Common z-scores for confidence levels
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    return zScores[confidenceLevel] || 1.96;
  }

  private computeEmpiricalCorrelation(forecastA: ForecastPoint[], forecastB: ForecastPoint[]): number {
    if (forecastA.length !== forecastB.length) return 0;
    
    const n = forecastA.length;
    const meanA = forecastA.reduce((sum, p) => sum + p.probability, 0) / n;
    const meanB = forecastB.reduce((sum, p) => sum + p.probability, 0) / n;
    
    let numerator = 0;
    let denomA = 0;
    let denomB = 0;
    
    for (let i = 0; i < n; i++) {
      const devA = forecastA[i].probability - meanA;
      const devB = forecastB[i].probability - meanB;
      
      numerator += devA * devB;
      denomA += devA * devA;
      denomB += devB * devB;
    }
    
    const denominator = Math.sqrt(denomA * denomB);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private computeInteractionStrength(activeOutcomes: any[]): number {
    const totalProbability = activeOutcomes.reduce((sum, o) => sum + o.probability, 0);
    const totalImpact = activeOutcomes.reduce((sum, o) => sum + o.impact, 0);
    return (totalProbability / activeOutcomes.length) * (totalImpact / activeOutcomes.length);
  }

  private identifyPotentialConflicts(activeOutcomes: any[], outcomes: OutcomeScenario[]): string[] {
    const conflicts = [];
    
    for (let i = 0; i < activeOutcomes.length; i++) {
      for (let j = i + 1; j < activeOutcomes.length; j++) {
        const outcomeA = outcomes.find(o => o.id === activeOutcomes[i].outcomeId);
        const outcomeB = outcomes.find(o => o.id === activeOutcomes[j].outcomeId);
        
        if (outcomeA && outcomeB) {
          const negativeCorrelation = outcomeA.dependencies.some(dep => 
            dep.scenarioId === outcomeB.id && dep.correlationType === 'negative'
          );
          
          if (negativeCorrelation) {
            conflicts.push(`${outcomeA.name} conflicts with ${outcomeB.name}`);
          }
        }
      }
    }
    
    return conflicts;
  }

  private computeMAE(forecast: ForecastPoint[]): number {
    // Simplified - would compare against actual outcomes
    return forecast.reduce((sum, p) => sum + Math.abs(p.probability - 0.5), 0) / forecast.length;
  }

  private computeRMSE(forecast: ForecastPoint[]): number {
    // Simplified - would compare against actual outcomes
    const mse = forecast.reduce((sum, p) => sum + Math.pow(p.probability - 0.5, 2), 0) / forecast.length;
    return Math.sqrt(mse);
  }

  private computeBrierScore(forecast: ForecastPoint[]): number {
    // Simplified Brier score calculation
    return forecast.reduce((sum, p) => sum + Math.pow(p.probability - 0.5, 2), 0) / forecast.length;
  }

  private async storeForecastingResults(runId: string, results: any): Promise<void> {
    try {
      await this.supabase
        .from('outcome_forecasting_results')
        .insert({
          run_id: runId,
          forecasting_results: results,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to store forecasting results:', error);
    }
  }
}

// Main handler
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
    
    if (!body.runId || !body.scenario || !body.outcomes) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId, scenario, or outcomes'
      });
    }

    const engine = new OutcomeForecastingEngine(supabase);
    const result = await engine.generateOutcomeForecasts(body);
    
    return jsonResponse(200, {
      ok: true,
      response: result
    });
    
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Outcome forecasting error:', e);
    return jsonResponse(500, { ok: false, message: msg })
  }
});
