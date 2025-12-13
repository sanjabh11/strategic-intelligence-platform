// Enterprise SSO Authentication Handler
// Supports SAML 2.0 and OIDC for enterprise customers
// Part of Monetization Strategy Phase 2 - Enterprise Market

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface SSOProvider {
  id: string;
  organization_id: string;
  provider_type: 'saml' | 'oidc' | 'oauth2';
  name: string;
  saml_entity_id?: string;
  saml_sso_url?: string;
  saml_certificate?: string;
  oidc_issuer?: string;
  oidc_client_id?: string;
  oidc_client_secret?: string;
  oidc_authorization_url?: string;
  oidc_token_url?: string;
  oidc_userinfo_url?: string;
  attribute_mapping: Record<string, string>;
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

    switch (path) {
      case 'init':
        return handleSSOInit(req, supabase)
      case 'callback':
        return handleSSOCallback(req, supabase)
      case 'saml-acs':
        return handleSAMLCallback(req, supabase)
      case 'metadata':
        return handleSAMLMetadata()
      case 'providers':
        return handleListProviders(req, supabase)
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown endpoint' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error: unknown) {
    console.error('SSO error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'SSO processing failed', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Initialize SSO flow - determine provider and redirect
async function handleSSOInit(req: Request, supabase: any): Promise<Response> {
  const url = new URL(req.url)
  const email = url.searchParams.get('email')
  const orgSlug = url.searchParams.get('org')
  const providerId = url.searchParams.get('provider_id')

  let provider: SSOProvider | null = null

  // Find provider by ID, org slug, or email domain
  if (providerId) {
    const { data } = await supabase
      .from('sso_providers')
      .select('*, organizations(*)')
      .eq('id', providerId)
      .eq('is_active', true)
      .single()
    provider = data
  } else if (orgSlug) {
    const { data } = await supabase
      .from('organizations')
      .select('*, sso_providers(*)')
      .eq('slug', orgSlug)
      .eq('is_active', true)
      .single()
    if (data?.sso_providers?.[0]) {
      provider = data.sso_providers[0]
    }
  } else if (email) {
    const domain = email.split('@')[1]
    const { data } = await supabase
      .from('organizations')
      .select('*, sso_providers(*)')
      .eq('domain', domain)
      .eq('is_active', true)
      .single()
    if (data?.sso_providers?.[0]) {
      provider = data.sso_providers[0]
    }
  }

  if (!provider) {
    return new Response(
      JSON.stringify({ 
        error: 'No SSO provider found',
        sso_available: false,
        message: 'Please use email/password login or contact your administrator'
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID()
  const nonce = crypto.randomUUID()

  // Store session
  await supabase.from('sso_sessions').insert({
    provider_id: provider.id,
    state,
    nonce,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  })

  // Build redirect URL based on provider type
  let redirectUrl: string

  if (provider.provider_type === 'saml') {
    redirectUrl = buildSAMLRequest(provider, state)
  } else {
    // OIDC/OAuth2
    redirectUrl = buildOIDCRequest(provider, state, nonce)
  }

  return new Response(
    JSON.stringify({ 
      redirect_url: redirectUrl,
      provider_type: provider.provider_type,
      provider_name: provider.name
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Build SAML AuthnRequest URL
function buildSAMLRequest(provider: SSOProvider, state: string): string {
  const appUrl = Deno.env.get('APP_URL') || 'https://strategic-intelligence.netlify.app'
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  
  // Simplified SAML request - in production use proper SAML library
  const samlRequest = btoa(`
    <samlp:AuthnRequest 
      xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
      ID="_${crypto.randomUUID()}"
      Version="2.0"
      IssueInstant="${new Date().toISOString()}"
      AssertionConsumerServiceURL="${supabaseUrl}/functions/v1/sso-auth/saml-acs"
      Destination="${provider.saml_sso_url}">
      <saml:Issuer>${supabaseUrl}/functions/v1/sso-auth/metadata</saml:Issuer>
      <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
    </samlp:AuthnRequest>
  `.replace(/\s+/g, ' ').trim())

  const params = new URLSearchParams({
    SAMLRequest: samlRequest,
    RelayState: state
  })

  return `${provider.saml_sso_url}?${params.toString()}`
}

// Build OIDC authorization URL
function buildOIDCRequest(provider: SSOProvider, state: string, nonce: string): string {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  
  const params = new URLSearchParams({
    client_id: provider.oidc_client_id || '',
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: `${supabaseUrl}/functions/v1/sso-auth/callback`,
    state,
    nonce
  })

  const authUrl = provider.oidc_authorization_url || 
    `${provider.oidc_issuer}/authorize`

  return `${authUrl}?${params.toString()}`
}

// Handle OIDC callback
async function handleSSOCallback(req: Request, supabase: any): Promise<Response> {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return redirectToApp(`/login?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return redirectToApp('/login?error=missing_params')
  }

  // Validate state
  const { data: session, error: sessionError } = await supabase
    .from('sso_sessions')
    .select('*, sso_providers(*)')
    .eq('state', state)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (sessionError || !session) {
    return redirectToApp('/login?error=invalid_state')
  }

  const provider = session.sso_providers

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(provider.oidc_token_url || `${provider.oidc_issuer}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: provider.oidc_client_id,
        client_secret: provider.oidc_client_secret,
        code,
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/sso-auth/callback`
      })
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      throw new Error('Failed to get access token')
    }

    // Get user info
    const userInfoUrl = provider.oidc_userinfo_url || `${provider.oidc_issuer}/userinfo`
    const userInfoResponse = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    })

    const userInfo = await userInfoResponse.json()

    // Map attributes
    const mapping = provider.attribute_mapping || {}
    const email = userInfo[mapping.email || 'email']
    const name = userInfo[mapping.name || 'name']

    if (!email) {
      throw new Error('Email not found in user info')
    }

    // Find or create user
    const user = await findOrCreateSSOUser(supabase, {
      email,
      name,
      providerId: provider.id,
      organizationId: provider.organization_id,
      externalId: userInfo.sub
    })

    // Update session
    await supabase.from('sso_sessions').update({
      user_id: user.id
    }).eq('id', session.id)

    // Create Supabase session
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('APP_URL')}/dashboard`
      }
    })

    if (authError) {
      throw authError
    }

    // Redirect to app with magic link token
    const magicLinkUrl = new URL(authData.properties.action_link)
    return redirectToApp(magicLinkUrl.pathname + magicLinkUrl.search)

  } catch (err: unknown) {
    console.error('SSO callback error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return redirectToApp(`/login?error=${encodeURIComponent(message)}`)
  }
}

// Handle SAML Assertion Consumer Service
async function handleSAMLCallback(req: Request, supabase: any): Promise<Response> {
  const formData = await req.formData()
  const samlResponse = formData.get('SAMLResponse') as string
  const relayState = formData.get('RelayState') as string

  if (!samlResponse) {
    return redirectToApp('/login?error=missing_saml_response')
  }

  // Validate relay state (our state parameter)
  const { data: session, error: sessionError } = await supabase
    .from('sso_sessions')
    .select('*, sso_providers(*)')
    .eq('state', relayState)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (sessionError || !session) {
    return redirectToApp('/login?error=invalid_state')
  }

  try {
    // Decode SAML response (simplified - use proper SAML library in production)
    const decoded = atob(samlResponse)
    
    // Extract email from SAML response (simplified parsing)
    const emailMatch = decoded.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/i)
    const email = emailMatch?.[1]

    if (!email) {
      throw new Error('Email not found in SAML response')
    }

    // Extract name if available
    const nameMatch = decoded.match(/<saml:Attribute Name="[^"]*name[^"]*"[^>]*>.*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/is)
    const name = nameMatch?.[1]

    const provider = session.sso_providers

    // Find or create user
    const user = await findOrCreateSSOUser(supabase, {
      email,
      name,
      providerId: provider.id,
      organizationId: provider.organization_id,
      externalId: email
    })

    // Create Supabase session
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('APP_URL')}/dashboard`
      }
    })

    if (authError) {
      throw authError
    }

    const magicLinkUrl = new URL(authData.properties.action_link)
    return redirectToApp(magicLinkUrl.pathname + magicLinkUrl.search)

  } catch (err: unknown) {
    console.error('SAML callback error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return redirectToApp(`/login?error=${encodeURIComponent(message)}`)
  }
}

// Generate SAML metadata for SP
function handleSAMLMetadata(): Response {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  
  const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor 
  xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${supabaseUrl}/functions/v1/sso-auth/metadata">
  <md:SPSSODescriptor 
    AuthnRequestsSigned="false" 
    WantAssertionsSigned="true" 
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" 
      Location="${supabaseUrl}/functions/v1/sso-auth/saml-acs" 
      index="0" 
      isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`

  return new Response(metadata, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/xml'
    }
  })
}

// List available providers for an organization
async function handleListProviders(req: Request, supabase: any): Promise<Response> {
  const url = new URL(req.url)
  const orgSlug = url.searchParams.get('org')
  const domain = url.searchParams.get('domain')

  let query = supabase
    .from('sso_providers')
    .select('id, name, provider_type, organizations(name, slug)')
    .eq('is_active', true)

  if (orgSlug) {
    query = query.eq('organizations.slug', orgSlug)
  } else if (domain) {
    query = query.eq('organizations.domain', domain)
  }

  const { data, error } = await query

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch providers' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ providers: data || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Helper: Find or create SSO user
async function findOrCreateSSOUser(
  supabase: any,
  params: {
    email: string;
    name?: string;
    providerId: string;
    organizationId: string;
    externalId: string;
  }
): Promise<{ id: string }> {
  // Check if user exists
  const { data: existingUser } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('external_id', params.externalId)
    .eq('sso_provider_id', params.providerId)
    .single()

  if (existingUser) {
    // Update last login
    await supabase
      .from('organization_members')
      .update({ last_login_at: new Date().toISOString() })
      .eq('user_id', existingUser.user_id)
    
    return { id: existingUser.user_id }
  }

  // Check by email
  const { data: userByEmail } = await supabase.auth.admin.listUsers()
  const existing = userByEmail?.users?.find((u: any) => u.email === params.email)

  let userId: string

  if (existing) {
    userId = existing.id
  } else {
    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: params.email,
      email_confirm: true,
      user_metadata: {
        full_name: params.name,
        sso_provider: params.providerId
      }
    })

    if (createError) throw createError
    userId = newUser.user.id

    // Grant enterprise tier
    await supabase.from('user_subscriptions').upsert({
      user_id: userId,
      tier: 'enterprise',
      status: 'active',
      current_period_start: new Date().toISOString()
    }, { onConflict: 'user_id' })
  }

  // Add to organization
  await supabase.from('organization_members').upsert({
    organization_id: params.organizationId,
    user_id: userId,
    sso_provider_id: params.providerId,
    external_id: params.externalId,
    role: 'member'
  }, { onConflict: 'organization_id,user_id' })

  return { id: userId }
}

// Helper: Redirect to app
function redirectToApp(path: string): Response {
  const appUrl = Deno.env.get('APP_URL') || 'https://strategic-intelligence.netlify.app'
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': `${appUrl}${path}`
    }
  })
}
