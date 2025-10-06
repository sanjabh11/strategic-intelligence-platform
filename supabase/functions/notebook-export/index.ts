// @ts-nocheck
// Supabase Edge Function: notebook-export
// Generates downloadable Jupyter/Colab notebook for researcher analysis
// Endpoint: POST /functions/v1/notebook-export
//
// ENV (required):
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Tables: analysis_runs, retrieval_cache

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables")
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface NotebookRequest {
  analysis_id: string
  analysis_data: any
  retrievals: any[]
}

function generateNotebookContent(analysisData: any, retrievals: any[]): string {
  const cells = []

  // Title cell
  cells.push({
    cell_type: "markdown",
    source: `# Strategic Intelligence Analysis Notebook\n\nAnalysis ID: ${analysisData.analysis_id}\n\nGenerated: ${new Date().toISOString()}`
  })

  // Setup cell
  cells.push({
    cell_type: "code",
    source: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.optimize import linprog
import json

# Load analysis data
analysis_data = ${JSON.stringify(analysisData, null, 2)}

print("Analysis loaded successfully")
print(f"Audience: {analysisData.audience}")
print(f"Retrievals: {analysisData.provenance.retrieval_count}")`
  })

  // Payoff matrix cell
  if (analysisData.payoff_matrix) {
    cells.push({
      cell_type: "markdown",
      source: "## Payoff Matrix Analysis"
    })

    cells.push({
      cell_type: "code",
      source: `# Payoff Matrix
players = ${JSON.stringify(analysisData.payoff_matrix.players)}
actions_by_player = ${JSON.stringify(analysisData.payoff_matrix.actions_by_player)}
matrix_values = ${JSON.stringify(analysisData.payoff_matrix.matrix_values)}

print("Players:", players)
print("Actions by player:", actions_by_player)
print("Payoff matrix shape:", np.array(matrix_values).shape)`
    })
  }

  // Solver configuration
  if (analysisData.solver_config) {
    cells.push({
      cell_type: "markdown",
      source: "## Game Theory Solver"
    })

    cells.push({
      cell_type: "code",
      source: `# Solver Configuration
solver_config = ${JSON.stringify(analysisData.solver_config)}

print("Solver method:", solver_config['method'])
print("Random seed:", solver_config['seed'])
print("Iterations:", solver_config['iterations'])`
    })
  }

  // Simulation results
  if (analysisData.simulation_results) {
    cells.push({
      cell_type: "markdown",
      source: "## Simulation Results"
    })

    cells.push({
      cell_type: "code",
      source: `# Simulation Results
equilibria = ${JSON.stringify(analysisData.simulation_results.equilibria)}
sensitivity = ${JSON.stringify(analysisData.simulation_results.sensitivity)}

print("Number of equilibria found:", len(equilibria))
for i, eq in enumerate(equilibria):
    print(f"Equilibrium {i+1}: {eq['type']} - Stability: {eq['stability']:.3f}")`
    })
  }

  // Data exports
  if (analysisData.data_exports) {
    cells.push({
      cell_type: "markdown",
      source: "## Data Exports"
    })

    cells.push({
      cell_type: "code",
      source: `# Data Export URLs
payoff_csv_url = "${analysisData.data_exports.payoff_csv_url || 'Not available'}"
simulations_json_url = "${analysisData.data_exports.simulations_json_url || 'Not available'}"

print("Payoff CSV:", payoff_csv_url)
print("Simulations JSON:", simulations_json_url)`
    })
  }

  // Retrievals section
  if (retrievals && retrievals.length > 0) {
    cells.push({
      cell_type: "markdown",
      source: "## Source Evidence"
    })

    cells.push({
      cell_type: "code",
      source: `# Retrievals
retrievals = ${JSON.stringify(retrievals)}

print(f"Total sources: {len(retrievals)}")
for i, r in enumerate(retrievals):
    print(f"{i+1}. {r.get('title', 'Source')} - {r.get('url', 'No URL')}")`
    })
  }

  return JSON.stringify({
    cells,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3"
      },
      language_info: {
        name: "python",
        version: "3.8.0"
      }
    },
    nbformat: 4,
    nbformat_minor: 4
  }, null, 1)
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
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
    const requestBody: NotebookRequest = await req.json()
    const { analysis_id, analysis_data, retrievals } = requestBody

    if (!analysis_id || !analysis_data) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_required_fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Generate notebook content
    const notebookContent = generateNotebookContent(analysis_data, retrievals || [])

    // Store notebook in Supabase storage (simplified - in production use proper storage)
    const notebookBlob = new Blob([notebookContent], { type: 'application/json' })
    const notebookUrl = `data:application/json;base64,${btoa(notebookContent)}`

    // Update analysis_runs with notebook URL
    const { error: updateError } = await supabaseAdmin
      .from('analysis_runs')
      .update({
        analysis_json: {
          ...analysis_data,
          notebook_url: notebookUrl
        }
      })
      .eq('id', analysis_id)

    if (updateError) {
      console.error('Failed to update analysis_runs:', updateError)
    }

    return new Response(JSON.stringify({
      ok: true,
      notebook_url: notebookUrl,
      notebook_content: notebookContent,
      analysis_id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Notebook export error:', error)
    return new Response(JSON.stringify({
      ok: false,
      error: 'notebook_generation_failed',
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