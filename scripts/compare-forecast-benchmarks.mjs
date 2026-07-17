#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DEFAULT_OUTPUT = 'docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json'

function usage() {
  console.log(`Usage: node scripts/compare-forecast-benchmarks.mjs --ledger <calibration-ledger.json> --baseline <baseline.json|csv> [--output ${DEFAULT_OUTPUT}]`)
}

function parseArgs(argv) {
  const parsed = {
    output: DEFAULT_OUTPUT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--ledger') {
      parsed.ledger = argv[index + 1]
      index += 1
    } else if (arg.startsWith('--ledger=')) {
      parsed.ledger = arg.slice('--ledger='.length)
    } else if (arg === '--baseline') {
      parsed.baseline = argv[index + 1]
      index += 1
    } else if (arg.startsWith('--baseline=')) {
      parsed.baseline = arg.slice('--baseline='.length)
    } else if (arg === '--output') {
      parsed.output = argv[index + 1]
      index += 1
    } else if (arg.startsWith('--output=')) {
      parsed.output = arg.slice('--output='.length)
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true
    }
  }

  return parsed
}

function readText(inputPath) {
  const absolutePath = path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath)
  const text = fs.readFileSync(absolutePath, 'utf8')
  return {
    absolutePath,
    text,
    hash: crypto.createHash('sha256').update(text).digest('hex'),
  }
}

function readJson(inputPath) {
  const source = readText(inputPath)
  return {
    ...source,
    data: JSON.parse(source.text),
  }
}

function parseCsv(text) {
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
  return body.map((record) => {
    const item = {}
    headers.forEach((header, index) => {
      item[header.trim()] = record[index] ?? ''
    })
    return item
  })
}

function readBaseline(inputPath) {
  const source = readText(inputPath)
  const ext = path.extname(source.absolutePath).toLowerCase()
  if (ext === '.csv') {
    return {
      ...source,
      data: {
        baselines: parseCsv(source.text),
      },
    }
  }
  return {
    ...source,
    data: JSON.parse(source.text),
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function round(value, digits = 6) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function normalizeBaselineRows(data) {
  const rows = Array.isArray(data) ? data : asArray(data.baselines)
  return rows
    .map((row) => ({
      baseline_id: String(row.baseline_id || row.id || row.source_id || row.name || '').trim(),
      label: String(row.label || row.name || row.baseline_id || row.id || '').trim(),
      baseline_type: String(row.baseline_type || row.type || 'external').trim(),
      avg_brier: numberOrNull(row.avg_brier ?? row.brier ?? row.brier_score),
      sample_size: numberOrNull(row.sample_size ?? row.n ?? row.count),
      source_url: row.source_url || row.url || null,
      notes: row.notes || row.description || null,
    }))
    .filter((row) => row.baseline_id && row.avg_brier !== null)
}

function normalizeForecastBaselineRows(data) {
  const rows = asArray(data.forecast_baselines)
    .concat(asArray(data.forecastBaselineRows))
    .concat(asArray(data.per_forecast_baselines))
  return rows
    .map((row) => ({
      baseline_id: String(row.baseline_id || row.id || row.name || '').trim(),
      label: String(row.label || row.name || row.baseline_id || row.id || '').trim(),
      forecast_id: String(row.forecast_id || row.forecastId || '').trim(),
      probability: numberOrNull(row.probability),
      outcome: numberOrNull(row.outcome),
      source_url: row.source_url || row.url || null,
      notes: row.notes || row.description || null,
    }))
    .filter((row) => row.baseline_id && row.forecast_id && row.probability !== null)
}

function brier(probability, outcome) {
  return (probability - outcome) ** 2
}

function buildPerForecastBaselines(ledger, rows) {
  const ledgerPoints = asArray(ledger.ledger_points)
  const bySource = new Map()
  for (const baselineRow of rows) {
    const matchingPoint = ledgerPoints.find((point) => String(point.forecast_id) === baselineRow.forecast_id)
    const outcome = baselineRow.outcome ?? numberOrNull(matchingPoint?.outcome)
    if (outcome === null) continue
    const bucket = bySource.get(baselineRow.baseline_id) || {
      baseline_id: baselineRow.baseline_id,
      label: baselineRow.label || baselineRow.baseline_id,
      baseline_type: 'per_forecast',
      values: [],
      source_url: baselineRow.source_url,
      notes: baselineRow.notes,
    }
    bucket.values.push(brier(baselineRow.probability, outcome))
    bySource.set(baselineRow.baseline_id, bucket)
  }

  return [...bySource.values()].map((bucket) => ({
    baseline_id: bucket.baseline_id,
    label: bucket.label,
    baseline_type: bucket.baseline_type,
    avg_brier: round(average(bucket.values)),
    sample_size: bucket.values.length,
    source_url: bucket.source_url || null,
    notes: bucket.notes || null,
  }))
}

function compareSourceToBaseline(source, baseline) {
  const appBrier = numberOrNull(source.avg_brier)
  const baselineBrier = numberOrNull(baseline.avg_brier)
  if (appBrier === null || baselineBrier === null) {
    return null
  }
  return {
    source_id: source.source_id,
    source_label: source.label || source.source_id,
    app_sample_size: Number(source.sample_size || 0),
    app_avg_brier: appBrier,
    baseline_id: baseline.baseline_id,
    baseline_label: baseline.label || baseline.baseline_id,
    baseline_type: baseline.baseline_type || 'external',
    baseline_sample_size: baseline.sample_size,
    baseline_avg_brier: baselineBrier,
    brier_delta: round(appBrier - baselineBrier),
    brier_skill_vs_baseline: baselineBrier > 0 ? round(1 - (appBrier / baselineBrier)) : null,
    verdict: appBrier < baselineBrier
      ? 'app_lower_brier'
      : appBrier > baselineBrier
        ? 'baseline_lower_brier'
        : 'tie',
  }
}

function buildComparison({ ledger, ledgerPath, ledgerHash, baselineData, baselinePath, baselineHash }) {
  const aggregateBaselines = normalizeBaselineRows(baselineData)
  const perForecastBaselines = buildPerForecastBaselines(ledger, normalizeForecastBaselineRows(baselineData))
  const baselines = [...aggregateBaselines, ...perForecastBaselines]
  const sourceSummaries = asArray(ledger.source_summaries)
  const comparisons = []

  for (const source of sourceSummaries) {
    for (const baseline of baselines) {
      const comparison = compareSourceToBaseline(source, baseline)
      if (comparison) comparisons.push(comparison)
    }
  }

  const bestBySource = sourceSummaries.map((source) => {
    const relevant = comparisons
      .filter((comparison) => comparison.source_id === source.source_id)
      .sort((left, right) => left.brier_delta - right.brier_delta)
    return {
      source_id: source.source_id,
      source_label: source.label || source.source_id,
      app_avg_brier: source.avg_brier ?? null,
      comparisons: relevant,
      best_verdict: relevant[0]?.verdict || 'no_baseline',
    }
  })

  const ledgerMode = ledger?.source?.mode || 'unknown'
  const ledgerClaimStatus = ledger?.commercial_claim_status || 'unknown'
  const hasBaseline = comparisons.length > 0
  const commercialBenchmarkStatus = ledgerClaimStatus === 'usable_with_caveats' && hasBaseline
    ? 'usable_with_caveats'
    : ledgerMode === 'sample_fixture' && hasBaseline
      ? 'sample_only_not_launch_proof'
      : hasBaseline
        ? 'insufficient_ledger_status'
        : 'missing_baseline'

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    source: {
      ledger: path.isAbsolute(ledgerPath) ? path.relative(ROOT, ledgerPath) : ledgerPath,
      ledger_sha256: ledgerHash,
      ledger_mode: ledgerMode,
      ledger_commercial_claim_status: ledgerClaimStatus,
      baseline: path.isAbsolute(baselinePath) ? path.relative(ROOT, baselinePath) : baselinePath,
      baseline_sha256: baselineHash,
    },
    commercial_benchmark_status: commercialBenchmarkStatus,
    summary: {
      sources_compared: sourceSummaries.length,
      baselines_loaded: baselines.length,
      comparisons_made: comparisons.length,
      note: commercialBenchmarkStatus === 'usable_with_caveats'
        ? 'Approved ledger and baseline comparison are present; keep source, question, and sample-size caveats with any accuracy claim.'
        : 'This benchmark comparison does not prove commercial prediction superiority. Use approved resolved forecasts and real human/community/external baselines before making market claims.',
    },
    methodology_alignment: [
      {
        framework: 'ForecastBench',
        alignment: 'partial',
        requirement: 'Brier-style scoring with comparable baselines and reproducible methodology.',
      },
      {
        framework: 'Metaculus FutureEval',
        alignment: 'partial',
        requirement: 'Compare model forecasts against human/community or pro forecasting baselines on shared resolved questions.',
      },
      {
        framework: 'NIST AI RMF Measure',
        alignment: 'partial',
        requirement: 'Benchmark and monitor performance in deployment-relevant conditions before relying on system claims.',
      },
    ],
    baselines,
    source_comparisons: bestBySource,
    all_comparisons: comparisons,
    claim_rules: [
      'Do not claim prediction superiority from sample fixtures.',
      'Do not compare against human/community/pro baselines unless forecasts were made on the same or explicitly comparable questions.',
      'Report sample sizes, question inclusion rules, and source URLs with every benchmark claim.',
      'Use base-rate comparisons as a minimum sanity check, not as proof of world-class forecasting.',
    ],
  }
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  usage()
  process.exit(0)
}

if (!args.ledger || !args.baseline) {
  usage()
  console.error('Missing required --ledger and/or --baseline path.')
  process.exit(2)
}

const ledger = readJson(args.ledger)
const baseline = readBaseline(args.baseline)
const report = buildComparison({
  ledger: ledger.data,
  ledgerPath: ledger.absolutePath,
  ledgerHash: ledger.hash,
  baselineData: baseline.data,
  baselinePath: baseline.absolutePath,
  baselineHash: baseline.hash,
})

const outputPath = path.isAbsolute(args.output) ? args.output : path.join(ROOT, args.output)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(JSON.stringify({
  output: path.relative(ROOT, outputPath),
  commercial_benchmark_status: report.commercial_benchmark_status,
  sources_compared: report.summary.sources_compared,
  baselines_loaded: report.summary.baselines_loaded,
  comparisons_made: report.summary.comparisons_made,
}, null, 2))
