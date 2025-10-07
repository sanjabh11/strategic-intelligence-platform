// Multiplayer Game Types
export type GameType = 'prisoners_dilemma' | 'public_goods' | 'stag_hunt'
export type GameStatus = 'waiting' | 'in_progress' | 'completed'
export type PlayerAction = 'cooperate' | 'defect' | 'contribute' | 'free_ride' | 'stag' | 'hare'

export interface MultiplayerSession {
  id: string
  session_name: string
  game_type: GameType
  max_players: number
  current_players: number
  payoff_matrix: number[][]
  rounds: number
  current_round: number
  status: GameStatus
  game_state: any
  created_at: string
  created_by?: string
}

export interface Participant {
  id: string
  session_id: string
  participant_id: string
  player_role?: string
  current_action?: PlayerAction
  current_payoff: number
  actions_taken: PlayerAction[]
  joined_at: string
  is_active?: boolean
  last_action_at?: string
}

export interface GameResult {
  participant_id: string
  action: PlayerAction
  payoff: number
  round: number
}
