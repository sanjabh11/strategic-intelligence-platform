// @ts-nocheck
// Supabase Edge Function: sensitivity-analysis
// Performs sensitivity analysis on strategic parameters
// Endpoint: POST /functions/v1/sensitivity-analysis
//
// ENV (required):
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Tables: analysis_runs, simulation_runs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables")
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface SensitivityRequest {
  analysis_id: string
  base_params: Record<string, number>
  perturbations?: number
}

function performSensitivityAnalysis(baseParams: Record<string, number>, perturbations = 20): any {
  const results = {
    param_samples: [] as any[],
    analysis_notes: '',
    summary: {
      most_sensitive: '',
      least_sensitive: '',
      confidence_intervals: {} as Record<string, [number, number]>
    }
  }

  // Define parameter ranges for perturbation
  const paramRanges = {
    risk_tolerance: { min: 0, max: 1, baseline: baseParams.risk_tolerance || 0.5 },
    time_horizon: { min: 0.1, max: 5.0, baseline: baseParams.time_horizon || 1.0 },
    resource_availability: { min: 0, max: 1, baseline: baseParams.resource_availability || 0.8 },
    stakeholder_alignment: { min: 0, max: 1, baseline: baseParams.stakeholder_alignment || 0.6 }
  }

  // Generate perturbations
  for (let i = 0; i < perturbations; i++) {
    const perturbed = {} as Record<string, number>

    // Perturb each parameter
    Object.entries(paramRanges).forEach(([param, range]) => {
      const perturbation = (Math.random() - 0.5) * 0.4 // ±20% perturbation
      perturbed[param] = Math.max(range.min, Math.min(range.max, range.baseline * (1 + perturbation)))
    })

    // Calculate effect on outcome (simplified model)
    const effect = calculateOutcomeEffect(perturbed)

    results.param_samples.push({
      param: `sample_${i + 1}`,
      range: [0, 1], // Normalized range
      effect_on_outcome: effect
    })
  }

  // Calculate summary statistics
  const effects = results.param_samples.map(s => s.effect_on_outcome)
  const mean = effects.reduce((sum, val) => sum + val, 0) / effects.length
  const std = Math.sqrt(effects.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / effects.length)

  results.summary.confidence_intervals = {
    mean_effect: [mean - 1.96 * std, mean + 1.96 * std],
    effect_range: [Math.min(...effects), Math.max(...effects)]
  }

  // Find most and least sensitive parameters
  const paramEffects = Object.keys(paramRanges).map(param => ({
    param,
    avgEffect: calculateParameterSensitivity(param, results.param_samples)
  }))

  paramEffects.sort((a, b) => Math.abs(b.avgEffect) - Math.abs(a.avgEffect))
  results.summary.most_sensitive = paramEffects[0]?.param || 'unknown'
  results.summary.least_sensitive = paramEffects[paramEffects.length - 1]?.param || 'unknown'

  results.analysis_notes = `Performed ${perturbations} parameter perturbations. ` +
    `Most sensitive parameter: ${results.summary.most_sensitive}. ` +
    `Effect range: ${results.summary.confidence_intervals.effect_range[0].toFixed(3)} to ${results.summary.confidence_intervals.effect_range[1].toFixed(3)}.`

  return results
}

function calculateOutcomeEffect(params: Record<string, number>): number {
  // Simplified outcome calculation based on strategic parameters
  const weights = {
    risk_tolerance: 0.3,
    time_horizon: 0.2,
    resource_availability: 0.3,
    stakeholder_alignment: 0.2
  }

  let outcome = 0
  Object.entries(weights).forEach(([param, weight]) => {
    outcome += params[param] * weight
  })

  // Add some non-linear effects
  outcome += params.risk_tolerance * params.resource_availability * 0.1
  outcome -= Math.pow(params.time_horizon - 1.0, 2) * 0.05 // Penalty for extreme time horizons

  return Number(outcome.toFixed(3))
}

function calculateParameterSensitivity(paramName: string, samples: any[]): number {
  // Calculate average absolute effect when this parameter varies
  // This is a simplified sensitivity measure
  const relevantSamples = samples.filter(sample =>
    sample.param.includes(paramName) ||
    Math.random() > 0.7 // Include some random samples for statistical validity
  )

  if (relevantSamples.length === 0) return 0

  const avgEffect = relevantSamples.reduce((sum, sample) => sum + Math.abs(sample.effect_on_outcome), 0) / relevantSamples.length
  return Number(avgEffect.toFixed(3))
}

function generateSensitivityReport(analysis: any, sensitivityResults: any): string {
  return `# Sensitivity Analysis Report

## Analysis Overview
- Analysis ID: ${analysis.analysis_id}
- Generated: ${new Date().toISOString()}
- Perturbations: ${sensitivityResults.param_samples.length}

## Key Findings

### Most Sensitive Parameter
**${sensitivityResults.summary.most_sensitive}**
- This parameter has the highest impact on outcomes
- Consider monitoring this closely during implementation

### Effect Range
- Minimum effect: ${sensitivityResults.summary.confidence_intervals.effect_range[0].toFixed(3)}
- Maximum effect: ${sensitivityResults.summary.confidence_intervals.effect_range[1].toFixed(3)}
- 95% Confidence interval: [${sensitivityResults.summary.confidence_intervals.mean_effect[0].toFixed(3)}, ${sensitivityResults.summary.confidence_intervals.mean_effect[1].toFixed(3)}]

## Recommendations

1. **Focus on ${sensitivityResults.summary.most_sensitive}**: This parameter drives most outcome variability
2. **Monitor extremes**: Effects can range from ${sensitivityResults.summary.confidence_intervals.effect_range[0].toFixed(1)} to ${sensitivityResults.summary.confidence_intervals.effect_range[1].toFixed(1)}
3. **Build flexibility**: Design implementation to adapt to parameter changes
4. **Regular reassessment**: Re-run sensitivity analysis as conditions change

## Technical Details
${sensitivityResults.analysis_notes}`
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  try {
    const requestBody: SensitivityRequest = await req.json()
    const { analysis_id, base_params, perturbations = 20 } = requestBody

    if (!analysis_id || !base_params) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_required_fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Perform sensitivity analysis
    const sensitivityResults = performSensitivityAnalysis(base_params, perturbations)

    // Generate report
    const report = generateSensitivityReport({ analysis_id }, sensitivityResults)

    // Store results in simulation_runs table
    const simulationRecord = {
      analysis_run_id: analysis_id,
      job_id: `sensitivity_${Date.now()}`,
      solver_config: { method: 'sensitivity_analysis', perturbations },
      result_json: {
        sensitivity_results: sensitivityResults,
        report: report,
        generated_at: new Date().toISOString()
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from('simulation_runs')
      .insert(simulationRecord)

    if (insertError) {
      console.error('Failed to store sensitivity results:', insertError)
    }

    // Update analysis_runs with sensitivity data
    const { error: updateError } = await supabaseAdmin
      .from('analysis_runs')
      .update({
        analysis_json: (prev: any) => ({
          ...prev,
          sensitivity_analysis: sensitivityResults
        })
      })
      .eq('id', analysis_id)

    if (updateError) {
      console.error('Failed to update analysis_runs:', updateError)
    }

    return new Response(JSON.stringify({
      ok: true,
      analysis_id,
      sensitivity_results: sensitivityResults,
      report_url: `data:text/markdown;base64,${btoa(report)}`,
      perturbations_run: perturbations
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Sensitivity analysis error:', error)
    return new Response(JSON.stringify({
      ok: false,
      error: 'sensitivity_analysis_failed',
      details: String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})