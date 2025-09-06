// Researcher View Component
// Detailed analysis view with comprehensive summary, assumptions, payoff matrix, and data exports

import React from 'react';
import { Microscope, FileText, Grid3X3, Download, AlertCircle, ExternalLink, CheckCircle, XCircle, Notebook, Zap, Table, TrendingUp } from 'lucide-react';
import { AudienceViewProps, ResearcherViewData, SourceCitation } from '../../types/audience-views';
import EVWidget from '../EVWidget';

const ResearcherView: React.FC<AudienceViewProps> = ({
  analysisData,
  onSourceClick,
  isLoading = false,
  error
}) => {
  const handleDownload = (url?: string, filename?: string) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'export';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-2 text-slate-300">Loading researcher analysis...</span>
        </div>
      </div>
    );
  }

  if (!analysisData || analysisData.audience !== 'researcher') {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-yellow-500/20">
        <div className="text-yellow-400 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          No researcher analysis data available
        </div>
      </div>
    );
  }

  const researcherData = analysisData.data as ResearcherViewData;

  const renderSummary = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <FileText className="w-6 h-6 mr-3 text-purple-400" />
        <h2 className="text-xl font-semibold text-slate-200">Research Summary</h2>
      </div>
      <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
        <div className="prose prose-slate max-w-none">
          <div className="text-slate-300 leading-relaxed whitespace-pre-line">
            {researcherData.long_summary}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAssumptions = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <AlertCircle className="w-6 h-6 mr-3 text-amber-400" />
        <h2 className="text-xl font-semibold text-slate-200">Model Assumptions</h2>
      </div>

      <div className="space-y-4">
        {researcherData.assumptions.map((assumption, index) => (
          <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                assumption.evidence_strength === 'strong' ? 'bg-green-500/20' :
                assumption.evidence_strength === 'moderate' ? 'bg-yellow-500/20' :
                'bg-red-500/20'
              }`}>
                {assumption.evidence_strength === 'strong' ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : assumption.evidence_strength === 'moderate' ? (
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-slate-200 font-medium leading-relaxed">
                  {assumption.assumption}
                </p>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  {assumption.justification}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    assumption.evidence_strength === 'strong' ? 'bg-green-500/20 text-green-300' :
                    assumption.evidence_strength === 'moderate' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {assumption.evidence_strength} evidence
                  </span>
                  {assumption.source_ids && assumption.source_ids.length > 0 && (
                    <div className="flex space-x-2">
                      {assumption.source_ids.map(sourceId => (
                        <button
                          key={sourceId}
                          onClick={() => onSourceClick?.(sourceId)}
                          className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded transition-colors"
                        >
                          Source {sourceId}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPayoffMatrix = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <Grid3X3 className="w-6 h-6 mr-3 text-cyan-400" />
        <h2 className="text-xl font-semibold text-slate-200">Payoff Matrix</h2>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid grid-cols-1 gap-4">
            {researcherData.payoff_matrix.map((row, index) => (
              <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="text-sm font-medium text-slate-400 mb-2">Player 1: {row.player1_action}</div>
                    <div className="text-sm font-medium text-slate-400">Player 2: {row.player2_action}</div>
                  </div>
                  <div className="flex space-x-4">
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Player 1 Payoff</div>
                      <div className="text-lg font-mono text-cyan-400 bg-slate-600 px-3 py-1 rounded">
                        {row.payoffs[0]}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Player 2 Payoff</div>
                      <div className="text-lg font-mono text-emerald-400 bg-slate-600 px-3 py-1 rounded">
                        {row.payoffs[1]}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataExports = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <Download className="w-6 h-6 mr-3 text-green-400" />
        <h2 className="text-xl font-semibold text-slate-200">Data Exports</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {researcherData.data_exports?.payoff_csv_url && (
          <button
            onClick={() => handleDownload(researcherData.data_exports.payoff_csv_url, 'payoff-matrix.csv')}
            className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-green-500 transition-colors text-left"
          >
            <div className="flex items-center space-x-3 mb-2">
              <Grid3X3 className="w-5 h-5 text-green-400" />
              <span className="font-medium text-slate-200">Payoff Matrix CSV</span>
            </div>
            <p className="text-xs text-slate-400">Export payoff matrix as CSV</p>
          </button>
        )}

        {researcherData.data_exports?.simulations_json_url && (
          <button
            onClick={() => handleDownload(researcherData.data_exports.simulations_json_url, 'simulations.json')}
            className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-green-500 transition-colors text-left"
          >
            <div className="flex items-center space-x-3 mb-2">
              <Download className="w-5 h-5 text-green-400" />
              <span className="font-medium text-slate-200">Simulations JSON</span>
            </div>
            <p className="text-xs text-slate-400">Simulation results data</p>
          </button>
        )}

        {researcherData.data_exports?.json_url && (
          <button
            onClick={() => handleDownload(researcherData.data_exports.json_url, 'analysis-data.json')}
            className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-green-500 transition-colors text-left"
          >
            <div className="flex items-center space-x-3 mb-2">
              <Download className="w-5 h-5 text-green-400" />
              <span className="font-medium text-slate-200">Complete JSON</span>
            </div>
            <p className="text-xs text-slate-400">Full analysis data</p>
          </button>
        )}

        {researcherData.data_exports?.raw_data && (
          <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
            <div className="flex items-center space-x-3 mb-2">
              <Microscope className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-slate-200">Raw Data</span>
            </div>
            <pre className="text-xs text-slate-400 bg-slate-800 p-2 rounded overflow-x-auto max-h-32">
              {JSON.stringify(researcherData.data_exports.raw_data, null, 2).substring(0, 300)}...
            </pre>
          </div>
        )}
      </div>
    </div>
  );

  const renderNotebookGenerator = () => {
    if (!researcherData.notebook_snippet) return null;

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center mb-6">
          <Notebook className="w-6 h-6 mr-3 text-indigo-400" />
          <h2 className="text-xl font-semibold text-slate-200">Jupyter Notebook Generator</h2>
        </div>

        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium text-slate-200">Generated Analysis Notebook</span>
            <button
              onClick={() => handleDownload(`data:text/plain,${encodeURIComponent(researcherData.notebook_snippet)}`, 'analysis-notebook.ipynb')}
              className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-sm font-medium flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Notebook
            </button>
          </div>

          <pre className="text-xs text-slate-400 bg-slate-800 p-3 rounded overflow-x-auto max-h-64">
            {researcherData.notebook_snippet}
          </pre>
        </div>
      </div>
    );
  };

  const renderSensitivitySuite = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <Zap className="w-6 h-6 mr-3 text-yellow-400" />
        <h2 className="text-xl font-semibold text-slate-200">Sensitivity Analysis Suite</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <h3 className="font-medium text-slate-200 mb-3">Parameter Sensitivity Results</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {researcherData.simulation_results?.sensitivity?.param_samples?.map((sample, index) => (
              <div key={index} className="bg-slate-600 rounded p-3 border border-slate-500">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300 font-medium">{sample.param}</span>
                  <span className="text-yellow-400 text-sm">
                    Effect: {(sample.effect_on_outcome * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  Range: {sample.range[0]} to {sample.range[1]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick sensitivity test button */}
        <button
          className="w-full px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg border border-yellow-500/40 hover:border-yellow-500/60 transition-colors"
        >
          <div className="flex items-center justify-center">
            <Zap className="w-5 h-5 mr-2" />
            Run New Sensitivity Analysis
          </div>
        </button>
      </div>
    </div>
  );

  const renderSources = () => {
    if (!researcherData.sources || researcherData.sources.length === 0) return null;

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center mb-4">
          <ExternalLink className="w-6 h-6 mr-3 text-purple-400" />
          <h2 className="text-xl font-semibold text-slate-200">Sources</h2>
        </div>
        <div className="space-y-3">
          {researcherData.sources.map((source, index) => (
            <button
              key={source.id}
              onClick={() => onSourceClick?.(source.id)}
              className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-purple-500 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center text-xs text-purple-400">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-purple-300 truncate">{source.title}</h3>
                  <p className="text-slate-400 text-sm line-clamp-2 mt-1">{source.snippet}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    {source.url && (
                      <p className="text-slate-500 text-xs truncate">{source.url}</p>
                    )}
                    {source.relevance_score && (
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        {Math.round(source.relevance_score * 100)}% relevant
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderDecisionWidgets = () => {
    // Check if we have decision table data from the analysis
    const analysis = analysisData as any; // Type assertion for accessing decision data
    if (analysis?.decision_table && analysis?.expected_value_ranking) {
      return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center mb-6">
            <Table className="w-6 h-6 mr-3 text-cyan-400" />
            <h2 className="text-xl font-semibold text-slate-200">Decision Analysis</h2>
          </div>

          {/* Decision Table */}
          <div className="mb-6">
            <h3 className="font-medium text-slate-200 mb-3">Decision Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left p-3 text-slate-300 font-medium">Actor</th>
                    <th className="text-left p-3 text-slate-300 font-medium">Action</th>
                    <th className="text-center p-3 text-slate-300 font-medium">Payoff</th>
                    <th className="text-center p-3 text-slate-300 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.decision_table.map((row: any, index: number) => (
                    <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="p-3 text-slate-300 font-medium">{row.actor}</td>
                      <td className="p-3 text-slate-300">{row.action}</td>
                      <td className="p-3 text-center">
                        <div className="text-sm font-mono text-blue-400">
                          {Number(row.payoff_estimate?.value ?? 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="text-sm text-slate-400">
                          {(Number(row.payoff_estimate?.confidence ?? 0) * 100).toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* EV Ranking */}
          <div>
            <h3 className="font-medium text-slate-200 mb-3">Expected Value Ranking</h3>
            <div className="space-y-3">
              {analysis.expected_value_ranking.map((item: any, index: number) => (
                <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-200">{item.action}</h4>
                    <span className="text-lg font-mono text-blue-400">
                      EV: {Number(item.ev).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    EV Confidence: {(Number(item.ev_confidence ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {renderSummary()}
      {renderAssumptions()}
      {renderPayoffMatrix()}
      {renderDecisionWidgets()}
      {renderDataExports()}
      {renderNotebookGenerator()}
      {renderSensitivitySuite()}
      {renderSources()}
    </div>
  );
};

export default ResearcherView;