// Interactive Sensitivity Analysis Slider for Learner View
// Allows users to adjust key parameters and see impact on EV rankings

import React, { useState, useEffect } from 'react';
import { BarChart3, Target, TrendingUp } from 'lucide-react';
import { LearnerViewData } from '../types/audience-views';

interface SensitivitySliderProps {
  data: LearnerViewData;
  onSensitivityUpdate?: (updatedRanking: any[]) => void;
}

const SensitivitySlider: React.FC<SensitivitySliderProps> = ({
  data,
  onSensitivityUpdate
}) => {
  const [selectedParam, setSelectedParam] = useState<string | null>(
    data.sensitivity_advice.most_sensitive_parameters[0]?.param || null
  );

  const [paramValue, setParamValue] = useState<number>(0.5); // -50% to +50%
  const [updatedRanking, setUpdatedRanking] = useState(data.expected_value_ranking);

  // Assume first sensitive parameter
  const sensitiveParams = data.sensitivity_advice.most_sensitive_parameters;
  const currentParam = sensitiveParams.find(p => p.param === selectedParam) || sensitiveParams[0];

  const handleParamChange = (value: number) => {
    setParamValue(value);

    // Calculate impact on EV rankings
    const impactFactor = 1 + (value * 0.5); // Convert -1 to 1 scale to multiplier

    const newRanking = data.expected_value_ranking.map(item => ({
      ...item,
      ev: item.ev * impactFactor
    })).sort((a, b) => b.ev - a.ev);

    setUpdatedRanking(newRanking);
    onSensitivityUpdate?.(newRanking);
  };

  const resetSlider = () => {
    setParamValue(0.5);
    setUpdatedRanking(data.expected_value_ranking);
    onSensitivityUpdate?.(data.expected_value_ranking);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Target className="w-6 h-6 mr-3 text-amber-400" />
          <h3 className="text-lg font-semibold text-slate-200">Parameter Sensitivity Explorer</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetSlider}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Parameter Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Select Parameter to Analyze
        </label>
        <div className="flex flex-wrap gap-2">
          {sensitiveParams.map(param => (
            <button
              key={param.param}
              onClick={() => setSelectedParam(param.param)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedParam === param.param
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {param.param}
            </button>
          ))}
        </div>
      </div>

      {currentParam && (
        <>
          {/* Slider Control */}
          <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-300 font-medium">{currentParam.param}</span>
              <span className="text-amber-400 font-mono text-sm">
                {((paramValue - 0.5) * 100).toFixed(1)}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={paramValue}
              onChange={(e) => handleParamChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right,
                  #ef4444 0%,
                  #f59e0b 25%,
                  #10b981 50%,
                  #f59e0b 75%,
                  #ef4444 100%)`
              }}
            />

            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>

          {/* Impact Visualization */}
          <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 mb-6">
            <h4 className="font-medium text-slate-200 mb-3 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Sensitivity Impact
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current vs Original */}
              <div>
                <h5 className="text-sm font-medium text-slate-300 mb-2">Current Rankings</h5>
                <div className="space-y-2">
                  {updatedRanking.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span className="text-slate-300 text-sm">{item.action}</span>
                      <span className="text-blue-400 font-mono text-sm">
                        EV: {item.ev.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Score */}
              <div>
                <h5 className="text-sm font-medium text-slate-300 mb-2">Impact Score</h5>
                <div className="text-center py-4">
                  <div className="text-2xl font-bold text-amber-400">
                    {(currentParam.impact_score * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Parameter Sensitivity
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Updated EV Rankings */}
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <h4 className="font-medium text-slate-200 mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          Updated Rankings After Adjustment
        </h4>
        <div className="space-y-2">
          {updatedRanking.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded bg-slate-600"
            >
              <div className="flex items-center">
                <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-bold text-blue-400 mr-3">
                  {index + 1}
                </span>
                <span className="text-slate-300">{item.action}</span>
              </div>
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

export default SensitivitySlider;