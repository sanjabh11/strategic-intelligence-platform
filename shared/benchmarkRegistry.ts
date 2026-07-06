/**
 * Benchmark Registry — AgentHarness-inspired accuracy tracking.
 *
 * Tracks forecast accuracy metrics over time, including Brier scores by
 * intent family, calibration drift, judge accuracy, and evidence graph
 * verification quality. Mirrors AgentHarness's benchmark registry pattern
 * for measuring agent performance across task families.
 *
 * Source: https://github.com/ApodexAI/AgentHarness
 * Pattern: Benchmark registry from AgentHarness evaluation framework
 */

export interface BenchmarkEntry {
  id: string
  intent: string
  questionHash: string
  predictedProbability: number
  actualOutcome: boolean | null
  brierScore: number | null
  judgeVerdict: string | null
  judgeDelta: number | null
  evidenceStrength: number | null
  verificationScore: number | null
  createdAt: string
  resolvedAt: string | null
}

export interface BenchmarkSummary {
  totalForecasts: number
  resolvedForecasts: number
  averageBrierScore: number | null
  medianBrierScore: number | null
  calibrationError: number | null
  judgeAccuracy: number | null
  judgeAdjustmentImpact: number | null
  evidenceStrengthCorrelation: number | null
  byIntent: Record<string, IntentBenchmark>
  trend: 'improving' | 'stable' | 'degrading' | 'insufficient_data'
}

export interface IntentBenchmark {
  intent: string
  count: number
  resolvedCount: number
  averageBrierScore: number | null
  calibrationError: number | null
  bestBrierScore: number | null
  worstBrierScore: number | null
}

export function computeBenchmarkSummary(entries: BenchmarkEntry[]): BenchmarkSummary {
  const totalForecasts = entries.length
  const resolved = entries.filter(e => e.actualOutcome !== null && e.brierScore !== null)
  const resolvedForecasts = resolved.length

  const brierScores = resolved.map(e => e.brierScore!).filter(s => s !== null)
  const averageBrierScore = brierScores.length > 0
    ? Math.round((brierScores.reduce((a, b) => a + b, 0) / brierScores.length) * 1000) / 1000
    : null
  const sortedBrier = [...brierScores].sort((a, b) => a - b)
  const medianBrierScore = sortedBrier.length > 0
    ? Math.round((sortedBrier[Math.floor(sortedBrier.length / 2)]) * 1000) / 1000
    : null

  const calibrationError = computeCalibrationError(resolved)
  const judgeAccuracy = computeJudgeAccuracy(resolved)
  const judgeAdjustmentImpact = computeJudgeImpact(resolved)
  const evidenceStrengthCorrelation = computeEvidenceCorrelation(resolved)

  const byIntentMap: Record<string, BenchmarkEntry[]> = {}
  for (const entry of resolved) {
    if (!byIntentMap[entry.intent]) byIntentMap[entry.intent] = []
    byIntentMap[entry.intent].push(entry)
  }

  const byIntent: Record<string, IntentBenchmark> = {}
  for (const [intent, intentEntries] of Object.entries(byIntentMap)) {
    const intentBrier = intentEntries.map(e => e.brierScore!).filter(s => s !== null)
    byIntent[intent] = {
      intent,
      count: entries.filter(e => e.intent === intent).length,
      resolvedCount: intentEntries.length,
      averageBrierScore: intentBrier.length > 0
        ? Math.round((intentBrier.reduce((a, b) => a + b, 0) / intentBrier.length) * 1000) / 1000
        : null,
      calibrationError: computeCalibrationError(intentEntries),
      bestBrierScore: intentBrier.length > 0 ? Math.min(...intentBrier) : null,
      worstBrierScore: intentBrier.length > 0 ? Math.max(...intentBrier) : null,
    }
  }

  const trend = assessTrend(resolved)

  return {
    totalForecasts,
    resolvedForecasts,
    averageBrierScore,
    medianBrierScore,
    calibrationError,
    judgeAccuracy,
    judgeAdjustmentImpact,
    evidenceStrengthCorrelation,
    byIntent,
    trend,
  }
}

function computeCalibrationError(resolved: BenchmarkEntry[]): number | null {
  if (resolved.length < 5) return null
  const bins: Record<number, { predicted: number[]; actual: number[] }> = {}
  for (const entry of resolved) {
    const bin = Math.floor(entry.predictedProbability * 10) / 10
    if (!bins[bin]) bins[bin] = { predicted: [], actual: [] }
    bins[bin].predicted.push(entry.predictedProbability)
    bins[bin].actual.push(entry.actualOutcome ? 1 : 0)
  }
  let totalError = 0
  let binCount = 0
  for (const bin of Object.keys(bins)) {
    const data = bins[Number(bin)]
    const avgPredicted = data.predicted.reduce((a, b) => a + b, 0) / data.predicted.length
    const avgActual = data.actual.reduce((a, b) => a + b, 0) / data.actual.length
    totalError += Math.abs(avgPredicted - avgActual)
    binCount++
  }
  return binCount > 0 ? Math.round((totalError / binCount) * 1000) / 1000 : null
}

function computeJudgeAccuracy(resolved: BenchmarkEntry[]): number | null {
  const judged = resolved.filter(e => e.judgeVerdict !== null && e.judgeDelta !== null)
  if (judged.length < 3) return null
  let correctAdjustments = 0
  for (const entry of judged) {
    const originalProb = entry.predictedProbability - (entry.judgeDelta || 0)
    const adjustedProb = entry.predictedProbability
    const actual = entry.actualOutcome ? 1 : 0
    const originalError = Math.abs(originalProb - actual)
    const adjustedError = Math.abs(adjustedProb - actual)
    if (adjustedError <= originalError) correctAdjustments++
  }
  return Math.round((correctAdjustments / judged.length) * 100) / 100
}

function computeJudgeImpact(resolved: BenchmarkEntry[]): number | null {
  const judged = resolved.filter(e => e.judgeDelta !== null && e.brierScore !== null)
  if (judged.length < 3) return null
  let totalImprovement = 0
  for (const entry of judged) {
    const originalProb = entry.predictedProbability - (entry.judgeDelta || 0)
    const originalBrier = (originalProb - (entry.actualOutcome ? 1 : 0)) ** 2
    totalImprovement += originalBrier - (entry.brierScore || 0)
  }
  return Math.round((totalImprovement / judged.length) * 1000) / 1000
}

function computeEvidenceCorrelation(resolved: BenchmarkEntry[]): number | null {
  const withEvidence = resolved.filter(e => e.evidenceStrength !== null && e.brierScore !== null)
  if (withEvidence.length < 5) return null
  const evidenceScores = withEvidence.map(e => e.evidenceStrength!)
  const brierScores = withEvidence.map(e => e.brierScore!)
  const n = withEvidence.length
  const meanEvidence = evidenceScores.reduce((a, b) => a + b, 0) / n
  const meanBrier = brierScores.reduce((a, b) => a + b, 0) / n
  let numerator = 0
  let denomEvidence = 0
  let denomBrier = 0
  for (let i = 0; i < n; i++) {
    const eDiff = evidenceScores[i] - meanEvidence
    const bDiff = brierScores[i] - meanBrier
    numerator += eDiff * bDiff
    denomEvidence += eDiff * eDiff
    denomBrier += bDiff * bDiff
  }
  const denom = Math.sqrt(denomEvidence * denomBrier)
  if (denom === 0) return null
  return Math.round((numerator / denom) * 1000) / 1000
}

function assessTrend(resolved: BenchmarkEntry[]): BenchmarkSummary['trend'] {
  if (resolved.length < 10) return 'insufficient_data'
  const sorted = [...resolved].sort((a, b) =>
    new Date(a.resolvedAt || a.createdAt).getTime() - new Date(b.resolvedAt || b.createdAt).getTime(),
  )
  const midpoint = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, midpoint)
  const secondHalf = sorted.slice(midpoint)
  const firstAvg = firstHalf.reduce((sum, e) => sum + (e.brierScore || 0), 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, e) => sum + (e.brierScore || 0), 0) / secondHalf.length
  const delta = secondAvg - firstAvg
  if (delta < -0.02) return 'improving'
  if (delta > 0.02) return 'degrading'
  return 'stable'
}

export function buildBenchmarkQuery(
  intent: string | null,
  limit: number = 100,
): { intent: string | null; limit: number } {
  return { intent, limit }
}

export interface BenchmarkDisplayMetrics {
  label: string
  value: string
  status: 'good' | 'warning' | 'bad' | 'neutral'
  tooltip: string
}

export function buildDisplayMetrics(summary: BenchmarkSummary): BenchmarkDisplayMetrics[] {
  const metrics: BenchmarkDisplayMetrics[] = []

  metrics.push({
    label: 'Total Forecasts',
    value: summary.totalForecasts.toString(),
    status: 'neutral',
    tooltip: 'All forecasts tracked in the registry',
  })

  metrics.push({
    label: 'Resolved',
    value: summary.resolvedForecasts.toString(),
    status: summary.resolvedForecasts > 20 ? 'good' : 'neutral',
    tooltip: 'Forecasts with known outcomes',
  })

  if (summary.averageBrierScore !== null) {
    metrics.push({
      label: 'Avg Brier',
      value: summary.averageBrierScore.toFixed(3),
      status: summary.averageBrierScore < 0.2 ? 'good' : summary.averageBrierScore < 0.33 ? 'warning' : 'bad',
      tooltip: 'Lower is better. 0 = perfect, 0.25 = random',
    })
  }

  if (summary.calibrationError !== null) {
    metrics.push({
      label: 'Calibration',
      value: `±${(summary.calibrationError * 100).toFixed(1)}%`,
      status: summary.calibrationError < 0.05 ? 'good' : summary.calibrationError < 0.1 ? 'warning' : 'bad',
      tooltip: 'Average difference between predicted and actual probabilities',
    })
  }

  if (summary.judgeAccuracy !== null) {
    metrics.push({
      label: 'Judge Accuracy',
      value: `${(summary.judgeAccuracy * 100).toFixed(0)}%`,
      status: summary.judgeAccuracy > 0.7 ? 'good' : summary.judgeAccuracy > 0.5 ? 'warning' : 'bad',
      tooltip: 'How often the LLM judge adjustment improved accuracy',
    })
  }

  if (summary.trend !== 'insufficient_data') {
    metrics.push({
      label: 'Trend',
      value: summary.trend,
      status: summary.trend === 'improving' ? 'good' : summary.trend === 'degrading' ? 'bad' : 'neutral',
      tooltip: 'Brier score trend over time',
    })
  }

  return metrics
}
