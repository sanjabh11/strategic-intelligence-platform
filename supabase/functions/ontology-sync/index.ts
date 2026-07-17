import { createClient } from 'npm:@supabase/supabase-js@2'
import { jsonResponse } from '../_shared/auth.ts'
import { ensureOntologySeed, maybeCallMlService } from '../_shared/ml-platform.ts'

function getAdminClient() {
  const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr'
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Server configuration error')
  }
  return createClient(supabaseUrl, serviceKey)
}

function isAuthorized(req: Request) {
  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim()
  const internalToken = Deno.env.get('INTERNAL_JOB_TOKEN') || Deno.env.get('WHITEBOX_SCHEDULE_TOKEN') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') || ''
  return Boolean(token) && (token === internalToken || token === serviceKey)
}

// INTERNAL: Called server-side, relies on RLS for auth
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' })
  if (!isAuthorized(req)) return jsonResponse(401, { ok: false, message: 'Unauthorized' })

  try {
    const admin = getAdminClient()
    const seed = await ensureOntologySeed(admin)
    const aliasMap = seed.aliases.reduce<Record<string, string[]>>((acc, alias) => {
      acc[alias.entity_key] = acc[alias.entity_key] || []
      acc[alias.entity_key].push(alias.alias)
      return acc
    }, {})

    const warmup = await maybeCallMlService('/ontology/link', {
      texts: seed.entities.slice(0, 8).map((entity) => `${entity.label} ${entity.description}`),
      aliases: aliasMap,
    }).catch((error) => {
      console.warn('ML ontology warmup fallback:', error)
      return null
    })

    return jsonResponse(200, {
      ok: true,
      entities: seed.entities.length,
      aliases: seed.aliases.length,
      retrievalPolicyId: 'entity_rank_v1',
      mlServiceLinked: Boolean(warmup),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('ontology-sync failed:', error)
    return jsonResponse(500, { ok: false, message })
  }
})
