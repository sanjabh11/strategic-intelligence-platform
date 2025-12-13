// Export Analysis Edge Function
// Generates exportable formats (CSV, JSON, Python, R) from analysis results
// Part of Monetization Strategy - Key researcher feature

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ExportRequest {
  analysisRunId: string;
  format: 'csv' | 'json' | 'python' | 'r' | 'excel';
  includeMetadata?: boolean;
  includeRawData?: boolean;
}

interface PayoffMatrix {
  players: string[];
  actions: Record<string, string[]>;
  payoffs: Record<string, Record<string, number[]>>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { analysisRunId, format, includeMetadata = true, includeRawData = false }: ExportRequest = await req.json()

    if (!analysisRunId || !format) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: analysisRunId, format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch analysis data
    const { data: analysis, error: fetchError } = await supabase
      .from('analysis_runs')
      .select('*')
      .eq('id', analysisRunId)
      .single()

    if (fetchError || !analysis) {
      return new Response(
        JSON.stringify({ error: 'Analysis not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const analysisJson = analysis.analysis_json || {}
    let exportContent: string
    let contentType: string
    let filename: string

    switch (format) {
      case 'csv':
        exportContent = generateCSV(analysisJson, includeMetadata)
        contentType = 'text/csv'
        filename = `analysis_${analysisRunId.slice(0, 8)}.csv`
        break

      case 'json':
        exportContent = generateJSON(analysisJson, analysis, includeMetadata, includeRawData)
        contentType = 'application/json'
        filename = `analysis_${analysisRunId.slice(0, 8)}.json`
        break

      case 'python':
        exportContent = generatePythonScript(analysisJson, analysis)
        contentType = 'text/x-python'
        filename = `analysis_${analysisRunId.slice(0, 8)}.py`
        break

      case 'r':
        exportContent = generateRScript(analysisJson, analysis)
        contentType = 'text/x-r'
        filename = `analysis_${analysisRunId.slice(0, 8)}.R`
        break

      case 'excel':
        // For Excel, we return JSON that frontend can convert using xlsx library
        exportContent = generateExcelData(analysisJson, analysis)
        contentType = 'application/json'
        filename = `analysis_${analysisRunId.slice(0, 8)}_excel.json`
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid format. Supported: csv, json, python, r, excel' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Log export for analytics
    await supabase.from('export_logs').insert({
      analysis_run_id: analysisRunId,
      format,
      user_id: analysis.user_id,
      exported_at: new Date().toISOString()
    }).catch(() => {}) // Ignore if table doesn't exist

    return new Response(
      JSON.stringify({
        ok: true,
        content: exportContent,
        contentType,
        filename,
        format
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ error: 'Export failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateCSV(analysis: any, includeMetadata: boolean): string {
  const lines: string[] = []

  if (includeMetadata) {
    lines.push('# Strategic Analysis Export')
    lines.push(`# Generated: ${new Date().toISOString()}`)
    lines.push(`# Audience: ${analysis.audience || 'researcher'}`)
    lines.push('')
  }

  // Decision Table
  if (analysis.decision_table && Array.isArray(analysis.decision_table)) {
    lines.push('# Decision Table')
    lines.push('Actor,Action,Payoff Value,Confidence,Sources')
    for (const row of analysis.decision_table) {
      const sources = row.payoff_estimate?.sources?.join(';') || ''
      lines.push(`"${row.actor || ''}","${row.action || ''}",${row.payoff_estimate?.value || 0},${row.payoff_estimate?.confidence || 0},"${sources}"`)
    }
    lines.push('')
  }

  // Expected Value Ranking
  if (analysis.expected_value_ranking && Array.isArray(analysis.expected_value_ranking)) {
    lines.push('# Expected Value Ranking')
    lines.push('Rank,Action,Expected Value,Confidence')
    analysis.expected_value_ranking.forEach((item: any, idx: number) => {
      lines.push(`${idx + 1},"${item.action || ''}",${item.ev || 0},${item.ev_confidence || 0}`)
    })
    lines.push('')
  }

  // Equilibrium Results
  if (analysis.simulation_results?.equilibria) {
    lines.push('# Equilibrium Results')
    lines.push('Type,Stability,Profile')
    for (const eq of analysis.simulation_results.equilibria) {
      const profile = JSON.stringify(eq.profile || [])
      lines.push(`"${eq.type || ''}",${eq.stability || 0},"${profile}"`)
    }
  }

  return lines.join('\n')
}

function generateJSON(analysis: any, fullRecord: any, includeMetadata: boolean, includeRaw: boolean): string {
  const output: any = {
    analysis: {
      summary: analysis.summary,
      decision_table: analysis.decision_table,
      expected_value_ranking: analysis.expected_value_ranking,
      simulation_results: analysis.simulation_results,
      sensitivity: analysis.sensitivity,
      provenance: analysis.provenance
    }
  }

  if (includeMetadata) {
    output.metadata = {
      analysis_id: fullRecord.id,
      created_at: fullRecord.created_at,
      audience: analysis.audience,
      scenario_description: fullRecord.scenario_description,
      status: fullRecord.status,
      exported_at: new Date().toISOString()
    }
  }

  if (includeRaw) {
    output.raw_data = fullRecord
  }

  return JSON.stringify(output, null, 2)
}

function generatePythonScript(analysis: any, fullRecord: any): string {
  const payoffMatrix = extractPayoffMatrix(analysis)
  
  return `#!/usr/bin/env python3
"""
Strategic Analysis Export
Generated: ${new Date().toISOString()}
Analysis ID: ${fullRecord.id}

This script recreates the game-theoretic analysis using Python.
Requires: numpy, scipy (optional: nashpy for equilibrium computation)
"""

import numpy as np
from typing import List, Dict, Tuple

# ============================================================================
# SCENARIO DATA
# ============================================================================

SCENARIO = """
${fullRecord.scenario_description || 'Strategic scenario analysis'}
"""

# Players and Actions
PLAYERS = ${JSON.stringify(payoffMatrix.players)}
ACTIONS = ${JSON.stringify(payoffMatrix.actions, null, 2)}

# Payoff Matrix (Player 1, Player 2 format for 2-player games)
# Format: payoffs[player1_action][player2_action] = [p1_payoff, p2_payoff]
PAYOFFS = ${JSON.stringify(payoffMatrix.payoffs, null, 2)}

# Decision Table from Analysis
DECISION_TABLE = ${JSON.stringify(analysis.decision_table || [], null, 2)}

# Expected Value Ranking
EV_RANKING = ${JSON.stringify(analysis.expected_value_ranking || [], null, 2)}

# ============================================================================
# ANALYSIS FUNCTIONS
# ============================================================================

def build_payoff_matrices() -> Tuple[np.ndarray, np.ndarray]:
    """Convert payoff dictionary to numpy matrices for each player."""
    if len(PLAYERS) != 2:
        raise ValueError("This function only supports 2-player games")
    
    p1_actions = ACTIONS.get(PLAYERS[0], [])
    p2_actions = ACTIONS.get(PLAYERS[1], [])
    
    n1, n2 = len(p1_actions), len(p2_actions)
    M1 = np.zeros((n1, n2))
    M2 = np.zeros((n1, n2))
    
    for i, a1 in enumerate(p1_actions):
        for j, a2 in enumerate(p2_actions):
            key = f"{a1}_{a2}"
            payoffs = PAYOFFS.get(key, [0, 0])
            M1[i, j] = payoffs[0] if len(payoffs) > 0 else 0
            M2[i, j] = payoffs[1] if len(payoffs) > 1 else 0
    
    return M1, M2

def find_pure_nash_equilibria(M1: np.ndarray, M2: np.ndarray) -> List[Tuple[int, int]]:
    """Find pure strategy Nash equilibria."""
    equilibria = []
    n1, n2 = M1.shape
    
    for i in range(n1):
        for j in range(n2):
            # Check if row i is best response to column j
            is_br1 = M1[i, j] >= M1[:, j].max()
            # Check if column j is best response to row i
            is_br2 = M2[i, j] >= M2[i, :].max()
            
            if is_br1 and is_br2:
                equilibria.append((i, j))
    
    return equilibria

def calculate_expected_value(action_idx: int, player: int, 
                            M1: np.ndarray, M2: np.ndarray,
                            opponent_dist: np.ndarray = None) -> float:
    """Calculate expected value of an action given opponent's distribution."""
    M = M1 if player == 0 else M2.T
    
    if opponent_dist is None:
        # Assume uniform distribution
        opponent_dist = np.ones(M.shape[1]) / M.shape[1]
    
    return np.dot(M[action_idx], opponent_dist)

def print_analysis():
    """Print the analysis results."""
    print("=" * 60)
    print("STRATEGIC ANALYSIS RESULTS")
    print("=" * 60)
    
    print(f"\\nPlayers: {PLAYERS}")
    print(f"Actions: {ACTIONS}")
    
    if len(PLAYERS) == 2:
        M1, M2 = build_payoff_matrices()
        print(f"\\nPayoff Matrix (Player 1):\\n{M1}")
        print(f"\\nPayoff Matrix (Player 2):\\n{M2}")
        
        equilibria = find_pure_nash_equilibria(M1, M2)
        print(f"\\nPure Strategy Nash Equilibria: {equilibria}")
        
        p1_actions = ACTIONS.get(PLAYERS[0], [])
        p2_actions = ACTIONS.get(PLAYERS[1], [])
        for eq in equilibria:
            print(f"  - ({p1_actions[eq[0]]}, {p2_actions[eq[1]]})")
    
    print("\\nExpected Value Ranking:")
    for item in EV_RANKING:
        print(f"  {item.get('action', 'N/A')}: EV = {item.get('ev', 0):.3f}")

if __name__ == "__main__":
    print_analysis()
    
    # Optional: Use nashpy for more sophisticated analysis
    try:
        import nashpy as nash
        if len(PLAYERS) == 2:
            M1, M2 = build_payoff_matrices()
            game = nash.Game(M1, M2)
            print("\\nNashpy Mixed Equilibria:")
            for eq in game.support_enumeration():
                print(f"  {eq}")
    except ImportError:
        print("\\nInstall nashpy for mixed equilibrium computation: pip install nashpy")
`
}

function generateRScript(analysis: any, fullRecord: any): string {
  const payoffMatrix = extractPayoffMatrix(analysis)
  
  return `# Strategic Analysis Export
# Generated: ${new Date().toISOString()}
# Analysis ID: ${fullRecord.id}
#
# This script recreates the game-theoretic analysis using R.
# Requires: GameTheory package (optional)

# ============================================================================
# SCENARIO DATA
# ============================================================================

scenario <- "${(fullRecord.scenario_description || '').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"

# Players and Actions
players <- ${JSON.stringify(payoffMatrix.players)}
actions <- list(${payoffMatrix.players.map(p => `"${p}" = ${JSON.stringify(payoffMatrix.actions[p] || [])}`).join(', ')})

# Decision Table
decision_table <- data.frame(
  actor = ${JSON.stringify((analysis.decision_table || []).map((r: any) => r.actor || ''))},
  action = ${JSON.stringify((analysis.decision_table || []).map((r: any) => r.action || ''))},
  payoff_value = ${JSON.stringify((analysis.decision_table || []).map((r: any) => r.payoff_estimate?.value || 0))},
  confidence = ${JSON.stringify((analysis.decision_table || []).map((r: any) => r.payoff_estimate?.confidence || 0))}
)

# Expected Value Ranking
ev_ranking <- data.frame(
  action = ${JSON.stringify((analysis.expected_value_ranking || []).map((r: any) => r.action || ''))},
  expected_value = ${JSON.stringify((analysis.expected_value_ranking || []).map((r: any) => r.ev || 0))},
  confidence = ${JSON.stringify((analysis.expected_value_ranking || []).map((r: any) => r.ev_confidence || 0))}
)

# ============================================================================
# ANALYSIS FUNCTIONS
# ============================================================================

# Build payoff matrix for 2-player game
build_payoff_matrix <- function() {
  if (length(players) != 2) {
    stop("This function only supports 2-player games")
  }
  
  p1_actions <- actions[[players[1]]]
  p2_actions <- actions[[players[2]]]
  
  n1 <- length(p1_actions)
  n2 <- length(p2_actions)
  
  M1 <- matrix(0, nrow = n1, ncol = n2, dimnames = list(p1_actions, p2_actions))
  M2 <- matrix(0, nrow = n1, ncol = n2, dimnames = list(p1_actions, p2_actions))
  
  # Populate from decision table
  for (i in 1:nrow(decision_table)) {
    action <- decision_table$action[i]
    value <- decision_table$payoff_value[i]
    # Simplified: assign to diagonal
    if (action %in% p1_actions) {
      idx <- which(p1_actions == action)
      M1[idx, ] <- value
    }
  }
  
  list(M1 = M1, M2 = M2)
}

# Find pure Nash equilibria
find_pure_nash <- function(M1, M2) {
  equilibria <- list()
  n1 <- nrow(M1)
  n2 <- ncol(M1)
  
  for (i in 1:n1) {
    for (j in 1:n2) {
      is_br1 <- M1[i, j] >= max(M1[, j])
      is_br2 <- M2[i, j] >= max(M2[i, ])
      
      if (is_br1 && is_br2) {
        equilibria <- append(equilibria, list(c(i, j)))
      }
    }
  }
  
  equilibria
}

# Print analysis
print_analysis <- function() {
  cat("====================================================\\n")
  cat("STRATEGIC ANALYSIS RESULTS\\n")
  cat("====================================================\\n\\n")
  
  cat("Players:", players, "\\n")
  cat("\\nDecision Table:\\n")
  print(decision_table)
  
  cat("\\nExpected Value Ranking:\\n")
  print(ev_ranking[order(-ev_ranking$expected_value), ])
}

# Run analysis
print_analysis()

# Optional: Use GameTheory package
tryCatch({
  library(GameTheory)
  cat("\\nGameTheory package loaded for advanced analysis\\n")
}, error = function(e) {
  cat("\\nInstall GameTheory package for advanced analysis: install.packages('GameTheory')\\n")
})
`
}

function generateExcelData(analysis: any, fullRecord: any): string {
  // Return structured data that can be converted to Excel on frontend
  return JSON.stringify({
    sheets: [
      {
        name: 'Summary',
        data: [
          ['Strategic Analysis Export'],
          ['Generated', new Date().toISOString()],
          ['Analysis ID', fullRecord.id],
          ['Scenario', fullRecord.scenario_description || ''],
          ['Audience', analysis.audience || 'researcher'],
          ['Status', fullRecord.status || 'completed']
        ]
      },
      {
        name: 'Decision Table',
        data: [
          ['Actor', 'Action', 'Payoff Value', 'Confidence', 'Sources'],
          ...(analysis.decision_table || []).map((row: any) => [
            row.actor || '',
            row.action || '',
            row.payoff_estimate?.value || 0,
            row.payoff_estimate?.confidence || 0,
            (row.payoff_estimate?.sources || []).join(', ')
          ])
        ]
      },
      {
        name: 'EV Ranking',
        data: [
          ['Rank', 'Action', 'Expected Value', 'Confidence'],
          ...(analysis.expected_value_ranking || []).map((item: any, idx: number) => [
            idx + 1,
            item.action || '',
            item.ev || 0,
            item.ev_confidence || 0
          ])
        ]
      },
      {
        name: 'Equilibria',
        data: [
          ['Type', 'Stability', 'Profile'],
          ...(analysis.simulation_results?.equilibria || []).map((eq: any) => [
            eq.type || '',
            eq.stability || 0,
            JSON.stringify(eq.profile || [])
          ])
        ]
      }
    ]
  })
}

function extractPayoffMatrix(analysis: any): PayoffMatrix {
  const players: string[] = []
  const actions: Record<string, string[]> = {}
  const payoffs: Record<string, Record<string, number[]>> = {}

  // Extract from decision table
  if (analysis.decision_table && Array.isArray(analysis.decision_table)) {
    for (const row of analysis.decision_table) {
      const actor = row.actor || 'Player'
      const action = row.action || 'Action'
      
      if (!players.includes(actor)) {
        players.push(actor)
        actions[actor] = []
      }
      
      if (!actions[actor].includes(action)) {
        actions[actor].push(action)
      }
    }
  }

  // If no players found, use defaults
  if (players.length === 0) {
    players.push('Player 1', 'Player 2')
    actions['Player 1'] = ['Cooperate', 'Defect']
    actions['Player 2'] = ['Cooperate', 'Defect']
  }

  return { players, actions, payoffs }
}
