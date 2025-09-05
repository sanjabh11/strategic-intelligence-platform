// Learner View Component
// Interactive learning view with decision table, rankings, sensitivity analysis, and exercises

import React from 'react';
import { BookOpen, Table, TrendingUp, AlertTriangle, GraduationCap, AlertCircle, ExternalLink } from 'lucide-react';
import { AudienceViewProps, LearnerViewData, SourceCitation } from '../../types/audience-views';

const LearnerView: React.FC<AudienceViewProps> = ({
  analysisData,
  onSourceClick,
  isLoading = false,
  error
}) => {
  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-red-500/20">
        <div className="flex items-center text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          <span className="ml-2 text-slate-300">Loading learner analysis...</span>
        </div>
      </div>
    );
  }

  if (!analysisData || analysisData.audience !== 'learner') {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-yellow-500/20">
        <div className="text-yellow-400 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          No learner analysis data available
        </div>
      </div>
    );
  }

  const learnerData = analysisData.data as LearnerViewData;

  const renderDecisionTable = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <Table className="w-6 h-6 mr-3 text-emerald-400" />
        <h2 className="text-xl font-semibold text-slate-200">Decision Table</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-600">
              <th className="text-left p-3 text-slate-300 font-medium">Actor</th>
              <th className="text-left p-3 text-slate-300 font-medium">Action</th>
              <th className="text-center p-3 text-slate-300 font-medium">Expected Payoff</th>
              <th className="text-left p-3 text-slate-300 font-medium">Risk Notes</th>
            </tr>
          </thead>
          <tbody>
            {learnerData.decision_table.map((row, index) => (
              <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/50">
                <td className="p-3 text-slate-300 font-medium">{row.actor}</td>
                <td className="p-3 text-slate-300">{row.action}</td>
                <td className="p-3 text-center">
                  <div className="text-sm font-mono text-blue-400">
                    {row.payoff_estimate.value.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">
                    Confidence: {(row.payoff_estimate.confidence * 100).toFixed(1)}%
                  </div>
                </td>
                <td className="p-3 text-slate-300 text-sm">{row.risk_notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderExpectedValueRanking = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <TrendingUp className="w-6 h-6 mr-3 text-blue-400" />
        <h2 className="text-xl font-semibold text-slate-200">Expected Value Analysis</h2>
      </div>

      <div className="space-y-4">
        {learnerData.expected_value_ranking.map((item, index) => (
          <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-200">{item.action}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-mono text-blue-400">
                  EV: {item.ev.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-600 rounded-full h-2 mb-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (item.ev_confidence * 100))}%` }}
              ></div>
            </div>
            <div className="text-xs text-slate-400">
              EV Confidence: {(item.ev_confidence * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSensitivityAdvice = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <AlertTriangle className="w-6 h-6 mr-3 text-amber-400" />
        <h2 className="text-xl font-semibold text-slate-200">Sensitivity Analysis</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Sensitive Parameters */}
        <div>
          <h3 className="font-medium text-slate-200 mb-3">Most Sensitive Parameters</h3>
          <div className="space-y-3">
            {learnerData.sensitivity_advice.most_sensitive_parameters.map((param, index) => (
              <div key={index} className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-200">{param.param}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    param.impact_score > 0.7 ? 'bg-red-500/20 text-red-300' :
                    param.impact_score > 0.4 ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    Impact: {(param.impact_score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, param.impact_score * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tipping Points */}
        <div>
          <h3 className="font-medium text-slate-200 mb-3">Critical Thresholds</h3>
          <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <ul className="space-y-2">
              {learnerData.sensitivity_advice.tipping_points.map((point, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="flex-shrink-0 w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  </div>
                  <span className="text-slate-300 text-sm">
                    {point.param} threshold: {point.threshold}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExercise = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <GraduationCap className="w-6 h-6 mr-3 text-purple-400" />
        <h2 className="text-xl font-semibold text-slate-200">Interactive Exercise</h2>
      </div>

      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 mb-6">
        <h3 className="font-medium text-slate-200 mb-2">Task</h3>
        <p className="text-slate-300 mb-4">{learnerData.exercise.task}</p>

        <div className="space-y-3">
          <h4 className="font-medium text-slate-200 mb-2">Hints</h4>
          {learnerData.exercise.hints.map((hint, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs text-purple-400">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-300">
                  {hint}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSources = () => {
    // Collect all unique sources from decision table
    const allSources = new Map();
    learnerData.decision_table.forEach(row => {
      row.payoff_estimate.sources.forEach(source => {
        if (!allSources.has(source.id)) {
          allSources.set(source.id, {
            id: source.id,
            score: source.score,
            excerpt: source.excerpt || 'No excerpt available'
          });
        }
      });
    });

    if (allSources.size === 0) return null;

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center mb-4">
          <ExternalLink className="w-6 h-6 mr-3 text-emerald-400" />
          <h2 className="text-xl font-semibold text-slate-200">Evidence Sources</h2>
        </div>
        <div className="space-y-3">
          {Array.from(allSources.values()).map((source, index) => (
            <button
              key={source.id}
              onClick={() => onSourceClick?.(source.id)}
              className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-emerald-500 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center text-xs text-emerald-400">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-emerald-300">Source {source.id}</h3>
                  <p className="text-slate-400 text-sm line-clamp-2 mt-1">{source.excerpt}</p>
                  <p className="text-slate-500 text-xs mt-1">Relevance: {(source.score * 100).toFixed(1)}%</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-4">
        <BookOpen className="w-6 h-6 mr-3 text-emerald-400" />
        <h2 className="text-xl font-semibold text-slate-200">Strategic Summary</h2>
      </div>
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <p className="text-slate-300 leading-relaxed">
          {learnerData.summary.text}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderSummary()}
      {renderDecisionTable()}
      {renderExpectedValueRanking()}
      {renderSensitivityAdvice()}
      {renderExercise()}
      {renderSources()}
    </div>
  );
};

export default LearnerView;