import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

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

const env = { ...loadEnvFile(path.resolve(process.cwd(), '.env')), ...process.env }
const projectRef = env.SUPABASE_PROJECT_REF || 'jxdihzqoaxtydolmltdr'
const functionsDir = path.resolve(process.cwd(), 'supabase/functions')

const localFunctions = fs.readdirSync(functionsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name)
  .sort()

const remoteRaw = execFileSync('supabase', ['functions', 'list', '--project-ref', projectRef, '--output', 'json'], {
  cwd: process.cwd(),
  encoding: 'utf8'
})

const remoteFunctions = JSON.parse(remoteRaw)
  .map((item) => ({
    name: item.slug || item.name,
    status: item.status,
    version: item.version,
    updated_at: item.updated_at
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const localSet = new Set(localFunctions)
const remoteSet = new Set(remoteFunctions.map((item) => item.name))

const repoBackedRemote = remoteFunctions.filter((item) => localSet.has(item.name))
const remoteOnlyLegacy = remoteFunctions.filter((item) => !localSet.has(item.name))
const localOnly = localFunctions.filter((name) => !remoteSet.has(name))

const quarantineCandidates = remoteOnlyLegacy.filter((item) =>
  /(cron|ingest|manifest|stream|fetch-|adapter|analysis-status|enhanced-analysis|write-full-analysis|forecast$|hydrate-analysis|validate-schema)/.test(item.name)
)

const report = {
  project_ref: projectRef,
  counts: {
    local_functions: localFunctions.length,
    remote_functions: remoteFunctions.length,
    repo_backed_remote: repoBackedRemote.length,
    remote_only_legacy: remoteOnlyLegacy.length,
    local_only: localOnly.length,
    quarantine_candidates: quarantineCandidates.length
  },
  repo_backed_remote: repoBackedRemote,
  remote_only_legacy: remoteOnlyLegacy,
  local_only: localOnly,
  quarantine_candidates: quarantineCandidates
}

console.log(JSON.stringify(report, null, 2))
