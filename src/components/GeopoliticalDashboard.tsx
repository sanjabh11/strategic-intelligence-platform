// Geopolitical Simulator Dashboard
// Real-time GDELT event streaming with game theory analysis
// Features: Live feed, radar prioritization, timeline, what-if simulator, historical comparison

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GDELTEvent,
  RadarEvent,
  TimelineDataPoint,
  RegionFilter,
  GameTypeFilter,
  RadarSort
} from '../types/geopolitical'
import { buildRadarScenarioPrompt, enrichRadarEvent } from '../lib/geopoliticalRadar'
import { API_BASE, getUserAuthHeaders } from '../lib/supabase'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  Globe,
  TrendingUp,
  AlertTriangle,
  Filter,
  RefreshCw,
  Search,
  Sliders,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowRight
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { WhatIfSimulator } from './WhatIfSimulator'
import { HistoricalComparison } from './HistoricalComparison'

interface ProviderDetail {
  name: string
  mode: 'live' | 'degraded' | 'unconfigured' | 'simulated'
  note?: string
}

interface ProviderDiagnostics {
  provider: string
  mode: 'live' | 'degraded' | 'simulated'
  warnings: string[]
  details: ProviderDetail[]
}

interface GdeltStreamResponse {
  scenarios?: GDELTEvent[]
  provider?: ProviderDiagnostics
  last_updated?: string
}

const attentionTone: Record<RadarEvent['attention_tier'], string> = {
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  high: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  monitor: 'border-sky-500/30 bg-sky-500/10 text-sky-200'
}

const EventCard: React.FC<{
  event: RadarEvent
  onSimulate: (event: RadarEvent) => void
  onBriefInConsole: (event: RadarEvent) => void
}> = ({ event, onSimulate, onBriefInConsole }) => {
  const [expanded, setExpanded] = useState(false)

  const gameTypeColors: Record<string, string> = {
    coordination_game: 'bg-emerald-500',
    conflict_game: 'bg-red-500',
    prisoners_dilemma: 'bg-amber-500',
    bargaining_game: 'bg-blue-500',
    unknown: 'bg-slate-500'
  }

  const goldsteinColor = event.goldstein_scale > 2
    ? 'text-emerald-400'
    : event.goldstein_scale < -2
      ? 'text-red-400'
      : 'text-amber-400'

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 transition-all hover:border-cyan-500">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {event.actors.map((actor, index) => (
            <span key={`${event.event_id}-${actor}-${index}`} className="flex items-center gap-2">
              <span className="font-semibold text-cyan-400">{actor}</span>
              {index < event.actors.length - 1 && <span className="text-slate-500">↔</span>}
            </span>
          ))}
        </div>
        <div className={`rounded px-2 py-1 text-xs font-medium text-white ${gameTypeColors[event.game_type] || gameTypeColors.unknown}`}>
          {event.game_type.replace(/_/g, ' ').toUpperCase()}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full border px-2.5 py-1 font-medium uppercase tracking-wide ${attentionTone[event.attention_tier]}`}>
          {event.attention_tier}
        </span>
        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-medium text-cyan-200">
          Priority {event.priority_score}
        </span>
        <span className="rounded-full border border-slate-600 bg-slate-900 px-2.5 py-1 text-slate-300">
          {event.region === 'all' ? 'Cross-region / unclassified' : event.region.replace(/_/g, ' ')}
        </span>
        {event.shadow_risk && (
          <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-1 text-fuchsia-200">
            Shadow risk {(event.shadow_risk.score * 100).toFixed(0)}%
          </span>
        )}
        {event.drift_signal && event.drift_signal.state !== 'stable' && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-200">
            Drift {event.drift_signal.state}
          </span>
        )}
      </div>

      <p className="mb-3 text-sm text-slate-300">{event.context.description}</p>

      {event.entity_refs && event.entity_refs.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {event.entity_refs.slice(0, 4).map((entity) => (
            <span key={`${event.event_id}:${entity.entity_key}`} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
              {entity.label}
            </span>
          ))}
        </div>
      )}

      <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Watch Reason</div>
        <div className="mt-1 text-sm text-slate-100">{event.watch_reason}</div>
      </div>

      <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Briefing Summary</div>
        <div className="mt-1 text-sm leading-6 text-slate-200">{event.briefing_summary}</div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded bg-slate-700 p-2">
          <div className="mb-1 text-xs text-slate-400">Goldstein Scale</div>
          <div className={`text-lg font-bold ${goldsteinColor}`}>
            {event.goldstein_scale > 0 ? '+' : ''}{event.goldstein_scale.toFixed(1)}
          </div>
        </div>
        <div className="rounded bg-slate-700 p-2">
          <div className="mb-1 text-xs text-slate-400">Confidence</div>
          <div className="text-lg font-bold text-cyan-400">
            {(event.context.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="mb-3 rounded bg-slate-700 p-3">
        <div className="mb-1 text-xs text-slate-400">Recommended Strategy</div>
        <div className="text-sm font-medium text-white">{event.recommended_strategy}</div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          {format(parseISO(event.timestamp), 'MMM d, HH:mm')}
        </div>
        <div className="flex flex-wrap gap-2">
          {event.context.source_url && (
            <a
              href={event.context.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </a>
          )}
          <button
            onClick={() => setExpanded((value) => !value)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Less' : 'More'}
          </button>
          <button
            onClick={() => onSimulate(event)}
            className="flex items-center gap-1 rounded bg-cyan-600 px-2 py-1 text-xs text-white hover:bg-cyan-500"
          >
            <Sliders className="h-3 w-3" />
            Simulate
          </button>
          <button
            onClick={() => onBriefInConsole(event)}
            className="flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600"
          >
            <ArrowRight className="h-3 w-3" />
            Brief in Console
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-slate-700 pt-3">
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400">Pattern:</span>{' '}
              <span className="text-white">{event.pattern}</span>
            </div>
            <div>
              <span className="text-slate-400">Strategic Value:</span>{' '}
              <span className="text-white">{event.context.strategic_value}</span>
            </div>
            <div>
              <span className="text-slate-400">Sentiment:</span>{' '}
              <span className="text-white">{event.sentiment.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TimelineChart: React.FC<{ events: GDELTEvent[] }> = ({ events }) => {
  const chartData = useMemo(() => {
    const grouped: Record<string, TimelineDataPoint> = {}

    events.forEach((event) => {
      const date = format(parseISO(event.timestamp), 'MMM dd')
      if (!grouped[date]) {
        grouped[date] = { date, cooperation: 0, conflict: 0, eventCount: 0 }
      }

      grouped[date].eventCount += 1
      if (event.goldstein_scale > 0) {
        grouped[date].cooperation += event.goldstein_scale
      } else {
        grouped[date].conflict += Math.abs(event.goldstein_scale)
      }
    })

    return Object.values(grouped).sort((left, right) => left.date.localeCompare(right.date))
  }, [events])

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
        <TrendingUp className="h-5 w-5 text-cyan-400" />
        7-Day Strategic Trend
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="cooperation" stroke="#10b981" strokeWidth={2} name="Cooperation" />
          <Line type="monotone" dataKey="conflict" stroke="#ef4444" strokeWidth={2} name="Conflict" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const FilterPanel: React.FC<{
  regionFilter: RegionFilter
  gameTypeFilter: GameTypeFilter
  sortMode: RadarSort
  searchQuery: string
  onRegionChange: (region: RegionFilter) => void
  onGameTypeChange: (type: GameTypeFilter) => void
  onSortChange: (sort: RadarSort) => void
  onSearchChange: (query: string) => void
  onRefresh: () => void
}> = ({
  regionFilter,
  gameTypeFilter,
  sortMode,
  searchQuery,
  onRegionChange,
  onGameTypeChange,
  onSortChange,
  onSearchChange,
  onRefresh
}) => {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Filter className="h-5 w-5 text-cyan-400" />
          Filters
        </h3>
        <button
          onClick={onRefresh}
          className="rounded p-2 text-cyan-400 transition-colors hover:bg-slate-700 hover:text-cyan-300"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-slate-400">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="USA, sanctions, bargaining..."
              className="w-full rounded border border-slate-600 bg-slate-700 py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">Region</label>
          <select
            value={regionFilter}
            onChange={(event) => onRegionChange(event.target.value as RegionFilter)}
            className="w-full rounded border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Regions</option>
            <option value="asia_pacific">Asia-Pacific</option>
            <option value="europe">Europe</option>
            <option value="middle_east">Middle East</option>
            <option value="americas">Americas</option>
            <option value="africa">Africa</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">Game Type</label>
          <select
            value={gameTypeFilter}
            onChange={(event) => onGameTypeChange(event.target.value as GameTypeFilter)}
            className="w-full rounded border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="coordination_game">Coordination Game</option>
            <option value="conflict_game">Conflict Game</option>
            <option value="prisoners_dilemma">Prisoner's Dilemma</option>
            <option value="bargaining_game">Bargaining Game</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">Sort</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSortChange('priority')}
              className={`rounded px-3 py-2 text-sm font-medium transition-colors ${sortMode === 'priority' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              Priority
            </button>
            <button
              onClick={() => onSortChange('newest')}
              className={`rounded px-3 py-2 text-sm font-medium transition-colors ${sortMode === 'newest' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              Newest
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const GeopoliticalDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [events, setEvents] = useState<RadarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<ProviderDiagnostics | null>(null)
  const [lastSuccessfulFetchAt, setLastSuccessfulFetchAt] = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all')
  const [gameTypeFilter, setGameTypeFilter] = useState<GameTypeFilter>('all')
  const [sortMode, setSortMode] = useState<RadarSort>('priority')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<RadarEvent | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      const headers = await getUserAuthHeaders()

      const response = await fetch(`${API_BASE}/gdelt-stream`, {
        headers,
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`)
      }

      const data = await response.json() as GdeltStreamResponse
      setEvents((data.scenarios || []).map((event) => enrichRadarEvent(event)))
      setProvider(data.provider || null)
      setLastSuccessfulFetchAt(data.last_updated || new Date().toISOString())
    } catch (err) {
      console.error('Error fetching events:', err)
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('The geopolitical feed timed out before it could return live scenarios.')
        } else if (err.message.includes('404')) {
          setError('The geopolitical feed endpoint is currently unavailable.')
        } else {
          setError('The geopolitical feed is temporarily unavailable.')
        }
      } else {
        setError('The geopolitical feed is temporarily unavailable.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    const interval = setInterval(fetchEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  const filteredEvents = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()
    const nextEvents = events.filter((event) => {
      if (search && ![event.actors.join(' '), event.context.description, event.watch_reason, event.briefing_summary]
        .join(' ')
        .toLowerCase()
        .includes(search)) {
        return false
      }

      if (gameTypeFilter !== 'all' && event.game_type !== gameTypeFilter) {
        return false
      }

      if (regionFilter !== 'all' && event.region !== regionFilter) {
        return false
      }

      return true
    })

    return [...nextEvents].sort((left, right) => {
      if (sortMode === 'newest') {
        return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
      }

      if (right.priority_score !== left.priority_score) {
        return right.priority_score - left.priority_score
      }

      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    })
  }, [events, searchQuery, gameTypeFilter, regionFilter, sortMode])

  const topPriorityEvents = useMemo(() => filteredEvents.slice(0, 3), [filteredEvents])

  const handleSimulate = (event: RadarEvent) => {
    setSelectedEvent(event)
  }

  const handleBriefInConsole = (event: RadarEvent) => {
    navigate('/console', {
      state: {
        scenarioText: buildRadarScenarioPrompt(event)
      }
    })
  }

  const providerBadgeClass = provider?.mode === 'live'
    ? 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30'
    : provider?.mode === 'simulated'
      ? 'bg-purple-900/30 text-purple-300 border-purple-500/30'
      : 'bg-amber-900/30 text-amber-300 border-amber-500/30'

  const topLevelStatusTone = error
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
    : provider?.mode === 'live'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : 'border-slate-700 bg-slate-800/60 text-slate-200'

  if (loading && events.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-cyan-400" />
          <p className="text-slate-400">Loading strategic scenarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-white">
            <Globe className="h-8 w-8 text-cyan-400" />
            Live Geopolitical Intelligence
          </h1>
          <p className="text-slate-400">
            Real-time strategic scenarios from GDELT with game theory analysis
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>
              Last updated: {lastSuccessfulFetchAt ? format(parseISO(lastSuccessfulFetchAt), 'MMM d, yyyy HH:mm') : 'Awaiting first live refresh'} • {events.length} scenarios • Updates every 5 minutes
            </span>
            {provider && (
              <span className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${providerBadgeClass}`}>
                {provider.mode === 'live' ? 'Live feed' : provider.mode === 'simulated' ? 'Simulated/local feed' : 'Degraded feed'}
              </span>
            )}
          </div>
          <div className={`mt-4 rounded-xl border p-4 ${topLevelStatusTone}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide">
                  {error ? 'Feed unavailable' : provider?.mode === 'live' ? 'Live feed active' : 'Feed degraded'}
                </div>
                <p className="mt-2 text-sm leading-6">
                  {error
                    ? 'The insight surface is still live, but the upstream geopolitical feed could not be refreshed for this request.'
                    : 'Scenario quality and freshness are determined by the upstream geopolitical feed and are labeled here before you rely on any signal.'}
                </p>
              </div>
              <button
                onClick={fetchEvents}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900/70 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
              >
                <RefreshCw className="h-4 w-4" />
                Retry feed
              </button>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
              <div>
                <span className="font-medium text-white">Last successful refresh:</span>{' '}
                {lastSuccessfulFetchAt ? format(parseISO(lastSuccessfulFetchAt), 'MMM d, yyyy HH:mm') : 'No successful refresh yet in this session'}
              </div>
              <div>
                <span className="font-medium text-white">Beta trust note:</span>{' '}
                {error
                  ? 'Treat this view as temporarily unavailable until the live feed recovers.'
                  : provider?.mode === 'live'
                    ? 'Signals are live-data-backed and can be handed off into the console.'
                    : 'Signals are degraded and should be treated as monitoring prompts, not decisive briefs.'}
              </div>
            </div>
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-slate-900/40 px-3 py-2 text-sm text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
          {provider && (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-200">Provider status</div>
                  <div className="text-xs text-slate-400">{provider.provider}</div>
                </div>
                <div className="text-xs text-slate-400">
                  {provider.details.map((detail) => `${detail.name}: ${detail.mode}`).join(' • ')}
                </div>
              </div>
              {provider.warnings.length > 0 && (
                <div className="mt-3 space-y-2">
                  {provider.warnings.map((warning) => (
                    <div key={warning} className="flex items-start gap-2 text-sm text-amber-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-6">
          <TimelineChart events={filteredEvents} />
        </div>

        {topPriorityEvents.length > 0 && (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800/80 p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">What Matters Now</h2>
                <p className="text-sm text-slate-400">Priority-ranked issues for immediate strategist follow-up.</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {topPriorityEvents.map((event) => (
                <div key={`${event.event_id}-top`} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white">{event.actors.join(' ↔ ')}</span>
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-200">
                      {event.priority_score}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-200">{event.briefing_summary}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">{event.watch_reason}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-wide ${attentionTone[event.attention_tier]}`}>
                      {event.attention_tier}
                    </span>
                    <button
                      onClick={() => handleBriefInConsole(event)}
                      className="inline-flex items-center gap-1 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500"
                    >
                      Brief in Console
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <FilterPanel
              regionFilter={regionFilter}
              gameTypeFilter={gameTypeFilter}
              sortMode={sortMode}
              searchQuery={searchQuery}
              onRegionChange={setRegionFilter}
              onGameTypeChange={setGameTypeFilter}
              onSortChange={setSortMode}
              onSearchChange={setSearchQuery}
              onRefresh={fetchEvents}
            />
          </div>

          <div className="lg:col-span-3">
            <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 p-4">
              <h3 className="mb-1 text-lg font-semibold text-white">
                Strategic Scenarios ({filteredEvents.length})
              </h3>
              <p className="text-sm text-slate-400">
                Priority-ranked signals. Use the console handoff to turn a live event into a strategist brief and governed forecast draft.
              </p>
            </div>

            <div className="max-h-[800px] space-y-4 overflow-y-auto pr-2">
              {filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Filter className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium text-slate-200">
                    {error ? 'No live scenarios are available right now' : 'No events match your filters'}
                  </p>
                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    {error
                      ? 'The upstream feed is unavailable, so this panel is intentionally holding a degraded state instead of fabricating strategic events. Retry the feed or shift into the console for manual strategist work.'
                      : 'Adjust the filters or refresh the feed to look for a different geopolitical scenario set.'}
                  </p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <EventCard
                    key={event.event_id}
                    event={event}
                    onSimulate={handleSimulate}
                    onBriefInConsole={handleBriefInConsole}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {filteredEvents.length > 0 && (
          <div className="mt-6">
            <HistoricalComparison event={filteredEvents[0]} />
          </div>
        )}

        {selectedEvent && (
          <WhatIfSimulator
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>
    </div>
  )
}

export default GeopoliticalDashboard
