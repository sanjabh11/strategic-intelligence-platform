/**
 * Concept System - Core Game Theory Concepts
 * 
 * Canonical definitions, worked examples, and common misconceptions
 * for teaching game theory fundamentals.
 */

import type { ProvenanceMetadata } from '../types/education'
import { createProvenanceMetadata } from '../types/education'

export interface ConceptDefinition {
  id: string
  name: string
  shortDescription: string
  fullExplanation: string
  formalDefinition: string
  keyInsights: string[]
  commonMisconceptions: Misconception[]
  relatedConcepts: string[]
  canonicalExamples: WorkedExample[]
  difficulty: 'basic' | 'intermediate' | 'advanced'
  category: 'equilibrium' | 'strategic_form' | 'extensive_form' | 'information' | 'cooperation' | 'mechanism_design'
}

export interface Misconception {
  misconception: string
  correction: string
  whyItMatters: string
}

export interface WorkedExample {
  id: string
  title: string
  scenario: string
  setup: string
  stepByStepSolution: Step[]
  keyTakeaway: string
  tryItYourself: {
    prompt: string
    expectedAnswer: string
    hint: string
  }
}

export interface Step {
  stepNumber: number
  title: string
  explanation: string
  insight?: string
}

// Core concept definitions
export const CORE_CONCEPTS: Record<string, ConceptDefinition> = {
  nash_equilibrium: {
    id: 'nash_equilibrium',
    name: 'Nash Equilibrium',
    shortDescription: 'A situation where no player can benefit by changing their strategy unilaterally',
    fullExplanation: `A Nash equilibrium occurs when every player's strategy is a best response to the other players' strategies. In other words, no player can improve their payoff by changing only their own strategy while the other players keep theirs unchanged. This doesn't mean it's the best possible outcome for everyone - just that no one has an incentive to deviate on their own.`,
    formalDefinition: 'In an n-player strategic-form game G = (S₁, ..., Sₙ; u₁, ..., uₙ), a strategy profile (s₁*, ..., sₙ*) is a Nash equilibrium if for every player i: uᵢ(sᵢ*, s₋ᵢ*) ≥ uᵢ(sᵢ, s₋ᵢ*) for all sᵢ ∈ Sᵢ',
    keyInsights: [
      'A Nash equilibrium is stable because no player wants to deviate unilaterally',
      'Games can have zero, one, or multiple Nash equilibria',
      'Not all Nash equilibria are equally good - some are Pareto dominated',
      'Finding Nash equilibria does not require that players actually coordinate',
      'In mixed strategy equilibria, players are indifferent between the strategies they randomize over'
    ],
    commonMisconceptions: [
      {
        misconception: 'Nash equilibrium means everyone gets the best possible outcome',
        correction: 'Nash equilibrium means no one can improve by changing alone. Prisoner\'s Dilemma shows mutual defection is a Nash equilibrium but cooperation would be better for both.',
        whyItMatters: 'Confusing stability with optimality leads to misunderstanding why cooperation is hard'
      },
      {
        misconception: 'Players must know what others will do to reach equilibrium',
        correction: 'Nash equilibrium is a prediction of stable play, not a process. Players can reach it through learning, trial and error, or just playing best responses.',
        whyItMatters: 'Equilibrium can emerge from decentralized behavior without explicit coordination'
      },
      {
        misconception: 'If a strategy is dominant, it must be part of a Nash equilibrium',
        correction: 'A dominant strategy equilibrium IS a Nash equilibrium, but not all Nash equilibria involve dominant strategies.',
        whyItMatters: 'Many interesting games (coordination, Chicken) have no dominant strategies but still have equilibria'
      }
    ],
    relatedConcepts: ['dominant_strategy', 'best_response', 'pareto_optimality', 'mixed_strategy'],
    canonicalExamples: [
      {
        id: 'ne_prisoners_dilemma',
        title: 'Prisoner\'s Dilemma Equilibrium',
        scenario: 'Two prisoners must choose to Cooperate (stay silent) or Defect (confess).',
        setup: 'Payoffs: (C,C) = (-1,-1), (C,D) = (-3,0), (D,C) = (0,-3), (D,D) = (-2,-2)',
        stepByStepSolution: [
          {
            stepNumber: 1,
            title: 'Find Row Player\'s Best Responses',
            explanation: 'If Column plays C: Row gets -1 from C, 0 from D → Best response: D',
            insight: 'Defection is always better for Row regardless of what Column does'
          },
          {
            stepNumber: 2,
            title: 'Find Column Player\'s Best Responses',
            explanation: 'If Row plays C: Column gets -1 from C, 0 from D → Best response: D',
            insight: 'Defection is always better for Column regardless of what Row does'
          },
          {
            stepNumber: 3,
            title: 'Find Mutual Best Response',
            explanation: 'Both players playing D is a mutual best response',
            insight: '(D,D) is the unique Nash equilibrium - both defect even though (C,C) would be better'
          }
        ],
        keyTakeaway: 'The Nash equilibrium can be Pareto inefficient - rational individual choice leads to collectively suboptimal outcome',
        tryItYourself: {
          prompt: 'What would be the Nash equilibrium if the punishment for mutual defection was -5 instead of -2?',
          expectedAnswer: 'Still (Defect, Defect) - the structure of incentives (defect is dominant) hasn\'t changed, just the severity',
          hint: 'Check if either player\'s best responses change with the new payoff'
        }
      },
      {
        id: 'ne_coordination',
        title: 'Coordination Game Equilibria',
        scenario: 'Two drivers must choose which side of the road to drive on.',
        setup: 'Payoffs: (Left,Left) = (1,1), (Right,Right) = (1,1), different sides = (0,0)',
        stepByStepSolution: [
          {
            stepNumber: 1,
            title: 'Check (Left, Left)',
            explanation: 'If both choose Left, neither wants to deviate - switching to Right would give payoff 0',
            insight: '(Left, Left) is a Nash equilibrium'
          },
          {
            stepNumber: 2,
            title: 'Check (Right, Right)',
            explanation: 'If both choose Right, neither wants to deviate - switching to Left would give payoff 0',
            insight: '(Right, Right) is also a Nash equilibrium'
          },
          {
            stepNumber: 3,
            title: 'Check Miscoordination',
            explanation: '(Left, Right) or (Right, Left): Both drivers would want to switch to match the other',
            insight: 'Miscoordination is NOT an equilibrium - both have incentive to change'
          }
        ],
        keyTakeaway: 'Multiple Nash equilibria create a coordination problem - we need social conventions or communication',
        tryItYourself: {
          prompt: 'What happens if driving on the left gives payoff 2 instead of 1?',
          expectedAnswer: '(Left,Left) becomes payoff-dominant, but (Right,Right) is still an equilibrium',
          hint: 'Payoff dominance vs equilibrium stability are different concepts'
        }
      }
    ],
    difficulty: 'basic',
    category: 'equilibrium'
  },

  dominant_strategy: {
    id: 'dominant_strategy',
    name: 'Dominant Strategy',
    shortDescription: 'A strategy that is optimal regardless of what other players do',
    fullExplanation: `A dominant strategy is one that gives a player their highest payoff no matter what strategies the other players choose. A strictly dominant strategy always yields a strictly higher payoff than any other strategy. A weakly dominant strategy yields at least as high a payoff, and strictly higher in at least one case. If all players have dominant strategies, their combination forms a dominant strategy equilibrium, which is also a Nash equilibrium.`,
    formalDefinition: 'Strategy sᵢ is strictly dominant for player i if uᵢ(sᵢ, s₋ᵢ) > uᵢ(s\'ᵢ, s₋ᵢ) for all s\'ᵢ ≠ sᵢ and all s₋ᵢ. It is weakly dominant if uᵢ(sᵢ, s₋ᵢ) ≥ uᵢ(s\'ᵢ, s₋ᵢ) with strict inequality for at least one s₋ᵢ.',
    keyInsights: [
      'If a strictly dominant strategy exists, rational players will always choose it',
      'Many interesting games have NO dominant strategies',
      'Iterated elimination of dominated strategies can simplify games',
      'A dominant strategy equilibrium is the strongest prediction in game theory',
      'Real-world games often lack dominant strategies, requiring more sophisticated analysis'
    ],
    commonMisconceptions: [
      {
        misconception: 'Every game has a dominant strategy for each player',
        correction: 'Most interesting games (Chicken, Battle of the Sexes, Coordination) lack dominant strategies. Their analysis requires finding best responses.',
        whyItMatters: 'Overreliance on dominant strategy thinking misses the strategic interdependence that makes game theory interesting'
      },
      {
        misconception: 'A dominant strategy means you always win',
        correction: 'A dominant strategy maximizes your payoff given what others do, but you might still get a low absolute payoff.',
        whyItMatters: 'Prisoner\'s Dilemma: defection is dominant but everyone ends up worse off'
      },
      {
        misconception: 'Weak dominance is good enough to always choose that strategy',
        correction: 'With weak dominance, other strategies can be just as good in some cases, so the prediction is less compelling.',
        whyItMatters: 'Weakly dominated strategies might be better in repeated games or with uncertainty'
      }
    ],
    relatedConcepts: ['nash_equilibrium', 'dominated_strategy', 'best_response', 'iterated_elimination'],
    canonicalExamples: [
      {
        id: 'ds_prisoners',
        title: 'Prisoner\'s Dilemma: Defect is Dominant',
        scenario: 'Two prisoners choose to Cooperate or Defect',
        setup: 'Standard Prisoner\'s Dilemma payoffs',
        stepByStepSolution: [
          {
            stepNumber: 1,
            title: 'Check Row Player Against Column Cooperating',
            explanation: 'If Column cooperates, Row gets -1 from C, 0 from D → D is better',
            insight: 'Defect is better when opponent cooperates'
          },
          {
            stepNumber: 2,
            title: 'Check Row Player Against Column Defecting',
            explanation: 'If Column defects, Row gets -3 from C, -2 from D → D is better',
            insight: 'Defect is better even when opponent defects'
          },
          {
            stepNumber: 3,
            title: 'Conclusion for Both Players',
            explanation: 'By symmetry, defect is dominant for both players',
            insight: 'We get a dominant strategy equilibrium: both defect'
          }
        ],
        keyTakeaway: 'In Prisoner\'s Dilemma, individual rationality (dominant strategy) leads to collective irrationality',
        tryItYourself: {
          prompt: 'Can you construct a 2x2 game where Row has a dominant strategy but Column does not?',
          expectedAnswer: 'Yes: Make Row\'s payoffs such that one row always beats the other, but Column\'s best response depends on Row\'s choice',
          hint: 'Give Row payoffs of (3,3) in row 1 vs (2,1) in row 2 for any column choices'
        }
      }
    ],
    difficulty: 'basic',
    category: 'strategic_form'
  },

  pareto_optimality: {
    id: 'pareto_optimality',
    name: 'Pareto Optimality',
    shortDescription: 'An outcome where no one can be made better off without making someone worse off',
    fullExplanation: `An outcome is Pareto optimal (or Pareto efficient) if there's no way to reallocate resources or change strategies to make at least one person better off without making anyone worse off. Pareto optimality is about efficiency, not fairness. A Pareto improvement moves from one outcome to another that makes at least one person better off and no one worse off. The Prisoner's Dilemma shows that Nash equilibrium can fail to be Pareto optimal.`,
    formalDefinition: 'Outcome x is Pareto optimal if there exists no outcome y such that uᵢ(y) ≥ uᵢ(x) for all players i, with strict inequality for at least one player.',
    keyInsights: [
      'Pareto optimality is about efficiency, not equity or fairness',
      'Multiple Pareto optimal outcomes can exist with different distributional properties',
      'Nash equilibrium may not be Pareto optimal (Prisoner\'s Dilemma)',
      'Pareto improvements are win-win moves that should be uncontroversial',
      'The set of Pareto optimal outcomes is called the Pareto frontier'
    ],
    commonMisconceptions: [
      {
        misconception: 'Pareto optimal means fair or equal',
        correction: 'Pareto optimality only means no waste. One person having everything and others nothing can be Pareto optimal.',
        whyItMatters: 'Efficiency and equity are different goals - you need both in policy design'
      },
      {
        misconception: 'Every Nash equilibrium is Pareto optimal',
        correction: 'Prisoner\'s Dilemma: (Defect, Defect) is a Nash equilibrium but (Cooperate, Cooperate) Pareto dominates it.',
        whyItMatters: 'Markets can settle on inefficient equilibria - this motivates regulation and mechanism design'
      },
      {
        misconception: 'If an outcome is not Pareto optimal, we can easily move to a better one',
        correction: 'Moving to a Pareto improvement may require coordination, trust, or mechanism design that is hard to achieve.',
        whyItMatters: 'The existence of potential gains doesn\'t mean they\'re achievable without the right institutions'
      }
    ],
    relatedConcepts: ['nash_equilibrium', 'social_welfare', 'coordination', 'mechanism_design'],
    canonicalExamples: [
      {
        id: 'pareto_dilemma',
        title: 'Prisoner\'s Dilemma: Equilibrium vs Efficiency',
        scenario: 'Compare Nash equilibrium to Pareto optimal outcomes',
        setup: 'Prisoner\'s Dilemma payoffs',
        stepByStepSolution: [
          {
            stepNumber: 1,
            title: 'List All Outcomes',
            explanation: '(C,C) = (-1,-1), (C,D) = (-3,0), (D,C) = (0,-3), (D,D) = (-2,-2)',
            insight: 'Four possible outcomes to evaluate'
          },
          {
            stepNumber: 2,
            title: 'Check if (D,D) is Pareto Optimal',
            explanation: 'Can we improve one player without hurting the other? Moving to (C,C): both get -1 instead of -2',
            insight: '(D,D) is NOT Pareto optimal - both players would prefer (C,C)'
          },
          {
            stepNumber: 3,
            title: 'Check if (C,C) is Pareto Optimal',
            explanation: 'Can we improve anyone? Moving to (C,D): Row gets worse (-3 < -1). Moving to (D,C): Column gets worse.',
            insight: '(C,C) IS Pareto optimal - any change hurts someone'
          }
        ],
        keyTakeaway: 'Nash equilibrium (D,D) is Pareto dominated by (C,C). Individual incentives prevent reaching the efficient outcome.',
        tryItYourself: {
          prompt: 'In a coordination game with payoffs (2,2) and (1,1), which outcomes are Pareto optimal?',
          expectedAnswer: 'Only (2,2) is Pareto optimal - (1,1) is Pareto dominated',
          hint: 'Pareto dominance: one outcome is better for at least one player and not worse for anyone'
        }
      }
    ],
    difficulty: 'intermediate',
    category: 'equilibrium'
  },

  mixed_strategy: {
    id: 'mixed_strategy',
    name: 'Mixed Strategy',
    shortDescription: 'Randomizing over pure strategies to make opponents indifferent',
    fullExplanation: `A mixed strategy is a probability distribution over pure strategies. Players randomize to keep opponents guessing, making them indifferent between their own strategies. In equilibrium, each player chooses their mix to make the other player indifferent - this indifference is what makes the opponent willing to mix too. Mixed strategies are necessary when no pure strategy equilibrium exists (like in Matching Pennies).`,
    formalDefinition: 'A mixed strategy for player i is a probability distribution σᵢ over Sᵢ. A mixed strategy Nash equilibrium is a profile (σ₁*, ..., σₙ*) where each σᵢ* is a best response to σ₋ᵢ*.',
    keyInsights: [
      'Players mix to make opponents indifferent, not to be unpredictable themselves',
      'In equilibrium, players are indifferent among the strategies they mix over',
      'A pure strategy is a mixed strategy with probability 1 on one action',
      'Not all games have pure strategy equilibria, but all finite games have mixed strategy equilibria (Nash\'s theorem)',
      'Randomization must be truly random - predictable patterns can be exploited'
    ],
    commonMisconceptions: [
      {
        misconception: 'Players mix to be unpredictable or confuse opponents',
        correction: 'Players mix to make OPPONENTS indifferent. Your own indifference is a consequence, not the goal.',
        whyItMatters: 'Misunderstanding why we mix leads to wrong predictions about behavior'
      },
      {
        misconception: 'In mixed equilibrium, any mixture is equally good',
        correction: 'You must play the exact equilibrium probabilities. Deviation makes opponent not indifferent, breaking equilibrium.',
        whyItMatters: 'Only the precise equilibrium mix keeps opponent indifferent'
      },
      {
        misconception: 'Mixed strategies are unrealistic because people don\'t randomize',
        correction: 'Mixed strategies predict population frequencies or unpredictable behavior, not literal coin flips.',
        whyItMatters: 'Mixed equilibria describe unpredictable behavior patterns in populations'
      }
    ],
    relatedConcepts: ['nash_equilibrium', 'expected_payoff', 'indifference', 'zero_sum_games'],
    canonicalExamples: [
      {
        id: 'ms_matching_pennies',
        title: 'Matching Pennies: The Classic Zero-Sum Game',
        scenario: 'Matcher wins if both choose same side; Hider wins if different',
        setup: 'Payoffs: Match=+1/-1, Mismatch=-1/+1',
        stepByStepSolution: [
          {
            stepNumber: 1,
            title: 'Check for Pure Strategy Equilibrium',
            explanation: 'If Matcher plays Heads, Hider wants Tails. If Hider plays Tails, Matcher wants Tails. No mutual best response.',
            insight: 'No pure strategy Nash equilibrium exists'
          },
          {
            stepNumber: 2,
            title: 'Find Row\'s Mix to Make Column Indifferent',
            explanation: 'Let p = P(Row plays Heads). Column\'s expected payoff to Heads: p(1) + (1-p)(-1) = 2p-1. To Tails: p(-1) + (1-p)(1) = 1-2p. Set equal: p = 0.5',
            insight: 'Row must play 50-50 to make Column indifferent'
          },
          {
            stepNumber: 3,
            title: 'Find Column\'s Mix to Make Row Indifferent',
            explanation: 'By symmetry, Column must also play 50-50',
            insight: 'The mixed strategy equilibrium is both playing 50-50'
          },
          {
            stepNumber: 4,
            title: 'Verify Equilibrium',
            explanation: 'At 50-50: Row\'s expected payoff to Heads = 0, to Tails = 0. Row is indifferent. Same for Column.',
            insight: 'Neither can improve by changing their mix unilaterally'
          }
        ],
        keyTakeaway: 'In zero-sum games without pure equilibria, players randomize 50-50 to prevent exploitation',
        tryItYourself: {
          prompt: 'What if Matching Pennies paid 3 to Matcher when matching Heads but only 1 when matching Tails?',
          expectedAnswer: 'Row should play Heads more often (p=2/3) to make Column indifferent',
          hint: 'Set Column\'s expected payoff to Heads equal to expected payoff to Tails and solve for p'
        }
      }
    ],
    difficulty: 'advanced',
    category: 'equilibrium'
  }
}

// Get all concepts
export function getAllConcepts(): ConceptDefinition[] {
  return Object.values(CORE_CONCEPTS)
}

// Get concept by ID
export function getConcept(id: string): ConceptDefinition | undefined {
  return CORE_CONCEPTS[id]
}

// Get concepts by difficulty
export function getConceptsByDifficulty(difficulty: 'basic' | 'intermediate' | 'advanced'): ConceptDefinition[] {
  return Object.values(CORE_CONCEPTS).filter(c => c.difficulty === difficulty)
}

// Get concepts by category
export function getConceptsByCategory(category: ConceptDefinition['category']): ConceptDefinition[] {
  return Object.values(CORE_CONCEPTS).filter(c => c.category === category)
}

// Get related concepts
export function getRelatedConcepts(conceptId: string): ConceptDefinition[] {
  const concept = CORE_CONCEPTS[conceptId]
  if (!concept) return []
  return concept.relatedConcepts.map(id => CORE_CONCEPTS[id]).filter(Boolean)
}

// Create provenance metadata for concept content
export function createConceptProvenance(conceptId: string): ProvenanceMetadata {
  return createProvenanceMetadata('canonical_education', {
    verifiedBy: 'manual_review',
    sources: [`concept:${conceptId}`],
    confidence: 1.0
  })
}
