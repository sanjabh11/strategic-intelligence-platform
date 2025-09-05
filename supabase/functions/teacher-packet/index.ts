// @ts-nocheck
// Supabase Edge Function: teacher-packet
// Generates educational materials for teacher audience
// Endpoint: POST /functions/v1/teacher-packet
//
// ENV (required):
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Tables: analysis_runs, asset_storage

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables")
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface TeacherPacketRequest {
  analysis_id: string
  analysis_data: any
  scenario_text: string
}

function generateLessonPlan(analysisData: any, scenarioText: string): string {
  const lesson = analysisData.lesson_outline

  return `# Lesson Plan: ${scenarioText.slice(0, 50)}...

## Duration: ${lesson.duration_minutes} minutes

## Learning Objectives
${lesson.learning_objectives.map(obj => `- ${obj}`).join('\n')}

## Summary
${lesson.summary}

## Materials Needed
- Whiteboard/projector
- Student handouts
- Timer
- Role cards (if simulation)

## Lesson Structure

### Introduction (10 minutes)
- Present the strategic scenario
- Discuss initial reactions
- Connect to real-world geopolitics

### Main Activity (25 minutes)
- ${lesson.learning_objectives[0] || 'Analyze the scenario'}
- Group discussion and analysis
- Present key findings

### Simulation/Game (15 minutes)
- Set up roles and rules
- Run simulation rounds
- Debrief outcomes

### Conclusion (5 minutes)
- Summarize key learnings
- Connect to broader concepts
- Assign follow-up work`
}

function generateSimulationRules(analysisData: any): string {
  const setup = analysisData.simulation_setup

  return `# Strategic Simulation Rules

## Setup
- **Players**: ${setup.roles.length} participants
- **Rounds**: ${setup.rounds}
- **Time per Round**: ${setup.timing_minutes_per_round} minutes

## Roles
${setup.roles.map((role: any) => `### ${role.role}
- **Instructions**: ${role.instructions}
- **Goal**: Maximize your payoff while considering strategic implications
${role.payoff_card_url ? `- **Payoff Card**: ${role.payoff_card_url}` : ''}`).join('\n\n')}

## Rules
1. Each round, players make simultaneous decisions
2. Payoffs are calculated based on the payoff matrix
3. Players can communicate but cannot share private information
4. The game continues for ${setup.rounds} rounds
5. Debrief after each round to discuss strategies

## Scoring
- Points are awarded based on outcomes
- Bonus points for creative strategic thinking
- Participation points for engagement`
}

function generateGradingRubric(analysisData: any): string {
  return `# Assessment Rubric

## Strategic Analysis (40%)
${analysisData.grading_rubric.map((item: any) => `- **${item.criteria}** (${item.max_points} points): ${item.description}`).join('\n')}

## Participation (30%)
- Active engagement in discussion: 15 points
- Quality of questions asked: 10 points
- Contribution to group learning: 5 points

## Simulation Performance (30%)
- Strategic decision making: 15 points
- Adaptation to changing conditions: 10 points
- Reflection on outcomes: 5 points

## Total: 100 points`
}

function generateStudentHandouts(analysisData: any, scenarioText: string): string[] {
  const handouts = []

  // Scenario summary handout
  handouts.push(`# Strategic Scenario Analysis

## Scenario
${scenarioText}

## Key Questions to Consider
1. What are the main actors involved?
2. What are their possible actions?
3. What are the potential outcomes?
4. How might uncertainty affect decisions?
5. What evidence supports different viewpoints?

## Your Analysis
[Space for student notes and analysis]`)

  // Decision matrix handout
  handouts.push(`# Decision Matrix Worksheet

## Scenario Overview
${scenarioText.slice(0, 100)}...

## Decision Analysis
Consider the following factors:
- Stakeholder interests
- Risk levels
- Potential outcomes
- Evidence strength

## Your Recommendations
1. Recommended action:
2. Rationale:
3. Potential risks:
4. Evidence supporting your view:`)

  return handouts
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
    const requestBody: TeacherPacketRequest = await req.json()
    const { analysis_id, analysis_data, scenario_text } = requestBody

    if (!analysis_id || !analysis_data || !scenario_text) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_required_fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Generate educational materials
    const lessonPlan = generateLessonPlan(analysis_data, scenario_text)
    const simulationRules = generateSimulationRules(analysis_data)
    const gradingRubric = generateGradingRubric(analysis_data)
    const studentHandouts = generateStudentHandouts(analysis_data, scenario_text)

    // Create downloadable URLs (simplified - in production use proper storage)
    const materials = {
      lesson_plan: `data:text/markdown;base64,${btoa(lessonPlan)}`,
      simulation_rules: `data:text/markdown;base64,${btoa(simulationRules)}`,
      grading_rubric: `data:text/markdown;base64,${btoa(gradingRubric)}`,
      student_handouts: studentHandouts.map(handout =>
        `data:text/markdown;base64,${btoa(handout)}`
      )
    }

    // Store materials in asset_storage table
    const assetRecords = [
      {
        analysis_run_id: analysis_id,
        asset_type: 'lesson_plan',
        asset_url: materials.lesson_plan
      },
      {
        analysis_run_id: analysis_id,
        asset_type: 'simulation_rules',
        asset_url: materials.simulation_rules
      },
      {
        analysis_run_id: analysis_id,
        asset_type: 'grading_rubric',
        asset_url: materials.grading_rubric
      },
      ...studentHandouts.map((_, index) => ({
        analysis_run_id: analysis_id,
        asset_type: `student_handout_${index + 1}`,
        asset_url: materials.student_handouts[index]
      }))
    ]

    const { error: insertError } = await supabaseAdmin
      .from('asset_storage')
      .insert(assetRecords)

    if (insertError) {
      console.error('Failed to store assets:', insertError)
    }

    return new Response(JSON.stringify({
      ok: true,
      analysis_id,
      materials,
      assets_stored: assetRecords.length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Teacher packet generation error:', error)
    return new Response(JSON.stringify({
      ok: false,
      error: 'teacher_packet_generation_failed',
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