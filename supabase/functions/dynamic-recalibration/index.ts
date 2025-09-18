// @ts-nocheck
// Supabase Edge Function: Dynamic Strategy Recalibration
// PRD-Compliant real-time strategy optimization under changing conditions
// Implements continuous Bayesian belief updating and adaptive strategy adjustment

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface StrategicBelief {
  parameter: string;
  priorDistribution: {
    mean: number;
    variance: number;
    confidence: number;
  };
  posteriorDistribution: {
    mean: number;
    variance: number;
    confidence: number;
  };
  updateHistory: Array<{
    timestamp: number;
    evidence: any;
    informationGain: number;
  }>;
}

interface StrategyRecommendation {
  actionId: string;
  priority: number;
  confidence: number;
  expectedValue: number;
  riskLevel: number;
  adaptationReason: string;
  validityWindow: {
    start: number;
    end: number;
  };
}

interface RecalibrationTrigger {
  type: 'information_update' | 'time_decay' | 'performance_deviation' | 'external_shock';
  threshold: number;
  sensitivity: number;
  cooldownPeriod: number; // Minimum time between recalibrations
}

interface RecalibrationRequest {
  runId: string;
  currentStrategy: {
    actions: Array<{
      id: string;
      name: string;
      currentPriority: number;
      performance: number; // Actual vs expected performance
    }>;
    beliefs: StrategicBelief[];
    lastUpdate: number; // Timestamp
  };
  newInformation: Array<{
    source: string;
    type: 'market_data' | 'competitor_action' | 'regulatory_change' | 'performance_feedback';
    content: any;
    reliability: number; // 0-1
    timestamp: number;
  }>;
  recalibrationConfig: {
    triggers: RecalibrationTrigger[];
    adaptationRate: number; // How quickly to adapt (0-1)
    conservatismBias: number; // Preference for current strategy (0-1)
    lookAheadHorizon: number; // Hours to optimize for
  };
  constraints: {
    maxStrategyChanges: number;
    minConfidenceThreshold: number;
    resourceLimitations: Record<string, number>;
  };
}

class DynamicRecalibrationEngine {
  private supabase: any;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async recalibrateStrategy(request: RecalibrationRequest): Promise<{
    shouldRecalibrate: boolean;
    triggeredBy: string[];
    updatedBeliefs: StrategicBelief[];
    newRecommendations: StrategyRecommendation[];
    adaptationMetrics: any;
    riskAssessment: any;
  }> {
    
    // Step 1: Evaluate recalibration triggers
    const triggerAnalysis = this.evaluateRecalibrationTriggers(
      request.currentStrategy,
      request.newInformation,
      request.recalibrationConfig.triggers
    );
    
    if (!triggerAnalysis.shouldRecalibrate) {
      return {
        shouldRecalibrate: false,
        triggeredBy: [],
        updatedBeliefs: request.currentStrategy.beliefs,
        newRecommendations: [],
        adaptationMetrics: { reason: 'No significant triggers detected' },
        riskAssessment: { level: 'stable' }
      };
    }
    
    // Step 2: Update beliefs with new information
    const updatedBeliefs = await this.updateStrategicBeliefs(
      request.currentStrategy.beliefs,
      request.newInformation,
      request.recalibrationConfig.adaptationRate
    );
    
    // Step 3: Recompute strategy recommendations
    const newRecommendations = await this.recomputeStrategyRecommendations(
      request.currentStrategy.actions,
      updatedBeliefs,
      request.recalibrationConfig,
      request.constraints
    );
    
    // Step 4: Compute adaptation metrics
    const adaptationMetrics = this.computeAdaptationMetrics(
      request.currentStrategy,
      { beliefs: updatedBeliefs, recommendations: newRecommendations },
      request.newInformation
    );
    
    // Step 5: Assess risks of strategy change
    const riskAssessment = this.assessRecalibrationRisks(
      request.currentStrategy,
      newRecommendations,
      adaptationMetrics
    );
    
    // Step 6: Store recalibration results
    await this.storeRecalibrationResults(request.runId, {
      triggerAnalysis,
      updatedBeliefs,
      newRecommendations,
      adaptationMetrics,
      riskAssessment
    });
    
    return {
      shouldRecalibrate: true,
      triggeredBy: triggerAnalysis.activeTriggers,
      updatedBeliefs,
      newRecommendations,
      adaptationMetrics,
      riskAssessment
    };
  }

  // Evaluate whether recalibration should be triggered
  private evaluateRecalibrationTriggers(
    currentStrategy: any,
    newInformation: any[],
    triggers: RecalibrationTrigger[]
  ): { shouldRecalibrate: boolean; activeTriggers: string[]; triggerStrengths: Record<string, number> } {
    
    const activeTriggers: string[] = [];
    const triggerStrengths: Record<string, number> = {};
    const currentTime = Date.now();
    
    for (const trigger of triggers) {
      let triggerStrength = 0;
      
      switch (trigger.type) {
        case 'information_update':
          // Check volume and significance of new information
          const significantInfo = newInformation.filter(info => 
            info.reliability > 0.7 && 
            (currentTime - info.timestamp) < 3600000 // Within last hour
          );
          triggerStrength = Math.min(1, significantInfo.length / 5); // Normalize by expected volume
          break;
          
        case 'time_decay':
          // Check how long since last update
          const timeSinceUpdate = (currentTime - currentStrategy.lastUpdate) / 3600000; // Hours
          triggerStrength = Math.min(1, timeSinceUpdate / 24); // Normalize by 24 hours
          break;
          
        case 'performance_deviation':
          // Check if actual performance deviates from expected
          const performanceDeviations = currentStrategy.actions.map((action: any) => 
            Math.abs(action.performance - 1.0) // 1.0 = expected performance
          );
          const avgDeviation = performanceDeviations.reduce((sum: number, dev: number) => sum + dev, 0) / performanceDeviations.length;
          triggerStrength = Math.min(1, avgDeviation / 0.5); // Normalize by 50% deviation
          break;
          
        case 'external_shock':
          // Check for high-impact external events
          const shockEvents = newInformation.filter(info => 
            info.type === 'regulatory_change' || 
            (info.reliability > 0.8 && info.content?.impact > 0.7)
          );
          triggerStrength = Math.min(1, shockEvents.length / 2); // Normalize by 2 shock events
          break;
      }
      
      triggerStrengths[trigger.type] = triggerStrength;
      
      if (triggerStrength >= trigger.threshold) {
        activeTriggers.push(trigger.type);
      }
    }
    
    return {
      shouldRecalibrate: activeTriggers.length > 0,
      activeTriggers,
      triggerStrengths
    };
  }

  // Update strategic beliefs using Bayesian updating
  private async updateStrategicBeliefs(
    currentBeliefs: StrategicBelief[],
    newInformation: any[],
    adaptationRate: number
  ): Promise<StrategicBelief[]> {
    
    const updatedBeliefs: StrategicBelief[] = [];
    
    for (const belief of currentBeliefs) {
      // Find relevant information for this belief parameter
      const relevantInfo = newInformation.filter(info => 
        this.isInformationRelevant(info, belief.parameter)
      );
      
      if (relevantInfo.length === 0) {
        // No new information - apply time decay to confidence
        const decayedBelief = this.applyTimeDecay(belief, adaptationRate);
        updatedBeliefs.push(decayedBelief);
        continue;
      }
      
      // Perform Bayesian update
      const updatedBelief = this.performBayesianUpdate(
        belief,
        relevantInfo,
        adaptationRate
      );
      
      updatedBeliefs.push(updatedBelief);
    }
    
    return updatedBeliefs;
  }

  // Check if information is relevant to a belief parameter
  private isInformationRelevant(information: any, parameter: string): boolean {
    // Simplified relevance matching - in practice would use NLP/semantic matching
    const infoText = JSON.stringify(information.content).toLowerCase();
    const parameterKeywords = parameter.toLowerCase().split('_');
    
    return parameterKeywords.some(keyword => infoText.includes(keyword));
  }

  // Apply time decay to belief confidence
  private applyTimeDecay(belief: StrategicBelief, decayRate: number): StrategicBelief {
    const decayFactor = Math.exp(-decayRate * 0.1); // Small decay per update
    
    return {
      ...belief,
      posteriorDistribution: {
        ...belief.posteriorDistribution,
        confidence: belief.posteriorDistribution.confidence * decayFactor,
        variance: belief.posteriorDistribution.variance * (1 + (1 - decayFactor) * 0.1)
      }
    };
  }

  // Perform Bayesian belief update
  private performBayesianUpdate(
    belief: StrategicBelief,
    relevantInfo: any[],
    adaptationRate: number
  ): StrategicBelief {
    
    let updatedMean = belief.posteriorDistribution.mean;
    let updatedVariance = belief.posteriorDistribution.variance;
    let updatedConfidence = belief.posteriorDistribution.confidence;
    
    for (const info of relevantInfo) {
      // Extract evidence value from information
      const evidenceValue = this.extractEvidenceValue(info, belief.parameter);
      const evidenceReliability = info.reliability;
      
      // Bayesian update formulas (simplified)
      const priorPrecision = 1 / updatedVariance;
      const evidencePrecision = evidenceReliability * 10; // Scale reliability to precision
      
      const posteriorPrecision = priorPrecision + evidencePrecision;
      const posteriorMean = (priorPrecision * updatedMean + evidencePrecision * evidenceValue) / posteriorPrecision;
      const posteriorVariance = 1 / posteriorPrecision;
      
      // Apply adaptation rate to moderate the update
      updatedMean = updatedMean + adaptationRate * (posteriorMean - updatedMean);
      updatedVariance = updatedVariance + adaptationRate * (posteriorVariance - updatedVariance);
      
      // Update confidence based on information gain
      const informationGain = this.computeInformationGain(
        { mean: updatedMean, variance: updatedVariance },
        { mean: posteriorMean, variance: posteriorVariance }
      );
      
      updatedConfidence = Math.min(1, updatedConfidence + informationGain * 0.1);
      
      // Record update in history
      belief.updateHistory.push({
        timestamp: Date.now(),
        evidence: info,
        informationGain
      });
    }
    
    return {
      ...belief,
      posteriorDistribution: {
        mean: updatedMean,
        variance: updatedVariance,
        confidence: updatedConfidence
      }
    };
  }

  // Extract numerical evidence value from information
  private extractEvidenceValue(information: any, parameter: string): number {
    // Simplified evidence extraction - in practice would use sophisticated NLP
    if (information.content?.value !== undefined) {
      return information.content.value;
    }
    
    // Try to extract from text content
    if (typeof information.content === 'string') {
      const numbers = information.content.match(/\d+\.?\d*/g);
      if (numbers && numbers.length > 0) {
        return parseFloat(numbers[0]);
      }
    }
    
    // Default to neutral evidence
    return 0.5;
  }

  // Compute information gain from belief update
  private computeInformationGain(prior: any, posterior: any): number {
    // KL divergence approximation for information gain
    const klDivergence = Math.log(Math.sqrt(posterior.variance / prior.variance)) + 
                        (prior.variance + Math.pow(prior.mean - posterior.mean, 2)) / (2 * posterior.variance) - 0.5;
    
    return Math.max(0, klDivergence);
  }

  // Recompute strategy recommendations based on updated beliefs
  private async recomputeStrategyRecommendations(
    currentActions: any[],
    updatedBeliefs: StrategicBelief[],
    config: any,
    constraints: any
  ): Promise<StrategyRecommendation[]> {
    
    const recommendations: StrategyRecommendation[] = [];
    
    for (const action of currentActions) {
      // Compute new expected value based on updated beliefs
      const expectedValue = this.computeExpectedValue(action, updatedBeliefs);
      
      // Compute confidence in recommendation
      const confidence = this.computeRecommendationConfidence(action, updatedBeliefs);
      
      // Compute risk level
      const riskLevel = this.computeActionRisk(action, updatedBeliefs);
      
      // Determine if action should be adapted
      const adaptationReason = this.determineAdaptationReason(
        action,
        expectedValue,
        confidence,
        riskLevel,
        config.conservatismBias
      );
      
      // Compute validity window
      const validityWindow = this.computeValidityWindow(
        action,
        updatedBeliefs,
        config.lookAheadHorizon
      );
      
      recommendations.push({
        actionId: action.id,
        priority: this.computeActionPriority(expectedValue, confidence, riskLevel),
        confidence,
        expectedValue,
        riskLevel,
        adaptationReason,
        validityWindow
      });
    }
    
    // Sort by priority and apply constraints
    recommendations.sort((a, b) => b.priority - a.priority);
    
    return this.applyRecommendationConstraints(recommendations, constraints);
  }

  // Compute expected value of action given updated beliefs
  private computeExpectedValue(action: any, beliefs: StrategicBelief[]): number {
    // Simplified expected value computation
    let expectedValue = 0.5; // Base value
    
    for (const belief of beliefs) {
      // Weight by belief confidence and relevance to action
      const relevance = this.computeBeliefActionRelevance(belief, action);
      const contribution = belief.posteriorDistribution.mean * belief.posteriorDistribution.confidence * relevance;
      expectedValue += contribution * 0.1; // Scale contribution
    }
    
    return Math.max(0, Math.min(1, expectedValue));
  }

  // Compute confidence in recommendation
  private computeRecommendationConfidence(action: any, beliefs: StrategicBelief[]): number {
    const relevantBeliefs = beliefs.filter(belief => 
      this.computeBeliefActionRelevance(belief, action) > 0.3
    );
    
    if (relevantBeliefs.length === 0) return 0.5;
    
    const avgConfidence = relevantBeliefs.reduce((sum, belief) => 
      sum + belief.posteriorDistribution.confidence, 0
    ) / relevantBeliefs.length;
    
    return avgConfidence;
  }

  // Compute action risk level
  private computeActionRisk(action: any, beliefs: StrategicBelief[]): number {
    // Risk increases with belief uncertainty
    const relevantBeliefs = beliefs.filter(belief => 
      this.computeBeliefActionRelevance(belief, action) > 0.3
    );
    
    if (relevantBeliefs.length === 0) return 0.5;
    
    const avgUncertainty = relevantBeliefs.reduce((sum, belief) => 
      sum + belief.posteriorDistribution.variance, 0
    ) / relevantBeliefs.length;
    
    return Math.min(1, avgUncertainty * 2); // Scale uncertainty to risk
  }

  // Compute relevance of belief to action
  private computeBeliefActionRelevance(belief: StrategicBelief, action: any): number {
    // Simplified relevance computation - in practice would use semantic similarity
    const beliefKeywords = belief.parameter.toLowerCase().split('_');
    const actionKeywords = action.name.toLowerCase().split('_');
    
    const commonKeywords = beliefKeywords.filter(keyword => 
      actionKeywords.some(actionKeyword => actionKeyword.includes(keyword))
    );
    
    return commonKeywords.length / Math.max(beliefKeywords.length, actionKeywords.length);
  }

  // Determine reason for adaptation
  private determineAdaptationReason(
    action: any,
    expectedValue: number,
    confidence: number,
    riskLevel: number,
    conservatismBias: number
  ): string {
    
    const currentValue = action.currentPriority || 0.5;
    const valueDifference = expectedValue - currentValue;
    const adaptationThreshold = 0.1 * (1 + conservatismBias);
    
    if (Math.abs(valueDifference) < adaptationThreshold) {
      return 'No significant change required';
    } else if (valueDifference > adaptationThreshold) {
      return `Increased expected value (${(valueDifference * 100).toFixed(1)}% improvement)`;
    } else if (valueDifference < -adaptationThreshold) {
      return `Decreased expected value (${(-valueDifference * 100).toFixed(1)}% decline)`;
    } else if (riskLevel > 0.7) {
      return 'High risk level detected - consider risk mitigation';
    } else if (confidence < 0.3) {
      return 'Low confidence - gather more information before proceeding';
    } else {
      return 'Minor adjustment based on updated beliefs';
    }
  }

  // Compute action priority
  private computeActionPriority(expectedValue: number, confidence: number, riskLevel: number): number {
    // Priority = Expected Value * Confidence * (1 - Risk)
    return expectedValue * confidence * (1 - riskLevel);
  }

  // Compute validity window for recommendation
  private computeValidityWindow(action: any, beliefs: StrategicBelief[], lookAheadHorizon: number): any {
    const currentTime = Date.now();
    
    // Estimate how long beliefs will remain stable
    const beliefStability = beliefs.reduce((min, belief) => 
      Math.min(min, belief.posteriorDistribution.confidence), 1
    );
    
    const validityDuration = lookAheadHorizon * beliefStability; // Hours
    
    return {
      start: currentTime,
      end: currentTime + validityDuration * 3600000 // Convert to milliseconds
    };
  }

  // Apply constraints to recommendations
  private applyRecommendationConstraints(
    recommendations: StrategyRecommendation[],
    constraints: any
  ): StrategyRecommendation[] {
    
    // Filter by minimum confidence threshold
    let filtered = recommendations.filter(rec => 
      rec.confidence >= constraints.minConfidenceThreshold
    );
    
    // Limit number of strategy changes
    if (filtered.length > constraints.maxStrategyChanges) {
      filtered = filtered.slice(0, constraints.maxStrategyChanges);
    }
    
    return filtered;
  }

  // Compute adaptation metrics
  private computeAdaptationMetrics(
    currentStrategy: any,
    newStrategy: any,
    newInformation: any[]
  ): any {
    
    return {
      beliefChangesMagnitude: this.computeBeliefChanges(currentStrategy.beliefs, newStrategy.beliefs),
      strategyChangesMagnitude: this.computeStrategyChanges(currentStrategy.actions, newStrategy.recommendations),
      informationUtilization: newInformation.length > 0 ? newInformation.filter(info => info.reliability > 0.5).length / newInformation.length : 0,
      adaptationSpeed: Date.now() - currentStrategy.lastUpdate,
      confidenceImprovement: this.computeConfidenceImprovement(currentStrategy.beliefs, newStrategy.beliefs)
    };
  }

  // Assess risks of recalibration
  private assessRecalibrationRisks(
    currentStrategy: any,
    newRecommendations: StrategyRecommendation[],
    adaptationMetrics: any
  ): any {
    
    return {
      level: adaptationMetrics.strategyChangesMagnitude > 0.5 ? 'high' : 
             adaptationMetrics.strategyChangesMagnitude > 0.2 ? 'medium' : 'low',
      factors: [
        adaptationMetrics.strategyChangesMagnitude > 0.5 ? 'Major strategy changes proposed' : null,
        adaptationMetrics.confidenceImprovement < 0 ? 'Decreased confidence in beliefs' : null,
        newRecommendations.some(rec => rec.riskLevel > 0.7) ? 'High-risk actions recommended' : null
      ].filter(Boolean),
      mitigationSuggestions: [
        'Implement changes gradually',
        'Monitor performance closely',
        'Maintain fallback options'
      ]
    };
  }

  // Helper methods for metrics computation
  private computeBeliefChanges(oldBeliefs: StrategicBelief[], newBeliefs: StrategicBelief[]): number {
    let totalChange = 0;
    
    for (let i = 0; i < Math.min(oldBeliefs.length, newBeliefs.length); i++) {
      const oldBelief = oldBeliefs[i];
      const newBelief = newBeliefs[i];
      
      const meanChange = Math.abs(newBelief.posteriorDistribution.mean - oldBelief.posteriorDistribution.mean);
      const confidenceChange = Math.abs(newBelief.posteriorDistribution.confidence - oldBelief.posteriorDistribution.confidence);
      
      totalChange += (meanChange + confidenceChange) / 2;
    }
    
    return oldBeliefs.length > 0 ? totalChange / oldBeliefs.length : 0;
  }

  private computeStrategyChanges(oldActions: any[], newRecommendations: StrategyRecommendation[]): number {
    let totalChange = 0;
    
    for (const oldAction of oldActions) {
      const newRec = newRecommendations.find(rec => rec.actionId === oldAction.id);
      if (newRec) {
        const priorityChange = Math.abs(newRec.priority - (oldAction.currentPriority || 0.5));
        totalChange += priorityChange;
      }
    }
    
    return oldActions.length > 0 ? totalChange / oldActions.length : 0;
  }

  private computeConfidenceImprovement(oldBeliefs: StrategicBelief[], newBeliefs: StrategicBelief[]): number {
    let totalImprovement = 0;
    
    for (let i = 0; i < Math.min(oldBeliefs.length, newBeliefs.length); i++) {
      const improvement = newBeliefs[i].posteriorDistribution.confidence - oldBeliefs[i].posteriorDistribution.confidence;
      totalImprovement += improvement;
    }
    
    return oldBeliefs.length > 0 ? totalImprovement / oldBeliefs.length : 0;
  }

  private async storeRecalibrationResults(runId: string, results: any): Promise<void> {
    try {
      await this.supabase
        .from('dynamic_recalibration_results')
        .insert({
          run_id: runId,
          recalibration_results: results,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to store recalibration results:', error);
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
    
    if (!body.runId || !body.currentStrategy || !body.newInformation) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId, currentStrategy, or newInformation'
      });
    }

    const engine = new DynamicRecalibrationEngine(supabase);
    const result = await engine.recalibrateStrategy(body);
    
    return jsonResponse(200, {
      ok: true,
      response: result
    });
    
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Dynamic recalibration error:', e);
    return jsonResponse(500, { ok: false, message: msg })
  }
});
