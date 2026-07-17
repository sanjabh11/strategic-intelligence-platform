import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  MessageSquare,
  Target,
  Send,
  RefreshCw,
  Award,
  BarChart3,
  Info,
  ClipboardCopy,
  CheckCircle2,
  Building2,
  BriefcaseBusiness,
  ShieldCheck
} from 'lucide-react'
import {
  NEGOTIATION_SCENARIOS,
  NegotiationResult,
  NegotiationScenario,
  NegotiationTurnRecord,
  buildNegotiationAiResponse,
  buildNegotiationDebriefText,
  calculateNegotiationResult,
  parseNegotiationMessage
} from '../lib/negotiationDojo'

interface NegotiationTurn extends NegotiationTurnRecord {
  id: string
  timestamp: Date
}

interface NegotiationDojoProps {
  userId?: string
}

const formatCurrency = (value?: number | null) => (typeof value === 'number' ? `$${value.toLocaleString()}` : '—')

const getOpeningMessage = (scenario: NegotiationScenario) => {
  switch (scenario.id) {
    case 'saas-renewal-budget-pressure':
      return `We can renew at ${formatCurrency(scenario.openingPrice)} annually. If you want meaningful movement, we will need a stronger commitment profile.`
    case 'software-procurement-100-seat':
      return `For 100 seats, the commercial package opens at ${formatCurrency(scenario.openingPrice)}. Annual commitment and rollout certainty are what unlock better pricing.`
    case 'vendor-price-increase-pushback':
      return `Given current cost pressure, the revised commercial position is ${formatCurrency(scenario.openingPrice)}. We can talk about forecast visibility or payment structure if you need movement.`
    case 'implementation-services-scope-rate':
      return `The implementation package is scoped at ${formatCurrency(scenario.openingPrice)}. If you want lower cost, we need to trade on scope discipline or payment timing.`
    case 'strategic-sourcing-constrained-supply':
      return `To secure allocation in this market, the package is ${formatCurrency(scenario.openingPrice)}. Priority allocation and deposit timing are the big levers.`
    default:
      return `With migration support included, we can move forward at ${formatCurrency(scenario.openingPrice)}. If you want a better number, I need to see real commercial trade-offs.`
  }
}

const tipCopy = [
  'State your BATNA before conceding. Budget limits, alternate vendors, and switching paths are leverage.',
  'Trade movement for movement. Price should not move unless support, commitment, or payment terms move too.',
  'Ask diagnostic questions before offering a number. You need their pressure points before you spend leverage.'
]

const NegotiationDojo: React.FC<NegotiationDojoProps> = () => {
  const [scenario, setScenario] = useState<NegotiationScenario | null>(null)
  const [turns, setTurns] = useState<NegotiationTurn[]>([])
  const [userInput, setUserInput] = useState('')
  const [currentOffer, setCurrentOffer] = useState<number | null>(null)
  const [result, setResult] = useState<NegotiationResult | null>(null)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [showTips, setShowTips] = useState(true)
  const [copiedMode, setCopiedMode] = useState<'debrief' | 'summary' | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [turns])

  useEffect(() => {
    if (!copiedMode) return undefined
    const timeout = setTimeout(() => setCopiedMode(null), 2000)
    return () => clearTimeout(timeout)
  }, [copiedMode])

  const groupedScenarios = useMemo(() => ({
    procurement: NEGOTIATION_SCENARIOS.filter((entry) => entry.buyerStory === 'procurement'),
    enterprise_software: NEGOTIATION_SCENARIOS.filter((entry) => entry.buyerStory === 'enterprise_software')
  }), [])

  const startNegotiation = useCallback((selectedScenario: NegotiationScenario) => {
    setScenario(selectedScenario)
    setTurns([
      {
        id: crypto.randomUUID(),
        role: 'ai',
        message: getOpeningMessage(selectedScenario),
        offer: selectedScenario.openingPrice,
        termChanges: [],
        timestamp: new Date()
      }
    ])
    setResult(null)
    setCurrentOffer(selectedScenario.openingPrice)
    setUserInput('')
    setShowTips(true)
    setCopiedMode(null)
  }, [])

  const copyDebrief = useCallback(async () => {
    if (!scenario || !result) return
    await navigator.clipboard.writeText(buildNegotiationDebriefText(scenario, result))
    setCopiedMode('debrief')
  }, [scenario, result])

  const copyManagerSummary = useCallback(async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.manager_summary)
    setCopiedMode('summary')
  }, [result])

  const handleSendMessage = useCallback(async () => {
    if (!scenario || !userInput.trim() || isAiThinking || result) return

    const analysis = parseNegotiationMessage(userInput, scenario)
    const userTurn: NegotiationTurn = {
      id: crypto.randomUUID(),
      role: 'user',
      message: userInput,
      offer: analysis.priceOffer,
      analysis,
      termChanges: [],
      timestamp: new Date()
    }

    const turnsWithUser = [...turns, userTurn]
    setTurns(turnsWithUser)
    setUserInput('')
    setIsAiThinking(true)

    await new Promise((resolve) => setTimeout(resolve, 800))

    const aiResponse = buildNegotiationAiResponse(userTurn, turnsWithUser, scenario, currentOffer)
    const aiTurn: NegotiationTurn = {
      id: crypto.randomUUID(),
      role: 'ai',
      message: aiResponse.message,
      offer: aiResponse.offer ?? undefined,
      termChanges: aiResponse.termChanges,
      timestamp: new Date()
    }

    const completedTurns = [...turnsWithUser, aiTurn]
    setTurns(completedTurns)

    if (typeof aiResponse.offer === 'number') {
      setCurrentOffer(aiResponse.offer)
    }

    const userTurnCount = completedTurns.filter((turn) => turn.role === 'user').length
    const autoNoDeal = !aiResponse.isDeal && !aiResponse.isNoDeal && userTurnCount >= 7
      ? { offer: aiResponse.offer, isDeal: false, isNoDeal: true }
      : aiResponse

    if (autoNoDeal.isDeal || autoNoDeal.isNoDeal) {
      setResult(calculateNegotiationResult(scenario, completedTurns, autoNoDeal))
    }

    setIsAiThinking(false)
  }, [currentOffer, isAiThinking, result, scenario, turns, userInput])

  const renderScenarioCard = (entry: NegotiationScenario) => (
    <div
      key={entry.id}
      onClick={() => startNegotiation(entry)}
      className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-5 transition-all hover:border-orange-500"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-medium text-white">{entry.title}</span>
        <span className={`rounded-full px-2 py-1 text-xs ${entry.difficulty === 'easy' ? 'bg-green-900/50 text-green-400' : entry.difficulty === 'medium' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`}>
          {entry.difficulty}
        </span>
      </div>
      <p className="mb-4 text-sm text-slate-400">{entry.description}</p>
      <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">Primary goal</div>
        <div className="mt-1 text-sm text-slate-200">{entry.primaryGoal}</div>
      </div>
      <div className="space-y-2 text-sm text-slate-400">
        <div>You: {entry.userRole}</div>
        <div>Counterparty: {entry.aiRole}</div>
        <div>BATNA: {entry.batna}</div>
      </div>
    </div>
  )

  const renderScenarioSelection = () => (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-white/20 p-3">
            <MessageSquare className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Negotiation Dojo</h2>
            <p className="text-orange-200">Procurement and enterprise-software negotiation drills with structured coaching artifacts.</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-blue-500/30 bg-blue-900/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-blue-400" />
          <div>
            <h4 className="mb-1 font-medium text-blue-300">What this module trains</h4>
            <p className="text-sm text-slate-300">
              Run realistic commercial negotiations, pressure-test BATNA usage, then review a manager-ready debrief covering concession discipline, ZOPA capture, and missed value.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-slate-200">
            <Building2 className="h-5 w-5 text-cyan-300" />
            <h3 className="font-semibold">Corporate Procurement</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {groupedScenarios.procurement.map(renderScenarioCard)}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-slate-200">
            <BriefcaseBusiness className="h-5 w-5 text-cyan-300" />
            <h3 className="font-semibold">Enterprise Software</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {groupedScenarios.enterprise_software.map(renderScenarioCard)}
          </div>
        </div>
      </div>
    </div>
  )

  const renderRubric = (label: string, score: number, rationale: string) => (
    <div key={label} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium capitalize text-slate-100">{label.replace(/_/g, ' ')}</span>
        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-200">
          {score}/5
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-400">{rationale}</p>
    </div>
  )

  const renderNegotiation = () => {
    if (!scenario) return null

    return (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[1.4fr,0.8fr]">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-white">{scenario.title}</h3>
                <p className="text-sm text-slate-400">
                  You: {scenario.userRole} | Counterparty: {scenario.aiRole}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Current Offer</div>
                <div className="text-xl font-bold text-orange-400">{formatCurrency(currentOffer)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="text-sm font-medium text-white">Primary Goal</div>
            <p className="mt-1 text-sm text-slate-300">{scenario.primaryGoal}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              BATNA
            </div>
            <p className="text-sm text-slate-300">{scenario.batna}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
              <Target className="h-4 w-4 text-cyan-300" />
              Tradeables
            </div>
            <p className="text-sm text-slate-300">{scenario.tradeables.join(' • ')}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
              <BarChart3 className="h-4 w-4 text-amber-300" />
              Counterparty Levers
            </div>
            <p className="text-sm text-slate-300">{scenario.counterpartyLikelyLevers.join(' • ')}</p>
          </div>
        </div>

        {showTips && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/30 p-3 text-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-amber-300">Enterprise coaching prompt</span>
              <button onClick={() => setShowTips(false)} className="text-xs text-amber-400">Hide</button>
            </div>
            <ul className="space-y-1 text-slate-300">
              {tipCopy.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}

        <div
          ref={chatRef}
          className="h-96 space-y-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-4"
        >
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-lg p-3 ${turn.role === 'user' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                <p>{turn.message}</p>
                {turn.offer && (
                  <div className="mt-2 text-xs opacity-80">
                    Offer: {formatCurrency(turn.offer)}
                  </div>
                )}
                {turn.termChanges && turn.termChanges.length > 0 && (
                  <div className="mt-2 text-xs opacity-80">
                    Terms in play: {turn.termChanges.join(' • ')}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isAiThinking && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-slate-700 p-3 text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {!result && (
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleSendMessage()
                }
              }}
              placeholder="State your commercial position, BATNA, or trade-offs..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              disabled={isAiThinking}
            />
            <button
              onClick={() => void handleSendMessage()}
              disabled={!userInput.trim() || isAiThinking}
              className="rounded-lg bg-orange-500 px-4 py-3 text-white disabled:bg-slate-700 hover:bg-orange-600"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        )}

        {result && (
          <div className={`rounded-xl border p-6 ${result.outcome === 'deal' ? 'border-green-500/30 bg-green-900/20' : 'border-red-500/30 bg-red-900/20'}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                <Award className="h-6 w-6 text-yellow-400" />
                {result.outcome === 'deal' ? 'Commercial Debrief' : 'No-Deal Debrief'}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void copyDebrief()}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
                >
                  {copiedMode === 'debrief' ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                  {copiedMode === 'debrief' ? 'Copied debrief' : 'Copy debrief'}
                </button>
                <button
                  onClick={() => void copyManagerSummary()}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-950"
                >
                  {copiedMode === 'summary' ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                  {copiedMode === 'summary' ? 'Copied summary' : 'Manager summary'}
                </button>
              </div>
            </div>

            <div className="mb-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-slate-800 p-3 text-center">
                <div className="text-sm text-slate-400">Final Price</div>
                <div className="text-xl font-bold text-green-400">{formatCurrency(result.finalPrice)}</div>
              </div>
              <div className="rounded-lg bg-slate-800 p-3 text-center">
                <div className="text-sm text-slate-400">Value Captured</div>
                <div className="text-xl font-bold text-cyan-400">{result.valueCapturedPercent}%</div>
              </div>
              <div className="rounded-lg bg-slate-800 p-3 text-center">
                <div className="text-sm text-slate-400">Price Leakage</div>
                <div className="text-xl font-bold text-amber-400">{formatCurrency(result.priceLeakage)}</div>
              </div>
              <div className="rounded-lg bg-slate-800 p-3 text-center">
                <div className="text-sm text-slate-400">Overall Rating</div>
                <div className="text-xl font-bold capitalize text-white">{result.overallRating}</div>
              </div>
            </div>

            <div className="mb-5 rounded-lg border border-slate-700 bg-slate-900/70 p-4">
              <div className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">Manager Summary</div>
              <p className="text-sm leading-6 text-slate-200">{result.manager_summary}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                  <div className="text-sm font-medium uppercase tracking-wide text-slate-400">BATNA Assessment</div>
                  <p className="mt-2 text-sm text-slate-200">{result.batna_assessment}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                  <div className="text-sm font-medium uppercase tracking-wide text-slate-400">Concession Pattern</div>
                  <p className="mt-2 text-sm text-slate-200">{result.concession_pattern}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                  <div className="text-sm font-medium uppercase tracking-wide text-slate-400">ZOPA Capture</div>
                  <p className="mt-2 text-sm text-slate-200">{result.zopa_capture}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                  <div className="text-sm font-medium uppercase tracking-wide text-slate-400">Missed Value</div>
                  <p className="mt-2 text-sm text-slate-200">{result.missed_value}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium uppercase tracking-wide text-slate-400">Coaching Rubric</div>
                {renderRubric('Preparation', result.coaching_rubric.preparation.score, result.coaching_rubric.preparation.rationale)}
                {renderRubric('Anchoring', result.coaching_rubric.anchoring.score, result.coaching_rubric.anchoring.rationale)}
                {renderRubric('Information Discovery', result.coaching_rubric.information_discovery.score, result.coaching_rubric.information_discovery.rationale)}
                {renderRubric('Tradeoff Management', result.coaching_rubric.tradeoff_management.score, result.coaching_rubric.tradeoff_management.rationale)}
                {renderRubric('Closing', result.coaching_rubric.closing.score, result.coaching_rubric.closing.rationale)}
              </div>
            </div>

            <button
              onClick={() => {
                setScenario(null)
                setTurns([])
                setResult(null)
                setCurrentOffer(null)
                setShowTips(true)
              }}
              className="mt-5 w-full rounded-lg bg-orange-500 py-3 font-medium text-white hover:bg-orange-600"
            >
              Try Another Scenario
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {scenario ? renderNegotiation() : renderScenarioSelection()}
    </div>
  )
}

export default NegotiationDojo
