import crypto from 'node:crypto'
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

const env = { ...loadEnvFile(path.resolve(process.cwd(), '.env')), ...process.env }
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.')
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  })
}

async function ensureUser(email, password) {
  const response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true
    })
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`admin user creation failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  return payload
}

async function signIn(email, password) {
  const response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.access_token) {
    throw new Error(`password sign-in failed with HTTP ${response.status}: ${JSON.stringify(payload)}`)
  }

  return payload.access_token
}

function getCreatedUserId(payload) {
  return payload?.user?.id || payload?.id || null
}

const instructorEmail = `codex-classroom-instructor+${Date.now()}@stanford.edu`
const instructorPassword = `ClassroomProof!${crypto.randomUUID().slice(0, 8)}`
const studentEmail = `codex-classroom-student+${Date.now()}@stanford.edu`
const studentPassword = `ClassroomProof!${crypto.randomUUID().slice(0, 8)}`

const instructor = await ensureUser(instructorEmail, instructorPassword)
const student = await ensureUser(studentEmail, studentPassword)
const instructorId = getCreatedUserId(instructor)
const studentId = getCreatedUserId(student)

if (!instructorId || !studentId) {
  throw new Error(`admin user creation returned an unexpected payload: ${JSON.stringify({ instructor, student })}`)
}

const instructorToken = await signIn(instructorEmail, instructorPassword)
const studentToken = await signIn(studentEmail, studentPassword)

const createResponse = await fetchWithTimeout(`${supabaseUrl}/rest/v1/classrooms`, {
  method: 'POST',
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${instructorToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  },
  body: JSON.stringify({
    name: 'Hosted smoke classroom',
    description: 'Hosted smoke test for classroom creation and join flow',
    owner_id: instructorId
  })
})

const createdClassrooms = await createResponse.json().catch(() => null)
if (!createResponse.ok || !Array.isArray(createdClassrooms) || !createdClassrooms[0]?.id) {
  throw new Error(`classroom creation failed with HTTP ${createResponse.status}: ${JSON.stringify(createdClassrooms)}`)
}

const classroom = createdClassrooms[0]

const memberInsertResponse = await fetchWithTimeout(`${supabaseUrl}/rest/v1/classroom_members`, {
  method: 'POST',
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${instructorToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    classroom_id: classroom.id,
    user_id: instructorId,
    role: 'instructor'
  })
})

if (!memberInsertResponse.ok) {
  const payload = await memberInsertResponse.json().catch(() => null)
  throw new Error(`failed to add instructor membership: ${memberInsertResponse.status} ${JSON.stringify(payload)}`)
}

const assignmentCreateResponse = await fetchWithTimeout(`${supabaseUrl}/rest/v1/classroom_assignments`, {
  method: 'POST',
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${instructorToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  },
  body: JSON.stringify({
    classroom_id: classroom.id,
    title: 'Hosted smoke assignment',
    description: 'Validate template routing, submissions, and grading in the hosted classroom flow.',
    template_id: 'vendor-renewal',
    custom_scenario: {
      title: 'Vendor renewal under budget pressure',
      scenarioText: 'A vendor opened a renewal with a large price increase while the buyer has one weaker outside option.'
    },
    points_possible: 100,
    is_published: true
  })
})

const createdAssignments = await assignmentCreateResponse.json().catch(() => null)
if (!assignmentCreateResponse.ok || !Array.isArray(createdAssignments) || !createdAssignments[0]?.id) {
  throw new Error(`assignment creation failed with HTTP ${assignmentCreateResponse.status}: ${JSON.stringify(createdAssignments)}`)
}

const assignment = createdAssignments[0]

const joinResponse = await fetchWithTimeout(`${supabaseUrl}/rest/v1/rpc/join_classroom_by_code`, {
  method: 'POST',
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${studentToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    p_join_code: classroom.join_code,
    p_user_id: studentId
  })
})

const joinPayload = await joinResponse.json().catch(() => null)
if (!joinResponse.ok || !joinPayload?.success) {
  throw new Error(`join_classroom_by_code failed with HTTP ${joinResponse.status}: ${JSON.stringify(joinPayload)}`)
}

const submissionCreateResponse = await fetchWithTimeout(`${supabaseUrl}/rest/v1/assignment_submissions`, {
  method: 'POST',
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${studentToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  },
  body: JSON.stringify({
    assignment_id: assignment.id,
    student_id: studentId,
    explanation: 'Counter with a smaller increase in exchange for term length and better renewal flexibility.'
  })
})

const createdSubmissions = await submissionCreateResponse.json().catch(() => null)
if (!submissionCreateResponse.ok || !Array.isArray(createdSubmissions) || !createdSubmissions[0]?.id) {
  throw new Error(`assignment submission failed with HTTP ${submissionCreateResponse.status}: ${JSON.stringify(createdSubmissions)}`)
}

const submission = createdSubmissions[0]

const gradingResponse = await fetchWithTimeout(`${supabaseUrl}/rest/v1/assignment_submissions?id=eq.${submission.id}`, {
  method: 'PATCH',
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${instructorToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  },
  body: JSON.stringify({
    score: 92,
    feedback: 'Good leverage framing. Push the outside option harder and make the term trade explicit.',
    graded_by: instructorId,
    graded_at: new Date().toISOString()
  })
})

const gradedSubmissions = await gradingResponse.json().catch(() => null)
if (!gradingResponse.ok || !Array.isArray(gradedSubmissions) || gradedSubmissions[0]?.score !== 92) {
  throw new Error(`grading failed with HTTP ${gradingResponse.status}: ${JSON.stringify(gradedSubmissions)}`)
}

const membershipResponse = await fetchWithTimeout(`${supabaseUrl}/rest/v1/classroom_members?classroom_id=eq.${classroom.id}&select=id,user_id,role`, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  }
})

const membershipPayload = await membershipResponse.json().catch(() => null)
if (!membershipResponse.ok || !Array.isArray(membershipPayload)) {
  throw new Error(`classroom membership verification failed with HTTP ${membershipResponse.status}: ${JSON.stringify(membershipPayload)}`)
}

const submissionVerificationResponse = await fetchWithTimeout(`${supabaseUrl}/rest/v1/assignment_submissions?assignment_id=eq.${assignment.id}&select=id,student_id,score,feedback`, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  }
})

const submissionVerificationPayload = await submissionVerificationResponse.json().catch(() => null)
if (!submissionVerificationResponse.ok || !Array.isArray(submissionVerificationPayload) || submissionVerificationPayload.length !== 1) {
  throw new Error(`submission verification failed with HTTP ${submissionVerificationResponse.status}: ${JSON.stringify(submissionVerificationPayload)}`)
}

console.log(JSON.stringify({
  classroom_id: classroom.id,
  assignment_id: assignment.id,
  submission_id: submission.id,
  join_code: classroom.join_code,
  join_success: joinPayload.success,
  member_count: membershipPayload.length,
  roles: membershipPayload.map((entry) => entry.role),
  submission_score: submissionVerificationPayload[0].score,
  feedback_present: Boolean(submissionVerificationPayload[0].feedback)
}, null, 2))
