import React from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AdvancedFrameworkOutput } from '../../lib/strategistContract'

interface EvolutionaryChartProps {
  output: AdvancedFrameworkOutput
}

const COLORS = ['#38bdf8', '#34d399', '#f59e0b', '#f472b6', '#a78bfa']

export default function EvolutionaryChart({ output }: EvolutionaryChartProps) {
  const trajectory = Array.isArray(output.results?.trajectory) ? output.results?.trajectory as Array<Record<string, any>> : []
  const strategies = Array.isArray(output.normalized_inputs?.strategies) ? output.normalized_inputs.strategies as string[] : []
  const endpointShares = output.results?.endpoint_shares as Record<string, number> | undefined

  if (trajectory.length === 0 || strategies.length === 0) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
        Evolutionary output is unavailable because the solver did not return a trajectory.
      </div>
    )
  }

  const chartData = trajectory.map((point) => ({
    step: point.step,
    ...point.shares,
  }))

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Replicator Dynamics</div>
          <div className="mt-1 text-xs text-slate-400">{output.summary}</div>
        </div>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          {output.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="step" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" domain={[0, 1]} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} />
            <Legend />
            {strategies.map((strategy, index) => (
              <Line
                key={strategy}
                type="monotone"
                dataKey={strategy}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {endpointShares && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(endpointShares).map(([strategy, share]) => (
            <span key={strategy} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">
              {strategy}: {Math.round(share * 100)}%
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
