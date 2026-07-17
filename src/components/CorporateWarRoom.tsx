import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Clock,
  Crown,
  GitBranch,
  Lock,
  MessageSquare,
  Play,
  Shield,
  Target,
  Users
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { WarRoomDecisionLogDraft, WarRoomRouteState, WarRoomScenarioVersionDraft } from '../lib/warRoom'

interface WarRoomSession {
  id: string
  name: string
  scenario: string
  status: 'lobby' | 'briefing' | 'active' | 'debrief' | 'completed'
  currentRound: number
  totalRounds: number
  teams: Array<{
    id: string
    name: string
    color: string
    resources?: Record<string, number>
    score?: number
  }>
  createdAt: string
  timerEndAt?: string | null
}

interface WarRoomDecisionLogEntry {
  id: string
  title: string
  summary: string
  source_surface: string
  linked_forecast_title: string | null
  created_at: string
}

interface WarRoomAssumption {
  id: string
  assumption: string
  rationale: string | null
  status: 'active' | 'monitor' | 'retired'
  created_at: string
}

interface WarRoomScenarioVersion {
  id: string
  title: string
  scenario_text: string
  source_surface: string
  studio_brief: string | null
  created_at: string
}

interface WarRoomComment {
  id: string
  body: string
  target_type: string
  created_at: string
}

interface ScenarioTemplate {
  id: string
  title: string
  description: string
  duration: string
  teamCount: number
  rounds: number
  category: 'market_entry' | 'merger' | 'disruption' | 'crisis' | 'pricing'
  difficulty: 'standard' | 'advanced' | 'expert'
  isEnterprise: boolean
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'market-entry-1',
    title: 'Tech Market Entry',
    description: 'Stress-test how an incumbent and a new entrant sequence moves around pricing, partnerships, and response timing.',
    duration: '45 min',
    teamCount: 3,
    rounds: 6,
    category: 'market_entry',
    difficulty: 'standard',
    isEnterprise: false
  },
  {
    id: 'merger-defense-1',
    title: 'Hostile Acquisition Defense',
    description: 'Capture board actions, white-knight options, shareholder pressure, and regulatory escalations as a live team scenario.',
    duration: '60 min',
    teamCount: 4,
    rounds: 8,
    category: 'merger',
    difficulty: 'advanced',
    isEnterprise: true
  },
  {
    id: 'disruption-1',
    title: 'Digital Disruption Response',
    description: 'Track sequential moves when an incumbent faces an aggressive challenger and must decide whether to defend, partner, or pivot.',
    duration: '30 min',
    teamCount: 2,
    rounds: 4,
    category: 'disruption',
    difficulty: 'standard',
    isEnterprise: false
  },
  {
    id: 'pricing-1',
    title: 'Airline Pricing War',
    description: 'Model retaliatory pricing, capacity discipline, and alliance behavior under incomplete information.',
    duration: '45 min',
    teamCount: 3,
    rounds: 5,
    category: 'pricing',
    difficulty: 'expert',
    isEnterprise: true
  }
]

const TEAM_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

interface CorporateWarRoomProps {
  userId?: string
  isEnterprise?: boolean
}

function mapSessionRow(row: any): WarRoomSession {
  return {
    id: row.id,
    name: row.name,
    scenario: row.scenario,
    status: row.status,
    currentRound: row.current_round ?? 0,
    totalRounds: row.total_rounds ?? 0,
    teams: Array.isArray(row.teams) ? row.teams : [],
    createdAt: row.created_at,
    timerEndAt: row.timer_end_at
  }
}

const CorporateWarRoom: React.FC<CorporateWarRoomProps> = ({ userId, isEnterprise = false }) => {
  const location = useLocation()
  const [view, setView] = useState<'lobby' | 'session'>('lobby')
  const [sessions, setSessions] = useState<WarRoomSession[]>([])
  const [activeSession, setActiveSession] = useState<WarRoomSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null)

  const [decisionLogs, setDecisionLogs] = useState<WarRoomDecisionLogEntry[]>([])
  const [assumptions, setAssumptions] = useState<WarRoomAssumption[]>([])
  const [scenarioVersions, setScenarioVersions] = useState<WarRoomScenarioVersion[]>([])
  const [comments, setComments] = useState<WarRoomComment[]>([])

  const [manualDecisionLog, setManualDecisionLog] = useState({ title: '', summary: '' })
  const [manualAssumption, setManualAssumption] = useState({ assumption: '', rationale: '' })
  const [manualComment, setManualComment] = useState('')
  const [pendingDecisionDraft, setPendingDecisionDraft] = useState<WarRoomDecisionLogDraft | null>(null)
  const [pendingScenarioDraft, setPendingScenarioDraft] = useState<WarRoomScenarioVersionDraft | null>(null)

  useEffect(() => {
    const state = (location.state as WarRoomRouteState | null) || null
    if (state?.decisionLogDraft) {
      setPendingDecisionDraft(state.decisionLogDraft)
      setManualDecisionLog({
        title: state.decisionLogDraft.title ?? '',
        summary: state.decisionLogDraft.summary ?? ''
      })
    }
    if (state?.scenarioVersionDraft) {
      setPendingScenarioDraft(state.scenarioVersionDraft)
    }
  }, [location.state])

  const fetchSessions = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('warroom_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setSessions((data || []).map(mapSessionRow))
    } catch (err) {
      console.error('Error fetching war room sessions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load war room sessions')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchSessionWorkspace = useCallback(async (sessionId: string) => {
    try {
      const [{ data: logs, error: logsError }, { data: assumptionRows, error: assumptionsError }, { data: versionRows, error: versionError }, { data: commentRows, error: commentsError }] = await Promise.all([
        supabase.from('warroom_decision_logs').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('warroom_assumptions').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('warroom_scenario_versions').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('warroom_comments').select('*').eq('session_id', sessionId).order('created_at', { ascending: false })
      ])

      if (logsError) throw logsError
      if (assumptionsError) throw assumptionsError
      if (versionError) throw versionError
      if (commentsError) throw commentsError

      setDecisionLogs((logs || []) as WarRoomDecisionLogEntry[])
      setAssumptions((assumptionRows || []) as WarRoomAssumption[])
      setScenarioVersions((versionRows || []) as WarRoomScenarioVersion[])
      setComments((commentRows || []) as WarRoomComment[])
    } catch (err) {
      console.error('Error fetching war room workspace:', err)
      setError(err instanceof Error ? err.message : 'Failed to load session memory')
    }
  }, [])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    if (!activeSession?.id) return
    void fetchSessionWorkspace(activeSession.id)
  }, [activeSession?.id, fetchSessionWorkspace])

  useEffect(() => {
    if (!activeSession?.timerEndAt) {
      setTimerRemaining(null)
      return
    }

    const interval = window.setInterval(() => {
      const remaining = Math.max(0, new Date(activeSession.timerEndAt || '').getTime() - Date.now())
      setTimerRemaining(Math.floor(remaining / 1000))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [activeSession?.timerEndAt])

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return `${minutes}:${remainder.toString().padStart(2, '0')}`
  }

  const createSession = useCallback(async (scenario: ScenarioTemplate) => {
    if (!userId) return
    if (scenario.isEnterprise && !isEnterprise) return

    setSaving(true)
    setError(null)
    try {
      const shellTeams = Array.from({ length: scenario.teamCount }, (_, index) => ({
        id: `team-${index + 1}`,
        name: `Team ${index + 1}`,
        color: TEAM_COLORS[index % TEAM_COLORS.length],
        resources: {
          capital: 100,
          marketShare: Math.floor(100 / scenario.teamCount),
          reputation: 80,
          rdCapacity: 60
        },
        score: 0
      }))

      const { data, error: createError } = await supabase
        .from('warroom_sessions')
        .insert({
          name: `${scenario.title} - ${new Date().toLocaleDateString()}`,
          scenario: scenario.title,
          scenario_type: scenario.category === 'merger' ? 'ma_defense' : scenario.category,
          status: 'lobby',
          current_round: 0,
          total_rounds: scenario.rounds,
          created_by: userId,
          teams: shellTeams,
          is_enterprise_only: scenario.isEnterprise,
          session_data: {
            description: scenario.description,
            difficulty: scenario.difficulty,
            duration: scenario.duration
          }
        })
        .select('*')
        .single()

      if (createError) throw createError

      const session = mapSessionRow(data)
      setSessions((prev) => [session, ...prev])
      setActiveSession(session)
      setView('session')
    } catch (err) {
      console.error('Error creating war room session:', err)
      setError(err instanceof Error ? err.message : 'Failed to create war room session')
    } finally {
      setSaving(false)
    }
  }, [isEnterprise, userId])

  const updateSession = useCallback(async (patch: Partial<WarRoomSession>) => {
    if (!activeSession?.id) return
    const dbPatch: Record<string, unknown> = {}

    if (patch.status) dbPatch.status = patch.status
    if (typeof patch.currentRound === 'number') dbPatch.current_round = patch.currentRound
    if (typeof patch.totalRounds === 'number') dbPatch.total_rounds = patch.totalRounds
    if (patch.timerEndAt !== undefined) dbPatch.timer_end_at = patch.timerEndAt

    const { data, error: updateError } = await supabase
      .from('warroom_sessions')
      .update(dbPatch)
      .eq('id', activeSession.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    const next = mapSessionRow(data)
    setActiveSession(next)
    setSessions((prev) => prev.map((entry) => entry.id === next.id ? next : entry))
  }, [activeSession?.id])

  const saveDecisionLog = useCallback(async () => {
    if (!activeSession?.id || !userId) return
    const title = manualDecisionLog.title.trim()
    const summary = manualDecisionLog.summary.trim()
    if (!title || !summary) return

    setSaving(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('warroom_decision_logs')
        .insert({
          session_id: activeSession.id,
          created_by: userId,
          title,
          summary,
          source_surface: pendingDecisionDraft?.sourceSurface || 'strategist_brief',
          strategist_brief_snapshot: pendingDecisionDraft?.strategistBrief || {},
          linked_forecast_id: pendingDecisionDraft?.linkedForecastId || null,
          linked_forecast_title: pendingDecisionDraft?.linkedForecastTitle || null
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      setDecisionLogs((prev) => [data as WarRoomDecisionLogEntry, ...prev])
      setPendingDecisionDraft(null)
      setManualDecisionLog({ title: '', summary: '' })
    } catch (err) {
      console.error('Error saving decision log:', err)
      setError(err instanceof Error ? err.message : 'Failed to save decision log')
    } finally {
      setSaving(false)
    }
  }, [activeSession?.id, manualDecisionLog, pendingDecisionDraft, userId])

  const saveAssumption = useCallback(async () => {
    if (!activeSession?.id || !userId) return
    if (!manualAssumption.assumption.trim()) return

    setSaving(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('warroom_assumptions')
        .insert({
          session_id: activeSession.id,
          created_by: userId,
          assumption: manualAssumption.assumption.trim(),
          rationale: manualAssumption.rationale.trim() || null,
          status: 'active'
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      setAssumptions((prev) => [data as WarRoomAssumption, ...prev])
      setManualAssumption({ assumption: '', rationale: '' })
    } catch (err) {
      console.error('Error saving assumption:', err)
      setError(err instanceof Error ? err.message : 'Failed to save assumption')
    } finally {
      setSaving(false)
    }
  }, [activeSession?.id, manualAssumption, userId])

  const saveScenarioVersion = useCallback(async () => {
    if (!activeSession?.id || !userId || !pendingScenarioDraft) return

    setSaving(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('warroom_scenario_versions')
        .insert({
          session_id: activeSession.id,
          created_by: userId,
          title: pendingScenarioDraft.title,
          scenario_text: pendingScenarioDraft.scenarioText,
          source_surface: pendingScenarioDraft.sourceSurface,
          template_id: pendingScenarioDraft.templateId || null,
          studio_brief: pendingScenarioDraft.studioBrief || null,
          report: pendingScenarioDraft.report || {}
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      setScenarioVersions((prev) => [data as WarRoomScenarioVersion, ...prev])
      setPendingScenarioDraft(null)
    } catch (err) {
      console.error('Error saving scenario version:', err)
      setError(err instanceof Error ? err.message : 'Failed to save scenario version')
    } finally {
      setSaving(false)
    }
  }, [activeSession?.id, pendingScenarioDraft, userId])

  const saveComment = useCallback(async () => {
    if (!activeSession?.id || !userId || !manualComment.trim()) return

    setSaving(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('warroom_comments')
        .insert({
          session_id: activeSession.id,
          created_by: userId,
          target_type: 'session',
          body: manualComment.trim()
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      setComments((prev) => [data as WarRoomComment, ...prev])
      setManualComment('')
    } catch (err) {
      console.error('Error saving comment:', err)
      setError(err instanceof Error ? err.message : 'Failed to save comment')
    } finally {
      setSaving(false)
    }
  }, [activeSession?.id, manualComment, userId])

  const sessionMetrics = useMemo(() => ({
    decisionLogs: decisionLogs.length,
    assumptions: assumptions.length,
    scenarioVersions: scenarioVersions.length,
    comments: comments.length
  }), [assumptions.length, comments.length, decisionLogs.length, scenarioVersions.length])

  if (!userId) {
    return null
  }

  const renderPendingArtifacts = () => {
    if (!pendingDecisionDraft && !pendingScenarioDraft) return null

    return (
      <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-fuchsia-200">Pending artifact ready for the war room</div>
            <div className="mt-1 text-xs text-slate-300">
              {pendingDecisionDraft && `Decision log: ${pendingDecisionDraft.title}`}
              {pendingDecisionDraft && pendingScenarioDraft ? ' · ' : ''}
              {pendingScenarioDraft && `Scenario version: ${pendingScenarioDraft.title}`}
            </div>
          </div>
          <div className="text-xs text-fuchsia-100/80">
            Create or open a session, then save the artifact into shared memory.
          </div>
        </div>
      </div>
    )
  }

  const renderLobby = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-white/20 p-3">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Corporate War Room</h2>
              <p className="text-indigo-200">Shared team memory for strategist briefs, linked forecasts, assumptions, and scenario versions.</p>
            </div>
          </div>
          {isEnterprise ? (
            <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-yellow-200 flex items-center gap-1">
              <Crown className="h-4 w-4" />
              Enterprise
            </span>
          ) : (
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm text-indigo-100">Collaboration-enabled</span>
          )}
        </div>
      </div>

      {renderPendingArtifacts()}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {!isEnterprise && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-amber-300" />
            <div>
              <div className="font-medium text-amber-200">Advanced scenarios stay Enterprise-only</div>
              <div className="mt-1 text-sm text-slate-300">
                Standard collaboration is live, but the most complex war-game templates remain restricted to Enterprise sessions.
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-200">Create a session</h3>
          {loading && <span className="text-sm text-slate-400">Loading sessions…</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENARIO_TEMPLATES.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => void createSession(scenario)}
              disabled={saving || (scenario.isEnterprise && !isEnterprise)}
              className={`rounded-xl border p-5 text-left transition-all ${
                scenario.isEnterprise && !isEnterprise
                  ? 'border-slate-700 bg-slate-800 opacity-60'
                  : 'border-slate-700 bg-slate-800 hover:border-indigo-500'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-white">
                    <Target className="h-5 w-5 text-indigo-300" />
                    <span className="font-medium">{scenario.title}</span>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{scenario.description}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${
                  scenario.isEnterprise
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {scenario.isEnterprise ? 'Enterprise' : scenario.difficulty}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {scenario.duration}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {scenario.teamCount} teams</span>
                <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> {scenario.rounds} rounds</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-semibold text-slate-200">Existing sessions</h3>
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-sm text-slate-400">
              No war-room sessions yet. Start one from a template or bring a strategist brief into the room.
            </div>
          ) : sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => {
                setActiveSession(session)
                setView('session')
              }}
              className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-4 text-left transition-colors hover:border-indigo-500"
            >
              <div>
                <div className="font-medium text-white">{session.name}</div>
                <div className="mt-1 text-sm text-slate-400">{session.scenario}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-full bg-slate-700 px-3 py-1 text-slate-300">{session.status}</span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderSession = () => {
    if (!activeSession) return null

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                onClick={() => setView('lobby')}
                className="mb-2 text-sm text-slate-400 transition-colors hover:text-white"
              >
                ← Back to lobby
              </button>
              <h2 className="text-2xl font-bold text-white">{activeSession.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{activeSession.scenario}</p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-slate-500">Round status</div>
              <div className="mt-1 text-lg font-semibold text-cyan-300">
                {activeSession.status} · {activeSession.currentRound}/{activeSession.totalRounds}
              </div>
              {timerRemaining !== null && (
                <div className="mt-2 text-sm text-amber-300">Timer {formatTimer(timerRemaining)}</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Decision logs</div>
            <div className="mt-2 text-3xl font-semibold text-white">{sessionMetrics.decisionLogs}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Assumptions</div>
            <div className="mt-2 text-3xl font-semibold text-white">{sessionMetrics.assumptions}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Scenario versions</div>
            <div className="mt-2 text-3xl font-semibold text-white">{sessionMetrics.scenarioVersions}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Comments</div>
            <div className="mt-2 text-3xl font-semibold text-white">{sessionMetrics.comments}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {activeSession.status === 'lobby' && (
            <button
              onClick={() => void updateSession({ status: 'briefing' })}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Start briefing
            </button>
          )}
          {activeSession.status === 'briefing' && (
            <button
              onClick={() => void updateSession({
                status: 'active',
                currentRound: 1,
                timerEndAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
              })}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400"
            >
              Begin war game
            </button>
          )}
          {activeSession.status === 'active' && (
            <button
              onClick={() => void updateSession({
                currentRound: activeSession.currentRound + 1 > activeSession.totalRounds ? activeSession.totalRounds : activeSession.currentRound + 1,
                status: activeSession.currentRound + 1 > activeSession.totalRounds ? 'debrief' : 'active',
                timerEndAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
              })}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
            >
              Advance round
            </button>
          )}
        </div>

        {renderPendingArtifacts()}

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex items-center gap-2 text-white">
                <ClipboardList className="h-5 w-5 text-fuchsia-300" />
                <h3 className="font-semibold">Decision logs</h3>
              </div>
              <div className="mt-4 space-y-3">
                <input
                  value={manualDecisionLog.title}
                  onChange={(event) => setManualDecisionLog((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Decision title"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <textarea
                  value={manualDecisionLog.summary}
                  onChange={(event) => setManualDecisionLog((prev) => ({ ...prev, summary: event.target.value }))}
                  placeholder="Concise decision summary"
                  rows={4}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => void saveDecisionLog()}
                  disabled={saving}
                  className="rounded-lg bg-fuchsia-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-fuchsia-400 disabled:bg-slate-700"
                >
                  Save decision log
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {decisionLogs.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-100">{entry.title}</div>
                        <div className="mt-2 text-sm text-slate-300">{entry.summary}</div>
                      </div>
                      <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-300">{entry.source_surface}</span>
                    </div>
                    {entry.linked_forecast_title && (
                      <div className="mt-2 text-xs text-cyan-200">Linked forecast: {entry.linked_forecast_title}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5 text-amber-300" />
                <h3 className="font-semibold">Assumptions</h3>
              </div>
              <div className="mt-4 space-y-3">
                <input
                  value={manualAssumption.assumption}
                  onChange={(event) => setManualAssumption((prev) => ({ ...prev, assumption: event.target.value }))}
                  placeholder="Assumption to track"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <textarea
                  value={manualAssumption.rationale}
                  onChange={(event) => setManualAssumption((prev) => ({ ...prev, rationale: event.target.value }))}
                  placeholder="Why this assumption matters"
                  rows={3}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => void saveAssumption()}
                  disabled={saving}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Add assumption
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {assumptions.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-100">{entry.assumption}</div>
                      <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-300">{entry.status}</span>
                    </div>
                    {entry.rationale && <div className="mt-2 text-sm text-slate-300">{entry.rationale}</div>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex items-center gap-2 text-white">
                <GitBranch className="h-5 w-5 text-cyan-300" />
                <h3 className="font-semibold">Scenario versions</h3>
              </div>
              {pendingScenarioDraft ? (
                <div className="mt-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
                  <div className="font-medium text-cyan-100">{pendingScenarioDraft.title}</div>
                  <div className="mt-2 text-sm text-slate-200">{pendingScenarioDraft.scenarioText}</div>
                  {pendingScenarioDraft.studioBrief && (
                    <div className="mt-3 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-xs leading-6 text-slate-300">
                      {pendingScenarioDraft.studioBrief}
                    </div>
                  )}
                  <button
                    onClick={() => void saveScenarioVersion()}
                    disabled={saving}
                    className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:bg-slate-700"
                  >
                    Save scenario version
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
                  Promote a sequential-game or console scenario into the war room to preserve the version history.
                </div>
              )}
              <div className="mt-5 space-y-3">
                {scenarioVersions.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-100">{entry.title}</div>
                      <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-300">{entry.source_surface}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-300">{entry.scenario_text}</div>
                    {entry.studio_brief && (
                      <div className="mt-2 text-xs text-cyan-200">{entry.studio_brief}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex items-center gap-2 text-white">
                <MessageSquare className="h-5 w-5 text-emerald-300" />
                <h3 className="font-semibold">Comments</h3>
              </div>
              <div className="mt-4 space-y-3">
                <textarea
                  value={manualComment}
                  onChange={(event) => setManualComment(event.target.value)}
                  placeholder="Add an update, dissent, or instruction for the team"
                  rows={3}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => void saveComment()}
                  disabled={saving}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:bg-slate-700"
                >
                  Add comment
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {comments.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                    <div className="text-sm text-slate-200">{entry.body}</div>
                    <div className="mt-2 text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex items-center gap-2 text-white">
                <BookOpen className="h-5 w-5 text-indigo-300" />
                <h3 className="font-semibold">Team shell</h3>
              </div>
              <div className="mt-4 space-y-3">
                {activeSession.teams.map((team) => (
                  <div key={team.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }}></span>
                        <span className="font-medium text-slate-100">{team.name}</span>
                      </div>
                      <span className="text-xs text-slate-400">{team.score || 0} pts</span>
                    </div>
                    {team.resources && (
                      <div className="mt-2 text-xs text-slate-400">
                        Capital {team.resources.capital ?? 0} · Market share {team.resources.marketShare ?? 0}% · Reputation {team.resources.reputation ?? 0}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {view === 'lobby' ? renderLobby() : renderSession()}
    </div>
  )
}

export default CorporateWarRoom
