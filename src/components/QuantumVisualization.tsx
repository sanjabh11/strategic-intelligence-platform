// Quantum Strategy Visualization Components
// Advanced UI for displaying quantum superposition states

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Scatter, ScatterChart, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { Atom, Zap, Waves, Target, TrendingUp } from 'lucide-react';

interface QuantumStrategicState {
  playerId: string;
  coherentStrategies: Array<{action: string; amplitude: number; probability: number}>;
  entanglementStrength: number;
  decoherenceRate: number;
}

interface QuantumVisualizationProps {
  quantumStates?: QuantumStrategicState[];
  isLearningMode?: boolean;
}

const QuantumVisualization: React.FC<QuantumVisualizationProps> = ({
  quantumStates = [],
  isLearningMode = false
}) => {
  const [selectedView, setSelectedView] = useState<'superposition' | 'temporal'>('superposition');

  if (quantumStates.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="text-center py-8">
          <Atom className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No quantum states available for visualization</p>
        </div>
      </div>
    );
  }

  // Quantum Superposition Chart
  const SuperpositionChart = () => {
    const superpositionData = quantumStates.flatMap(state =>
      state.coherentStrategies.map(strategy => ({
        name: `${state.playerId}:${strategy.action}`,
        amplitude: Math.abs(strategy.amplitude),
        probability: strategy.probability * 100,
        player: state.playerId,
        strategy: strategy.action
      }))
    );

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center mb-6">
          <Atom className="w-6 h-6 mr-3 text-purple-400" />
          <h3 className="text-xl font-semibold text-slate-200">Quantum Superposition States</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scatter plot for amplitudes */}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={superpositionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="amplitude"
                  name="Amplitude"
                  stroke="#94a3b8"
                />
                <YAxis
                  dataKey="probability"
                  name="Probability (%)"
                  stroke="#94a3b8"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [`${value}${name.includes('Probability') ? '%' : ''}`, name]}
                />
                <Scatter dataKey="probability" fill="#a855f7" />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2 text-center">Strategy Amplitude vs Probability</p>
          </div>

          {/* Bar chart for probabilities */}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={superpositionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={10}
                  stroke="#94a3b8"
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#94a3b8"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Probability']}
                />
                <Bar dataKey="probability" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2 text-center">Strategy Probability Distribution</p>
          </div>
        </div>

        {/* Insights Panel */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg text-center">
            <div className="text-purple-400 text-xl font-mono">
              {quantumStates.length}
            </div>
            <div className="text-sm text-slate-400">Active Players</div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg text-center">
            <div className="text-blue-400 text-xl font-mono">
              {(superpositionData.reduce((sum, item) => sum + item.probability, 0) / superpositionData.length).toFixed(1)}%
            </div>
            <div className="text-sm text-slate-400">Avg Probability</div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg text-center">
            <div className="text-emerald-400 text-xl font-mono">
              {Math.max(...superpositionData.map(d => d.amplitude)).toFixed(2)}
            </div>
            <div className="text-sm text-slate-400">Max Amplitude</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
          <div className="flex items-center">
            <Zap className="w-4 h-4 mr-2 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Quantum Insight</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Players maintain multiple strategic possibilities simultaneously until observation forces commitment.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* View Selection Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
        <button
          onClick={() => setSelectedView('superposition')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            selectedView === 'superposition'
              ? 'bg-slate-700 text-slate-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <Atom className="w-4 h-4 mr-2 inline" />
          Superposition
        </button>
        <button
          onClick={() => setSelectedView('temporal')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            selectedView === 'temporal'
              ? 'bg-slate-700 text-slate-200'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          <Waves className="w-4 h-4 mr-2 inline" />
          Strategy Rivers
        </button>
      </div>

      {/* Render Selected View */}
      {selectedView === 'superposition' && <SuperpositionChart />}
      {selectedView === 'temporal' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-emerald-500/30">
          <div className="text-center py-8">
            <Waves className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">Strategy river visualization coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuantumVisualization;