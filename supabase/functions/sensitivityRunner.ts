// @ts-nocheck
// deno-lint-ignore-file
// supabase/functions/sensitivityRunner.ts
// Sensitivity analysis runner - performs parameter perturbations (n=10, ±10%) and creates tornado summary
// Endpoint: POST /worker/jobs (job type: sensitivity)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { computeEVs } from "./evEngine.ts";

// --- Environment helpers ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface KeyParam {
  name: string;
  base: number;
  range: [number, number]; // percentage range e.g. [-10, 10] for ±10%
}

interface BaseActions { // simplified action entry
  actor: string;
  action: string;
  payoff_estimate: {
    value: number;
    confidence: number;
    sources: Array<{id: string, score: number, excerpt?: string}>
  };
}

export async function runSensitivity(
  baseActions: BaseActions[],
  keyParams: KeyParam[],
  n: number = 10
): Promise<any> {
  const results: any[] = [];

  for (const p of keyParams) {
    const deltas: number[] = [];

    // Generate n perturbations within ±10% range
    for (let i = 0; i < n; i++) {
      const factor = p.range[0] + Math.random() * (p.range[1] - p.range[0]); // Random within range

      // Apply perturbation to base values
      const perturbed = baseActions.map(action => ({
        ...action,
        payoff_estimate: {
          ...action.payoff_estimate,
          value: action.payoff_estimate.value * (1 + factor / 100) // Apply percentage factor
        }
      }));

      const evs = computeEVs(perturbed);
      const topEV = evs[0]?.ev || 0; // Track top EV change
      deltas.push(topEV);
    }

    const avg = deltas.reduce((s, v) => s + v, 0) / deltas.length;
    const min = Math.min(...deltas);
    const max = Math.max(...deltas);
    const range = max - min;

    // Tornado summary for this parameter
    results.push({
      param: p.name,
      base_value: p.base,
      range_percentage: p.range,
      avg_top_ev: avg,
      min_ev: min,
      max_ev: max,
      range_delta: range,
      raw_deltas: deltas
    });
  }

  // Sort by impact (largest range first = most sensitive)
  results.sort((a, b) => b.range_delta - a.range_delta);

  const tornado_summary = {
    most_sensitive_parameter: results[0]?.param || 'none',
    total_parameters: results.length,
    samples_per_parameter: n,
    perturbation_range_percent: 10,
    parameter_sensitivity_ranking: results.map(r => ({
      param: r.param,
      range_delta: r.range_delta,
      avg_top_ev: r.avg_top_ev
    }))
  };

  return {
    results,
    tornado_summary
  };
}

// Handler for worker job execution
export async function handleSensitivityJob(jobData: any) {
  const { analysis_id, base_actions, key_params, n = 10 } = jobData;

  try {
    const sensitivityResults = await runSensitivity(base_actions, key_params, n);

    // Persist to simulation_runs
    const simulationRecord = {
      analysis_run_id: analysis_id,
      job_id: `sensitivity_${Date.now()}`,
      solver_config: {
        method: 'sensitivity_analysis',
        n,
        perturbation_range: 10
      },
      result_json: sensitivityResults,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin
      .from('simulation_runs')
      .insert(simulationRecord);

    if (error) {
      throw new Error(`Failed to persist sensitivity results: ${error.message}`);
    }

    return { success: true, simulation_id: simulationRecord.job_id };

  } catch (error) {
    console.error('Sensitivity job failed:', error);
    return { success: false, error: String(error) };
  }
}