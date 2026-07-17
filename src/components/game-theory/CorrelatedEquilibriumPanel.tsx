import React from 'react'
import type { AdvancedFrameworkOutput } from '../../lib/strategistContract'

interface CorrelatedEquilibriumPanelProps {
  output: AdvancedFrameworkOutput
}

export default function CorrelatedEquilibriumPanel({ output }: CorrelatedEquilibriumPanelProps) {
  const distribution = Array.isArray(output.results?.distribution) ? output.results?.distribution as number[][] : []
  const actionsByPlayer = Array.isArray(output.normalized_inputs?.actions_by_player)
    ? output.normalized_inputs.actions_by_player as string[][]
    : []
  const obedienceSlacks = Array.isArray(output.results?.obedience_slacks) ? output.results?.obedience_slacks as Array<Record<string, any>> : []

  if (distribution.length === 0 || actionsByPlayer.length < 2) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
        Correlated-equilibrium output is unavailable because the joint distribution was missing.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Correlated Equilibrium</div>
          <div className="mt-1 text-xs text-slate-400">{output.summary}</div>
        </div>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          {output.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800/90 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Row / Column</th>
              {actionsByPlayer[1].map((action) => (
                <th key={action} className="px-3 py-2 text-left">{action}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actionsByPlayer[0].map((action, rowIndex) => (
              <tr key={action} className="border-t border-slate-700">
                <td className="px-3 py-2 font-medium text-slate-200">{action}</td>
                {distribution[rowIndex]?.map((probability, columnIndex) => (
                  <td key={`${action}-${columnIndex}`} className="px-3 py-2 text-slate-300">
                    {(probability * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {obedienceSlacks.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/80 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Obedience slacks</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {obedienceSlacks.slice(0, 6).map((slack, index) => (
              <div key={index} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
                {slack.player}: follow {slack.recommended_action} over {slack.deviation_action} by {slack.slack}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
