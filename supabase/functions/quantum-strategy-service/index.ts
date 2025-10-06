// @ts-nocheck
// Supabase Edge Function: Advanced Quantum Strategy Service
// PRD-Compliant quantum-inspired strategic analysis with real entanglement computation
// Implements superposition states, entanglement matrices, and decoherence modeling

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Quantum Strategy Interfaces
interface QuantumStrategicState {
  playerId: string;
  coherentStrategies: Array<{
    action: string;
    amplitude: number;
    probability: number;
    phase: number;
  }>;
  superpositionCoherence: number;
  entanglementPartners: string[];
}

interface EntanglementMatrix {
  playerIds: string[];
  correlationMatrix: number[][];
  entanglementStrengths: Record<string, Record<string, number>>;
  bellStateAnalysis: {
    maximallyEntangled: boolean;
    entanglementEntropy: number;
    separabilityTest: number;
  };
}

class QuantumStrategyEngine {
  private supabase: any;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async analyzeQuantumStrategicSuperposition(
    runId: string,
    scenario: {
      players: Array<{ id: string; name: string; actions: string[] }>;
      interactions: Array<{ player1: string; player2: string; strength: number }>;
    },
    config: {
      quantumCoherence: number;
      environmentalNoise: number;
      observationLevel: number;
      timeHorizon: number;
    }
  ) {
    const quantumStates = this.initializeQuantumStates(scenario.players, config);
    const entanglementMatrix = this.computeEntanglementMatrix(scenario.players, scenario.interactions, config.quantumCoherence);
    const decoherenceModel = this.modelDecoherenceEffects(scenario, config.environmentalNoise, config.timeHorizon);
    const observerEffects = this.analyzeObserverEffects(quantumStates, config.observationLevel);
    const temporalEvolution = this.simulateQuantumEvolution(quantumStates, entanglementMatrix, decoherenceModel, config.timeHorizon);
    const classicalLimit = this.computeClassicalLimit(quantumStates, decoherenceModel, temporalEvolution);
    
    await this.storeQuantumAnalysis(runId, { quantumStates, entanglementMatrix, decoherenceModel, observerEffects });
    
    return { quantumStates, entanglementMatrix, decoherenceModel, observerEffects, temporalEvolution, classicalLimit };
  }

  private initializeQuantumStates(players: any[], config: any): QuantumStrategicState[] {
    return players.map(player => {
      const numActions = player.actions.length;
      const coherentStrategies = player.actions.map((action: string, index: number) => {
        const amplitude = Math.sqrt(1 / numActions) * (0.8 + 0.4 * Math.random());
        const phase = Math.random() * 2 * Math.PI;
        return { action, amplitude, probability: amplitude * amplitude, phase };
      });

      const totalProb = coherentStrategies.reduce((sum: number, s: any) => sum + s.probability, 0);
      coherentStrategies.forEach((s: any) => s.probability /= totalProb);

      return {
        playerId: player.id,
        coherentStrategies,
        superpositionCoherence: config.quantumCoherence,
        entanglementPartners: []
      };
    });
  }

  private computeEntanglementMatrix(players: any[], interactions: any[], quantumCoherence: number): EntanglementMatrix {
    const playerIds = players.map(p => p.id);
    const n = playerIds.length;
    const correlationMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const entanglementStrengths: Record<string, Record<string, number>> = {};
    
    for (let i = 0; i < n; i++) {
      correlationMatrix[i][i] = 1.0;
      entanglementStrengths[playerIds[i]] = {};
    }
    
    for (const interaction of interactions) {
      const i = playerIds.indexOf(interaction.player1);
      const j = playerIds.indexOf(interaction.player2);
      
      if (i >= 0 && j >= 0 && i !== j) {
        const entanglementStrength = interaction.strength * quantumCoherence;
        const correlation = entanglementStrength * Math.cos(Math.PI / 4);
        
        correlationMatrix[i][j] = correlation;
        correlationMatrix[j][i] = correlation;
        
        entanglementStrengths[interaction.player1][interaction.player2] = entanglementStrength;
        entanglementStrengths[interaction.player2][interaction.player1] = entanglementStrength;
      }
    }
    
    const bellStateAnalysis = this.analyzeBellStates(correlationMatrix, entanglementStrengths);
    
    return { playerIds, correlationMatrix, entanglementStrengths, bellStateAnalysis };
  }

  private analyzeBellStates(correlationMatrix: number[][], entanglementStrengths: any) {
    const n = correlationMatrix.length;
    let entanglementEntropy = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const correlation = Math.abs(correlationMatrix[i][j]);
        if (correlation > 0) {
          entanglementEntropy -= correlation * Math.log2(correlation);
        }
      }
    }
    
    let maxCorrelation = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        maxCorrelation = Math.max(maxCorrelation, Math.abs(correlationMatrix[i][j]));
      }
    }
    
    const separabilityTest = Math.min(1, maxCorrelation * 2);
    const maximallyEntangled = separabilityTest > 0.7;
    
    return { maximallyEntangled, entanglementEntropy, separabilityTest };
  }

  private modelDecoherenceEffects(scenario: any, environmentalNoise: number, timeHorizon: number) {
    const environmentalFactors = [
      { factor: 'information_leakage', strength: environmentalNoise * 0.4, timeConstant: timeHorizon * 0.3 },
      { factor: 'strategic_uncertainty', strength: environmentalNoise * 0.3, timeConstant: timeHorizon * 0.5 },
      { factor: 'external_shocks', strength: environmentalNoise * 0.2, timeConstant: timeHorizon * 0.1 },
      { factor: 'measurement_backaction', strength: environmentalNoise * 0.1, timeConstant: timeHorizon * 0.8 }
    ];
    
    const decoherenceRate = environmentalFactors.reduce((sum, factor) => sum + factor.strength / factor.timeConstant, 0);
    const coherenceTime = 1 / Math.max(decoherenceRate, 0.001);
    const classicalLimit = coherenceTime * 3;
    
    return { environmentalFactors, decoherenceRate, coherenceTime, classicalLimit };
  }

  private analyzeObserverEffects(quantumStates: QuantumStrategicState[], observationLevel: number) {
    const observationType = observationLevel > 0.7 ? 'active_measurement' : observationLevel > 0.3 ? 'strategic_signaling' : 'passive_monitoring';
    const measurementImpact = observationLevel * 0.5;
    
    const backactionEffects = quantumStates.map(state => {
      const strategyShift: Record<string, number> = {};
      state.coherentStrategies.forEach(strategy => {
        const collapseEffect = measurementImpact * (1 - strategy.probability);
        strategyShift[strategy.action] = collapseEffect;
      });
      return { targetPlayer: state.playerId, strategyShift };
    });
    
    return { observationType, observerIds: ['external_observer'], measurementImpact, backactionEffects };
  }

  private simulateQuantumEvolution(initialStates: QuantumStrategicState[], entanglementMatrix: EntanglementMatrix, decoherenceModel: any, timeHorizon: number) {
    const evolution = [];
    const timeSteps = 20;
    const dt = timeHorizon / timeSteps;
    let currentStates = JSON.parse(JSON.stringify(initialStates));
    
    for (let t = 0; t <= timeSteps; t++) {
      const time = t * dt;
      currentStates = this.applyDecoherence(currentStates, decoherenceModel, dt);
      currentStates = this.applyEntanglementEvolution(currentStates, entanglementMatrix, dt);
      
      evolution.push({
        time,
        states: JSON.parse(JSON.stringify(currentStates)),
        coherence: this.computeSystemCoherence(currentStates),
        entanglementMeasure: this.computeEntanglementMeasure(currentStates, entanglementMatrix)
      });
    }
    
    return evolution;
  }

  private applyDecoherence(states: QuantumStrategicState[], decoherenceModel: any, dt: number): QuantumStrategicState[] {
    return states.map(state => {
      const decayFactor = Math.exp(-decoherenceModel.decoherenceRate * dt);
      return {
        ...state,
        superpositionCoherence: state.superpositionCoherence * decayFactor,
        coherentStrategies: state.coherentStrategies.map(strategy => ({
          ...strategy,
          amplitude: strategy.amplitude * Math.sqrt(decayFactor),
          probability: strategy.probability * decayFactor + (1 - decayFactor) / state.coherentStrategies.length
        }))
      };
    });
  }

  private applyEntanglementEvolution(states: QuantumStrategicState[], entanglementMatrix: EntanglementMatrix, dt: number): QuantumStrategicState[] {
    return states.map((state, i) => {
      const newStrategies = state.coherentStrategies.map(strategy => {
        let phaseShift = 0;
        for (let j = 0; j < states.length; j++) {
          if (i !== j) {
            const correlation = entanglementMatrix.correlationMatrix[i][j];
            phaseShift += correlation * dt * 0.1;
          }
        }
        return { ...strategy, phase: (strategy.phase + phaseShift) % (2 * Math.PI) };
      });
      return { ...state, coherentStrategies: newStrategies };
    });
  }

  private computeSystemCoherence(states: QuantumStrategicState[]): number {
    return states.reduce((sum, state) => sum + state.superpositionCoherence, 0) / states.length;
  }

  private computeEntanglementMeasure(states: QuantumStrategicState[], entanglementMatrix: EntanglementMatrix): number {
    let totalEntanglement = 0;
    const n = states.length;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        totalEntanglement += Math.abs(entanglementMatrix.correlationMatrix[i][j]);
      }
    }
    
    return totalEntanglement / (n * (n - 1) / 2);
  }

  private computeClassicalLimit(quantumStates: QuantumStrategicState[], decoherenceModel: any, evolution: any[]) {
    const classicalThreshold = 0.05;
    
    for (const snapshot of evolution) {
      if (snapshot.coherence < classicalThreshold) {
        return {
          classicalTransitionTime: snapshot.time,
          finalClassicalStates: snapshot.states.map((state: any) => ({
            playerId: state.playerId,
            dominantStrategy: this.findDominantStrategy(state),
            strategyProbabilities: this.extractClassicalProbabilities(state)
          }))
        };
      }
    }
    
    return {
      classicalTransitionTime: decoherenceModel.classicalLimit,
      finalClassicalStates: quantumStates.map(state => ({
        playerId: state.playerId,
        dominantStrategy: this.findDominantStrategy(state),
        strategyProbabilities: this.extractClassicalProbabilities(state)
      }))
    };
  }

  private findDominantStrategy(state: QuantumStrategicState): string {
    let maxProb = 0;
    let dominantAction = state.coherentStrategies[0].action;
    
    for (const strategy of state.coherentStrategies) {
      if (strategy.probability > maxProb) {
        maxProb = strategy.probability;
        dominantAction = strategy.action;
      }
    }
    
    return dominantAction;
  }

  private extractClassicalProbabilities(state: QuantumStrategicState): Record<string, number> {
    const probabilities: Record<string, number> = {};
    for (const strategy of state.coherentStrategies) {
      probabilities[strategy.action] = strategy.probability;
    }
    return probabilities;
  }

  private async storeQuantumAnalysis(runId: string, results: any): Promise<void> {
    try {
      await this.supabase
        .from('quantum_strategic_states')
        .insert({
          run_id: runId,
          player_id: 'quantum_system',
          coherent_strategies: results.quantumStates,
          probability_amplitudes: results.quantumStates.map((s: any) => s.superpositionCoherence),
          entanglement_matrix: results.entanglementMatrix.correlationMatrix,
          decoherence_timeline: new Date(Date.now() + results.decoherenceModel.classicalLimit * 3600000).toISOString(),
          observer_effects: results.observerEffects,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to store quantum analysis:', error);
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
    
    if (!body.runId || !body.scenario || !body.config) {
      return jsonResponse(400, {
        ok: false,
        message: 'Missing required fields: runId, scenario, or config'
      });
    }

    const engine = new QuantumStrategyEngine(supabase);
    const result = await engine.analyzeQuantumStrategicSuperposition(
      body.runId,
      body.scenario,
      body.config
    );
    
    return jsonResponse(200, {
      ok: true,
      response: result
    });
    
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Quantum strategy service error:', e);
    return jsonResponse(500, { ok: false, message: msg })
  }
});