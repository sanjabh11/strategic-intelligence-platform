// @ts-nocheck
// Supabase Edge Function: Temporal Strategy Optimization
// PRD-Compliant window of opportunity dynamics and timing optimization
// Implements real-time strategic timing and temporal cascade modeling

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TemporalWindow {
  id: string;
  name: string;
  startTime: number; // Hours from now
  endTime: number; // Hours from now
  opportunityValue: number; // 0-1 scale
  decayRate: number; // How quickly value decreases
  prerequisites: string[]; // Required conditions
  conflictsWith: string[]; // Mutually exclusive windows
}

interface StrategicAction {
  id: string;
  name: string;
  duration: number; // Hours to execute
  resourceRequirement: number; // 0-1 scale
  reversibility: number; // 0-1, how easily can this be undone
  informationValue: number; // How much this reveals to opponents
  cascadeEffects: Array<{
    targetAction: string;
    delay: number; // Hours
    probabilityMultiplier: number;
  }>;
}

interface TemporalOptimizationRequest {
  runId: string;
  scenario: {
    title: string;
    timeHorizon: number; // Total hours available
    urgencyLevel: number; // 0-1 scale
  };
  availableActions: StrategicAction[];
  temporalWindows: TemporalWindow[];
  constraints: {
    maxConcurrentActions: number;
    resourceBudget: number;
    informationLeakageLimit: number;
  };
  objectives: {
    maximizeValue: number; // Weight 0-1
    minimizeRisk: number; // Weight 0-1
    preserveFlexibility: number; // Weight 0-1
  };
}

class TemporalStrategyOptimizer {
  private supabase: any;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async optimizeTemporalStrategy(request: TemporalOptimizationRequest): Promise<{
    optimalSchedule: any[];
    windowAnalysis: any;
    cascadeProjections: any[];
    flexibilityMetrics: any;
    riskAssessment: any;
  }> {
    
    // Step 1: Analyze temporal windows and their dynamics
    const windowAnalysis = this.analyzeTemporalWindows(
      request.temporalWindows,
      request.scenario.timeHorizon
    );
    
    // Step 2: Compute optimal action scheduling
    const optimalSchedule = await this.computeOptimalSchedule(
      request.availableActions,
      request.temporalWindows,
      request.constraints,
      request.objectives,
      request.scenario.timeHorizon
    );
    
    // Step 3: Project cascade effects over time
    const cascadeProjections = this.projectCascadeEffects(
      optimalSchedule,
      request.availableActions,
      request.scenario.timeHorizon
    );
    
    // Step 4: Compute flexibility metrics
    const flexibilityMetrics = this.computeFlexibilityMetrics(
      optimalSchedule,
      request.availableActions,
      request.temporalWindows
    );
    
    // Step 5: Assess temporal risks
    const riskAssessment = this.assessTemporalRisks(
      optimalSchedule,
      windowAnalysis,
      cascadeProjections
    );
    
    // Step 6: Store optimization results
    await this.storeOptimizationResults(request.runId, {
      optimalSchedule,
      windowAnalysis,
      flexibilityMetrics,
      riskAssessment
    });
    
    return {
      optimalSchedule,
      windowAnalysis,
      cascadeProjections,
      flexibilityMetrics,
      riskAssessment
    };
  }

  // Analyze temporal windows and their value dynamics
  private analyzeTemporalWindows(
    windows: TemporalWindow[],
    timeHorizon: number
  ): any {
    const analysis = {
      criticalWindows: [],
      windowConflicts: [],
      valueDecayAnalysis: [],
      optimalTimingRecommendations: []
    };

    // Identify critical windows (high value, short duration)
    for (const window of windows) {
      const duration = window.endTime - window.startTime;
      const criticality = window.opportunityValue / Math.max(duration, 0.1);
      
      if (criticality > 0.5) { // Threshold for criticality
        analysis.criticalWindows.push({
          windowId: window.id,
          criticality,
          timeRemaining: Math.max(0, window.startTime),
          actionRequired: window.startTime < 1 // Less than 1 hour to act
        });
      }
    }

    // Analyze window conflicts
    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        const windowA = windows[i];
        const windowB = windows[j];
        
        // Check for temporal overlap
        const overlap = Math.max(0, 
          Math.min(windowA.endTime, windowB.endTime) - 
          Math.max(windowA.startTime, windowB.startTime)
        );
        
        if (overlap > 0 || windowA.conflictsWith.includes(windowB.id)) {
          analysis.windowConflicts.push({
            windows: [windowA.id, windowB.id],
            overlapDuration: overlap,
            conflictType: windowA.conflictsWith.includes(windowB.id) ? 'strategic' : 'temporal',
            resolutionStrategy: this.suggestConflictResolution(windowA, windowB, overlap)
          });
        }
      }
    }

    // Analyze value decay patterns
    for (const window of windows) {
      const decayAnalysis = this.analyzeValueDecay(window, timeHorizon);
      analysis.valueDecayAnalysis.push(decayAnalysis);
    }

    return analysis;
  }

  // Compute optimal action scheduling using dynamic programming
  private async computeOptimalSchedule(
    actions: StrategicAction[],
    windows: TemporalWindow[],
    constraints: any,
    objectives: any,
    timeHorizon: number
  ): Promise<any[]> {
    
    // Create time slots (hourly granularity)
    const timeSlots = Math.ceil(timeHorizon);
    const schedule = [];
    
    // Use greedy algorithm with look-ahead for scheduling
    const availableActions = [...actions];
    let currentTime = 0;
    let usedResources = 0;
    let informationLeaked = 0;
    let activeActions = 0;

    while (currentTime < timeHorizon && availableActions.length > 0) {
      // Find best action for current time
      const candidates = availableActions.filter(action => {
        // Check resource constraints
        if (usedResources + action.resourceRequirement > constraints.resourceBudget) return false;
        
        // Check concurrency constraints
        if (activeActions >= constraints.maxConcurrentActions) return false;
        
        // Check information leakage
        if (informationLeaked + action.informationValue > constraints.informationLeakageLimit) return false;
        
        // Check if action fits in remaining time
        if (currentTime + action.duration > timeHorizon) return false;
        
        return true;
      });

      if (candidates.length === 0) {
        currentTime += 1; // Advance time if no actions possible
        continue;
      }

      // Score candidates based on objectives
      const scoredCandidates = candidates.map(action => {
        const score = this.scoreActionAtTime(action, currentTime, windows, objectives);
        return { action, score };
      });

      // Select best action
      scoredCandidates.sort((a, b) => b.score - a.score);
      const selectedAction = scoredCandidates[0].action;

      // Schedule the action
      schedule.push({
        actionId: selectedAction.id,
        startTime: currentTime,
        endTime: currentTime + selectedAction.duration,
        expectedValue: scoredCandidates[0].score,
        resourcesUsed: selectedAction.resourceRequirement,
        informationRevealed: selectedAction.informationValue
      });

      // Update state
      usedResources += selectedAction.resourceRequirement;
      informationLeaked += selectedAction.informationValue;
      activeActions++;
      currentTime += selectedAction.duration;

      // Remove action from available list
      const actionIndex = availableActions.indexOf(selectedAction);
      availableActions.splice(actionIndex, 1);

      // Simulate action completion (for concurrency tracking)
      setTimeout(() => activeActions--, selectedAction.duration * 1000);
    }

    return schedule;
  }

  // Score an action at a specific time considering windows and objectives
  private scoreActionAtTime(
    action: StrategicAction,
    time: number,
    windows: TemporalWindow[],
    objectives: any
  ): number {
    let score = 0;

    // Value maximization component
    const windowValue = this.computeWindowValue(action, time, windows);
    score += windowValue * objectives.maximizeValue;

    // Risk minimization component (inverse of risk)
    const riskLevel = this.computeActionRisk(action, time, windows);
    score += (1 - riskLevel) * objectives.minimizeRisk;

    // Flexibility preservation component
    const flexibilityImpact = action.reversibility;
    score += flexibilityImpact * objectives.preserveFlexibility;

    return score;
  }

  // Compute value of action within temporal windows
  private computeWindowValue(
    action: StrategicAction,
    time: number,
    windows: TemporalWindow[]
  ): number {
    let totalValue = 0;

    for (const window of windows) {
      // Check if action overlaps with window
      const actionEnd = time + action.duration;
      const overlap = Math.max(0, 
        Math.min(actionEnd, window.endTime) - 
        Math.max(time, window.startTime)
      );

      if (overlap > 0) {
        // Compute decayed value at action time
        const timeIntoWindow = Math.max(0, time - window.startTime);
        const decayedValue = window.opportunityValue * Math.exp(-window.decayRate * timeIntoWindow);
        
        // Weight by overlap proportion
        const overlapProportion = overlap / action.duration;
        totalValue += decayedValue * overlapProportion;
      }
    }

    return totalValue;
  }

  // Compute risk level of action at specific time
  private computeActionRisk(
    action: StrategicAction,
    time: number,
    windows: TemporalWindow[]
  ): number {
    let risk = 0;

    // Information leakage risk
    risk += action.informationValue * 0.3;

    // Irreversibility risk
    risk += (1 - action.reversibility) * 0.4;

    // Timing risk (acting too early or too late)
    const timingRisk = this.computeTimingRisk(action, time, windows);
    risk += timingRisk * 0.3;

    return Math.min(1, risk);
  }

  // Compute timing-specific risks
  private computeTimingRisk(
    action: StrategicAction,
    time: number,
    windows: TemporalWindow[]
  ): number {
    // Find relevant windows for this action
    const relevantWindows = windows.filter(window => {
      const actionEnd = time + action.duration;
      return actionEnd > window.startTime && time < window.endTime;
    });

    if (relevantWindows.length === 0) {
      return 0.8; // High risk if not in any window
    }

    // Compute risk based on window positioning
    let minRisk = 1;
    for (const window of relevantWindows) {
      const windowCenter = (window.startTime + window.endTime) / 2;
      const actionCenter = time + action.duration / 2;
      const deviation = Math.abs(actionCenter - windowCenter);
      const windowDuration = window.endTime - window.startTime;
      const normalizedDeviation = deviation / (windowDuration / 2);
      
      minRisk = Math.min(minRisk, normalizedDeviation);
    }

    return minRisk;
  }

  // Project cascade effects over time
  private projectCascadeEffects(
    schedule: any[],
    actions: StrategicAction[],
    timeHorizon: number
  ): any[] {
    const cascades = [];
    const timeSlots = Array(Math.ceil(timeHorizon)).fill(0).map((_, i) => ({ time: i, effects: [] }));

    for (const scheduledAction of schedule) {
      const action = actions.find(a => a.id === scheduledAction.actionId);
      if (!action) continue;

      for (const cascade of action.cascadeEffects) {
        const effectTime = scheduledAction.endTime + cascade.delay;
        
        if (effectTime < timeHorizon) {
          const timeSlot = Math.floor(effectTime);
          if (timeSlots[timeSlot]) {
            timeSlots[timeSlot].effects.push({
              sourceAction: action.id,
              targetAction: cascade.targetAction,
              probability: cascade.probabilityMultiplier,
              magnitude: scheduledAction.expectedValue * cascade.probabilityMultiplier
            });
          }
        }
      }
    }

    return timeSlots.filter(slot => slot.effects.length > 0);
  }

  // Compute flexibility metrics for the schedule
  private computeFlexibilityMetrics(
    schedule: any[],
    actions: StrategicAction[],
    windows: TemporalWindow[]
  ): any {
    const metrics = {
      overallFlexibility: 0,
      reversibilityScore: 0,
      adaptabilityScore: 0,
      contingencyOptions: []
    };

    // Compute reversibility score
    let totalReversibility = 0;
    for (const scheduledAction of schedule) {
      const action = actions.find(a => a.id === scheduledAction.actionId);
      if (action) {
        totalReversibility += action.reversibility;
      }
    }
    metrics.reversibilityScore = schedule.length > 0 ? totalReversibility / schedule.length : 0;

    // Compute adaptability score (unused windows and actions)
    const usedWindows = new Set();
    for (const scheduledAction of schedule) {
      for (const window of windows) {
        if (scheduledAction.startTime < window.endTime && scheduledAction.endTime > window.startTime) {
          usedWindows.add(window.id);
        }
      }
    }
    metrics.adaptabilityScore = 1 - (usedWindows.size / windows.length);

    // Overall flexibility
    metrics.overallFlexibility = (metrics.reversibilityScore + metrics.adaptabilityScore) / 2;

    return metrics;
  }

  // Assess temporal risks in the schedule
  private assessTemporalRisks(
    schedule: any[],
    windowAnalysis: any,
    cascadeProjections: any[]
  ): any {
    const risks = {
      missedOpportunities: [],
      cascadeRisks: [],
      timingRisks: [],
      overallRiskScore: 0
    };

    // Identify missed critical windows
    for (const criticalWindow of windowAnalysis.criticalWindows) {
      const windowCovered = schedule.some(action => 
        action.startTime < criticalWindow.timeRemaining + 1 && // Assuming 1-hour window
        action.endTime > criticalWindow.timeRemaining
      );
      
      if (!windowCovered) {
        risks.missedOpportunities.push({
          windowId: criticalWindow.windowId,
          lostValue: criticalWindow.criticality,
          timeRemaining: criticalWindow.timeRemaining
        });
      }
    }

    // Analyze cascade risks
    for (const cascade of cascadeProjections) {
      const highRiskEffects = cascade.effects.filter(effect => effect.probability > 0.7);
      if (highRiskEffects.length > 0) {
        risks.cascadeRisks.push({
          time: cascade.time,
          riskLevel: Math.max(...highRiskEffects.map(e => e.probability)),
          effects: highRiskEffects
        });
      }
    }

    // Compute overall risk score
    const missedOpportunityRisk = risks.missedOpportunities.length * 0.2;
    const cascadeRisk = risks.cascadeRisks.length * 0.15;
    risks.overallRiskScore = Math.min(1, missedOpportunityRisk + cascadeRisk);

    return risks;
  }

  // Helper methods
  private analyzeValueDecay(window: TemporalWindow, timeHorizon: number): any {
    const decayPoints = [];
    const duration = window.endTime - window.startTime;
    
    for (let t = window.startTime; t <= Math.min(window.endTime, timeHorizon); t += duration / 10) {
      const timeIntoWindow = t - window.startTime;
      const value = window.opportunityValue * Math.exp(-window.decayRate * timeIntoWindow);
      decayPoints.push({ time: t, value });
    }
    
    return {
      windowId: window.id,
      decayPattern: decayPoints,
      halfLife: Math.log(2) / window.decayRate,
      optimalActionTime: window.startTime + (1 / window.decayRate) * 0.5 // Slightly delayed for preparation
    };
  }

  private suggestConflictResolution(windowA: TemporalWindow, windowB: TemporalWindow, overlap: number): string {
    if (windowA.opportunityValue > windowB.opportunityValue * 1.5) {
      return `Prioritize ${windowA.name} due to significantly higher value`;
    } else if (windowB.opportunityValue > windowA.opportunityValue * 1.5) {
      return `Prioritize ${windowB.name} due to significantly higher value`;
    } else if (overlap < 2) {
      return 'Consider sequential execution with minimal delay';
    } else {
      return 'Evaluate partial execution or resource splitting';
    }
  }

  private async storeOptimizationResults(runId: string, results: any): Promise<void> {
    try {
      await this.supabase
        .from('temporal_optimization_results')
        .insert({
          run_id: runId,
          optimization_results: results,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to store temporal optimization results:', error);
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
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
    
    if (!body.runId || !body.scenario || !body.availableActions || !body.temporalWindows) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId, scenario, availableActions, or temporalWindows'
      });
    }

    const optimizer = new TemporalStrategyOptimizer(supabase);
    const result = await optimizer.optimizeTemporalStrategy(body);
    
    return jsonResponse(200, {
      ok: true,
      response: result
    });
    
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Temporal strategy optimization error:', e);
    return jsonResponse(500, { ok: false, message: msg })
  }
});
