import React from 'react'
import type { AdvancedFrameworkOutput } from '../../lib/strategistContract'

interface QreSensitivityPanelProps {
  output: AdvancedFrameworkOutput
}

export default function QreSensitivityPanel({ output }: QreSensitivityPanelProps) {
  const profile = output.results?.profile as Record<string, Record<string, number>> | undefined
  const sensitivitySamples = Array.isArray(output.results?.sensitivity_samples)
    ? output.results?.sensitivity_samples as Array<Record<string, any>>
    : []

  if (!profile) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
        Bounded-rationality output is unavailable because the QRE profile was missing.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Logit-QRE</div>
          <div className="mt-1 text-xs text-slate-400">{output.summary}</div>
        </div>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          {output.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(profile).map(([player, actions]) => (
          <div key={player} className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">{player}</div>
            <div className="mt-2 space-y-2">
              {Object.entries(actions).map(([action, probability]) => (
                <div key={action}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>{action}</span>
                    <span>{Math.round(probability * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-950">
                    <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${Math.max(4, probability * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {sensitivitySamples.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/80 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Lambda sensitivity</div>
          <div className="mt-2 space-y-2 text-xs text-slate-300">
            {sensitivitySamples.map((sample, index) => (
              <div key={index} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
                lambda={sample.lambda}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
