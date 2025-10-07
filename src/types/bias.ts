// Bias Intervention Simulator Types
// Based on behavioral economics and cognitive psychology research

export type BiasType = 
  | 'anchoring'
  | 'sunk_cost'
  | 'confirmation'
  | 'overconfidence'
  | 'availability'
  | 'loss_aversion'
  | 'status_quo'
  | 'framing'
  | 'hindsight'
  | 'planning_fallacy'

export type ScenarioCategory = 'career' | 'investment' | 'negotiation' | 'purchase' | 'relationship'

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface DilemmaOption {
  text: string
  biases_triggered: BiasType[]
  optimal_choice: boolean
  explanation: string
  strategic_reasoning: string
}

export interface DilemmaScenario {
  id: string
  title: string
  situation: string
  context?: string
  options: DilemmaOption[]
  category: ScenarioCategory
  difficulty: DifficultyLevel
  learning_point: string
}

export interface UserDecision {
  scenario_id: string
  selected_option: number
  biases_triggered: BiasType[]
  was_optimal: boolean
  timestamp: Date
}

export interface BiasProfile {
  [bias: string]: {
    frequency: number
    severity: number
    trend: 'improving' | 'stable' | 'worsening'
    last_occurrence: Date | null
  }
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  condition: (stats: UserStats) => boolean
  unlocked: boolean
  unlockedAt?: Date
}

export interface UserStats {
  totalScenarios: number
  optimalChoices: number
  biasesDetected: number
  uniqueBiasesFound: number
  currentStreak: number
  longestStreak: number
  weeklyOptimalRate: number
  improvementPercent: number
  decisions: UserDecision[]
}

export const BIAS_DESCRIPTIONS: Record<BiasType, { name: string; description: string; icon: string }> = {
  anchoring: {
    name: 'Anchoring Bias',
    description: 'Over-relying on the first piece of information encountered',
    icon: '⚓'
  },
  sunk_cost: {
    name: 'Sunk Cost Fallacy',
    description: 'Continuing something because of past investment, ignoring future value',
    icon: '💸'
  },
  confirmation: {
    name: 'Confirmation Bias',
    description: 'Seeking information that confirms existing beliefs',
    icon: '✔️'
  },
  overconfidence: {
    name: 'Overconfidence Bias',
    description: 'Overestimating one\'s own abilities or knowledge',
    icon: '💪'
  },
  availability: {
    name: 'Availability Heuristic',
    description: 'Judging likelihood based on how easily examples come to mind',
    icon: '💭'
  },
  loss_aversion: {
    name: 'Loss Aversion',
    description: 'Preferring to avoid losses rather than acquire equivalent gains',
    icon: '📉'
  },
  status_quo: {
    name: 'Status Quo Bias',
    description: 'Preferring things to stay the same',
    icon: '🔄'
  },
  framing: {
    name: 'Framing Effect',
    description: 'Drawing different conclusions from the same information based on presentation',
    icon: '🖼️'
  },
  hindsight: {
    name: 'Hindsight Bias',
    description: 'Believing past events were more predictable than they were',
    icon: '🔙'
  },
  planning_fallacy: {
    name: 'Planning Fallacy',
    description: 'Underestimating time, costs, and risks of future actions',
    icon: '📅'
  }
}
