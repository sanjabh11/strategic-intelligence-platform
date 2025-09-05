// @ts-nocheck
// Supabase Edge Function: strategic-playbook
// Generates tactical checklists and playbooks for recommended actions
// Endpoint: POST /functions/v1/strategic-playbook
//
// ENV (required):
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Tables: analysis_runs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables")
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface PlaybookRequest {
  analysis_id: string
  analysis_data: any
  scenario_text: string
  generate_alternatives?: boolean
}

interface PlaybookStep {
  step_number: number
  title: string
  description: string
  owner_role: string
  estimated_time: string
  kpis: string[]
  trigger_conditions: string[]
  dependencies: string[]
  risk_mitigation: string[]
}

function generatePlaybookSteps(analysisData: any, scenarioText: string): PlaybookStep[] {
  const steps: PlaybookStep[] = []

  // Extract recommended actions from analysis data
  let recommendedActions = []

  if (analysisData.expected_value_ranking) {
    // Use EV ranking for learner/researcher
    recommendedActions = analysisData.expected_value_ranking
      .slice(0, 3) // Top 3 actions
      .map((item: any) => ({
        action: item.action,
        confidence: item.ev_confidence
      }))
  } else if (analysisData.top_2_actions) {
    // Use top actions for student
    recommendedActions = analysisData.top_2_actions.map((action: any) => ({
      action: action.action,
      confidence: action.expected_outcome.confidence
    }))
  }

  // Generate playbook for each recommended action
  recommendedActions.forEach((recAction: any, index: number) => {
    const baseStep = index + 1

    // Step 1: Assessment
    steps.push({
      step_number: baseStep * 10 + 1,
      title: `Assess ${recAction.action}`,
      description: `Conduct detailed assessment of the recommended action: ${recAction.action}. Evaluate current capabilities, resource requirements, and potential obstacles.`,
      owner_role: 'Strategic Analyst',
      estimated_time: '2-4 hours',
      kpis: [
        'Assessment completeness score',
        'Identified risks documented',
        'Resource requirements quantified'
      ],
      trigger_conditions: [
        'Analysis confidence > 70%',
        'Stakeholder alignment confirmed',
        'Resource availability verified'
      ],
      dependencies: [],
      risk_mitigation: [
        'Consult subject matter experts',
        'Validate assumptions with data',
        'Conduct sensitivity analysis'
      ]
    })

    // Step 2: Planning
    steps.push({
      step_number: baseStep * 10 + 2,
      title: `Develop Implementation Plan for ${recAction.action}`,
      description: `Create detailed implementation timeline, assign responsibilities, and establish monitoring mechanisms for ${recAction.action}.`,
      owner_role: 'Project Manager',
      estimated_time: '4-6 hours',
      kpis: [
        'Plan completeness',
        'Resource allocation efficiency',
        'Timeline realism'
      ],
      trigger_conditions: [
        'Assessment completed',
        'Budget approved',
        'Team assigned'
      ],
      dependencies: [`Step ${(baseStep * 10) + 1}`],
      risk_mitigation: [
        'Build in contingency time',
        'Establish clear communication channels',
        'Create rollback procedures'
      ]
    })

    // Step 3: Execution
    steps.push({
      step_number: baseStep * 10 + 3,
      title: `Execute ${recAction.action}`,
      description: `Implement the planned action according to the established timeline. Monitor progress and adjust as needed.`,
      owner_role: 'Implementation Team',
      estimated_time: '1-4 weeks',
      kpis: [
        'Milestone completion rate',
        'Quality metrics met',
        'Timeline adherence'
      ],
      trigger_conditions: [
        'Implementation plan approved',
        'Resources mobilized',
        'Go/no-go decision made'
      ],
      dependencies: [`Step ${(baseStep * 10) + 2}`],
      risk_mitigation: [
        'Regular progress reviews',
        'Early warning systems',
        'Flexible adaptation protocols'
      ]
    })

    // Step 4: Monitoring & Evaluation
    steps.push({
      step_number: baseStep * 10 + 4,
      title: `Monitor and Evaluate ${recAction.action}`,
      description: `Track outcomes, measure against KPIs, and evaluate effectiveness of ${recAction.action}. Document lessons learned.`,
      owner_role: 'Evaluation Team',
      estimated_time: '1-2 weeks',
      kpis: [
        'Outcome achievement rate',
        'Lesson capture completeness',
        'Process improvement identified'
      ],
      trigger_conditions: [
        'Implementation milestones reached',
        'Data collection systems active',
        'Evaluation framework established'
      ],
      dependencies: [`Step ${(baseStep * 10) + 3}`],
      risk_mitigation: [
        'Establish baseline metrics',
        'Use multiple evaluation methods',
        'Plan for unexpected outcomes'
      ]
    })
  })

  return steps
}

function generateAlternativeScenarios(analysisData: any): any[] {
  // Generate alternative strategic scenarios based on sensitivity analysis
  const alternatives = []

  if (analysisData.sensitivity_advice?.most_sensitive_parameters) {
    analysisData.sensitivity_advice.most_sensitive_parameters.forEach((param: any) => {
      alternatives.push({
        scenario_title: `High ${param.param} Scenario`,
        description: `Scenario where ${param.param} is at elevated levels`,
        trigger_conditions: [`${param.param} exceeds ${param.impact_score * 100}% threshold`],
        contingency_actions: [
          'Activate backup plans',
          'Increase monitoring frequency',
          'Prepare alternative strategies'
        ],
        probability: param.impact_score
      })
    })
  }

  return alternatives
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
    const requestBody: PlaybookRequest = await req.json()
    const { analysis_id, analysis_data, scenario_text, generate_alternatives = false } = requestBody

    if (!analysis_id || !analysis_data || !scenario_text) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_required_fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Generate playbook steps
    const playbookSteps = generatePlaybookSteps(analysis_data, scenario_text)

    // Generate alternative scenarios if requested
    const alternativeScenarios = generate_alternatives
      ? generateAlternativeScenarios(analysis_data)
      : []

    // Create playbook structure
    const playbook = {
      analysis_id,
      scenario_summary: scenario_text.slice(0, 200) + '...',
      generated_at: new Date().toISOString(),
      total_steps: playbookSteps.length,
      estimated_completion_time: '4-8 weeks',
      primary_playbook: playbookSteps,
      alternative_scenarios: alternativeScenarios,
      success_criteria: [
        'All primary steps completed',
        'KPIs met or exceeded',
        'No critical risks realized',
        'Stakeholder satisfaction > 80%'
      ]
    }

    // Update analysis_runs with playbook data
    const { error: updateError } = await supabaseAdmin
      .from('analysis_runs')
      .update({
        analysis_json: {
          ...analysis_data,
          playbook
        }
      })
      .eq('id', analysis_id)

    if (updateError) {
      console.error('Failed to update analysis_runs:', updateError)
    }

    return new Response(JSON.stringify({
      ok: true,
      analysis_id,
      playbook,
      steps_generated: playbookSteps.length,
      alternatives_generated: alternativeScenarios.length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Strategic playbook generation error:', error)
    return new Response(JSON.stringify({
      ok: false,
      error: 'playbook_generation_failed',
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