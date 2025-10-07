// What-If Simulator Component
// Interactive parameter adjustment for geopolitical scenarios
// Allows users to explore alternative outcomes by modifying strategic variables

import React, { useState, useMemo } from 'react'
import { GDELTEvent, SimulationParams, SimulatedOutcome } from '../types/geopolitical'
import { X, Sliders, TrendingUp, AlertCircle } from 'lucide-react'

interface WhatIfSimulatorProps {
  event: GDELTEvent
  onClose: () => void
}

// Simulate strategic outcome based on adjusted parameters
function runSimulation(event: GDELTEvent, params: SimulationParams): SimulatedOutcome {
  // Base payoff matrix (simplified 2x2 for visualization)
  const baseCooperatePayoff = event.goldstein_scale > 0 ? 3 : 1
  const baseDefectPayoff = event.goldstein_scale < 0 ? -2 : 1
  
  // Adjust payoffs based on parameters
  const cooperateAdjustment = 
    params.cooperationLevel * 2 + 
    params.economicTies * 1.5 + 
    params.allianceSupport * 1.0
  
  const defectAdjustment = 
    params.militaryStrength * 1.5 - 
    params.economicTies * 0.5
  
  const adjustedCooperate = baseCooperatePayoff + cooperateAdjustment
  const adjustedDefect = baseDefectPayoff + defectAdjustment
  
  // Determine optimal strategy
  let strategy: string
  let payoff: number
  let probability: number
  
  if (adjustedCooperate > adjustedDefect + 1) {
    strategy = 'Strong cooperation recommended - High mutual benefit with low risk'
    payoff = adjustedCooperate
    probability = 0.75 + params.cooperationLevel * 0.2
  } else if (adjustedDefect > adjustedCooperate + 1) {
    strategy = 'Defensive posture advised - Protect interests while signaling willingness to cooperate'
    payoff = adjustedDefect
    probability = 0.65 + params.militaryStrength * 0.2
  } else {
    strategy = 'Conditional cooperation - Tit-for-tat strategy with monitoring'
    payoff = (adjustedCooperate + adjustedDefect) / 2
    probability = 0.60 + (params.cooperationLevel + params.allianceSupport) * 0.15
  }
  
  // Build payoff matrix
  const payoffMatrix = [
    [adjustedCooperate, adjustedCooperate * 0.8],
    [adjustedDefect * 1.2, adjustedDefect]
  ]
  
  return {
    strategy,
    payoff: Math.max(payoff, 0),
    probability: Math.min(probability, 0.95),
    confidence: 0.70 + (params.cooperationLevel + params.economicTies + params.allianceSupport) / 12,
    payoffMatrix
  }
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({ event, onClose }) => {
  const [params, setParams] = useState<SimulationParams>({
    cooperationLevel: 0.5,
    militaryStrength: 0.5,
    economicTies: 0.5,
    allianceSupport: 0.5
  })

  const simulatedOutcome = useMemo(() => 
    runSimulation(event, params), 
    [event, params]
  )

  // Calculate original outcome (with default params)
  const originalOutcome = useMemo(() => 
    runSimulation(event, { cooperationLevel: 0.5, militaryStrength: 0.5, economicTies: 0.5, allianceSupport: 0.5 }),
    [event]
  )

  const handleParamChange = (param: keyof SimulationParams, value: number) => {
    setParams(prev => ({ ...prev, [param]: value }))
  }

  const payoffDiff = simulatedOutcome.payoff - originalOutcome.payoff
  const probabilityDiff = simulatedOutcome.probability - originalOutcome.probability

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-lg max-w-4xl w-full border border-slate-700 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Sliders className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">What-If Scenario Simulator</h2>
              <p className="text-sm text-slate-400 mt-1">
                Adjust parameters to explore alternative strategic outcomes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Event Context */}
          <div className="bg-slate-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-white mb-2">Current Scenario</h3>
            <p className="text-slate-300 text-sm mb-2">{event.context.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">
                Actors: <span className="text-cyan-400">{event.actors.join(', ')}</span>
              </span>
              <span className="text-slate-400">
                Type: <span className="text-cyan-400">{event.game_type.replace(/_/g, ' ')}</span>
              </span>
            </div>
          </div>

          {/* Parameter Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Cooperation Level */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Cooperation Level
                <span className="text-slate-400 font-normal ml-2">
                  ({params.cooperationLevel.toFixed(2)})
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.cooperationLevel}
                onChange={(e) => handleParamChange('cooperationLevel', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Full Defection</span>
                <span>Full Cooperation</span>
              </div>
            </div>

            {/* Military Strength */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Military Strength
                <span className="text-slate-400 font-normal ml-2">
                  ({params.militaryStrength.toFixed(2)})
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.militaryStrength}
                onChange={(e) => handleParamChange('militaryStrength', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Weak</span>
                <span>Strong</span>
              </div>
            </div>

            {/* Economic Ties */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Economic Interdependence
                <span className="text-slate-400 font-normal ml-2">
                  ({params.economicTies.toFixed(2)})
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.economicTies}
                onChange={(e) => handleParamChange('economicTies', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Independent</span>
                <span>Highly Interdependent</span>
              </div>
            </div>

            {/* Alliance Support */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Alliance Support
                <span className="text-slate-400 font-normal ml-2">
                  ({params.allianceSupport.toFixed(2)})
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.allianceSupport}
                onChange={(e) => handleParamChange('allianceSupport', parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Isolated</span>
                <span>Strong Backing</span>
              </div>
            </div>
          </div>

          {/* Outcome Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Prediction */}
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                <h3 className="font-semibold text-white">Original Prediction</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Strategy:</span>
                  <p className="text-white mt-1">{event.recommended_strategy}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-400">Expected Payoff</div>
                    <div className="text-lg font-bold text-white">
                      {originalOutcome.payoff.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-400">Success Prob.</div>
                    <div className="text-lg font-bold text-white">
                      {(originalOutcome.probability * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Outcome */}
            <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-lg p-4 border border-cyan-500/50">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-white">Simulated Outcome</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Adjusted Strategy:</span>
                  <p className="text-white mt-1">{simulatedOutcome.strategy}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-400">Expected Payoff</div>
                    <div className="text-lg font-bold text-cyan-400">
                      {simulatedOutcome.payoff.toFixed(1)}
                      <span className={`text-xs ml-1 ${payoffDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {payoffDiff >= 0 ? '+' : ''}{payoffDiff.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-400">Success Prob.</div>
                    <div className="text-lg font-bold text-cyan-400">
                      {(simulatedOutcome.probability * 100).toFixed(0)}%
                      <span className={`text-xs ml-1 ${probabilityDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {probabilityDiff >= 0 ? '+' : ''}{(probabilityDiff * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-300 mb-1">Strategic Insight</h4>
                <p className="text-sm text-slate-300">
                  {payoffDiff > 1 ? (
                    <>Your adjusted parameters suggest a <strong className="text-emerald-400">significantly better outcome</strong>. 
                    Higher cooperation and economic ties create mutual benefits.</>
                  ) : payoffDiff < -1 ? (
                    <>Your adjusted parameters indicate a <strong className="text-red-400">worse outcome</strong>. 
                    Consider increasing cooperation or economic interdependence.</>
                  ) : (
                    <>Your adjustments produce a <strong className="text-amber-400">similar outcome</strong>. 
                    The current equilibrium appears relatively stable.</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Payoff Matrix Visualization */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-white mb-3">Adjusted Payoff Matrix</h4>
            <div className="bg-slate-700 rounded-lg p-4">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-xs text-slate-400 p-2"></th>
                    <th className="text-xs text-slate-300 p-2">Opponent Cooperates</th>
                    <th className="text-xs text-slate-300 p-2">Opponent Defects</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-xs text-slate-300 p-2">You Cooperate</td>
                    <td className="text-center p-2">
                      <span className="inline-block bg-emerald-600 text-white px-3 py-1 rounded font-semibold">
                        {simulatedOutcome.payoffMatrix[0][0].toFixed(1)}
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className="inline-block bg-amber-600 text-white px-3 py-1 rounded font-semibold">
                        {simulatedOutcome.payoffMatrix[0][1].toFixed(1)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-xs text-slate-300 p-2">You Defect</td>
                    <td className="text-center p-2">
                      <span className="inline-block bg-amber-600 text-white px-3 py-1 rounded font-semibold">
                        {simulatedOutcome.payoffMatrix[1][0].toFixed(1)}
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className="inline-block bg-red-600 text-white px-3 py-1 rounded font-semibold">
                        {simulatedOutcome.payoffMatrix[1][1].toFixed(1)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <button
            onClick={() => setParams({ cooperationLevel: 0.5, militaryStrength: 0.5, economicTies: 0.5, allianceSupport: 0.5 })}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  )
}

export default WhatIfSimulator
