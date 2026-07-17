const textEncoder = new TextEncoder()

function toUtf8Bytes(input: string) {
  return textEncoder.encode(input)
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function hmacSha256(message: string, secretBytes: Uint8Array) {
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, toUtf8Bytes(message))
  return new Uint8Array(signature)
}

function isBase64Candidate(input: string) {
  return /^[A-Za-z0-9+/=_-]+$/.test(input)
}

function decodeBase64(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function buildWhopSecretCandidates(secret: string) {
  const rawSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const candidates = [toUtf8Bytes(secret), toUtf8Bytes(rawSecret)]

  if (isBase64Candidate(rawSecret)) {
    try {
      candidates.push(decodeBase64(rawSecret))
    } catch {
      // Ignore invalid base64 candidate.
    }
  }

  const deduped = new Map<string, Uint8Array>()
  candidates.forEach((candidate) => {
    deduped.set(bytesToBase64(candidate), candidate)
  })
  return Array.from(deduped.values())
}

export function isLocalWebhookDevelopment() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  return (
    Deno.env.get('LOCAL_DEV') === 'true' ||
    Deno.env.get('ENV') === 'local' ||
    Deno.env.get('NODE_ENV') === 'development' ||
    supabaseUrl.includes('127.0.0.1') ||
    supabaseUrl.includes('localhost')
  )
}

export async function verifyStripeSignature(payload: string, signatureHeader: string | null, secret: string, toleranceSeconds = 300) {
  if (!signatureHeader) {
    return { ok: false, error: 'missing_signature' as const }
  }

  const pairs = signatureHeader.split(',').map((entry) => entry.trim())
  const timestamp = pairs.find((entry) => entry.startsWith('t='))?.slice(2)
  const signatures = pairs
    .filter((entry) => entry.startsWith('v1='))
    .map((entry) => entry.slice(3))
    .filter(Boolean)

  if (!timestamp || signatures.length === 0) {
    return { ok: false, error: 'invalid_signature_header' as const }
  }

  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber)) {
    return { ok: false, error: 'invalid_timestamp' as const }
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber)
  if (ageSeconds > toleranceSeconds) {
    return { ok: false, error: 'signature_too_old' as const }
  }

  const signedPayload = `${timestamp}.${payload}`
  const expected = bytesToHex(await hmacSha256(signedPayload, toUtf8Bytes(secret)))
  const matches = signatures.some((signature) => timingSafeEqual(signature, expected))

  return matches ? { ok: true } : { ok: false, error: 'signature_mismatch' as const }
}

export async function verifyWhopSignature(payload: string, headers: Headers, secret: string, toleranceSeconds = 300) {
  const webhookId = headers.get('webhook-id')
  const webhookTimestamp = headers.get('webhook-timestamp')
  const signatureHeader = headers.get('webhook-signature') || headers.get('whop-signature')

  if (!webhookId || !webhookTimestamp || !signatureHeader) {
    return { ok: false, error: 'missing_standard_headers' as const }
  }

  const timestampNumber = Number(webhookTimestamp)
  if (!Number.isFinite(timestampNumber)) {
    return { ok: false, error: 'invalid_timestamp' as const }
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber)
  if (ageSeconds > toleranceSeconds) {
    return { ok: false, error: 'signature_too_old' as const }
  }

  const expectedMessage = `${webhookId}.${webhookTimestamp}.${payload}`
  const signatures = signatureHeader
    .split(' ')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [version, signature] = entry.split(',', 2)
      return { version, signature }
    })
    .filter(({ version, signature }) => version === 'v1' && Boolean(signature))

  if (signatures.length === 0) {
    return { ok: false, error: 'invalid_signature_header' as const }
  }

  const secretCandidates = buildWhopSecretCandidates(secret)
  for (const candidate of secretCandidates) {
    const expected = bytesToBase64(await hmacSha256(expectedMessage, candidate))
    if (signatures.some(({ signature }) => timingSafeEqual(signature, expected))) {
      return { ok: true }
    }
  }

  return { ok: false, error: 'signature_mismatch' as const }
}
