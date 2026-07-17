import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

const DEFAULT_BUCKET = 'analysis-artifacts'
const DEFAULT_THRESHOLD_BYTES = 64 * 1024
const HEAVY_KEY_PATTERNS = [
  /sequential.*report/i,
  /game.*tree/i,
  /graph/i,
  /matrix_values/i,
  /simulation_results/i,
]

type ArtifactStorageColumns = {
  analysis_json: Record<string, unknown>
  payload_mode: 'inline' | 'storage_pointer'
  artifact_bucket: string | null
  artifact_path: string | null
  artifact_sha256: string | null
  artifact_bytes: number | null
}

function resolveBucketName() {
  return Deno.env.get('ANALYSIS_ARTIFACT_BUCKET') || DEFAULT_BUCKET
}

function resolveThresholdBytes() {
  const raw = Number(Deno.env.get('ANALYSIS_ARTIFACT_THRESHOLD_BYTES') || DEFAULT_THRESHOLD_BYTES)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_THRESHOLD_BYTES
}

function normalizeDatePrefix(date = new Date()) {
  return date.toISOString().slice(0, 10).replace(/-/g, '/')
}

function encodeJson(value: unknown) {
  const payload = JSON.stringify(value ?? {})
  const bytes = new TextEncoder().encode(payload)
  return { payload, bytes }
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    Uint8Array.from(bytes).buffer,
  )
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function containsHeavyArtifact(value: unknown, seen = new WeakSet<object>()): boolean {
  if (!isPlainObject(value) && !Array.isArray(value)) return false
  if (typeof value === 'object' && value !== null) {
    if (seen.has(value as object)) return false
    seen.add(value as object)
  }

  if (Array.isArray(value)) {
    if (value.length > 120) return true
    return value.some((entry) => containsHeavyArtifact(entry, seen))
  }

  for (const [key, nested] of Object.entries(value)) {
    if (HEAVY_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      return true
    }
    if (containsHeavyArtifact(nested, seen)) {
      return true
    }
  }

  return false
}

function pickDefined<T extends Record<string, unknown>>(source: T, keys: string[]) {
  const target: Record<string, unknown> = {}
  for (const key of keys) {
    if (source[key] !== undefined) {
      target[key] = source[key]
    }
  }
  return target
}

function buildInlineEnvelope(analysis: Record<string, unknown>, artifact: {
  bucket: string
  path: string
  sha256: string
  bytes: number
}) {
  return {
    ...pickDefined(analysis, [
      'analysis_id',
      'audience',
      'scenario_text',
      'summary',
      'long_summary',
      'one_paragraph_summary',
      'lesson_outline',
      'top_2_actions',
      'forecast',
      'multiAgentForecast',
      'multi_agent_forecast',
      'provenance',
      'constraint_checks',
      'drift_signal',
      'attribution',
      'disclaimer',
      'reason',
    ]),
    artifact_ref: {
      bucket: artifact.bucket,
      path: artifact.path,
      sha256: artifact.sha256,
      bytes: artifact.bytes,
      mode: 'storage_pointer',
    },
  }
}

function deepMerge(base: unknown, overlay: unknown): unknown {
  if (Array.isArray(base) || Array.isArray(overlay)) {
    return overlay ?? base
  }
  if (!isPlainObject(base) || !isPlainObject(overlay)) {
    return overlay ?? base
  }

  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    result[key] = key in result ? deepMerge(result[key], value) : value
  }
  return result
}

export async function prepareAnalysisArtifactPersistence(
  admin: SupabaseClient,
  args: {
    requestId: string
    analysisJson: Record<string, unknown>
    sourceHint?: string
  },
): Promise<ArtifactStorageColumns> {
  const analysisJson = isPlainObject(args.analysisJson) ? args.analysisJson : {}
  const { bytes } = encodeJson(analysisJson)
  const byteLength = bytes.byteLength
  const shouldOffload = byteLength >= resolveThresholdBytes() || containsHeavyArtifact(analysisJson)

  if (!shouldOffload) {
    return {
      analysis_json: analysisJson,
      payload_mode: 'inline',
      artifact_bucket: null,
      artifact_path: null,
      artifact_sha256: null,
      artifact_bytes: byteLength,
    }
  }

  const bucket = resolveBucketName()
  const path = `${args.sourceHint || 'analysis-runs'}/${normalizeDatePrefix()}/${args.requestId}.json`
  const sha256 = await sha256Hex(bytes)

  const { error } = await admin.storage.from(bucket).upload(path, bytes, {
    contentType: 'application/json',
    upsert: true,
  })

  if (error) {
    console.warn(`Artifact upload failed for ${args.requestId}; falling back to inline payload: ${error.message}`)
    return {
      analysis_json: {
        ...analysisJson,
        artifact_offload_warning: 'storage_upload_failed',
      },
      payload_mode: 'inline',
      artifact_bucket: null,
      artifact_path: null,
      artifact_sha256: null,
      artifact_bytes: byteLength,
    }
  }

  return {
    analysis_json: buildInlineEnvelope(analysisJson, {
      bucket,
      path,
      sha256,
      bytes: byteLength,
    }),
    payload_mode: 'storage_pointer',
    artifact_bucket: bucket,
    artifact_path: path,
    artifact_sha256: sha256,
    artifact_bytes: byteLength,
  }
}

export async function hydrateAnalysisJson(
  admin: SupabaseClient,
  row: {
    analysis_json?: unknown
    payload_mode?: string | null
    artifact_bucket?: string | null
    artifact_path?: string | null
  },
) {
  const inlineJson = isPlainObject(row.analysis_json) ? row.analysis_json : {}

  if (row.payload_mode !== 'storage_pointer' || !row.artifact_path) {
    return inlineJson
  }

  const bucket = row.artifact_bucket || resolveBucketName()
  const { data, error } = await admin.storage.from(bucket).download(row.artifact_path)

  if (error || !data) {
    console.warn(`Artifact hydration failed for ${row.artifact_path}: ${error?.message || 'missing object'}`)
    return inlineJson
  }

  try {
    const text = await data.text()
    const parsed = JSON.parse(text)
    return deepMerge(parsed, inlineJson)
  } catch (parseError) {
    console.warn(`Artifact JSON parse failed for ${row.artifact_path}: ${String(parseError)}`)
    return inlineJson
  }
}
