#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DEFAULT_OUTPUT = 'docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json'
const DEFAULT_MIN_SAMPLE_SIZE = 25
const DEFAULT_BINS = 5
const CONSENSUS_POLICY_FALLBACK = 'role_weighted'

function usage() {
  console.log(`Usage: node scripts/build-calibration-ledger.mjs --input <forecast-export.json|csv> [--output ${DEFAULT_OUTPUT}] [--source-mode approved_export|sample_fixture] [--min-sample-size 25] [--bins 5]`)
}

function parseArgs(argv) {
  const parsed = {
    output: DEFAULT_OUTPUT,
    sourceMode: 'approved_export',
    minSampleSize: DEFAULT_MIN_SAMPLE_SIZE,
    bins: DEFAULT_BINS,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--input') {
      parsed.input = argv[index + 1]
      index += 1
    } else if (arg.startsWith('--input=')) {
      parsed.input = arg.slice('--input='.length)
    } else if (arg === '--output') {
      parsed.output = argv[index + 1]
      index += 1
    } else if (arg.startsWith('--output=')) {
      parsed.output = arg.slice('--output='.length)
    } else if (arg === '--source-mode') {
      parsed.sourceMode = argv[index + 1]
      index += 1
    } else if (arg.startsWith('--source-mode=')) {
      parsed.sourceMode = arg.slice('--source-mode='.length)
    } else if (arg === '--min-sample-size') {
      parsed.minSampleSize = Number(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--min-sample-size=')) {
      parsed.minSampleSize = Number(arg.slice('--min-sample-size='.length))
    } else if (arg === '--bins') {
      parsed.bins = Number(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--bins=')) {
      parsed.bins = Number(arg.slice('--bins='.length))
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true
    }
  }

  parsed.minSampleSize = Number.isFinite(parsed.minSampleSize) && parsed.minSampleSize > 0
    ? Math.floor(parsed.minSampleSize)
    : DEFAULT_MIN_SAMPLE_SIZE
  parsed.bins = Number.isFinite(parsed.bins) && parsed.bins > 1
    ? Math.floor(parsed.bins)
    : DEFAULT_BINS

  return parsed
}

function readInput(inputPath) {
  const absolutePath = path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath)
  const text = fs.readFileSync(absolutePath, 'utf8')
  const hash = crypto.createHash('sha256').update(text).digest('hex')
  const ext = path.extname(absolutePath).toLowerCase()
  if (ext === '.csv') {
    return {
      absolutePath,
      hash,
      data: {
        forecasts: parseCsv(text),
      },
    }
  }

  return {
    absolutePath,
    hash,
    data: JSON.parse(text),
  }
}

function parseCsv(text) {
  const rows = []
  const records = []
  let field = ''
  let row = []
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      records.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field || row.length) {
    row.push(field)
    records.push(row)
  }

  const [headers = [], ...body] = records.filter((record) => record.some((value) => value.trim()))
  for (const record of body) {
    const item = {}
    headers.forEach((header, index) => {
      item[header.trim()] = record[index] ?? ''
    })
    rows.push(item)
  }
  return rows
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function extractRows(data) {
  if (Array.isArray(data)) {
    return {
      forecasts: data,
      predictions: [],
    }
  }

  const forecasts = asArray(data.forecasts)
    .concat(asArray(data.rows))
    .concat(asArray(data.records))
    .concat(asArray(data.data))

  return {
    forecasts,
    predictions: asArray(data.forecast_predictions)
      .concat(asArray(data.predictions))
      .concat(asArray(data.user_predictions)),
  }
}

function parseMaybeJson(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function normalizeOutcome(value) {
  const text = String(value ?? '').trim().toLowerCase()
  if (['yes', 'true', '1', 'hit', 'occurred', 'positive'].includes(text)) return 1
  if (['no', 'false', '0', 'miss', 'not_occurred', 'negative'].includes(text)) return 0
  return null
}

function normalizeProbability(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  if (numeric >= 0 && numeric <= 1) return numeric
  if (numeric > 1 && numeric <= 100) return numeric / 100
  return null
}

function round(value, digits = 6) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function brier(probability, outcome) {
  return (probability - outcome) ** 2
}

function getForecastId(row, index) {
  return String(row.id || row.forecast_id || row.forecastId || `forecast-${index + 1}`)
}

function getGameTheoryModel(row) {
  return parseMaybeJson(row.game_theory_model)
    || parseMaybeJson(row.gameTheoryModel)
    || parseMaybeJson(row.model)
    || row.game_theory_model
    || row.gameTheoryModel
    || row.model
    || null
}

function normalizePolicyId(value) {
  const text = String(value || '').trim().toLowerCase()
  if (['role_weighted', 'equal_weight', 'trimmed_mean', 'skeptic_adjusted'].includes(text)) return text
  if (text.includes('equal')) return 'equal_weight'
  if (text.includes('trimmed')) return 'trimmed_mean'
  if (text.includes('skeptic')) return 'skeptic_adjusted'
  return CONSENSUS_POLICY_FALLBACK
}

function extractForecastSources(row, predictionsByForecast) {
  const sources = []
  const registryProbability = normalizeProbability(
    row.current_probability ?? row.currentProbability ?? row.probability ?? row.forecast_probability,
  )
  if (registryProbability !== null) {
    sources.push({
      source_id: 'registry_current_probability',
      label: 'Registry current probability',
      probability: registryProbability,
    })
  }

  const model = getGameTheoryModel(row)
  const consensus = model?.multi_agent_forecast?.consensus || model?.consensus || null
  const champion = consensus?.champion || model?.multi_agent_forecast?.champion || null
  const activePolicy = normalizePolicyId(consensus?.activePolicy || champion?.policyId)
  const championProbability = normalizeProbability(
    champion?.calibratedProbability ?? champion?.probability ?? champion?.rawProbability,
  )
  if (championProbability !== null) {
    sources.push({
      source_id: `multi_agent_${activePolicy}`,
      label: champion?.label || `Multi-agent ${activePolicy}`,
      probability: championProbability,
    })
  }

  for (const challenger of asArray(consensus?.challengers)) {
    const policyId = normalizePolicyId(challenger?.id || challenger?.label || challenger?.method)
    const probability = normalizeProbability(challenger?.calibratedProbability ?? challenger?.probability ?? challenger?.rawProbability)
    if (probability === null) continue
    sources.push({
      source_id: `challenger_${policyId}`,
      label: challenger?.label || `Challenger ${policyId}`,
      probability,
    })
  }

  const forecastPredictions = predictionsByForecast.get(String(row.id || row.forecast_id)) || asArray(row.forecast_predictions)
  const predictionProbabilities = forecastPredictions
    .map((prediction) => normalizeProbability(prediction.probability ?? prediction.prediction_probability))
    .filter((probability) => probability !== null)
  if (predictionProbabilities.length) {
    sources.push({
      source_id: 'community_prediction_mean',
      label: 'Community prediction mean',
      probability: predictionProbabilities.reduce((sum, probability) => sum + probability, 0) / predictionProbabilities.length,
      prediction_count: predictionProbabilities.length,
    })
  }

  const byId = new Map()
  for (const source of sources) {
    if (!byId.has(source.source_id)) {
      byId.set(source.source_id, source)
    }
  }
  return [...byId.values()]
}

function buildLedgerPoints(rows, predictions) {
  const predictionsByForecast = new Map()
  for (const prediction of predictions) {
    const forecastId = String(prediction.forecast_id || prediction.forecastId || '')
    if (!forecastId) continue
    const bucket = predictionsByForecast.get(forecastId) || []
    bucket.push(prediction)
    predictionsByForecast.set(forecastId, bucket)
  }

  const points = []
  const excluded = []

  rows.forEach((row, index) => {
    const forecastId = getForecastId(row, index)
    const outcome = normalizeOutcome(row.resolution_outcome ?? row.resolutionOutcome ?? row.outcome ?? row.actual)
    const isResolved = row.is_resolved === true || String(row.is_resolved ?? row.isResolved ?? '').toLowerCase() === 'true' || outcome !== null
    if (!isResolved || outcome === null) {
      excluded.push({
        forecast_id: forecastId,
        title: row.title || row.question || null,
        reason: 'missing_binary_resolution',
      })
      return
    }

    const sources = extractForecastSources(row, predictionsByForecast)
    if (!sources.length) {
      excluded.push({
        forecast_id: forecastId,
        title: row.title || row.question || null,
        reason: 'missing_probability_source',
      })
      return
    }

    for (const source of sources) {
      points.push({
        forecast_id: forecastId,
        title: row.title || row.question || null,
        question: row.question || null,
        source_id: source.source_id,
        label: source.label,
        probability: round(source.probability),
        outcome,
        brier_score: round(brier(source.probability, outcome)),
        resolved_at: row.resolved_at || row.resolvedAt || null,
        prediction_count: source.prediction_count ?? null,
      })
    }
  })

  return { points, excluded }
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function summarizeSource(points, sourceId, bins) {
  const sourcePoints = points.filter((point) => point.source_id === sourceId)
  const outcomes = sourcePoints.map((point) => point.outcome)
  const probabilities = sourcePoints.map((point) => point.probability)
  const baseRate = average(outcomes)
  const baseBrier = baseRate === null
    ? null
    : average(outcomes.map((outcome) => brier(baseRate, outcome)))
  const avgBrier = average(sourcePoints.map((point) => point.brier_score))

  const reliabilityBins = Array.from({ length: bins }, (_, index) => {
    const min = index / bins
    const max = (index + 1) / bins
    const bucket = sourcePoints.filter((point) => {
      if (index === bins - 1) return point.probability >= min && point.probability <= max
      return point.probability >= min && point.probability < max
    })
    const avgProbability = average(bucket.map((point) => point.probability))
    const observedFrequency = average(bucket.map((point) => point.outcome))
    return {
      bin: `${round(min, 2)}-${round(max, 2)}`,
      count: bucket.length,
      avg_probability: avgProbability === null ? null : round(avgProbability),
      observed_frequency: observedFrequency === null ? null : round(observedFrequency),
      avg_brier: bucket.length ? round(average(bucket.map((point) => point.brier_score))) : null,
      calibration_error: avgProbability === null || observedFrequency === null
        ? null
        : round(Math.abs(avgProbability - observedFrequency)),
    }
  })

  const nonEmptyBins = reliabilityBins.filter((bin) => bin.count > 0)
  const expectedCalibrationError = sourcePoints.length
    ? nonEmptyBins.reduce((sum, bin) => sum + (bin.count / sourcePoints.length) * (bin.calibration_error ?? 0), 0)
    : null

  return {
    source_id: sourceId,
    label: sourcePoints[0]?.label || sourceId,
    sample_size: sourcePoints.length,
    avg_brier: avgBrier === null ? null : round(avgBrier),
    base_rate: baseRate === null ? null : round(baseRate),
    base_rate_brier: baseBrier === null ? null : round(baseBrier),
    brier_skill_vs_base_rate: avgBrier !== null && baseBrier && baseBrier > 0
      ? round(1 - (avgBrier / baseBrier))
      : null,
    accuracy_at_50: sourcePoints.length
      ? round(sourcePoints.filter((point) => (point.probability >= 0.5 ? 1 : 0) === point.outcome).length / sourcePoints.length)
      : null,
    mean_probability: probabilities.length ? round(average(probabilities)) : null,
    observed_frequency: outcomes.length ? round(average(outcomes)) : null,
    expected_calibration_error: expectedCalibrationError === null ? null : round(expectedCalibrationError),
    reliability_bins: reliabilityBins,
  }
}

function buildReport({ inputPath, inputHash, sourceMode, minSampleSize, bins, rows, predictions }) {
  const { points, excluded } = buildLedgerPoints(rows, predictions)
  const sourceIds = [...new Set(points.map((point) => point.source_id))].sort()
  const sourceSummaries = sourceIds.map((sourceId) => summarizeSource(points, sourceId, bins))
  const maxSampleSize = sourceSummaries.reduce((max, source) => Math.max(max, source.sample_size), 0)
  const approvedExport = sourceMode === 'approved_export'
  const enoughSamples = maxSampleSize >= minSampleSize
  const commercialClaimStatus = approvedExport && enoughSamples
    ? 'usable_with_caveats'
    : approvedExport
      ? 'insufficient_sample_size'
      : 'not_launch_proof'

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    source: {
      input: path.isAbsolute(inputPath) ? path.relative(ROOT, inputPath) : inputPath,
      input_sha256: inputHash,
      mode: sourceMode,
      approved_export_required_for_claims: true,
    },
    commercial_claim_status: commercialClaimStatus,
    summary: {
      forecast_rows_read: rows.length,
      prediction_rows_read: predictions.length,
      included_point_count: points.length,
      excluded_forecast_count: excluded.length,
      sources_scored: sourceSummaries.length,
      max_source_sample_size: maxSampleSize,
      minimum_sample_size: minSampleSize,
      reliability_bins: bins,
      note: commercialClaimStatus === 'usable_with_caveats'
        ? 'Approved export meets the configured minimum sample threshold; still compare against external/human/community baselines before prediction-superiority claims.'
        : 'This report does not prove commercial prediction accuracy. Use an approved resolved-forecast export with enough samples before making accuracy claims.',
    },
    inclusion_rules: [
      'Include only binary resolved outcomes: yes/no, true/false, 1/0, occurred/not_occurred.',
      'Exclude unresolved, ambiguous, canceled, or probability-missing forecasts.',
      'Normalize probabilities expressed as either 0-1 decimals or 0-100 percentages.',
      'Score registry current probability, multi-agent champion, challengers, and community mean when present.',
    ],
    source_summaries: sourceSummaries,
    ledger_points: points,
    excluded_forecasts: excluded,
    next_required_evidence: [
      'Run this against an owner-approved hosted export of resolved forecasts and forecast_predictions.',
      'Attach external baselines: base rate, community/pro forecaster where available, and ForecastBench-style benchmark comparison.',
      'Store inclusion/exclusion review and resolution-source notes for every forecast.',
      'Keep this as pilot evidence until sample size, reliability bins, and hosted security boundaries are proven.',
    ],
  }
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  usage()
  process.exit(0)
}

if (!args.input) {
  usage()
  console.error('Missing required --input path.')
  process.exit(2)
}

if (!['approved_export', 'sample_fixture'].includes(args.sourceMode)) {
  console.error('--source-mode must be approved_export or sample_fixture.')
  process.exit(2)
}

const input = readInput(args.input)
const { forecasts, predictions } = extractRows(input.data)
const report = buildReport({
  inputPath: input.absolutePath,
  inputHash: input.hash,
  sourceMode: args.sourceMode,
  minSampleSize: args.minSampleSize,
  bins: args.bins,
  rows: forecasts,
  predictions,
})

const outputPath = path.isAbsolute(args.output) ? args.output : path.join(ROOT, args.output)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(JSON.stringify({
  output: path.relative(ROOT, outputPath),
  commercial_claim_status: report.commercial_claim_status,
  included_point_count: report.summary.included_point_count,
  sources_scored: report.summary.sources_scored,
  max_source_sample_size: report.summary.max_source_sample_size,
}, null, 2))
