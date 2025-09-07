// Interactive EV Override Widget for Learner View
// Allows users to adjust payoff estimates and see updated EV rankings

import React, { useState, useEffect } from 'react';
import { TrendingUp, RotateCcw, Save } from 'lucide-react';
import { LearnerViewData } from '../types/audience-views';

interface EVWidgetProps {
  data: LearnerViewData;
  onUpdateEV?: (updatedData: LearnerViewData) => void;
}

const EVWidget: React.FC<EVWidgetProps> = ({ data, onUpdateEV }) => {
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [updatedData, setUpdatedData] = useState<LearnerViewData>(data);

  const handlePayoffChange = (actionIndex: number, newValue: number) => {
    const action = data.decision_table[actionIndex].action;
    setOverrides(prev => ({ ...prev, [action]: newValue }));

    // Calculate updated data
    const newData = { ...data };
    newData.decision_table = newData.decision_table.map((row, idx) => {
      if (idx === actionIndex) {
        const overrideValue = overrides[row.action] ?? row.payoff_estimate.value;
        return {
          ...row,
          payoff_estimate: { ...row.payoff_estimate, value: overrideValue }
        };
      }
      return row;
    });

    // Recalculate EV rankings
    const evs = newData.decision_table.map(row => ({
      action: row.action,
      ev: row.payoff_estimate.value * row.payoff_estimate.confidence,
      ev_confidence: row.payoff_estimate.confidence
    }));

    evs.sort((a, b) => b.ev - a.ev);
    newData.expected_value_ranking = evs;

    setUpdatedData(newData);
    onUpdateEV?.(newData);
  };

  const resetOverrides = () => {
    setOverrides({});
    setUpdatedData(data);
    onUpdateEV?.(data);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <TrendingUp className="w-6 h-6 mr-3 text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-200">EV Override Experiment</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetOverrides}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 flex items-center"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {data.decision_table.map((row, index) => {
          // NaN protection for payoff values
          const payoffValue = row.payoff_estimate?.value;
          const confidenceValue = row.payoff_estimate?.confidence;

          if (isNaN(payoffValue) || isNaN(confidenceValue)) {
            return (
              <div key={index} className="bg-red-900/20 rounded-lg p-4 border border-red-700">
                <h4 className="font-medium text-red-200 mb-3">{row.action}</h4>
                <div className="text-xs text-red-400">
                  Insufficient numeric data - cannot display payoff estimate
                </div>
              </div>
            );
          }

          return (
            <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <h4 className="font-medium text-slate-200 mb-3">{row.action}</h4>

              <div className="space-y-2">
                <label className="block text-xs text-slate-400">
                  Override Payoff Estimate
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrides[row.action] ?? payoffValue}
                  onChange={(e) => handlePayoffChange(index, parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-slate-200 text-sm"
                />
                <div className="text-xs text-slate-500">
                  Original: {payoffValue.toFixed(2)} |
                  Confidence: {(confidenceValue * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Updated EV Rankings */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h4 className="font-medium text-slate-200 mb-3">Updated EV Rankings</h4>
        <div className="space-y-3">
          {updatedData.expected_value_ranking.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-slate-600 last:border-b-0">
              <span className="text-slate-300">{item.action}</span>
              <span className="font-mono text-blue-400">
                EV: {item.ev.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EVWidget;