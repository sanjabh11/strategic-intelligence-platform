// Student View Component
// Simplified analysis view for student audience with summary, key actions, terms, and quiz

import React from 'react';
import { GraduationCap, Target, BookOpen, HelpCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { AudienceViewProps, StudentViewData, SourceCitation } from '../../types/audience-views';

const StudentView: React.FC<AudienceViewProps> = ({
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <span className="ml-2 text-slate-300">Loading student analysis...</span>
        </div>
      </div>
    );
  }

  if (!analysisData || analysisData.audience !== 'student') {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-yellow-500/20">
        <div className="text-yellow-400 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          No student analysis data available
        </div>
      </div>
    );
  }

  const studentData = analysisData.data as StudentViewData;

  const renderSummary = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-4">
        <GraduationCap className="w-6 h-6 mr-3 text-cyan-400" />
        <h2 className="text-xl font-semibold text-slate-200">Strategic Summary</h2>
      </div>
      <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <p className="text-slate-300 leading-relaxed">
          {studentData.one_paragraph_summary.text}
        </p>
      </div>
    </div>
  );

  const renderTopActions = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-4">
        <Target className="w-6 h-6 mr-3 text-emerald-400" />
        <h2 className="text-xl font-semibold text-slate-200">Key Actions</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {studentData.top_2_actions.map((action, index) => (
          <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">{index + 1}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-200 mb-2">
                  {action.action}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-2">
                  {action.rationale}
                </p>
                <div className="text-xs text-slate-500">
                  Expected Outcome: {action.expected_outcome.value.toFixed(2)}
                  (Confidence: {(action.expected_outcome.confidence * 100).toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderKeyTerms = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-4">
        <BookOpen className="w-6 h-6 mr-3 text-purple-400" />
        <h2 className="text-xl font-semibold text-slate-200">Key Terms</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {studentData.key_terms.map((term, index) => (
          <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <h3 className="font-medium text-purple-300 mb-2">{term.term}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              {term.definition}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuiz = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-4">
        <HelpCircle className="w-6 h-6 mr-3 text-blue-400" />
        <h2 className="text-xl font-semibold text-slate-200">Knowledge Check</h2>
      </div>

      <div className="space-y-6">
        {studentData.two_quiz_questions.map((question, qIndex) => (
          <div key={qIndex} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-200">
                {qIndex + 1}. {question.q}
              </h3>
              <span className={`px-2 py-1 rounded text-xs ${
                question.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {question.difficulty}
              </span>
            </div>
            <div className="bg-slate-600 rounded-lg p-3 border border-slate-500">
              <p className="text-sm text-slate-300">
                <strong>Answer:</strong> {question.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSources = () => {
    // Collect all unique sources from actions
    const allSources = new Map();
    studentData.top_2_actions.forEach(action => {
      action.expected_outcome.sources.forEach(source => {
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
          <ExternalLink className="w-6 h-6 mr-3 text-cyan-400" />
          <h2 className="text-xl font-semibold text-slate-200">Evidence Sources</h2>
        </div>
        <div className="space-y-3">
          {Array.from(allSources.values()).map((source, index) => (
            <button
              key={source.id}
              onClick={() => onSourceClick?.(source.id)}
              className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-cyan-500 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 rounded flex items-center justify-center text-xs text-cyan-400">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-cyan-300">Source {source.id}</h3>
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

  return (
    <div className="space-y-6">
      {renderSummary()}
      {renderTopActions()}
      {renderKeyTerms()}
      {renderQuiz()}
      {renderSources()}
    </div>
  );
};

export default StudentView;