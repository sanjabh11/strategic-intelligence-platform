import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Eye, FileText, Users, TrendingUp, Table, AlertCircle, MessageSquare } from 'lucide-react';
import { ENDPOINTS, getAuthHeaders } from '../lib/supabase';

interface ReviewItem {
  id: string;
  scenario_text: string;
  created_at: string;
  audience: string;
  summary?: string;
  review_reason: string;
  reviewer_guidance: string;
  evidence_backed: boolean;
  retrieval_count: number;
  analysis_json?: any;
}

interface ReviewQueueResponse {
  ok: boolean;
  reviews: ReviewItem[];
  total_pending: number;
  reviewer_prompt: string;
}

interface ReviewResponse {
  ok: boolean;
  analysis_id: string;
  action: 'approve' | 'reject';
  review_id: string;
  reviewed_at: string;
  message?: string;
}

const HumanReview: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showRawJson, setShowRawJson] = useState<Record<string, boolean>>({});
  const [expandedExcerpt, setExpandedExcerpt] = useState<Record<string, number | null>>({});
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [recomputing, setRecomputing] = useState<string | null>(null);
  const [runningSensitivity, setRunningSensitivity] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(ENDPOINTS.HUMAN_REVIEW_QUEUE, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }

      const data: ReviewQueueResponse = await response.json();

      if (!data.ok) {
        throw new Error('API returned error');
      }

      setReviews(data.reviews);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (analysisId: string, action: 'approve' | 'reject') => {
    try {
      setSubmittingReview(analysisId);
      const reviewNotes = notes[analysisId] || '';
      const editedJson = editedData[analysisId];

      const response = await fetch(`${ENDPOINTS.HUMAN_REVIEW_POST}/${analysisId}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action,
          notes: reviewNotes,
          edited_data: editedJson ? { ...editedJson } : null
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit review: ${response.statusText}`);
      }

      const data: ReviewResponse = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Review submission failed');
      }

      // Remove the reviewed item from the list
      setReviews(prev => prev.filter(r => r.id !== analysisId));
      setNotes(prev => { const newNotes = { ...prev }; delete newNotes[analysisId]; return newNotes; });

      console.log(`Review ${action}d successfully:`, data);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmittingReview(null);
    }
  };

  const handleRecomputeEV = async (review: ReviewItem) => {
    try {
      setRecomputing(review.id);
      const editedJson = editedData[review.id] || review.analysis_json;
      const payload = {
        actions: (editedJson.decision_table || []).map((row: any) => ({
          actor: row.actor,
          action: row.action,
          payoff_estimate: {
            value: row.payoff_estimate?.value || 0,
            confidence: row.payoff_estimate?.confidence || 0.5,
            sources: row.payoff_estimate?.sources || []
          }
        }))
      };

      const response = await fetch(`${ENDPOINTS.ANALYZE}?recompute=true`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to recompute EV: ${response.statusText}`);
      }

      const data = await response.json();
      const newAnalysis = { ...editedJson, expected_value_ranking: data.expected_value_ranking || editedJson.expected_value_ranking };
      setEditedData(prev => ({ ...prev, [review.id]: newAnalysis }));
      console.log('EV recomputed successfully');
    } catch (err) {
      console.error('Error recomputing EV:', err);
      setError(err instanceof Error ? err.message : 'Failed to recompute EV');
    } finally {
      setRecomputing(null);
    }
  };

  const handleSensitivityRun = async (review: ReviewItem) => {
    try {
      setRunningSensitivity(review.id);
      const editedJson = editedData[review.id] || review.analysis_json;
      const avgPayoff = (editedJson.decision_table || []).reduce((acc: number, row: any) => acc + (row.payoff_estimate?.value || 0), 0) / (editedJson.decision_table?.length || 1);
      const baseParams = {
        risk_tolerance: avgPayoff / 10, // Scale to 0-1
        time_horizon: 1.0,
        resource_availability: 0.8,
        stakeholder_alignment: avgPayoff / 100 // Another scale
      };

      const response = await fetch(`${ENDPOINTS.ANALYZE.replace('analyze-engine', 'sensitivity-analysis')}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          analysis_id: review.id,
          base_params: baseParams
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to run sensitivity analysis: ${response.statusText}`);
      }

      const data = await response.json();
      setEditedData(prev => ({
        ...prev,
        [review.id]: { ...editedJson, sensitivity_results: data.sensitivity_results }
      }));
      console.log('Sensitivity analysis completed successfully');
    } catch (err) {
      console.error('Error running sensitivity analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to run sensitivity analysis');
    } finally {
      setRunningSensitivity(null);
    }
  };

  const renderDecisionTable = (analysisJson: any, reviewId: string) => {
    if (!analysisJson?.decision_table) return null;

    const editedTable = editedData[reviewId]?.decision_table || analysisJson.decision_table;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-slate-200 mb-2">Decision Table</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-600">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left p-2 text-slate-300 font-medium">Actor</th>
                <th className="text-left p-2 text-slate-300 font-medium">Action</th>
                <th className="text-center p-2 text-slate-300 font-medium">Payoff (Editable)</th>
                <th className="text-left p-2 text-slate-300 font-medium">Risk Notes</th>
              </tr>
            </thead>
            <tbody>
              {editedTable.map((row: any, index: number) => (
                <tr key={index} className="border-b border-slate-700">
                  <td className="p-2 text-slate-300">{row.actor}</td>
                  <td className="p-2 text-slate-300">{row.action}</td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      step="0.01"
                      value={row.payoff_estimate?.value || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const newData = { ...editedData };
                        if (!newData[reviewId]) newData[reviewId] = { ...analysisJson };
                        if (!newData[reviewId].decision_table) newData[reviewId].decision_table = [...editedTable];
                        newData[reviewId].decision_table[index] = {
                          ...row,
                          payoff_estimate: { ...row.payoff_estimate, value }
                        };
                        setEditedData(newData);
                      }}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-center text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="p-2 text-slate-300">{row.risk_notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderExpectedValueRanking = (analysisJson: any, reviewId: string) => {
    if (!analysisJson?.expected_value_ranking) return null;

    const editedRanking = editedData[reviewId]?.expected_value_ranking || analysisJson.expected_value_ranking;

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-slate-200 mb-2">Expected Value Ranking (Editable)</h4>
        <div className="space-y-2">
          {editedRanking.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-2 bg-slate-700 rounded">
              <span className="text-slate-300">{item.action}</span>
              <input
                type="number"
                step="0.01"
                value={item.ev || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  const newData = { ...editedData };
                  if (!newData[reviewId]) newData[reviewId] = { ...analysisJson };
                  if (!newData[reviewId].expected_value_ranking) newData[reviewId].expected_value_ranking = [...editedRanking];
                  newData[reviewId].expected_value_ranking[index] = { ...item, ev: value };
                  setEditedData(newData);
                }}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-center text-blue-400 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReviewCard = (review: ReviewItem) => (
    <div key={review.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-slate-200">Analysis {review.id.slice(0, 8)}</h3>
            <span className={`px-2 py-1 rounded text-xs ${
              review.audience === 'geopolitical' ? 'bg-red-500/20 text-red-300' :
              review.audience === 'strategic' ? 'bg-blue-500/20 text-blue-300' :
              'bg-slate-500/20 text-slate-300'
            }`}>
              {review.audience}
            </span>
            {review.evidence_backed && (
              <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-300">
                Evidence Based
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Created: {new Date(review.created_at).toLocaleDateString()} •
            Sources: {review.retrieval_count}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-slate-400" />
          <Clock className="w-4 h-4 text-yellow-400" />
        </div>
      </div>

      {/* Scenario Text */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-200 mb-1">Scenario</h4>
        <p className="text-slate-300 text-sm">{review.scenario_text}</p>
      </div>

      {/* Summary */}
      {review.summary && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-200 mb-1">Summary</h4>
          <p className="text-slate-300 text-sm">{review.summary}</p>
        </div>
      )}

      {/* Retrieval Excerpts */}
      {review.retrieval_count > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-200 mb-2">Retrieval Excerpts ({review.retrieval_count})</h4>
          {review.analysis_json?.retrieval_excerpts?.map((excerpt: any, idx: number) => (
            <div key={idx} className="mb-2">
              <button
                onClick={() => setExpandedExcerpt(prev => ({ ...prev, [review.id]: prev[review.id] === idx ? null : idx }))}
                className="text-left w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
              >
                Excerpt {idx + 1}: {excerpt.title || excerpt.text?.substring(0, 50)}...
              </button>
              {expandedExcerpt[review.id] === idx && (
                <div className="mt-2 p-3 bg-slate-900 border border-slate-600 rounded text-xs text-slate-300">
                  {excerpt.text || excerpt.content}
                </div>
              )}
            </div>
          )) || (
            <p className="text-slate-500 text-sm">No excerpts available or not loaded.</p>
          )}
        </div>
      )}

      {/* Decision Table */}
      {review.analysis_json && renderDecisionTable(review.analysis_json, review.id)}

      {/* Expected Value Ranking */}
      {review.analysis_json && renderExpectedValueRanking(review.analysis_json, review.id)}

      {/* Action Buttons */}
      {review.analysis_json?.expected_value_ranking && (
        <div className="mt-4 flex space-x-3">
          <button
            onClick={() => handleRecomputeEV(review)}
            disabled={recomputing === review.id}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors"
          >
            {recomputing === review.id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            <span>Recompute EV</span>
          </button>

          <button
            onClick={() => handleSensitivityRun(review)}
            disabled={runningSensitivity === review.id}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg font-medium transition-colors"
          >
            {runningSensitivity === review.id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>Sensitivity Run</span>
          </button>
        </div>
      )}

      {/* Raw LLM JSON */}
      {review.analysis_json && (
        <div className="mt-4">
          <button
            onClick={() => setShowRawJson(prev => ({ ...prev, [review.id]: !prev[review.id] }))}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
          >
            <FileText className="w-4 h-4" />
            <span>{showRawJson[review.id] ? 'Hide' : 'Show'} Raw LLM JSON</span>
          </button>
          {showRawJson[review.id] && (
            <pre className="mt-2 p-3 bg-slate-900 border border-slate-600 rounded text-xs text-slate-300 overflow-x-auto max-h-60">
              {JSON.stringify(review.analysis_json, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Reviewer Guidance */}
      <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
          <div>
            <p className="text-yellow-300 text-sm font-medium">Review Guidance</p>
            <p className="text-yellow-200 text-xs">{review.reviewer_guidance}</p>
            <p className="text-yellow-200 text-xs mt-1">{review.review_reason}</p>
          </div>
        </div>
      </div>

      {/* Review Actions */}
      <div className="border-t border-slate-700 pt-4">
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-200 mb-2">Review Notes (Optional)</label>
          <textarea
            value={notes[review.id] || ''}
            onChange={(e) => setNotes(prev => ({ ...prev, [review.id]: e.target.value }))}
            placeholder="Add any notes about your review decision..."
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 placeholder-slate-500 text-sm resize-none"
            rows={2}
          />
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleReview(review.id, 'approve')}
            disabled={submittingReview === review.id}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg font-medium transition-colors"
          >
            {submittingReview === review.id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Approve
          </button>
          <button
            onClick={() => handleReview(review.id, 'reject')}
            disabled={submittingReview === review.id}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg font-medium transition-colors"
          >
            {submittingReview === review.id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Reject
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mr-3"></div>
          <span className="text-slate-300">Loading reviews...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-red-500/20">
        <div className="flex items-center text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchReviews}
          className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
        <div className="text-center text-slate-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No analyses pending review</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-200">Human Review Queue</h1>
            <p className="text-slate-400 text-sm mt-1">{reviews.length} analyses pending review</p>
          </div>
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-slate-400" />
            <span className="text-slate-300 text-sm">Review Workflow</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {reviews.map(renderReviewCard)}
      </div>
    </div>
  );
};

export default HumanReview;