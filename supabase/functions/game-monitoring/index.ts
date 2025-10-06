// @ts-nocheck
// Supabase Edge Function: game-monitoring
// Comprehensive CI monitoring system for canonical games and game theory solver verification
// Endpoint: POST /functions/v1/game-monitoring
// GET /functions/v1/game-monitoring (for retrieving canonical games and metrics)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment setup
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// --- Canonical Game Theory Test Suite ---

interface CanonicalGame {
  id: string
  name: string
  type: string
  players: number
  payoffMatrix: number[][][]
  knownEquilibria: {
    pure?: number[][]
    mixed?: number[][]
    nash?: any[]
  }
  knownSolutions?: {
    value?: number
    confidence: number
  }
}

class GameTheoryTestSuite {
  private canonicalGames: Record<string, CanonicalGame>

  constructor() {
    // Initialize with canonical game examples
    this.canonicalGames = {
      'prisoners_dilemma': {
        id: 'prisoners_dilemma',
        name: 'Prisoner\'s Dilemma',
        type: 'normal_form',
        players: 2,
        payoffMatrix: [
          [[-8, -8], [0, -10]],
          [[-10, 0], [-1, -1]]
        ],
        knownEquilibria: {
          nash: [[1, 1]],
          mixed: []
        },
        knownSolutions: {
          value: -1,
          confidence: 1.0
        }
      },
      'battle_of_sexes': {
        id: 'battle_of_sexes',
        name: 'Battle of the Sexes',
        type: 'normal_form',
        players: 2,
        payoffMatrix: [
          [[3, 1], [0, 0]],
          [[0, 0], [1, 3]]
        ],
        knownEquilibria: {
          pure: [[0, 0], [1, 1]],
          nash: [[0, 0], [1, 1]]
        },
        knownSolutions: {
          confidence: 1.0
        }
      },
      'stag_hunt': {
        id: 'stag_hunt',
        name: 'Stag Hunt',
        type: 'normal_form',
        players: 2,
        payoffMatrix: [
          [[5, 5], [0, 4]],
          [[4, 0], [2, 2]]
        ],
        knownEquilibria: {
          pure: [[0, 0], [1, 1]],
          nash: [[0, 0], [1, 1]]
        },
        knownSolutions: {
          confidence: 1.0
        }
      }
    }
  }

  // Test Nash equilibrium computation accuracy
  async testNashEquilibria(gameId: string, computedEquilibria: any[]): Promise<{
    accuracy: number
    confidence: number
    errors: string[]
    testResults: any[]
  }> {
    const canonicalGame = this.canonicalGames[gameId]
    if (!canonicalGame) {
      throw new Error(`Unknown canonical game: ${gameId}`)
    }

    const startTime = performance.now()
    const results = []
    const errors = []

    try {
      // Test pure strategy Nash equilibria
      if (canonicalGame.knownEquilibria.pure) {
        for (const knownEquilibrium of canonicalGame.knownEquilibria.pure) {
          const isFound = this.checkEquilibriumMatch(computedEquilibria, knownEquilibrium)
          results.push({
            testType: 'pure_strategy_nash',
            knownEquilibrium,
            found: isFound,
            status: isFound ? 'pass' : 'fail'
          })
        }
      }

      // Test mixed strategy Nash equilibria
      if (canonicalGame.knownEquilibria.mixed) {
        for (const knownMixedEquilibrium of canonicalGame.knownEquilibria.mixed) {
          const isFound = computedEquilibria.some(eq =>
            this.checkMixedStrategyEquilibrium(eq, knownMixedEquilibrium)
          )
          results.push({
            testType: 'mixed_strategy_nash',
            knownEquilibrium: knownMixedEquilibrium,
            found: isFound,
            status: isFound ? 'pass' : 'fail'
          })
        }
      }

      // Calculate accuracy
      const passedTests = results.filter(r => r.status === 'pass').length
      const totalTests = results.length
      const accuracy = totalTests > 0 ? passedTests / totalTests : 0

      const executionTime = performance.now() - startTime

      return {
        accuracy,
        confidence: accuracy >= 0.8 ? 0.95 : accuracy >= 0.5 ? 0.7 : 0.3,
        errors,
        testResults: results.concat([{
          testType: 'performance',
          executionTimeMs: executionTime,
          performanceThresholdMs: 1000
        }])
      }
    } catch (error: any) {
      errors.push(`Test execution error: ${error.message}`)
      return {
        accuracy: 0,
        confidence: 0,
        errors,
        testResults: results
      }
    }
  }

  // Test expected value computation
  async testExpectedValues(gameId: string, computedEV: number, solution?: any): Promise<{
    accuracy: number
    error_margin: number
    testResults: any[]
  }> {
    const canonicalGame = this.canonicalGames[gameId]
    if (!canonicalGame || !canonicalGame.knownSolutions?.value) {
      return {
        accuracy: 0.5, // Default if no known solution
        error_margin: Math.abs(computedEV),
        testResults: [{
          testType: 'expected_value',
          status: 'no_baseline'
        }]
      }
    }

    const expectedValue = canonicalGame.knownSolutions.value
    const error = Math.abs(computedEV - expectedValue)
    const errorMargin = Math.abs(error / expectedValue)
    const accuracy = Math.max(0, 1 - errorMargin * 10) // Scale error to accuracy

    return {
      accuracy,
      error_margin: error,
      testResults: [{
        testType: 'expected_value',
        expected: expectedValue,
        computed: computedEV,
        error,
        errorMargin,
        status: accuracy >= 0.9 ? 'pass' : accuracy >= 0.7 ? 'warn' : 'fail'
      }]
    }
  }

  private checkEquilibriumMatch(computedEq: any[], knownEq: number[]): boolean {
    return computedEq.some(eq =>
      Array.isArray(eq) && eq.length === knownEq.length &&
      eq.every((val, idx) => Math.abs(val - knownEq[idx]) < 1e-6)
    )
  }

  private checkMixedStrategyEquilibrium(eq: any, knownMixed: any): boolean {
    // Simplified mixed strategy equilibrium check
    // In practice would check against known mixed strategy profiles
    return false // Placeholder
  }

  getCanonicalGames(): Record<string, CanonicalGame> {
    return this.canonicalGames
  }

  async runComprehensiveTest(gameId: string, algorithmResults: any): Promise<{
    overallScore: number
    testSuite: any[]
    performanceMetrics: any
  }> {
    const nashTest = await this.testNashEquilibria(gameId, algorithmResults.equilibria || [])
    const evTest = await this.testExpectedValues(gameId, algorithmResults.expectedValue || 0)

    // Combine test results
    const testSuite = nashTest.testResults.concat(evTest.testResults)
    const overallScore = (nashTest.accuracy * 0.6) + (evTest.accuracy * 0.4)

    return {
      overallScore,
      testSuite,
      performanceMetrics: {
        nashAccuracy: nashTest.accuracy,
        expectedValueAccuracy: evTest.accuracy,
        confidence: Math.min(nashTest.confidence, evTest.accuracy)
      }
    }
  }
}

// --- Performance Monitoring System ---

class PerformanceMonitor {
  private metrics: any[] = []
  private baselineMetrics: any = {}

  constructor() {
    this.loadBaselineMetrics()
  }

  async loadBaselineMetrics(): Promise<void> {
    try {
      const { data } = await supabase
        .from('game_definitions')
        .select('runtime_metrics')
        .limit(50)
        .order('created_at', { ascending: false })

      if (data) {
        // Calculate baseline metrics from historical data
        this.baselineMetrics = this.calculateBaselineMetrics(data)
      }
    } catch (error) {
      console.warn('Failed to load baseline metrics:', error)
    }
  }

  private calculateBaselineMetrics(historicalData: any[]): any {
    const executionTimes = historicalData
      .map(d => d.runtime_metrics?.executionTimeMs)
      .filter(t => typeof t === 'number' && t > 0)

    if (executionTimes.length === 0) {
      return {
        avgExecutionTime: 100,
        stdDeviation: 20,
        p95ExecutionTime: 200
      }
    }

    const mean = executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length
    const variance = executionTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / executionTimes.length
    const stdDeviation = Math.sqrt(variance)
    const sorted = [...executionTimes].sort((a, b) => a - b)

    return {
      avgExecutionTime: Math.round(mean),
      stdDeviation: Math.round(stdDeviation),
      p95ExecutionTime: Math.round(sorted[Math.floor(sorted.length * 0.95)] || mean * 1.5)
    }
  }

  startMetricsCollection(): { startTime: number, memoryStart: any } {
    return {
      startTime: performance.now(),
      memoryStart: Deno.memoryUsage?.() || {}
    }
  }

  collectMetrics(
    startMetrics: any,
    algorithmResults: any,
    testResults: any
  ): {
    executionTimeMs: number
    memoryUsageMB: number
    cpuTime?: number
    performanceScore: number
    regressionDetected: boolean
    alerts?: string[]
  } {
    const executionTime = performance.now() - startMetrics.startTime
    const memoryUsage = Deno.memoryUsage?.() || {}
    const memoryUsageMB = Math.round(((memoryUsage.rss || 0) / 1024 / 1024) * 100) / 100

    const performanceScore = this.calculatePerformanceScore(executionTime, testResults)

    // Detect performance regressions
    const alerts = []
    let regressionDetected = false

    if (executionTime > this.baselineMetrics.p95ExecutionTime) {
      alerts.push(`Performance regression detected: execution time ${executionTime}ms exceeds P95 baseline ${this.baselineMetrics.p95ExecutionTime}ms`)
      regressionDetected = true
    }

    if (testResults.overallScore < 0.7) {
      alerts.push(`Low test confidence: ${Math.round(testResults.overallScore * 100)}%`)
      regressionDetected = true
    }

    return {
      executionTimeMs: Math.round(executionTime),
      memoryUsageMB,
      performanceScore: Math.round(performanceScore * 100) / 100,
      regressionDetected,
      alerts: alerts.length > 0 ? alerts : undefined
    }
  }

  private calculatePerformanceScore(executionTime: number, testResults: any): number {
    const executionScore = Math.max(0, 1 - (executionTime / this.baselineMetrics.p95ExecutionTime))
    const accuracyScore = testResults.overallScore || 0
    return (executionScore * 0.4) + (accuracyScore * 0.6)
  }

  async storeMetrics(
    analysisRunId: string,
    gameId: string,
    algorithmType: string,
    metrics: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('game_definitions')
        .upsert({
          analysis_run_id: analysisRunId,
          game_type: algorithmType,
          canonical_games: { [gameId]: metrics },
          runtime_metrics: metrics
        })

      if (error) {
        console.error('Failed to store game metrics:', error)
      }
    } catch (error) {
      console.error('Error storing game metrics:', error)
    }
  }
}

// --- Main Function ---

Deno.serve(async (req: Request): Promise<Response> => {
  const startTime = performance.now()

  try {
    // Initialize monitoring components
    const testSuite = new GameTheoryTestSuite()
    const performanceMonitor = new PerformanceMonitor()

    // Handle different HTTP methods
    if (req.method === 'GET') {
      // Retrieve canonical games and monitoring data
      const { data: gamesData } = await supabase
        .from('game_definitions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      const canonicalGames = testSuite.getCanonicalGames()
      const baselineMetrics = (performanceMonitor as any).baselineMetrics

      return new Response(JSON.stringify({
        canonicalGames,
        historicalData: gamesData || [],
        baselineMetrics,
        status: 'active'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
        }
      })
    }

    if (req.method === 'POST') {
      const requestBody = await req.json()
      const {
        runId,
        algorithmResults,
        gameId = 'prisoners_dilemma',
        algorithmType = 'nash_equilibrium'
      } = requestBody

      // Start performance monitoring
      const metricsStart = performanceMonitor.startMetricsCollection()

      // Run comprehensive test suite
      const testResults = await testSuite.runComprehensiveTest(gameId, algorithmResults)

      // Collect performance metrics
      const performanceMetrics = performanceMonitor.collectMetrics(
        metricsStart,
        algorithmResults,
        testResults
      )

      // Prepare response
      const monitoringResults = {
        runId,
        timestamp: new Date().toISOString(),
        gameId,
        algorithmType,
        testResults,
        performanceMetrics,
        status: performanceMetrics.regressionDetected ? 'needs_attention' : 'healthy',
        alerts: performanceMetrics.alerts || []
      }

      // Store results in database
      await performanceMonitor.storeMetrics(
        runId,
        gameId,
        algorithmType,
        {
          ...monitoringResults,
          executionTimeMs: performanceMetrics.executionTimeMs,
          overallScore: testResults.overallScore
        }
      )

      return new Response(JSON.stringify(monitoringResults), {
        status: monitoringResults.status === 'needs_attention' ? 207 : 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
        }
      })
    }

    // Handle unsupported methods
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      supportedMethods: ['GET', 'POST']
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET, POST'
      }
    })

  } catch (error: any) {
    console.error('Game monitoring error:', error)

    // Calculate total execution time
    const executionTime = performance.now() - startTime

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
      executionTimeMs: Math.round(executionTime),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})