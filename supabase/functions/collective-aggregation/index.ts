// @ts-nocheck
// Supabase Edge Function: collective-aggregation
// POST /functions/v1/collective-aggregation
// Privacy-preserving collective aggregation with differential privacy

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface UserContribution {
  id: string
  value: number
  confidence: number
  action?: string
  category?: string
  evidence_quality: number
  timestamp: string
  user_expertise?: number
  anonymized: boolean
}

interface PrivacyConfig {
  epsilon: number
  sensitivity: number
  delta?: number
  k_anonymity?: number
  privacy_budget_limit: number
}

interface AggregationResult {
  method: string
  value: number
  confidence: number
  noisy_value: number
  privacy_loss: number
  quality_score: number
  user_count: number
  outlier_count: number
}

interface PrivacyBudget {
  total_epsilon_used: number
  queries_today: number
  last_reset: string
}

interface AggregationMetrics {
  privacy_loss_epsilon: number
  signal_to_noise_ratio: number
  aggregation_quality_score: number
  confidence_reliability: number
  timestamp: string
}

// =============================================================================
// PRIVACY MECHANISMS
// =============================================================================

class DifferentialPrivacyEngine {
  config: PrivacyConfig

  constructor(config: PrivacyConfig) {
    this.config = config
  }

  /**
   * Laplace Mechanism: Add noise ~ Laplace(0, sensitivity/epsilon)
   */
  addLaplaceNoise(value: number): number {
    const scale = this.config.sensitivity / this.config.epsilon
    const u = Math.random() - 0.5
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u))
    return value + noise
  }

  /**
   * Exponential Mechanism for categorical data
   */
  selectWithExponentialMechanism(options: { value: any; utility: number }[]): any {
    const scores = options.map(opt =>
      Math.exp(this.config.epsilon * opt.utility / (2 * this.config.sensitivity))
    )
    const totalScore = scores.reduce((sum, s) => sum + s, 0)

    // Sample from the distribution
    const random = Math.random() * totalScore
    let cumulative = 0

    for (let i = 0; i < options.length; i++) {
      cumulative += scores[i]
      if (random <= cumulative) {
        return options[i].value
      }
    }

    return options[options.length - 1].value
  }

  /**
   * Advanced Composition for multiple queries
   */
  calculatePrivacyLoss(numQueries: number): number {
    return this.config.epsilon * Math.sqrt(2 * numQueries * Math.log(1 / (this.config.delta || 0.00001)))
  }
}

// =============================================================================
// ANONYMIZATION PIPELINE
// =============================================================================

class AnonymizationPipeline {
  k: number

  constructor(k_anonymity = 5) {
    this.k = k_anonymity
  }

  /**
   * Remove personally identifiable information
   */
  sanitizeContribution(contribution: any): UserContribution {
    const sanitized: UserContribution = {
      id: this.hashUserId(contribution.user_id || contribution.id),
      value: Number(contribution.value) || 0,
      confidence: Number(contribution.confidence) || 0.5,
      action: contribution.action,
      category: contribution.category,
      evidence_quality: this.assessEvidenceQuality(contribution),
      timestamp: new Date().toISOString(), // Anonymize timestamps
      user_expertise: contribution.user_expertise || 0.5,
      anonymized: true
    }

    return sanitized
  }

  private hashUserId(userId: string): string {
    const encoder = new TextEncoder()
    const data = encoder.encode(userId)
    return btoa(String.fromCharCode(...new Uint8Array(data))).substr(0, 16)
  }

  private assessEvidenceQuality(contribution: any): number {
    let quality = 0.5

    // Evidence count
    if (contribution.evidence_count >= 3) quality += 0.3
    else if (contribution.evidence_count >= 1) quality += 0.1

    // Evidence backed
    if (contribution.evidence_backed) quality += 0.2

    // Age of data (prefer recent)
    if (contribution.created_at) {
      const age = Date.now() - new Date(contribution.created_at).getTime()
      const agePenalty = Math.min(0.2, age / (30 * 24 * 60 * 60 * 1000)) // 30 days
      quality -= agePenalty
    }

    return Math.max(0, Math.min(1, quality))
  }

  /**
   * K-anonymity enforcement
   */
  enforceKAnonymity(contributions: UserContribution[]): UserContribution[] {
    if (contributions.length < this.k) {
      throw new Error(`Insufficient data for k=${this.k} anonymity: ${contributions.length} contributions`)
    }

    // Group by similar attributes and ensure each group has at least k members
    const groups = new Map<string, UserContribution[]>()

    contributions.forEach(contrib => {
      const groupKey = `${Math.floor(contrib.value * 10)}_${Math.floor(contrib.confidence * 5)}`
      if (!groups.has(groupKey)) groups.set(groupKey, [])
      groups.get(groupKey)!.push(contrib)
    })

    // Filter groups that meet k-anonymity
    const anonymized: UserContribution[] = []
    groups.forEach(group => {
      if (group.length >= this.k) {
        anonymized.push(...group)
      }
    })

    return anonymized
  }
}

// =============================================================================
// AGGREGATION METHODS
// =============================================================================

class AggregationEngine {
  private privacy: DifferentialPrivacyEngine
  private anonymization: AnonymizationPipeline

  constructor(privacy: DifferentialPrivacyEngine, anonymization: AnonymizationPipeline) {
    this.privacy = privacy
    this.anonymization = anonymization
  }

  /**
   * Majority voting with privacy preservation
   */
  majorityVoting(contributions: UserContribution[]): AggregationResult {
    const values = contributions.map(c => c.value)
    const categories = contributions.map(c => c.category || 'general')

    // Count frequencies
    const freq: { [key: string]: number } = {}
    categories.forEach(cat => {
      freq[cat] = (freq[cat] || 0) + 1
    })

    // Find majority
    let majority = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b)

    // Apply exponential mechanism for privacy
    const options = Object.keys(freq).map(cat => ({
      value: cat,
      utility: freq[cat]
    }))

    const privateMajority = this.privacy.selectWithExponentialMechanism(options)

    return {
      method: 'majority_voting',
      value: freq[majority] / contributions.length,
      confidence: freq[majority] / contributions.length,
      noisy_value: freq[privateMajority] / contributions.length,
      privacy_loss: this.privacy.calculatePrivacyLoss(contributions.length),
      quality_score: this.calculateQualityScore(contributions),
      user_count: contributions.length,
      outlier_count: 0
    }
  }

  /**
   * Weighted consensus based on confidence and expertise
   */
  weightedConsensus(contributions: UserContribution[]): AggregationResult {
    const weights = contributions.map(c =>
      c.confidence * (1 + (c.user_expertise || 0.5)) * c.evidence_quality
    )

    // Weighted average
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    const weightedSum = contributions.reduce((sum, c, i) =>
      sum + (c.value * weights[i]), 0
    )

    const weightedAvg = weightedSum / totalWeight
    const noisyAvg = this.privacy.addLaplaceNoise(weightedAvg)

    // Calculate confidence based on weight distribution
    const maxWeight = Math.max(...weights)
    const weightStd = Math.sqrt(weights.reduce((sum, w, i) =>
      sum + Math.pow(w - (weightedAvg * weights.length) / contributions.length, 2), 0
    ) / weights.length)

    return {
      method: 'weighted_consensus',
      value: weightedAvg,
      confidence: Math.min(1, maxWeight / totalWeight + (1 - weightStd / maxWeight)),
      noisy_value: noisyAvg,
      privacy_loss: this.privacy.calculatePrivacyLoss(contributions.length),
      quality_score: this.calculateQualityScore(contributions),
      user_count: contributions.length,
      outlier_count: 0
    }
  }

  /**
   * Bayesian aggregation with uncertainty propagation
   */
  bayesianAggregation(contributions: UserContribution[]): AggregationResult {
    // Initialize with uniform prior
    let posteriorMean = 0.5
    let posteriorVariance = 1/3 // Uniform prior variance

    contributions.forEach(contrib => {
      const likelihoodVariance = Math.pow(1 - contrib.confidence, 2)
      const precision = 1 / likelihoodVariance
      const priorPrecision = 1 / posteriorVariance

      // Update posterior
      const posteriorPrecision = priorPrecision + precision
      posteriorMean = (priorMean * priorPrecision + contrib.value * precision) / posteriorPrecision
      posteriorVariance = 1 / posteriorPrecision
    })

    // Add Laplace noise
    const noisyMean = this.privacy.addLaplaceNoise(posteriorMean)

    return {
      method: 'bayesian_aggregation',
      value: posteriorMean,
      confidence: Math.max(0.1, 1 - Math.sqrt(posteriorVariance)),
      noisy_value: noisyMean,
      privacy_loss: this.privacy.calculatePrivacyLoss(contributions.length),
      quality_score: this.calculateQualityScore(contributions),
      user_count: contributions.length,
      outlier_count: 0
    }
  }

  private calculateQualityScore(contributions: UserContribution[]): number {
    const avgConfidence = contributions.reduce((sum, c) => sum + c.confidence, 0) / contributions.length
    const avgEvidenceQuality = contributions.reduce((sum, c) => sum + c.evidence_quality, 0) / contributions.length
    const variability = this.calculateVariability(contributions.map(c => c.value))

    // Higher score for high confidence, good evidence, and moderate variability
    const baseScore = (avgConfidence * 0.4 + avgEvidenceQuality * 0.4 + (1 - variability) * 0.2)
    return Math.max(0, Math.min(1, baseScore))
  }

  private calculateVariability(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    return Math.sqrt(variance) / mean // Coefficient of variation
  }
}

// =============================================================================
// DATA QUALITY CONTROLS
// =============================================================================

class QualityControl {
  minUsers: number
  outlierThreshold: number

  constructor(minUsers = 5, outlierThreshold = 2.0) {
    this.minUsers = minUsers
    this.outlierThreshold = outlierThreshold
  }

  /**
   * IQR-based outlier detection
   */
  detectOutliers(values: number[]): { outliers: number[]; cleanValues: number[] } {
    if (values.length < 4) return { outliers: [], cleanValues: values }

    const sorted = [...values].sort((a, b) => a - b)
    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const q3 = sorted[Math.floor(sorted.length * 0.75)]
    const iqr = q3 - q1
    const lowerBound = q1 - (this.outlierThreshold * iqr)
    const upperBound = q3 + (this.outlierThreshold * iqr)

    const outliers: number[] = []
    const cleanValues: number[] = []

    values.forEach(value => {
      if (value < lowerBound || value > upperBound) {
        outliers.push(value)
      } else {
        cleanValues.push(value)
      }
    })

    return { outliers, cleanValues }
  }

  /**
   * Quality assessment
   */
  assessDatasetQuality(contributions: UserContribution[]): {
    meetsRequirements: boolean
    qualityScore: number
    issues: string[]
  } {
    const issues: string[] = []

    if (contributions.length < this.minUsers) {
      issues.push(`Insufficient users: ${contributions.length}/${this.minUsers}`)
    }

    const avgConfidence = contributions.reduce((sum, c) => sum + c.confidence, 0) / contributions.length
    if (avgConfidence < 0.3) {
      issues.push(`Low average confidence: ${(avgConfidence * 100).toFixed(1)}%`)
    }

    const avgEvidenceQuality = contributions.reduce((sum, c) => sum + c.evidence_quality, 0) / contributions.length
    if (avgEvidenceQuality < 0.4) {
      issues.push(`Poor evidence quality: ${(avgEvidenceQuality * 100).toFixed(1)}%`)
    }

    const { outliers } = this.detectOutliers(contributions.map(c => c.value))
    if (outliers.length > contributions.length * 0.3) {
      issues.push(`High outlier ratio: ${outliers.length}/${contributions.length}`)
    }

    const qualityScore = this.calculateOverallQuality(contributions, issues.length)

    return {
      meetsRequirements: issues.length === 0,
      qualityScore,
      issues
    }
  }

  private calculateOverallQuality(contributions: UserContribution[], issuesCount: number): number {
    const baseQuality = contributions.reduce((sum, c) =>
      sum + (c.confidence + c.evidence_quality) / 2, 0
    ) / contributions.length

    return Math.max(0.1, baseQuality - (issuesCount * 0.1))
  }
}

// =============================================================================
// PRIVACY BUDGET MANAGER
// =============================================================================

class PrivacyBudgetManager {
  private lastReset: Date
  private epsilonUsed: number = 0
  private dailyLimit: number

  constructor(dailyEpsilonLimit = 10) {
    this.dailyLimit = dailyEpsilonLimit
    this.lastReset = new Date()
    this.checkReset()
  }

  /**
   * Check if budget reset is needed
   */
  private checkReset(): void {
    const now = new Date()
    if (now.getDate() !== this.lastReset.getDate() ||
        now.getMonth() !== this.lastReset.getMonth() ||
        now.getFullYear() !== this.lastReset.getFullYear()) {
      this.epsilonUsed = 0
      this.lastReset = now
    }
  }

  /**
   * Allocate privacy budget for a query
   */
  allocateBudget(epsilonNeeded: number): { allowed: boolean; remainingBudget: number } {
    this.checkReset()

    const remaining = this.dailyLimit - this.epsilonUsed
    if (remaining >= epsilonNeeded) {
      this.epsilonUsed += epsilonNeeded
      return { allowed: true, remainingBudget: remaining - epsilonNeeded }
    }

    return { allowed: false, remainingBudget: remaining }
  }

  getCurrentBudget(): PrivacyBudget {
    this.checkReset()
    return {
      total_epsilon_used: this.epsilonUsed,
      queries_today: Math.floor(this.epsilonUsed / 0.5), // Approximate queries based on typical epsilon
      last_reset: this.lastReset.toISOString()
    }
  }
}

// =============================================================================
// MAIN AGGREGATION FUNCTION
// =============================================================================

async function aggregateCollectiveIntelligence(
  metricKey: string,
  bucketKey: string,
  method: string = 'weighted_consensus',
  config: Partial<PrivacyConfig> = {}
): Promise<{
  ok: boolean
  result?: AggregationResult
  metrics?: AggregationMetrics
  quality?: any
  reason?: string
  message?: string
}> {
  const startTime = Date.now()

  try {
    // Initialize components
    const privacyConfig: PrivacyConfig = {
      epsilon: config.epsilon || 0.5,
      sensitivity: config.sensitivity || 1.0,
      delta: config.delta || 1e-5,
      k_anonymity: config.k_anonymity || 5,
      privacy_budget_limit: config.privacy_budget_limit || 10
    }

    const privacyEngine = new DifferentialPrivacyEngine(privacyConfig)
    const anonymization = new AnonymizationPipeline(privacyConfig.k_anonymity)
    const aggregation = new AggregationEngine(privacyEngine, anonymization)
    const qualityControl = new QualityControl(5, 2.0)
    const budgetManager = new PrivacyBudgetManager(privacyConfig.privacy_budget_limit)

    // Check budget allocation
    const allocation = budgetManager.allocateBudget(privacyConfig.epsilon)
    if (!allocation.allowed) {
      return {
        ok: false,
        reason: 'privacy_budget_exceeded',
        message: `Privacy budget exceeded. Used: ${budgetManager.getCurrentBudget().total_epsilon_used}/${privacyConfig.privacy_budget_limit}`
      }
    }

    // Fetch raw data
    const { data: rawAnalyses, error } = await supabaseAdmin
      .from('analysis_runs')
      .select('id, analysis_json, created_at')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .not('analysis_json', 'is', null)

    if (error || !rawAnalyses) {
      return {
        ok: false,
        reason: 'data_fetch_error',
        message: error?.message || 'Failed to fetch analysis data'
      }
    }

    // Extract and anonymize contributions
    const contributions: UserContribution[] = []

    for (const analysis of rawAnalyses) {
      try {
        const data = typeof analysis.analysis_json === 'string'
          ? JSON.parse(analysis.analysis_json)
          : analysis.analysis_json

        // Extract metrics based on audience and structure
        const contribution = anonymization.sanitizeContribution({
          ...analysis,
          ...data,
          analysis_id: analysis.id
        })

        contributions.push(contribution)
      } catch (e) {
        console.warn('Failed to parse analysis:', e)
      }
    }

    // Enforce k-anonymity
    const anonymizedContributions = anonymization.enforceKAnonymity(contributions)

    // Quality assessment
    const qualityAssessment = qualityControl.assessDatasetQuality(anonymizedContributions)

    if (!qualityAssessment.meetsRequirements) {
      return {
        ok: false,
        reason: 'quality_requirements_not_met',
        message: qualityAssessment.issues.join('; ')
      }
    }

    // Apply outlier detection
    const values = anonymizedContributions.map(c => c.value)
    const { cleanValues } = qualityControl.detectOutliers(values)
    const outlierCount = values.length - cleanValues.length

    // Perform aggregation
    let result: AggregationResult
    switch (method) {
      case 'majority_voting':
        result = aggregation.majorityVoting(anonymizedContributions)
        break
      case 'bayesian_aggregation':
        result = aggregation.bayesianAggregation(anonymizedContributions)
        break
      case 'weighted_consensus':
      default:
        result = aggregation.weightedConsensus(anonymizedContributions)
        break
    }

    // Update with outlier count
    result.outlier_count = outlierCount

    // Calculate metrics
    const signalNoiseRatio = result.value / Math.abs(result.value - result.noisy_value)
    const metrics: AggregationMetrics = {
      privacy_loss_epsilon: result.privacy_loss,
      signal_to_noise_ratio: isNaN(signalNoiseRatio) ? 0 : signalNoiseRatio,
      aggregation_quality_score: qualityAssessment.qualityScore,
      confidence_reliability: this.assessConfidenceReliability(anonymizedContributions, result),
      timestamp: new Date().toISOString()
    }

    return {
      ok: true,
      result,
      metrics,
      quality: {
        ...qualityAssessment,
        outlier_count: outlierCount,
        effective_sample_size: anonymizedContributions.length
      }
    }

  } catch (err: any) {
    console.error('Aggregation error:', err)
    return {
      ok: false,
      reason: 'aggregation_error',
      message: err.message
    }
  }
}

function assessConfidenceReliability(contributions: UserContribution[], result: AggregationResult): number {
  const confidences = contributions.map(c => c.confidence)
  const meanConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length
  const confidenceVariance = confidences.reduce((sum, c) => sum + Math.pow(c - meanConfidence, 2), 0) / confidences.length

  // Reliability based on confidence distribution and result confidence
  return Math.min(1, (result.confidence + (1 - Math.sqrt(confidenceVariance))) / 2)
}

// =============================================================================
// HTTP HANDLER
// =============================================================================

Deno.serve(async (req) => {
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
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json()
    const {
      metric_key,
      bucket_key,
      method = 'weighted_consensus',
      privacy_config = {},
      min_users = 5
    } = body

    if (!metric_key || !bucket_key) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'metric_key_and_bucket_key_required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`[collective-aggregation] Aggregating ${metric_key}:${bucket_key} using ${method}`)

    // Merge privacy config
    const config = { ...privacy_config, minUsers: min_users }

    // Perform aggregation
    const aggregationResult = await aggregateCollectiveIntelligence(metric_key, bucket_key, method, config)

    if (!aggregationResult.ok) {
      return new Response(JSON.stringify({
        ok: false,
        reason: aggregationResult.reason,
        message: aggregationResult.message
      }), {
        status: 200, // Not an error, just requirements not met
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { result, metrics, quality } = aggregationResult

    // Store result in database
    const { error: storeError } = await supabaseAdmin
      .from('collective_aggregates')
      .insert({
        metric_key,
        bucket_key,
        noisy_value: result!.noisy_value,
        dp_epsilon: metrics!.privacy_loss_epsilon,
        user_count: result!.user_count,
        aggregation_method: method,
        quality_score: quality.qualityScore,
        outlier_count: quality.outlier_count,
        privacy_loss: metrics!.privacy_loss_epsilon,
        created_at: new Date().toISOString()
      })

    if (storeError) {
      console.error('Failed to store aggregate:', storeError)
    }

    return new Response(JSON.stringify({
      ok: true,
      result,
      metrics,
      quality,
      stored: !storeError
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Collective aggregation error:', err)
    return new Response(JSON.stringify({
      ok: false,
      error: 'collective_aggregation_failed',
      message: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})