import React from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AdvancedFrameworkOutput } from '../../lib/strategistContract'

interface CoalitionalGraphProps {
  output: AdvancedFrameworkOutput
}

export default function CoalitionalGraph({ output }: CoalitionalGraphProps) {
  const shapleyValues = output.results?.shapley_values as Record<string, number> | undefined
  const core = output.results?.core as Record<string, any> | undefined
  const grandCoalition = Array.isArray(output.results?.grand_coalition) ? output.results?.grand_coalition as string[] : []
  const data = shapleyValues
    ? Object.entries(shapleyValues).map(([player, value]) => ({ player, value }))
    : []

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
        Coalitional output is unavailable because the solver did not return a valid Shapley allocation.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Coalitional Stability</div>
          <div className="mt-1 text-xs text-slate-400">{output.summary}</div>
        </div>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          {output.status.replace(/_/g, ' ')}
        </span>
      </div>

      {grandCoalition.length > 0 && (
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/80 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Grand coalition</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {grandCoalition.map((player) => (
              <span key={player} className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs text-indigo-200">
                {player}
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Core: {core?.is_non_empty ? 'non-empty' : 'empty'}
          </div>
        </div>
      )}

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="player" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {Array.isArray(core?.blocking_coalitions) && core.blocking_coalitions.length > 0 && (
        <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="text-xs uppercase tracking-wide text-rose-200">Blocking coalitions</div>
          <div className="mt-2 space-y-1 text-xs text-rose-100">
            {core.blocking_coalitions.slice(0, 4).map((coalition: any, index: number) => (
              <div key={index}>
                {(coalition.coalition || []).join(', ')} worth {coalition.worth}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
