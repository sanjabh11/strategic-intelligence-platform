import fs from 'node:fs'
import path from 'node:path'

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return {}
  const content = fs.readFileSync(filepath, 'utf8')
  const entries = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    entries[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
  }
  return entries
}

function loadFixture(name) {
  const filepath = path.resolve(process.cwd(), 'supabase/functions/_shared/test-fixtures', name)
  return JSON.parse(fs.readFileSync(filepath, 'utf8'))
}

const env = { ...loadEnvFile(path.resolve(process.cwd(), '.env')), ...process.env }
const supabaseUrl = env.VITE_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = env.VITE_SUPABASE_ANON_KEY
const timeoutMs = Number(env.HOSTED_RESEARCHER_ADVANCED_TIMEOUT_MS || 120000)

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.')
}

async function fetchWithTimeout(url, options = {}, customTimeoutMs = timeoutMs) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(customTimeoutMs),
  })
}

async function callAnalyzeEngine(body) {
  const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/analyze-engine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      ...body,
      run_id: `researcher-advanced-smoke-${Date.now()}-${body.expected_framework}`,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok || !payload?.analysis) {
    throw new Error(`analyze-engine failed for ${body.expected_framework}: ${JSON.stringify(payload)}`)
  }

  return payload
}

async function callHydrator(analysisRunId) {
  const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/analysis-hydrator?analysis_run_id=${analysisRunId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    throw new Error(`analysis-hydrator failed for ${analysisRunId}: ${JSON.stringify(payload)}`)
  }
  return payload
}

async function callExportAnalysis(analysisRunId) {
  const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/export-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      analysisRunId,
      format: 'json',
      includeMetadata: true,
      includeRawData: false,
    }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    throw new Error(`export-analysis failed for ${analysisRunId}: ${JSON.stringify(payload)}`)
  }
  return payload
}

async function callNotebookExport(analysisId, analysisData, retrievals = []) {
  const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/notebook-export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      analysis_id: analysisId,
      analysis_data: analysisData,
      retrievals,
    }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    throw new Error(`notebook-export failed for ${analysisId}: ${JSON.stringify(payload)}`)
  }
  return payload
}

function assertFrameworkEnvelope(frameworkName, envelope) {
  if (!envelope) {
    throw new Error(`missing advanced framework envelope: ${frameworkName}`)
  }
  if (envelope.framework !== frameworkName) {
    throw new Error(`framework mismatch for ${frameworkName}: ${envelope.framework}`)
  }
  if (envelope.status !== 'deterministic') {
    throw new Error(`expected deterministic ${frameworkName} output, got ${envelope.status}`)
  }
  if (!envelope.normalized_inputs || Object.keys(envelope.normalized_inputs).length === 0) {
    throw new Error(`missing normalized inputs for ${frameworkName}`)
  }
}

const fixtures = [
  loadFixture('researcher-coalitional.json'),
  loadFixture('researcher-signaling.json'),
]

const results = []

for (const fixture of fixtures) {
  const analyze = await callAnalyzeEngine(fixture)
  const analysisRunId = analyze.analysis_run_id || analyze.analysis_id || analyze.request_id
  const analysis = analyze.analysis
  const frameworks = analysis?.simulation_results?.advanced_frameworks || {}
  const envelope = frameworks[fixture.expected_framework]

  assertFrameworkEnvelope(fixture.expected_framework, envelope)

  const hydrated = await callHydrator(analysisRunId)
  const hydratedEnvelope = hydrated.analysis?.simulation_results?.advanced_frameworks?.[fixture.expected_framework]
  assertFrameworkEnvelope(fixture.expected_framework, hydratedEnvelope)

  const exported = await callExportAnalysis(analysisRunId)
  const exportedJson = JSON.parse(exported.content)
  const exportedEnvelope = exportedJson?.analysis?.simulation_results?.advanced_frameworks?.[fixture.expected_framework]
  assertFrameworkEnvelope(fixture.expected_framework, exportedEnvelope)

  const notebook = await callNotebookExport(analysis.analysis_id, analysis, analysis.retrievals || [])
  if (!notebook.notebook_content.includes('advanced_frameworks')) {
    throw new Error(`notebook-export did not preserve advanced frameworks for ${fixture.expected_framework}`)
  }

  results.push({
    expected_framework: fixture.expected_framework,
    analysis_run_id: analysisRunId,
    analysis_id: analysis.analysis_id,
    status: envelope.status,
    normalized_input_keys: Object.keys(envelope.normalized_inputs || {}),
    hydrated_status: hydratedEnvelope.status,
    exported_status: exportedEnvelope.status,
    notebook_preserved: true,
  })
}

console.log(JSON.stringify({
  scenarios_checked: fixtures.length,
  passed: true,
  results,
}, null, 2))
