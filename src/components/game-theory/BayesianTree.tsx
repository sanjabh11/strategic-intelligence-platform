import React from 'react'
import type { AdvancedFrameworkOutput } from '../../lib/strategistContract'

interface BayesianTreeProps {
  output: AdvancedFrameworkOutput
}

export default function BayesianTree({ output }: BayesianTreeProps) {
  const senderTypes = Array.isArray(output.normalized_inputs?.sender_types)
    ? output.normalized_inputs.sender_types as string[]
    : []
  const messages = Array.isArray(output.normalized_inputs?.messages)
    ? output.normalized_inputs.messages as string[]
    : []
  const observedMessage = typeof output.normalized_inputs?.observed_message === 'string'
    ? output.normalized_inputs.observed_message
    : messages[0]
  const posterior = output.results?.posterior as Record<string, any> | undefined
  const bestActions = Array.isArray(output.results?.best_receiver_actions)
    ? output.results?.best_receiver_actions as string[]
    : []

  if (senderTypes.length === 0 || messages.length === 0) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
        Bayesian signaling output is unavailable because sender types or messages were missing.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Perfect Bayesian Signaling</div>
          <div className="mt-1 text-xs text-slate-400">{output.summary}</div>
        </div>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          {output.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/70 p-4">
        <svg viewBox="0 0 640 220" className="h-56 w-full">
          <line x1="120" y1="110" x2="280" y2="55" stroke="#475569" strokeWidth="2" />
          <line x1="120" y1="110" x2="280" y2="165" stroke="#475569" strokeWidth="2" />
          <line x1="360" y1="55" x2="520" y2="110" stroke="#475569" strokeWidth="2" />
          <line x1="360" y1="165" x2="520" y2="110" stroke="#475569" strokeWidth="2" />
          <line x1="360" y1="55" x2="360" y2="165" stroke="#38bdf8" strokeDasharray="6 6" strokeWidth="2" />

          <circle cx="120" cy="110" r="24" fill="#0f172a" stroke="#38bdf8" />
          <circle cx="360" cy="55" r="24" fill="#0f172a" stroke={observedMessage === messages[0] ? '#34d399' : '#64748b'} />
          <circle cx="360" cy="165" r="24" fill="#0f172a" stroke={observedMessage === messages[1] ? '#34d399' : '#64748b'} />
          <circle cx="520" cy="110" r="24" fill="#0f172a" stroke="#f59e0b" />

          <text x="120" y="115" textAnchor="middle" fill="#e2e8f0" fontSize="12">Sender</text>
          <text x="360" y="60" textAnchor="middle" fill="#e2e8f0" fontSize="11">{messages[0] || 'M1'}</text>
          <text x="360" y="170" textAnchor="middle" fill="#e2e8f0" fontSize="11">{messages[1] || 'M2'}</text>
          <text x="520" y="115" textAnchor="middle" fill="#e2e8f0" fontSize="12">Receiver</text>
        </svg>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Posterior beliefs</div>
          <div className="mt-2 space-y-1 text-sm text-slate-200">
            {posterior?.posterior_beliefs
              ? senderTypes.map((senderType) => (
                  <div key={senderType}>
                    {senderType}: {Math.round((posterior.posterior_beliefs[senderType] || 0) * 100)}%
                  </div>
                ))
              : <div className="text-amber-200">Off-path: Bayes posterior unavailable.</div>}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Receiver best response</div>
          <div className="mt-2 text-sm text-slate-200">
            {bestActions.length > 0 ? bestActions.join(', ') : 'No admissible receiver action set returned.'}
          </div>
          <div className="mt-2 text-xs text-slate-400">Observed message: {observedMessage}</div>
        </div>
      </div>
    </div>
  )
}
