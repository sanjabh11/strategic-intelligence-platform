import React, { useState, useCallback } from 'react'
import { Loader2, Play, RotateCcw, Swords, Trophy, TrendingUp } from 'lucide-react'
import { ENDPOINTS, getAuthHeaders } from '../lib/supabase'

const AVAILABLE_STRATEGIES = [
  { id: 'cooperator', label: 'Cooperator', desc: 'Always cooperates' },
  { id: 'defector', label: 'Defector', desc: 'Always defects' },
  { id: 'titfortat', label: 'Tit For Tat', desc: 'Cooperates first, then mirrors opponent' },
  { id: 'titfortat2', label: 'Tit For 2 Tats', desc: 'Forgives one defection, retaliates on second' },
  { id: 'grudger', label: 'Grudger', desc: 'Cooperates until opponent defects, then always defects' },
  { id: 'winstayloseshift', label: 'Win-Stay Lose-Shift', desc: 'Repeats last move if it won, switches if it lost' },
  { id: 'random', label: 'Random', desc: 'Randomly cooperates or defects' },
  { id: 'alternator', label: 'Alternator', desc: 'Alternates between cooperate and defect' },
  { id: 'generous titfortat', label: 'Generous Tit For Tat', desc: 'Tit For Tat with occasional forgiveness' },
  { id: 'suspicious titfortat', label: 'Suspicious Tit For Tat', desc: 'Defects first, then mirrors opponent' },
  { id: 'gradual', label: 'Gradual', desc: 'Punishes with increasing defections' },
  { id: 'contrite', label: 'Contrite Tit For Tat', desc: 'Tit For Tat with contrition after noise' },
  { id: 'punisher', label: 'Punisher', desc: 'Punishes defection severely' },
  { id: 'apologizer', label: 'Apologizer', desc: 'Cooperates after own defection' },
  { id: 'oncebitten', label: 'Once Bitten', desc: 'Defects permanently after one defection by opponent' },
  { id: 'goneaway', label: 'Go By Majority', desc: 'Uses majority of opponent history' },
]

interface RankedStrategy {
  rank: number
  strategy: string
  mean_score: number
}

interface TournamentResult {
  results: {
    ranked_strategies: RankedStrategy[]
    payoff_matrix: number[][]
    strategy_names: string[]
    tournament_config: {
      turns: number
      repetitions: number
      seed: number
      num_strategies: number
    }
    evolutionary_trajectory: Array<{ step: number; populations: number[] }>
    ecosystem_steps: number
  }
  diagnostics: {
    solver_version: string
    input_hash: string
  }
  warnings: string[]
}

export default function StrategyArena() {
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(['cooperator', 'defector', 'titfortat', 'grudger'])
  const [turns, setTurns] = useState(200)
  const [repetitions, setRepetitions] = useState(10)
  const [seed, setSeed] = useState(42)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TournamentResult | null>(null)

  const toggleStrategy = useCallback((id: string) => {
    setSelectedStrategies(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id)
      if (prev.length >= 16) return prev
      return [...prev, id]
    })
  }, [])

  const runTournament = useCallback(async () => {
    if (selectedStrategies.length < 2) {
      setError('Select at least 2 strategies to run a tournament.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const mlServiceUrl = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000'
      const response = await fetch(`${mlServiceUrl}/game-theory/solve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          framework: 'ipd_tournament',
          payload: {
            strategies: selectedStrategies,
            turns,
            repetitions,
            seed,
          },
        }),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || `ML service returned ${response.status}`)
      }
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run tournament')
    } finally {
      setLoading(false)
    }
  }, [selectedStrategies, turns, repetitions, seed])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  const maxScore = result?.results.ranked_strategies.reduce((max, r) => Math.max(max, Math.abs(r.mean_score)), 0) || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="inline-flex rounded-xl bg-cyan-500/10 p-3 text-cyan-300">
          <Swords className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Strategy Arena</h2>
          <p className="text-sm text-slate-400">
            Iterated Prisoner's Dilemma tournaments powered by the Axelrod library. Pit 230+ canonical strategies against each other and watch evolutionary dynamics unfold.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Select Strategies</h3>
              <span className="text-xs text-slate-500">{selectedStrategies.length}/16 selected</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AVAILABLE_STRATEGIES.map(strategy => {
                const selected = selectedStrategies.includes(strategy.id)
                return (
                  <button
                    key={strategy.id}
                    onClick={() => toggleStrategy(strategy.id)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      selected
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200'
                        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-medium">{strategy.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{strategy.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Tournament Configuration</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Turns per match</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={turns}
                  onChange={e => setTurns(Math.max(10, Math.min(500, Number(e.target.value) || 200)))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Repetitions</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={repetitions}
                  onChange={e => setRepetitions(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Seed</label>
                <input
                  type="number"
                  value={seed}
                  onChange={e => setSeed(Number(e.target.value) || 42)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={runTournament}
                disabled={loading || selectedStrategies.length < 2}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {loading ? 'Running tournament…' : 'Run Tournament'}
              </button>
              {result && (
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              )}
            </div>
            {error && (
              <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-white">Rankings</h3>
                </div>
                <div className="space-y-2">
                  {result.results.ranked_strategies.map((entry) => (
                    <div key={entry.strategy} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            entry.rank === 1 ? 'bg-amber-500/20 text-amber-300'
                              : entry.rank === 2 ? 'bg-slate-400/20 text-slate-300'
                                : entry.rank === 3 ? 'bg-orange-700/20 text-orange-400'
                                  : 'bg-slate-700 text-slate-400'
                          }`}>{entry.rank}</span>
                          <span className="text-sm font-medium text-white">{entry.strategy}</span>
                        </div>
                        <span className="text-sm font-semibold text-cyan-300">{entry.mean_score.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${(Math.abs(entry.mean_score) / maxScore) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Evolutionary Dynamics</h3>
                </div>
                <div className="text-xs text-slate-500 mb-3">
                  Population share over {result.results.ecosystem_steps} generations
                </div>
                <EvolutionaryChart
                  trajectory={result.results.evolutionary_trajectory}
                  strategyNames={result.results.strategy_names}
                />
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Payoff Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-slate-500"></th>
                        {result.results.strategy_names.map(name => (
                          <th key={name} className="px-2 py-1 text-slate-400 font-medium">{name.slice(0, 6)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.payoff_matrix.map((row, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1 text-slate-400 font-medium">{result.results.strategy_names[i].slice(0, 6)}</td>
                          {row.map((val, j) => (
                            <td key={j} className="px-2 py-1 text-slate-300 text-center">{val.toFixed(2)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center">
              <Swords className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">
                Select strategies and run a tournament to see rankings, evolutionary dynamics, and payoff matrices.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EvolutionaryChart({
  trajectory,
  strategyNames,
}: {
  trajectory: Array<{ step: number; populations: number[] }>
  strategyNames: string[]
}) {
  const colors = ['#06b6d4', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#84cc16']
  const maxPop = Math.max(...trajectory.flatMap(t => t.populations), 1)

  return (
    <div className="space-y-2">
      {strategyNames.map((name, i) => {
        const color = colors[i % colors.length]
        const finalPop = trajectory[trajectory.length - 1]?.populations[i] ?? 0
        const initialPop = trajectory[0]?.populations[i] ?? 0
        const trend = finalPop > initialPop ? 'up' : finalPop < initialPop ? 'down' : 'flat'
        return (
          <div key={name}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {name}
              </span>
              <span className={`font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'}`}>
                {(finalPop / maxPop * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-end gap-px h-8 bg-slate-900/60 rounded overflow-hidden">
              {trajectory.map((point, stepIdx) => {
                const height = (point.populations[i] / maxPop) * 100
                return (
                  <div
                    key={stepIdx}
                    className="flex-1 min-w-[1px] transition-all"
                    style={{
                      height: `${height}%`,
                      backgroundColor: color,
                      opacity: 0.3 + (stepIdx / trajectory.length) * 0.7,
                    }}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
