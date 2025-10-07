// Geopolitical Simulator Dashboard
// Real-time GDELT event streaming with game theory analysis
// Features: Live feed, timeline, what-if simulator, historical comparison

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { 
  GDELTEvent, 
  TimelineDataPoint, 
  RegionFilter, 
  GameTypeFilter,
  SimulationParams,
  SimulatedOutcome,
  HistoricalScenario
} from '../types/geopolitical'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
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
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import { WhatIfSimulator } from './WhatIfSimulator'
import { HistoricalComparison } from './HistoricalComparison'

// Event Card Component
const EventCard: React.FC<{ event: GDELTEvent; onSimulate: (event: GDELTEvent) => void }> = ({ event, onSimulate }) => {
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
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-cyan-500 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {event.actors.map((actor, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="font-semibold text-cyan-400">{actor}</span>
                {i < event.actors.length - 1 && <span className="text-slate-500">↔</span>}
              </span>
            ))}
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium text-white ${gameTypeColors[event.game_type] || gameTypeColors.unknown}`}>
          {event.game_type.replace(/_/g, ' ').toUpperCase()}
        </div>
      </div>

      <p className="text-slate-300 text-sm mb-3">{event.context.description}</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-700 rounded p-2">
          <div className="text-xs text-slate-400 mb-1">Goldstein Scale</div>
          <div className={`text-lg font-bold ${goldsteinColor}`}>
            {event.goldstein_scale > 0 ? '+' : ''}{event.goldstein_scale.toFixed(1)}
          </div>
        </div>
        <div className="bg-slate-700 rounded p-2">
          <div className="text-xs text-slate-400 mb-1">Confidence</div>
          <div className="text-lg font-bold text-cyan-400">
            {(event.context.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="bg-slate-700 rounded p-3 mb-3">
        <div className="text-xs text-slate-400 mb-1">Recommended Strategy</div>
        <div className="text-sm text-white font-medium">{event.recommended_strategy}</div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {format(parseISO(event.timestamp), 'MMM d, HH:mm')}
        </div>
        <div className="flex gap-2">
          {event.context.source_url && (
            <a 
              href={event.context.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Source
            </a>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Less' : 'More'}
          </button>
          <button
            onClick={() => onSimulate(event)}
            className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            Simulate
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="text-xs space-y-2">
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

// Timeline Chart Component
const TimelineChart: React.FC<{ events: GDELTEvent[] }> = ({ events }) => {
  const chartData = useMemo(() => {
    const grouped: Record<string, TimelineDataPoint> = {}
    
    events.forEach(event => {
      const date = format(parseISO(event.timestamp), 'MMM dd')
      if (!grouped[date]) {
        grouped[date] = { date, cooperation: 0, conflict: 0, eventCount: 0 }
      }
      
      grouped[date].eventCount++
      if (event.goldstein_scale > 0) {
        grouped[date].cooperation += event.goldstein_scale
      } else {
        grouped[date].conflict += Math.abs(event.goldstein_scale)
      }
    })
    
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
  }, [events])

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-cyan-400" />
        7-Day Strategic Trend
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #475569',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="cooperation" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Cooperation"
          />
          <Line 
            type="monotone" 
            dataKey="conflict" 
            stroke="#ef4444" 
            strokeWidth={2}
            name="Conflict"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Filter Panel Component
const FilterPanel: React.FC<{
  regionFilter: RegionFilter
  gameTypeFilter: GameTypeFilter
  searchQuery: string
  onRegionChange: (region: RegionFilter) => void
  onGameTypeChange: (type: GameTypeFilter) => void
  onSearchChange: (query: string) => void
  onRefresh: () => void
}> = ({ regionFilter, gameTypeFilter, searchQuery, onRegionChange, onGameTypeChange, onSearchChange, onRefresh }) => {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Filter className="w-5 h-5 text-cyan-400" />
          Filters
        </h3>
        <button
          onClick={onRefresh}
          className="text-cyan-400 hover:text-cyan-300 p-2 rounded hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Search Actors</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="USA, CHN, RUS..."
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Region Filter */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Region</label>
          <select
            value={regionFilter}
            onChange={(e) => onRegionChange(e.target.value as RegionFilter)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Regions</option>
            <option value="asia_pacific">Asia-Pacific</option>
            <option value="europe">Europe</option>
            <option value="middle_east">Middle East</option>
            <option value="americas">Americas</option>
            <option value="africa">Africa</option>
          </select>
        </div>

        {/* Game Type Filter */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Game Type</label>
          <select
            value={gameTypeFilter}
            onChange={(e) => onGameTypeChange(e.target.value as GameTypeFilter)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Types</option>
            <option value="coordination_game">Coordination Game</option>
            <option value="conflict_game">Conflict Game</option>
            <option value="prisoners_dilemma">Prisoner's Dilemma</option>
            <option value="bargaining_game">Bargaining Game</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// Main Dashboard Component
export const GeopoliticalDashboard: React.FC = () => {
  const [events, setEvents] = useState<GDELTEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all')
  const [gameTypeFilter, setGameTypeFilter] = useState<GameTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<GDELTEvent | null>(null)

  // Fetch initial events
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(
        `${supabaseUrl}/functions/v1/gdelt-stream`,
        {
          headers: {
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`)
      }

      const data = await response.json()
      setEvents(data.scenarios || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Setup SSE for real-time updates (refresh every 5 minutes in production)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [fetchEvents])

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search filter
      if (searchQuery && !event.actors.some(actor => 
        actor.toLowerCase().includes(searchQuery.toLowerCase())
      )) {
        return false
      }

      // Game type filter
      if (gameTypeFilter !== 'all' && event.game_type !== gameTypeFilter) {
        return false
      }

      // Region filter (simplified - in production, map countries to regions)
      // For now, we'll show all events when region is selected
      // TODO: Add country-to-region mapping

      return true
    })
  }, [events, searchQuery, gameTypeFilter])

  const handleSimulate = (event: GDELTEvent) => {
    setSelectedEvent(event)
  }

  if (loading && events.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading strategic scenarios...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchEvents}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Globe className="w-8 h-8 text-cyan-400" />
            Live Geopolitical Intelligence
          </h1>
          <p className="text-slate-400">
            Real-time strategic scenarios from GDELT with game theory analysis
          </p>
          <div className="mt-2 text-sm text-slate-500">
            Last updated: {format(new Date(), 'MMM d, yyyy HH:mm')} • 
            {' '}{events.length} scenarios • Updates every 5 minutes
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="mb-6">
          <TimelineChart events={events} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters */}
          <div className="lg:col-span-1">
            <FilterPanel
              regionFilter={regionFilter}
              gameTypeFilter={gameTypeFilter}
              searchQuery={searchQuery}
              onRegionChange={setRegionFilter}
              onGameTypeChange={setGameTypeFilter}
              onSearchChange={setSearchQuery}
              onRefresh={fetchEvents}
            />
          </div>

          {/* Event Feed */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-4">
              <h3 className="text-lg font-semibold text-white mb-1">
                Strategic Scenarios ({filteredEvents.length})
              </h3>
              <p className="text-sm text-slate-400">
                Click "Simulate" to explore what-if scenarios
              </p>
            </div>

            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No events match your filters</p>
                </div>
              ) : (
                filteredEvents.map(event => (
                  <EventCard
                    key={event.event_id}
                    event={event}
                    onSimulate={handleSimulate}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Historical Comparison Section */}
        {filteredEvents.length > 0 && (
          <div className="mt-6">
            <HistoricalComparison event={filteredEvents[0]} />
          </div>
        )}

        {/* What-If Simulator Modal */}
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
