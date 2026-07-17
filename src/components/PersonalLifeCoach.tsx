import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Brain, Shield, Sparkles, Target, TrendingUp, Users } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { API_BASE, getUserAuthHeaders, supabase } from '../lib/supabase'
import { normalizeStrategistResponse, type StrategistResponse } from '../lib/strategistContract'

export function PersonalLifeCoach() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<StrategistResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasAuthenticatedSession, setHasAuthenticatedSession] = useState(false)

  useEffect(() => {
    let active = true

    if (!supabase) {
      setHasAuthenticatedSession(false)
      return () => {
        active = false
      }
    }

    async function syncAuthState() {
      const { data } = await supabase.auth.getSession()
      if (active) {
        setHasAuthenticatedSession(Boolean(data.session?.access_token))
      }
    }

    void syncAuthState()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setHasAuthenticatedSession(Boolean(session?.access_token))
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const confidencePercent = useMemo(
    () => Math.round((result?.strategist.confidence || 0) * 100),
    [result]
  )

  const analyzeDecision = async () => {
    if (!hasAuthenticatedSession) {
      setResult(null)
      setError('Sign in to generate strategist guidance and save the result to your workspace.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const headers = await getUserAuthHeaders()
      const response = await fetch(`${API_BASE}/personal-life-coach`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, description, category })
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(typeof data?.message === 'string' ? data.message : `HTTP error! status: ${response.status}`)
      }

      setResult(normalizeStrategistResponse(data))
    } catch (requestError) {
      console.error('Analysis failed:', requestError)
      setResult(null)
      setError(requestError instanceof Error ? requestError.message : 'Failed to analyze decision. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const strategistTrustTone = result?.strategist.provenance_status === 'evidence_backed'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
    : result?.strategist.provenance_status === 'llm_unverified'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-100'

  const strategistTrustLabel = result?.strategist.provenance_status === 'evidence_backed'
    ? 'Evidence-backed'
    : result?.strategist.provenance_status === 'llm_unverified'
      ? 'LLM-generated, limited evidence'
      : 'Heuristic fallback'

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-white">Game Theory Strategist</h1>
        <p className="text-slate-400">Structured decision support with deconstruction, incentives, strategy space, equilibria, and adaptive counter-moves.</p>
      </div>

      <Card className="mb-6 border-slate-700 bg-slate-800 p-6 text-slate-100">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Decision Title</label>
            <Input
              placeholder="e.g., Should I accept this job offer?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-slate-600 bg-slate-900 text-slate-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Category</label>
            <select
              className="w-full rounded border border-slate-600 bg-slate-900 p-2 text-slate-100"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="career">Career</option>
              <option value="business">Business</option>
              <option value="financial">Financial</option>
              <option value="health">Health</option>
              <option value="relationship">Relationship</option>
              <option value="purchase">Major Purchase</option>
              <option value="conflict">Conflict Resolution</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Describe Your Situation</label>
            <Textarea
              placeholder="Include who is involved, what each side wants, your options, and what could change the outcome."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="border-slate-600 bg-slate-900 text-slate-100"
            />
          </div>

          <Button
            onClick={analyzeDecision}
            disabled={loading || !title || !description || !hasAuthenticatedSession}
            className="w-full"
          >
            {loading ? 'Analyzing...' : hasAuthenticatedSession ? 'Get Strategic Advice' : 'Sign in to use strategist'}
          </Button>
          {!hasAuthenticatedSession && (
            <p className="text-xs text-slate-400">
              This surface requires an authenticated account because strategist outputs are stored as user-scoped decision records.
            </p>
          )}
        </div>
      </Card>

      {error && (
        <Card className="border-red-500/30 bg-red-500/10 p-6 text-red-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 text-red-300" />
            <div>
              <h3 className="font-semibold">Strategist request failed</h3>
              <p className="mt-1 text-sm text-red-100/90">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <Card className={`${strategistTrustTone} p-4`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-white">Trust status</h3>
                <p className="mt-1 text-sm">
                  {strategistTrustLabel}. {result.strategist.claim_to_evidence.length > 0
                    ? 'Claim-level evidence is attached below.'
                    : 'Treat this as review-visible until stronger evidence is attached.'}
                </p>
              </div>
              <span className="rounded-full border border-current/30 px-3 py-1 text-xs font-medium">
                {strategistTrustLabel}
              </span>
            </div>
          </Card>

          <Card className="border-cyan-500/30 bg-slate-900/80 p-6 text-slate-100">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 text-cyan-300" />
              <div className="flex-1">
                <h3 className="font-semibold text-white">Executive Summary</h3>
                <p className="mt-2 text-sm leading-6 text-slate-100">{result.strategist.executive_summary}</p>
                <h4 className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Expanded Summary</h4>
                <p className="mt-2 text-sm leading-6 text-slate-300">{result.strategist.summary}</p>
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-200">Confidence: {confidencePercent}%</p>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-700">
                    <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${confidencePercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/80 p-6 text-slate-100">
            <div className="mb-4 flex items-start gap-3">
              <Users className="mt-1 text-cyan-300" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Phase 1</p>
                <h3 className="font-semibold text-white">Deconstruction</h3>
                <p className="mt-1 text-sm text-slate-400">Who is involved, what each actor wants, and what constraints shape the board.</p>
              </div>
            </div>
            <div className="space-y-3">
              {result.strategist.actors.map((actor) => (
                <div key={actor.id} className="rounded border border-slate-700 bg-slate-800/70 p-3">
                  <p className="font-medium text-slate-100">{actor.name}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{actor.role}</p>
                  {(actor.objectives ?? []).length > 0 && (
                    <p className="mt-2 text-sm text-slate-300">Objectives: {(actor.objectives ?? []).join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-slate-900/80 p-6 text-slate-100">
            <div className="mb-4 flex items-start gap-3">
              <Target className="mt-1 text-emerald-300" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Phase 2</p>
                <h3 className="font-semibold text-white">Incentive Mapping</h3>
                <p className="mt-1 text-sm text-slate-400">Leverage, pressures, and hard constraints by actor.</p>
              </div>
            </div>
            <div className="space-y-3">
              {result.strategist.incentives.map((entry, index) => {
                const actor = result.strategist.actors.find((candidate) => candidate.id === entry.actorId)
                return (
                  <div key={`${entry.actorId}-${index}`} className="rounded border border-slate-700 bg-slate-800/70 p-3">
                    <p className="font-medium text-slate-100">{actor?.name || entry.actorId}</p>
                    <div className="mt-2 space-y-1 text-sm text-slate-300">
                      {(entry.incentives ?? []).length > 0 && <p>Incentives: {(entry.incentives ?? []).join(', ')}</p>}
                      {(entry.leverage ?? []).length > 0 && <p>Leverage: {(entry.leverage ?? []).join(', ')}</p>}
                      {(entry.constraints ?? []).length > 0 && <p>Constraints: {(entry.constraints ?? []).join(', ')}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="bg-slate-900/80 p-6 text-slate-100">
            <div className="mb-4 flex items-start gap-3">
              <TrendingUp className="mt-1 text-blue-300" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Phase 3</p>
                <h3 className="font-semibold text-white">Strategy Space</h3>
                <p className="mt-1 text-sm text-slate-400">Executable strategies with expected value, rationale, and downside.</p>
              </div>
            </div>
            <div className="space-y-4">
              {result.strategist.strategy_space.map((entry, index) => {
                const actor = result.strategist.actors.find((candidate) => candidate.id === entry.actorId)
                return (
                  <div key={`${entry.actorId}-${index}`} className="rounded border border-slate-700 bg-slate-800/70 p-3">
                    <p className="font-medium text-slate-100">{actor?.name || entry.actorId}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {(entry.options ?? []).map((option, optionIndex) => (
                        <div key={`${option.action}-${optionIndex}`} className="rounded border border-slate-700 bg-slate-900/80 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-slate-100">{option.action}</p>
                            <span className="rounded bg-slate-700 px-2 py-1 text-xs uppercase tracking-wide text-slate-300">
                              {option.riskLevel} risk
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-300">{option.rationale}</p>
                          <p className="mt-2 text-xs text-slate-400">Expected value: {option.expectedValue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="border-indigo-500/40 bg-indigo-500/10 p-6 text-slate-100">
            <div className="mb-4 flex items-start gap-3">
              <Brain className="mt-1 text-indigo-300" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Phase 4</p>
                <h3 className="font-semibold text-white">Nash Equilibria</h3>
                <p className="mt-1 text-sm text-indigo-100/80">Stable profiles where unilateral deviation is unattractive under the current assumptions.</p>
              </div>
            </div>
            <div className="space-y-3">
              {result.strategist.equilibria.map((equilibrium, index) => (
                <div key={`${equilibrium.name}-${index}`} className="rounded border border-indigo-500/20 bg-slate-900/80 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-slate-100">{equilibrium.name}</p>
                    <span className="rounded bg-indigo-500/20 px-2 py-1 text-xs uppercase tracking-wide text-indigo-200">
                      Stability {Math.round((equilibrium.stability ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {Object.entries(equilibrium.profile ?? {}).map(([actorId, action]) => {
                      const actor = result.strategist.actors.find((candidate) => candidate.id === actorId)
                      return (
                        <div key={`${actorId}-${String(action)}`} className="rounded border border-slate-700 bg-slate-800/70 p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">{actor?.name || actorId}</p>
                          <p className="mt-1 font-medium text-slate-100">{String(action)}</p>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{equilibrium.whyItHolds}</p>
                </div>
              ))}
            </div>
          </Card>

          {result.strategist.biases.length > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/10 p-6 text-slate-100">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-1 text-yellow-300" />
                <div className="flex-1">
                  <h3 className="mb-2 font-semibold text-white">Biases to correct before acting</h3>
                  {result.strategist.biases.map((bias, i) => (
                    <div key={i} className="mb-2 rounded border border-yellow-500/20 bg-slate-900/70 p-3">
                      <p className="font-medium capitalize text-slate-100">{bias.type.replace('_', ' ')}</p>
                      <p className="mt-1 text-sm text-slate-300">{bias.description}</p>
                      {bias.intervention && (
                        <p className="mt-2 text-xs text-yellow-200">Intervention: {bias.intervention}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <Card className="border-green-500/30 bg-green-500/10 p-6 text-slate-100">
            <div className="flex items-start gap-3">
              <Brain className="mt-1 text-green-300" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-300">Phase 5</p>
                <h3 className="mb-2 font-semibold text-white">Recommended action</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-slate-100">Primary Action: {result.strategist.recommendation.primary_action ?? 'pending'}</p>
                    <p className="mt-1 text-sm text-slate-300">{result.strategist.recommendation.rationale}</p>
                    <p className="mt-2 text-sm text-slate-200">Expected outcome: {result.strategist.recommendation.expected_outcome}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {((result.strategist.recommendation.key_insights ?? []).length > 0 || (result.strategist.recommendation.alternatives ?? []).length > 0) && (
            <Card className="bg-slate-900/80 p-6 text-slate-100">
              <div className="flex items-start gap-3">
                <Shield className="mt-1 text-purple-300" />
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">Phase 5 Support</p>
                  <h3 className="mb-2 font-semibold text-white">Executable strategies</h3>
                  {(result.strategist.recommendation.key_insights ?? []).length > 0 && (
                    <ul className="space-y-2">
                      {(result.strategist.recommendation.key_insights ?? []).map((insight, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-purple-300">•</span>
                          <span className="text-sm text-slate-300">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(result.strategist.recommendation.alternatives ?? []).length > 0 && (
                    <div className="mt-4 space-y-2">
                      {(result.strategist.recommendation.alternatives ?? []).map((alt, i) => (
                        <div key={i} className="rounded border border-slate-700 bg-slate-800/70 p-3">
                          <p className="font-medium capitalize text-slate-100">{alt.action}</p>
                          <p className="text-sm text-slate-300">Expected value: {alt.expected_value} | Risk: {alt.risk_level}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-slate-900/80 p-6 text-slate-100">
              <div className="flex items-start gap-3">
                <Target className="mt-1 text-emerald-300" />
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Phase 6</p>
                  <h3 className="font-semibold text-white">Dynamic adjustment</h3>
                  <div className="mt-3 space-y-3">
                    {result.strategist.opponent_types.map((entry, index) => (
                      <div key={`${entry.label}-${index}`} className="rounded border border-slate-700 bg-slate-800/70 p-3">
                        <p className="font-medium text-slate-100">{entry.label}</p>
                        <p className="text-sm text-slate-300">Probability: {Math.round((entry.probability ?? 0) * 100)}%</p>
                        <p className="mt-1 text-xs text-slate-400">Tell: {entry.tell}</p>
                        <p className="mt-1 text-xs text-slate-400">Adjustment: {entry.recommendedAdjustment}</p>
                      </div>
                    ))}
                    {result.strategist.dynamic_adjustments.map((entry, index) => (
                      <div key={`${entry.trigger}-${index}`} className="rounded border border-slate-700 bg-slate-800/70 p-3">
                        <p className="font-medium text-slate-100">{entry.trigger}</p>
                        <p className="mt-1 text-xs text-slate-400">{entry.adjustment}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900/80 p-6 text-slate-100">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-1 text-cyan-300" />
                <div className="flex-1">
                  <h3 className="font-semibold text-white">Evidence and provenance</h3>
                  <div className="mt-3 space-y-3">
                    {result.strategist.evidence.map((entry, index) => (
                      <div key={`${entry.id}-${entry.label}-${index}`} className="rounded border border-slate-700 bg-slate-800/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-100">{entry.label}</p>
                          <span className="rounded bg-slate-700 px-2 py-1 text-xs uppercase tracking-wide text-slate-300">
                            {(entry.sourceType ?? 'unknown').replace('_', ' ')}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{entry.detail}</p>
                      </div>
                    ))}
                    {result.strategist.claim_to_evidence.length > 0 && (
                      <div className="rounded border border-cyan-500/20 bg-cyan-500/5 p-3">
                        <p className="font-medium text-slate-100">Claim-to-evidence</p>
                        <div className="mt-3 space-y-3">
                          {result.strategist.claim_to_evidence.map((claim) => (
                            <div key={claim.claim_id} className="rounded border border-slate-700 bg-slate-900/70 p-3">
                              <p className="font-medium text-slate-100">{claim.claim_text}</p>
                              <div className="mt-2 space-y-2">
                                {claim.evidence_refs.map((ref) => (
                                  <div key={`${claim.claim_id}-${ref.evidence_id}`} className="text-xs text-slate-300">
                                    {ref.label} · {(ref.sourceType ?? 'unknown').replace('_', ' ')} · {ref.support}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
