export function getFunctionsBaseUrl() {
  const explicitBaseUrl = Deno.env.get('SUPABASE_FUNCTIONS_BASE_URL')
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, '')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`
  }

  return 'http://localhost:54321/functions/v1'
}

export function buildFunctionUrl(functionName: string) {
  return `${getFunctionsBaseUrl()}/${functionName}`
}
