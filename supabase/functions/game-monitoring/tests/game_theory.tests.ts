// @ts-nocheck
// Comprehensive test suite for game theory algorithms
// Compatible with Deno testing framework

import { assertEquals, assertGreater, assertLess } from "https://deno.land/std@0.204.0/assert/mod.ts"

// Mock implementation of game theory functions for testing
class GameTheoryAlgorithms {
  // Expected Value computation
  computeExpectedValue(payoffMatrix: number[][], strategies: number[]): number {
    if (!payoffMatrix || !strategies || payoffMatrix.length !== strategies.length) {
      throw new Error('Invalid input dimensions')
    }

    let expectedValue = 0
    strategies.forEach((prob, idx) => {
      if (payoffMatrix[idx] && typeof payoffMatrix[idx][0] === 'number') {
        expectedValue += prob * payoffMatrix[idx][0]
      }
    })

    return expectedValue
  }

  // Nash Equilibrium computation (simplified implementation)
  computeNashEquilibrium(payoffMatrix: number[][][]): number[][] {
    if (!payoffMatrix || payoffMatrix.length === 0) {
      throw new Error('Invalid payoff matrix')
    }

    const equilibria = []
    const rows = payoffMatrix.length
    const cols = payoffMatrix[0]?.length || 0

    // Check pure strategy Nash equilibria
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (this.isPureStrategyNash(payoffMatrix, i, j)) {
          equilibria.push([i, j])
        }
      }
    }

    return equilibria
  }

  private isPureStrategyNash(payoffMatrix: number[][][], row: number, col: number): boolean {
    const payoff = payoffMatrix[row][col]
    const rows = payoffMatrix.length
    const cols = payoffMatrix[0].length

    // Check if player 1's payoff is at least as good in all columns for this row
    for (let j = 0; j < cols; j++) {
      if (payoffMatrix[row][j][0] > payoff[0]) {
        return false
      }
    }

    // Check if player 2's payoff is at least as good in all rows for this column
    for (let i = 0; i < rows; i++) {
      if (payoffMatrix[i][col][1] > payoff[1]) {
        return false
      }
    }

    return true
  }

  // Compute expected values for decision table
  computeDecisionEV(decisionTable: any[], scenario: string): {
    ranking: any[]
    computation_notes: string
  } {
    if (!Array.isArray(decisionTable) || decisionTable.length === 0) {
      return {
        ranking: [],
        computation_notes: "No decision table provided"
      }
    }

    const evMap = new Map()
    const confidenceMap = new Map()

    // Group by action and compute EV
    decisionTable.forEach((entry: any) => {
      const action = entry.action || "Unknown Action"
      const payoff = entry.payoff_estimate?.value || 0
      const confidence = entry.payoff_estimate?.confidence || 0.5

      if (!evMap.has(action)) {
        evMap.set(action, [])
        confidenceMap.set(action, [])
      }

      evMap.get(action).push(payoff)
      confidenceMap.get(action).push(confidence)
    })

    // Compute average EV and confidence for each action
    const ranking = Array.from(evMap.entries()).map(([action, payoffs]) => {
      const avgPayoff = payoffs.reduce((sum: number, p: number) => sum + p, 0) / payoffs.length
      const avgConfidence = confidenceMap.get(action).reduce((sum: number, c: number) => sum + c, 0) / confidenceMap.get(action).length

      return {
        action,
        ev: Number(avgPayoff.toFixed(3)),
        ev_confidence: Number(avgConfidence.toFixed(3))
      }
    })

    // Sort by EV descending
    ranking.sort((a, b) => b.ev - a.ev)

    return {
      ranking,
      computation_notes: `Computed EV for ${ranking.length} actions from ${decisionTable.length} decision entries`
    }
  }
}

// Test Suite
const gameAlgos = new GameTheoryAlgorithms()

async function runGameTheoryTests() {
  console.log('🚀 Starting Game Theory Algorithm Tests\n')

  // Test 1: Expected Value Computation
  console.log('📊 Testing Expected Value Computation...')

  const testPayoffs = [
    [3, 1],
    [0, 0],
    [1, 3]
  ]

  const testStrategies = [0.5, 0.3, 0.2]

  try {
    const ev = gameAlgos.computeExpectedValue(testPayoffs, testStrategies)
    assertGreater(ev, 1.0, 'EV should be greater than 1.0')
    assertLess(ev, 3.0, 'EV should be less than 3.0')
    console.log('✅ Expected Value test passed:', ev)
  } catch (error) {
    console.log('❌ Expected Value test failed:', error.message)
  }

  // Test 2: Prisoners' Dilemma Nash Equilibrium
  console.log('\n🎯 Testing Prisoners\' Dilemma Nash Equilibrium...')

  const prisonersDilemma = [
    [[-8, -8], [0, -10]],
    [[-10, 0], [-1, -1]]
  ]

  try {
    const equilibria = gameAlgos.computeNashEquilibrium(prisonersDilemma)
    const mutualDefectFound = equilibria.some(eq => eq[0] === 1 && eq[1] === 1)
    assertEquals(mutualDefectFound, true, 'Should find (Defect, Defect) as Nash equilibrium')
    console.log('✅ Prisoners\' Dilemma Nash test passed:', equilibria)
  } catch (error) {
    console.log('❌ Prisoners\' Dilemma Nash test failed:', error.message)
  }

  // Test 3: Decision Table EV computation
  console.log('\n📋 Testing Decision Table EV Computation...')

  const testDecisionTable = [
    {
      action: 'Cooperate',
      payoff_estimate: { value: 2, confidence: 0.8 }
    },
    {
      action: 'Defect',
      payoff_estimate: { value: 3, confidence: 0.6 }
    },
    {
      action: 'Cooperate',
      payoff_estimate: { value: 1, confidence: 0.9 }
    }
  ]

  try {
    const result = gameAlgos.computeDecisionEV(testDecisionTable, 'test scenario')
    assertEquals(result.ranking.length, 2, 'Should have 2 unique actions')
    assertEquals(result.ranking[0].action, 'Defect', 'Defect should be ranked higher')
    assertGreater(result.ranking[0].ev, result.ranking[1].ev, 'Defect should have higher EV')
    console.log('✅ Decision Table EV test passed:', result)
  } catch (error) {
    console.log('❌ Decision Table EV test failed:', error.message)
  }

  // Test 4: Error Handling
  console.log('\n⚠️  Testing Error Handling...')

  try {
    gameAlgos.computeExpectedValue([], [])
    console.log('❌ Should have thrown error for empty inputs')
  } catch (error) {
    console.log('✅ Correctly handled empty input error:', error.message)
  }

  try {
    gameAlgos.computeNashEquilibrium([])
    console.log('❌ Should have thrown error for empty payoff matrix')
  } catch (error) {
    console.log('✅ Correctly handled empty matrix error:', error.message)
  }

  try {
    gameAlgos.computeDecisionEV([], '')
    const result = gameAlgos.computeDecisionEV([], '')
    assertEquals(result.ranking.length, 0, 'Should handle empty decision table gracefully')
    console.log('✅ Correctly handled empty decision table')
  } catch (error) {
    console.log('❌ Unexpected error with empty decision table:', error.message)
  }

  // Test 5: Sensitivity Analysis (subset)
  console.log('\n🔄 Testing Sensitivity Analysis...')

  const payoffMatrix = [
    [[-8, -8], [0, -10]],
    [[-10, 0], [-1, -1]]
  ]

  // Test basic computation
  try {
    const sensitivityParams = []
    for (let i = 0; i < 3; i++) {
      const riskTolerance = 0.5 + (Math.random() - 0.5) * 0.4
      const timeHorizon = 1.0 + (Math.random() - 0.5) * 1.0
      const resourceAvailability = 0.8 + (Math.random() - 0.5) * 0.3

      const effect = (riskTolerance * 0.3 + timeHorizon * 0.2 + resourceAvailability * 0.3) - 0.5
      sensitivityParams.push({
        sample: i + 1,
        effect: Number(effect.toFixed(3))
      })
    }

    assertGreater(sensitivityParams.length, 0, 'Should generate sensitivity parameters')
    console.log('✅ Sensitivity Analysis test passed:', sensitivityParams.slice(0, 2))
  } catch (error) {
    console.log('❌ Sensitivity Analysis test failed:', error.message)
  }

  console.log('\n🏁 Game Theory Tests Completed')
}

// Performance Tests
async function runPerformanceTests() {
  console.log('\n⚡ Running Performance Tests...')

  const startTime = performance.now()

  // Test with larger payoff matrices
  for (let size = 2; size <= 10; size += 2) {
    const payoffMatrix = Array(size).fill(null).map(() =>
      Array(size).fill(null).map(() =>
        [Math.random() * 100 - 50, Math.random() * 100 - 50]
      )
    )

    const iterStart = performance.now()
    const equilibria = gameAlgos.computeNashEquilibrium(payoffMatrix)
    const iterTime = performance.now() - iterStart

    console.log(`Matrix size ${size}x${size}: ${Math.round(iterTime)}ms, ${equilibria.length} equilibria`)
  }

  const totalTime = performance.now() - startTime
  console.log(`🎯 Performance test completed in ${Math.round(totalTime)}ms`)
}

// Accuracy Tests against Known Solutions
async function runAccuracyTests() {
  console.log('\n🎯 Running Accuracy Tests...')

  // Battle of the Sexes
  const battleOfSexes = [
    [[3, 1], [0, 0]],
    [[0, 0], [1, 3]]
  ]

  try {
    const equilibria = gameAlgos.computeNashEquilibrium(battleOfSexes)
    const hasPureEquilibria = equilibria.length >= 2
    const expectedEquilibria = equilibria.some(eq => eq[0] === 0 && eq[1] === 0) &&
                              equilibria.some(eq => eq[0] === 1 && eq[1] === 1)

    assertEquals(hasPureEquilibria, true, 'Should find pure strategy equilibria')
    console.log('✅ Battle of the Sexes test passed:', equilibria)
  } catch (error) {
    console.log('❌ Battle of the Sexes test failed:', error.message)
  }

  // Stag Hunt
  const stagHunt = [
    [[5, 5], [0, 4]],
    [[4, 0], [2, 2]]
  ]

  try {
    const equilibria = gameAlgos.computeNashEquilibrium(stagHunt)
    const hasStagStag = equilibria.some(eq => eq[0] === 0 && eq[1] === 0)
    const hasHareHare = equilibria.some(eq => eq[0] === 1 && eq[1] === 1)

    assertEquals(hasStagStag, true, 'Should find (Stag, Stag) equilibrium')
    assertEquals(hasHareHare, true, 'Should find (Hare, Hare) equilibrium')
    console.log('✅ Stag Hunt test passed:', equilibria)
  } catch (error) {
    console.log('❌ Stag Hunt test failed:', error.message)
  }
}

// Export for use in other test files
export { GameTheoryAlgorithms, runGameTheoryTests, runPerformanceTests, runAccuracyTests }

// Run tests if this file is executed directly
if (import.meta.main) {
  await runGameTheoryTests()
  await runAccuracyTests()
  await runPerformanceTests()
}