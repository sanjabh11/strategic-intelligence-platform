// Geopolitical Dashboard Types
// Based on GDELT streaming data and game theory analysis

export interface GDELTEvent {
  event_id: string
  actors: string[]
  pattern: string
  goldstein_scale: number
  sentiment: number
  game_type: string
  recommended_strategy: string
  context: {
    description: string
    strategic_value: number
    source_url: string
    confidence: number
  }
  realtime: boolean
  timestamp: string
}

export interface HistoricalScenario {
  id: string
  pattern_name: string
  scenario_title: string
  success_rate: number
  total_iterations: number // Renamed from sample_size
  description?: string
  year?: number
  domain?: string
  stakeholder_count?: number
  payoff_data?: any
  citations?: string[]
  indicator_code?: string // Optional for backward compatibility
  confidence_level?: number // Optional for backward compatibility
  data_source?: string
  time_period_start?: string
  time_period_end?: string
  raw_data?: any
  created_at?: string
  updated_at?: string
}

export interface SimulationParams {
  cooperationLevel: number // 0-1
  militaryStrength: number // 0-1
  economicTies: number // 0-1
  allianceSupport: number // 0-1
}

export interface SimulatedOutcome {
  strategy: string
  payoff: number
  probability: number
  confidence: number
  payoffMatrix: number[][]
}

export interface TimelineDataPoint {
  date: string
  cooperation: number
  conflict: number
  eventCount: number
}

export type RegionFilter = 'all' | 'asia_pacific' | 'europe' | 'middle_east' | 'americas' | 'africa'
export type GameTypeFilter = 'all' | 'coordination_game' | 'conflict_game' | 'prisoners_dilemma' | 'bargaining_game'
