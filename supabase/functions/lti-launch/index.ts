// LTI 1.3 Launch Handler
// Handles LMS integration for Canvas, Moodle, Blackboard
// Part of Monetization Strategy Phase 2 - Educational Market

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface LTI13Message {
  iss: string;           // Issuer (LMS platform)
  aud: string;           // Audience (our client_id)
  sub: string;           // Subject (user ID in LMS)
  exp: number;           // Expiration
  iat: number;           // Issued at
  nonce: string;
  'https://purl.imsglobal.org/spec/lti/claim/message_type': string;
  'https://purl.imsglobal.org/spec/lti/claim/version': string;
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': string;
  'https://purl.imsglobal.org/spec/lti/claim/roles': string[];
  'https://purl.imsglobal.org/spec/lti/claim/context'?: {
    id: string;
    label: string;
    title: string;
    type: string[];
  };
  'https://purl.imsglobal.org/spec/lti/claim/resource_link'?: {
    id: string;
    title: string;
    description?: string;
  };
  name?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.split('/').pop()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Route handling
    switch (path) {
      case 'login':
        return handleOIDCLogin(req, supabase)
      case 'launch':
        return handleLaunch(req, supabase)
      case 'jwks':
        return handleJWKS(supabase)
      case 'register':
        return handlePlatformRegistration(req, supabase)
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown endpoint' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error: unknown) {
    console.error('LTI error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'LTI processing failed', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Step 1: OIDC Login Initiation
async function handleOIDCLogin(req: Request, supabase: any): Promise<Response> {
  const formData = await req.formData()
  const iss = formData.get('iss') as string
  const loginHint = formData.get('login_hint') as string
  const targetLinkUri = formData.get('target_link_uri') as string
  const ltiMessageHint = formData.get('lti_message_hint') as string

  if (!iss) {
    return new Response(
      JSON.stringify({ error: 'Missing issuer' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Find registered platform
  const { data: platform, error } = await supabase
    .from('lti_platforms')
    .select('*')
    .eq('issuer', iss)
    .eq('is_active', true)
    .single()

  if (error || !platform) {
    return new Response(
      JSON.stringify({ error: 'Platform not registered', issuer: iss }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Generate state and nonce
  const state = crypto.randomUUID()
  const nonce = crypto.randomUUID()

  // Store session for validation
  await supabase.from('lti_sessions').insert({
    platform_id: platform.id,
    lti_user_id: loginHint || 'pending',
    state,
    nonce,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min expiry
  })

  // Build authorization redirect URL
  const authParams = new URLSearchParams({
    scope: 'openid',
    response_type: 'id_token',
    client_id: platform.client_id,
    redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/lti-launch/launch`,
    login_hint: loginHint || '',
    state,
    nonce,
    response_mode: 'form_post',
    prompt: 'none'
  })

  if (ltiMessageHint) {
    authParams.set('lti_message_hint', ltiMessageHint)
  }

  const authUrl = `${platform.auth_endpoint}?${authParams.toString()}`

  // Return redirect
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': authUrl
    }
  })
}

// Step 2: Handle Launch (callback from LMS)
async function handleLaunch(req: Request, supabase: any): Promise<Response> {
  const formData = await req.formData()
  const idToken = formData.get('id_token') as string
  const state = formData.get('state') as string

  if (!idToken || !state) {
    return new Response(
      JSON.stringify({ error: 'Missing id_token or state' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate state
  const { data: session, error: sessionError } = await supabase
    .from('lti_sessions')
    .select('*, lti_platforms(*)')
    .eq('state', state)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired state' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Decode JWT (in production, verify signature with platform's JWKS)
  const payload = decodeJWT(idToken) as LTI13Message

  if (!payload) {
    return new Response(
      JSON.stringify({ error: 'Invalid JWT' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate nonce
  if (payload.nonce !== session.nonce) {
    return new Response(
      JSON.stringify({ error: 'Nonce mismatch' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Extract LTI claims
  const ltiContext = payload['https://purl.imsglobal.org/spec/lti/claim/context']
  const ltiRoles = payload['https://purl.imsglobal.org/spec/lti/claim/roles'] || []
  const resourceLink = payload['https://purl.imsglobal.org/spec/lti/claim/resource_link']

  // Find or create user
  let userId: string | null = null
  
  if (payload.email) {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', payload.email)
      .single()

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Create user with LTI data
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: payload.email,
        email_confirm: true,
        user_metadata: {
          full_name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
          lti_user_id: payload.sub,
          lti_platform: session.lti_platforms.name
        }
      })
      
      if (newUser) {
        userId = newUser.user.id
        
        // Grant academic tier for LTI users
        await supabase.from('user_subscriptions').insert({
          user_id: userId,
          tier: 'academic',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 6 months
        })
      }
    }
  }

  // Update session with full data
  await supabase.from('lti_sessions').update({
    user_id: userId,
    lti_user_id: payload.sub,
    lti_context_id: ltiContext?.id,
    lti_context_title: ltiContext?.title,
    lti_roles: ltiRoles,
    launch_data: payload
  }).eq('id', session.id)

  // Handle classroom context
  if (ltiContext?.id && userId) {
    await handleClassroomContext(supabase, session.platform_id, ltiContext, userId, ltiRoles)
  }

  // Generate session token and redirect to app
  const appUrl = Deno.env.get('APP_URL') || 'https://strategic-intelligence.netlify.app'
  const sessionToken = crypto.randomUUID() // In production, use proper JWT
  
  // Redirect to app with context
  const redirectParams = new URLSearchParams({
    lti_session: session.id,
    context: ltiContext?.id || '',
    resource: resourceLink?.id || ''
  })

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': `${appUrl}?${redirectParams.toString()}`
    }
  })
}

// Handle classroom creation/joining based on LTI context
async function handleClassroomContext(
  supabase: any,
  platformId: string,
  context: { id: string; title: string; label?: string },
  userId: string,
  roles: string[]
): Promise<void> {
  // Check if classroom exists for this LTI context
  const { data: existingClassroom } = await supabase
    .from('classrooms')
    .select('*')
    .eq('institution_id', platformId)
    .contains('settings', { lti_context_id: context.id })
    .single()

  const isInstructor = roles.some(r => 
    r.includes('Instructor') || 
    r.includes('Administrator') || 
    r.includes('ContentDeveloper')
  )

  if (existingClassroom) {
    // Add user as member if not already
    await supabase.from('classroom_members').upsert({
      classroom_id: existingClassroom.id,
      user_id: userId,
      role: isInstructor ? 'instructor' : 'student'
    }, { onConflict: 'classroom_id,user_id' })
  } else if (isInstructor) {
    // Create classroom for instructor
    const { data: newClassroom } = await supabase.from('classrooms').insert({
      name: context.title || context.label || 'LTI Course',
      institution_id: platformId,
      owner_id: userId,
      settings: {
        lti_context_id: context.id,
        max_students: 100,
        allow_collaboration: true,
        share_results: false
      }
    }).select().single()

    if (newClassroom) {
      await supabase.from('classroom_members').insert({
        classroom_id: newClassroom.id,
        user_id: userId,
        role: 'instructor'
      })
    }
  }
}

// JWKS endpoint for tool public keys
async function handleJWKS(supabase: any): Promise<Response> {
  const { data: config } = await supabase
    .from('lti_tool_config')
    .select('public_key')
    .single()

  // Return JWKS format (simplified)
  const jwks = {
    keys: config?.public_key ? [
      {
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: 'strategic-intel-1',
        // In production, convert PEM to JWK format
        n: 'placeholder',
        e: 'AQAB'
      }
    ] : []
  }

  return new Response(
    JSON.stringify(jwks),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Platform registration endpoint (for admins)
async function handlePlatformRegistration(req: Request, supabase: any): Promise<Response> {
  const body = await req.json()
  
  const { name, platform_type, issuer, client_id, auth_endpoint, token_endpoint, jwks_endpoint, institution_name } = body

  if (!issuer || !client_id || !auth_endpoint) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabase.from('lti_platforms').insert({
    name: name || institution_name || 'LMS Platform',
    platform_type: platform_type || 'other',
    issuer,
    client_id,
    auth_endpoint,
    token_endpoint: token_endpoint || auth_endpoint.replace('/auth', '/token'),
    jwks_endpoint: jwks_endpoint || `${new URL(issuer).origin}/.well-known/jwks.json`,
    institution_name
  }).select().single()

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Registration failed', details: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ ok: true, platform: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Simple JWT decoder (no verification - use proper library in production)
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload
  } catch {
    return null
  }
}
