import React from 'react'
import type { AdvancedGameOutputs } from '../../lib/strategistContract'

interface AdvancedFrameworkSummaryCardProps {
  outputs?: AdvancedGameOutputs
}

const STATUS_LABELS: Record<string, string> = {
  deterministic: 'Deterministic',
  heuristic: 'Heuristic',
  incomplete_inputs: 'Incomplete',
  rejected: 'Rejected',
}

export default function AdvancedFrameworkSummaryCard({ outputs }: AdvancedFrameworkSummaryCardProps) {
  const entries = Object.values(outputs || {}).filter(Boolean)
  if (entries.length === 0) return null

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/90 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">Advanced Game-Theory Summary</div>
          <div className="mt-1 text-sm text-slate-400">
            Compact public-facing snapshot of the deterministic framework outputs attached to this run.
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <div key={entry.framework} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium capitalize text-slate-100">{entry.framework.replace(/_/g, ' ')}</div>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-200">
                {STATUS_LABELS[entry.status] || entry.status}
              </span>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-400">{entry.summary}</div>
            {entry.warnings.length > 0 && (
              <div className="mt-3 text-xs text-amber-200">
                {entry.warnings[0]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
