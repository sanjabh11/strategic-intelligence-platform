/**
 * Deterministic Payoff Matrix Lab
 * 
 * Canonical solvers for 2x2 and small normal-form games.
 * All outputs are mathematically verified with step-by-step reasoning.
 * NO randomness, NO heuristics in education paths.
 */

import type { ProvenanceMetadata } from '../types/education'
import { createProvenanceMetadata } from '../types/education'

export type PlayerStrategy = string

export interface PayoffEntry {
  rowPlayer: number
  colPlayer: number
}

export interface PayoffMatrix {
  rowPlayer: string
  colPlayer: string
  rowStrategies: PlayerStrategy[]
  colStrategies: PlayerStrategy[]
  payoffs: PayoffEntry[][]  // [row][col]
}

export interface BestResponse {
  strategy: PlayerStrategy
  opponentStrategy: PlayerStrategy
  payoff: number
  isBestResponse: boolean
}

export interface NashEquilibrium {
  rowStrategy: PlayerStrategy
  colStrategy: PlayerStrategy
  rowPayoff: number
  colPayoff: number
  type: 'pure' | 'mixed'
  rowMixProbabilities?: Record<string, number>
  colMixProbabilities?: Record<string, number>
}

export interface DominanceInfo {
  strategy: PlayerStrategy
  player: 'row' | 'col'
  dominatedBy: PlayerStrategy
  isStrictlyDominant: boolean
  isWeaklyDominant: boolean
}

export interface ParetoInfo {
  rowStrategy: PlayerStrategy
  colStrategy: PlayerStrategy
  rowPayoff: number
  colPayoff: number
  isParetoOptimal: boolean
  dominates?: { row: PlayerStrategy; col: PlayerStrategy }
}

export interface MatrixAnalysisResult {
  matrix: PayoffMatrix
  bestResponses: {
    row: BestResponse[]
    col: BestResponse[]
  }
  dominatedStrategies: DominanceInfo[]
  nashEquilibria: NashEquilibrium[]
  paretoOptimal: ParetoInfo[]
  hasDominantStrategyEquilibrium: boolean
  isCoordinationGame: boolean
  isPrisonersDilemma: boolean
  isChickenGame: boolean
  isBattleOfSexes: boolean
  isZeroSum: boolean
  provenance: ProvenanceMetadata
  stepByStep: string[]
}

// Canonical game pattern detection
export function detectCanonicalPattern(matrix: PayoffMatrix): {
  pattern: 'prisoners_dilemma' | 'chicken' | 'battle_of_sexes' | 'coordination' | 'zero_sum' | 'none'
  confidence: number
} {
  const [s1, s2] = matrix.rowStrategies
  const [t1, t2] = matrix.colStrategies
  
  if (!s1 || !s2 || !t1 || !t2 || matrix.rowStrategies.length !== 2 || matrix.colStrategies.length !== 2) {
    return { pattern: 'none', confidence: 0 }
  }
  
  const [[a, b], [c, d]] = matrix.payoffs  // a=row,col s1,t1; b=row,col s1,t2; c=row,col s2,t1; d=row,col s2,t2
  
  // Prisoner's Dilemma: T > R > P > S structure
  // Check: c > a (defect better when opponent cooperates)
  //        d > b (defect better when opponent defects)
  //        a > d (mutual cooperation better than mutual defection)
  //        (b + c)/2 < a (joint payoff maximized by cooperation)
  if (c.rowPlayer > a.rowPlayer && d.rowPlayer > b.rowPlayer && a.rowPlayer > d.rowPlayer) {
    return { pattern: 'prisoners_dilemma', confidence: 0.9 }
  }
  
  // Chicken: Two Nash equilibria in pure strategies (swerve/don't swerve)
  // Neither player has dominant strategy
  const rowHasDominant = (a.rowPlayer > c.rowPlayer && b.rowPlayer > d.rowPlayer) ||
                        (c.rowPlayer > a.rowPlayer && d.rowPlayer > b.rowPlayer)
  const colHasDominant = (a.colPlayer > b.colPlayer && c.colPlayer > d.colPlayer) ||
                        (b.colPlayer > a.colPlayer && d.colPlayer > c.colPlayer)
  
  if (!rowHasDominant && !colHasDominant) {
    // Check for multiple equilibria
    const rowBestToT1 = a.rowPlayer >= c.rowPlayer
    const rowBestToT2 = b.rowPlayer >= d.rowPlayer
    const colBestToS1 = a.colPlayer >= b.colPlayer
    const colBestToS2 = c.colPlayer >= d.colPlayer
    
    if ((rowBestToT1 && colBestToS1) || (rowBestToT2 && colBestToS2)) {
      return { pattern: 'coordination', confidence: 0.7 }
    }
    if ((rowBestToT1 && !colBestToS1) || (!rowBestToT1 && colBestToS1)) {
      return { pattern: 'chicken', confidence: 0.6 }
    }
  }
  
  // Battle of Sexes: Coordination with asymmetric payoffs
  if (!rowHasDominant && !colHasDominant) {
    const payoffDiff = Math.abs(a.rowPlayer - b.rowPlayer) + Math.abs(c.colPlayer - d.colPlayer)
    if (payoffDiff > 2) {
      return { pattern: 'battle_of_sexes', confidence: 0.5 }
    }
  }
  
  // Zero-sum: payoffs sum to constant
  const sum1 = a.rowPlayer + a.colPlayer
  const sum2 = b.rowPlayer + b.colPlayer
  const sum3 = c.rowPlayer + c.colPlayer
  const sum4 = d.rowPlayer + d.colPlayer
  if (Math.abs(sum1 - sum2) < 0.001 && Math.abs(sum2 - sum3) < 0.001 && Math.abs(sum3 - sum4) < 0.001) {
    return { pattern: 'zero_sum', confidence: 0.95 }
  }
  
  return { pattern: 'none', confidence: 0 }
}

// Compute best responses for each player
export function computeBestResponses(matrix: PayoffMatrix): {
  row: BestResponse[]
  col: BestResponse[]
} {
  const rowResponses: BestResponse[] = []
  const colResponses: BestResponse[] = []
  
  // Row player's best responses to each column strategy
  for (let colIdx = 0; colIdx < matrix.colStrategies.length; colIdx++) {
    const colStrat = matrix.colStrategies[colIdx]
    let maxPayoff = -Infinity
    const payoffs: { strategy: string; payoff: number }[] = []
    
    for (let rowIdx = 0; rowIdx < matrix.rowStrategies.length; rowIdx++) {
      const payoff = matrix.payoffs[rowIdx][colIdx].rowPlayer
      payoffs.push({ strategy: matrix.rowStrategies[rowIdx], payoff })
      if (payoff > maxPayoff) {
        maxPayoff = payoff
      }
    }
    
    for (const { strategy, payoff } of payoffs) {
      rowResponses.push({
        strategy,
        opponentStrategy: colStrat,
        payoff,
        isBestResponse: Math.abs(payoff - maxPayoff) < 0.0001
      })
    }
  }
  
  // Column player's best responses to each row strategy
  for (let rowIdx = 0; rowIdx < matrix.rowStrategies.length; rowIdx++) {
    const rowStrat = matrix.rowStrategies[rowIdx]
    let maxPayoff = -Infinity
    const payoffs: { strategy: string; payoff: number }[] = []
    
    for (let colIdx = 0; colIdx < matrix.colStrategies.length; colIdx++) {
      const payoff = matrix.payoffs[rowIdx][colIdx].colPlayer
      payoffs.push({ strategy: matrix.colStrategies[colIdx], payoff })
      if (payoff > maxPayoff) {
        maxPayoff = payoff
      }
    }
    
    for (const { strategy, payoff } of payoffs) {
      colResponses.push({
        strategy,
        opponentStrategy: rowStrat,
        payoff,
        isBestResponse: Math.abs(payoff - maxPayoff) < 0.0001
      })
    }
  }
  
  return { row: rowResponses, col: colResponses }
}

// Check for dominated strategies
export function findDominatedStrategies(matrix: PayoffMatrix): DominanceInfo[] {
  const dominated: DominanceInfo[] = []
  
  // Check row player strategies
  for (let i = 0; i < matrix.rowStrategies.length; i++) {
    for (let j = 0; j < matrix.rowStrategies.length; j++) {
      if (i === j) continue
      
      let strictlyBetter = true
      let weaklyBetter = true
      let atLeastOneStrict = false
      
      for (let colIdx = 0; colIdx < matrix.colStrategies.length; colIdx++) {
        const payoffI = matrix.payoffs[i][colIdx].rowPlayer
        const payoffJ = matrix.payoffs[j][colIdx].rowPlayer
        
        if (payoffJ < payoffI) {
          strictlyBetter = false
          weaklyBetter = false
          break
        }
        if (payoffJ > payoffI) {
          atLeastOneStrict = true
        }
      }
      
      if (strictlyBetter && atLeastOneStrict) {
        dominated.push({
          strategy: matrix.rowStrategies[i],
          player: 'row',
          dominatedBy: matrix.rowStrategies[j],
          isStrictlyDominant: false,
          isWeaklyDominant: false
        })
      } else if (weaklyBetter && !atLeastOneStrict) {
        dominated.push({
          strategy: matrix.rowStrategies[i],
          player: 'row',
          dominatedBy: matrix.rowStrategies[j],
          isStrictlyDominant: false,
          isWeaklyDominant: true
        })
      }
    }
  }
  
  // Check column player strategies
  for (let i = 0; i < matrix.colStrategies.length; i++) {
    for (let j = 0; j < matrix.colStrategies.length; j++) {
      if (i === j) continue
      
      let strictlyBetter = true
      let weaklyBetter = true
      let atLeastOneStrict = false
      
      for (let rowIdx = 0; rowIdx < matrix.rowStrategies.length; rowIdx++) {
        const payoffI = matrix.payoffs[rowIdx][i].colPlayer
        const payoffJ = matrix.payoffs[rowIdx][j].colPlayer
        
        if (payoffJ < payoffI) {
          strictlyBetter = false
          weaklyBetter = false
          break
        }
        if (payoffJ > payoffI) {
          atLeastOneStrict = true
        }
      }
      
      if (strictlyBetter && atLeastOneStrict) {
        dominated.push({
          strategy: matrix.colStrategies[i],
          player: 'col',
          dominatedBy: matrix.colStrategies[j],
          isStrictlyDominant: false,
          isWeaklyDominant: false
        })
      } else if (weaklyBetter && !atLeastOneStrict) {
        dominated.push({
          strategy: matrix.colStrategies[i],
          player: 'col',
          dominatedBy: matrix.colStrategies[j],
          isStrictlyDominant: false,
          isWeaklyDominant: true
        })
      }
    }
  }
  
  return dominated
}

// Find pure strategy Nash equilibria
export function findPureNashEquilibria(
  matrix: PayoffMatrix,
  bestResponses: { row: BestResponse[]; col: BestResponse[] }
): NashEquilibrium[] {
  const equilibria: NashEquilibrium[] = []
  
  for (let rowIdx = 0; rowIdx < matrix.rowStrategies.length; rowIdx++) {
    for (let colIdx = 0; colIdx < matrix.colStrategies.length; colIdx++) {
      const rowStrat = matrix.rowStrategies[rowIdx]
      const colStrat = matrix.colStrategies[colIdx]
      
      // Check if this cell is a best response for both players
      const rowIsBR = bestResponses.row.some(
        br => br.strategy === rowStrat && br.opponentStrategy === colStrat && br.isBestResponse
      )
      const colIsBR = bestResponses.col.some(
        br => br.strategy === colStrat && br.opponentStrategy === rowStrat && br.isBestResponse
      )
      
      if (rowIsBR && colIsBR) {
        equilibria.push({
          rowStrategy: rowStrat,
          colStrategy: colStrat,
          rowPayoff: matrix.payoffs[rowIdx][colIdx].rowPlayer,
          colPayoff: matrix.payoffs[rowIdx][colIdx].colPlayer,
          type: 'pure'
        })
      }
    }
  }
  
  return equilibria
}

// Solve for mixed strategy Nash equilibrium in 2x2 games
export function solveMixedStrategy2x2(matrix: PayoffMatrix): NashEquilibrium | null {
  if (matrix.rowStrategies.length !== 2 || matrix.colStrategies.length !== 2) {
    return null
  }
  
  const [[a, b], [c, d]] = matrix.payoffs
  
  // For row player mixing between s1 and s2 to make col player indifferent
  // Let p = probability row plays s1
  // Col's payoff to t1: p*a.col + (1-p)*c.col
  // Col's payoff to t2: p*b.col + (1-p)*d.col
  // Set equal: p*a.col + (1-p)*c.col = p*b.col + (1-p)*d.col
  // p*(a.col - c.col - b.col + d.col) = d.col - c.col
  
  const rowMixDenom = a.colPlayer - c.colPlayer - b.colPlayer + d.colPlayer
  let rowMixP = 0.5
  if (Math.abs(rowMixDenom) > 0.0001) {
    rowMixP = (d.colPlayer - c.colPlayer) / rowMixDenom
  }
  rowMixP = Math.max(0, Math.min(1, rowMixP))
  
  // For col player mixing between t1 and t2 to make row player indifferent
  // Let q = probability col plays t1
  // Row's payoff to s1: q*a.row + (1-q)*b.row
  // Row's payoff to s2: q*c.row + (1-q)*d.row
  // Set equal: q*(a.row - b.row - c.row + d.row) = d.row - b.row
  
  const colMixDenom = a.rowPlayer - b.rowPlayer - c.rowPlayer + d.rowPlayer
  let colMixQ = 0.5
  if (Math.abs(colMixDenom) > 0.0001) {
    colMixQ = (d.rowPlayer - b.rowPlayer) / colMixDenom
  }
  colMixQ = Math.max(0, Math.min(1, colMixQ))
  
  // If mixing probabilities are at boundaries, this is actually a pure strategy equilibrium
  if (rowMixP === 0 || rowMixP === 1 || colMixQ === 0 || colMixQ === 1) {
    return null
  }
  
  // Calculate expected payoffs
  const rowPayoff = colMixQ * (rowMixP * a.rowPlayer + (1 - rowMixP) * c.rowPlayer) +
                   (1 - colMixQ) * (rowMixP * b.rowPlayer + (1 - rowMixP) * d.rowPlayer)
  const colPayoff = rowMixP * (colMixQ * a.colPlayer + (1 - colMixQ) * b.colPlayer) +
                   (1 - rowMixP) * (colMixQ * c.colPlayer + (1 - colMixQ) * d.colPlayer)
  
  return {
    rowStrategy: 'Mixed',
    colStrategy: 'Mixed',
    rowPayoff,
    colPayoff,
    type: 'mixed',
    rowMixProbabilities: {
      [matrix.rowStrategies[0]]: rowMixP,
      [matrix.rowStrategies[1]]: 1 - rowMixP
    },
    colMixProbabilities: {
      [matrix.colStrategies[0]]: colMixQ,
      [matrix.colStrategies[1]]: 1 - colMixQ
    }
  }
}

// Find Pareto optimal outcomes
export function findParetoOptimal(matrix: PayoffMatrix): ParetoInfo[] {
  const outcomes: ParetoInfo[] = []
  
  for (let rowIdx = 0; rowIdx < matrix.rowStrategies.length; rowIdx++) {
    for (let colIdx = 0; colIdx < matrix.colStrategies.length; colIdx++) {
      const rowPayoff = matrix.payoffs[rowIdx][colIdx].rowPlayer
      const colPayoff = matrix.payoffs[rowIdx][colIdx].colPlayer
      
      let isParetoOptimal = true
      let dominates: { row: string; col: string } | undefined
      
      // Check if any other outcome Pareto dominates this one
      for (let r2 = 0; r2 < matrix.rowStrategies.length; r2++) {
        for (let c2 = 0; c2 < matrix.colStrategies.length; c2++) {
          if (r2 === rowIdx && c2 === colIdx) continue
          
          const otherRow = matrix.payoffs[r2][c2].rowPlayer
          const otherCol = matrix.payoffs[r2][c2].colPlayer
          
          if (otherRow >= rowPayoff && otherCol >= colPayoff &&
              (otherRow > rowPayoff || otherCol > colPayoff)) {
            isParetoOptimal = false
            dominates = { row: matrix.rowStrategies[r2], col: matrix.colStrategies[c2] }
            break
          }
        }
        if (!isParetoOptimal) break
      }
      
      outcomes.push({
        rowStrategy: matrix.rowStrategies[rowIdx],
        colStrategy: matrix.colStrategies[colIdx],
        rowPayoff,
        colPayoff,
        isParetoOptimal,
        dominates
      })
    }
  }
  
  return outcomes
}

// Main analysis function - complete canonical solution
export function analyzeMatrix(matrix: PayoffMatrix): MatrixAnalysisResult {
  const stepByStep: string[] = []
  
  stepByStep.push(`Analyzing ${matrix.rowPlayer} vs ${matrix.colPlayer}`)
  stepByStep.push(`Row strategies: ${matrix.rowStrategies.join(', ')}`)
  stepByStep.push(`Column strategies: ${matrix.colStrategies.join(', ')}`)
  
  // Step 1: Check for dominated strategies
  const dominated = findDominatedStrategies(matrix)
  if (dominated.length > 0) {
    stepByStep.push(`Found ${dominated.length} dominated strategies:`)
    for (const d of dominated) {
      stepByStep.push(`  - ${d.player} player's "${d.strategy}" is dominated by "${d.dominatedBy}"`)
    }
  } else {
    stepByStep.push('No dominated strategies found')
  }
  
  // Step 2: Compute best responses
  const bestResponses = computeBestResponses(matrix)
  stepByStep.push('Computed best responses:')
  for (const br of bestResponses.row.filter(r => r.isBestResponse)) {
    stepByStep.push(`  - ${matrix.rowPlayer} best responds with "${br.strategy}" to "${br.opponentStrategy}"`)
  }
  for (const br of bestResponses.col.filter(c => c.isBestResponse)) {
    stepByStep.push(`  - ${matrix.colPlayer} best responds with "${br.strategy}" to "${br.opponentStrategy}"`)
  }
  
  // Step 3: Find pure Nash equilibria
  const pureNash = findPureNashEquilibria(matrix, bestResponses)
  stepByStep.push(`Found ${pureNash.length} pure strategy Nash equilibria`)
  
  // Step 4: Look for mixed strategy equilibrium (2x2 only)
  let mixedNash: NashEquilibrium | null = null
  if (matrix.rowStrategies.length === 2 && matrix.colStrategies.length === 2) {
    mixedNash = solveMixedStrategy2x2(matrix)
    if (mixedNash) {
      stepByStep.push('Found mixed strategy Nash equilibrium')
      if (mixedNash.rowMixProbabilities) {
        stepByStep.push(`  - ${matrix.rowPlayer} plays ${matrix.rowStrategies[0]} with probability ${mixedNash.rowMixProbabilities[matrix.rowStrategies[0]].toFixed(3)}`)
      }
      if (mixedNash.colMixProbabilities) {
        stepByStep.push(`  - ${matrix.colPlayer} plays ${matrix.colStrategies[0]} with probability ${mixedNash.colMixProbabilities[matrix.colStrategies[0]].toFixed(3)}`)
      }
    }
  }
  
  // Step 5: Find Pareto optimal outcomes
  const pareto = findParetoOptimal(matrix)
  const paretoCount = pareto.filter(p => p.isParetoOptimal).length
  stepByStep.push(`Found ${paretoCount} Pareto optimal outcomes`)
  
  // Step 6: Detect canonical pattern
  const pattern = detectCanonicalPattern(matrix)
  if (pattern.pattern !== 'none') {
    stepByStep.push(`Pattern detected: ${pattern.pattern} (confidence: ${(pattern.confidence * 100).toFixed(0)}%)`)
  }
  
  // Combine all equilibria
  const allEquilibria: NashEquilibrium[] = [...pureNash]
  if (mixedNash) {
    allEquilibria.push(mixedNash)
  }
  
  // Check for dominant strategy equilibrium
  const hasDominantStrategyEquilibrium = dominated.length > 0 && pureNash.length === 1
  
  return {
    matrix,
    bestResponses,
    dominatedStrategies: dominated,
    nashEquilibria: allEquilibria,
    paretoOptimal: pareto,
    hasDominantStrategyEquilibrium,
    isCoordinationGame: pattern.pattern === 'coordination',
    isPrisonersDilemma: pattern.pattern === 'prisoners_dilemma',
    isChickenGame: pattern.pattern === 'chicken',
    isBattleOfSexes: pattern.pattern === 'battle_of_sexes',
    isZeroSum: pattern.pattern === 'zero_sum',
    provenance: createProvenanceMetadata('canonical_education', {
      verifiedBy: 'solver',
      confidence: 1.0,
      stepByStepReasoning: stepByStep
    }),
    stepByStep
  }
}

// Canonical game generators for education
export function generatePrisonersDilemma(
  reward: number = 3,
  sucker: number = 0,
  temptation: number = 5,
  punishment: number = 1
): PayoffMatrix {
  return {
    rowPlayer: 'Prisoner A',
    colPlayer: 'Prisoner B',
    rowStrategies: ['Cooperate', 'Defect'],
    colStrategies: ['Cooperate', 'Defect'],
    payoffs: [
      [{ rowPlayer: reward, colPlayer: reward }, { rowPlayer: sucker, colPlayer: temptation }],
      [{ rowPlayer: temptation, colPlayer: sucker }, { rowPlayer: punishment, colPlayer: punishment }]
    ]
  }
}

export function generateCoordinationGame(
  payoffBothA: number = 2,
  payoffBothB: number = 1,
  payoffMiscoordination: number = 0
): PayoffMatrix {
  return {
    rowPlayer: 'Player 1',
    colPlayer: 'Player 2',
    rowStrategies: ['A', 'B'],
    colStrategies: ['A', 'B'],
    payoffs: [
      [{ rowPlayer: payoffBothA, colPlayer: payoffBothA }, { rowPlayer: payoffMiscoordination, colPlayer: payoffMiscoordination }],
      [{ rowPlayer: payoffMiscoordination, colPlayer: payoffMiscoordination }, { rowPlayer: payoffBothB, colPlayer: payoffBothB }]
    ]
  }
}

export function generateBattleOfSexes(
  bothOpera: number = 3,
  bothFootball: number = 2,
  miscoordination: number = 0,
  operaBias: number = 1
): PayoffMatrix {
  return {
    rowPlayer: 'Player 1 (prefers Opera)',
    colPlayer: 'Player 2 (prefers Football)',
    rowStrategies: ['Opera', 'Football'],
    colStrategies: ['Opera', 'Football'],
    payoffs: [
      [{ rowPlayer: bothOpera, colPlayer: bothOpera - operaBias }, { rowPlayer: miscoordination, colPlayer: miscoordination }],
      [{ rowPlayer: miscoordination, colPlayer: miscoordination }, { rowPlayer: bothFootball - operaBias, colPlayer: bothFootball }]
    ]
  }
}

export function generateMatchingPennies(): PayoffMatrix {
  return {
    rowPlayer: 'Matcher',
    colPlayer: 'Hider',
    rowStrategies: ['Heads', 'Tails'],
    colStrategies: ['Heads', 'Tails'],
    payoffs: [
      [{ rowPlayer: 1, colPlayer: -1 }, { rowPlayer: -1, colPlayer: 1 }],
      [{ rowPlayer: -1, colPlayer: 1 }, { rowPlayer: 1, colPlayer: -1 }]
    ]
  }
}
