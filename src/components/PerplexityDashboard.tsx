// Perplexity Dashboard Component - External Sources Display (Ph4.md compliant)
import React, { useState } from 'react';
import { ExternalLink, Search, Database, CheckCircle2, AlertTriangle, Globe, FileText, RefreshCw, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import type { AnalysisResult, Retrieval } from '../types/strategic-analysis';

interface PerplexityDashboardProps {
  analysis: AnalysisResult;
  onRefresh?: () => void;
  onRequestReview?: () => void;
  rateLimitInfo?: {
    isRateLimited: boolean;
    retryAfter?: number;
    message?: string;
  };
}

const PerplexityDashboard: React.FC<PerplexityDashboardProps> = ({
  analysis,
  onRefresh,
  onRequestReview,
  rateLimitInfo
}) => {
  const { retrievals, retrieval_count, provenance } = analysis;
  const hasRetrievals = retrievals && retrievals.length > 0;
  const displayCount = retrieval_count || retrievals?.length || 0;
  const isEvidenceBacked = provenance?.evidence_backed;
  const retrievalIds = provenance?.retrieval_ids || [];

  const [isCollapsed, setIsCollapsed] = useState(true);

  // Format retry after time
  const formatRetryAfter = (seconds?: number) => {
    if (!seconds) return 'later';
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
    return `${Math.ceil(seconds / 3600)} hours`;
  };

  // Rate limit banner
  const RateLimitBanner = () => {
    if (!rateLimitInfo?.isRateLimited) return null;

    return (
      <div className="mb-6 bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-yellow-400 font-medium mb-1">Rate Limit Exceeded</h3>
            <p className="text-yellow-200 text-sm mb-3">
              {rateLimitInfo.message || 'API rate limit reached. Please wait before trying again.'}
            </p>
            {rateLimitInfo.retryAfter && (
              <p className="text-yellow-300 text-sm mb-3">
                You can retry in approximately {formatRetryAfter(rateLimitInfo.retryAfter)}.
              </p>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={rateLimitInfo.retryAfter && rateLimitInfo.retryAfter > 60}
                className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                {rateLimitInfo.retryAfter && rateLimitInfo.retryAfter > 60 ? 'Wait to Retry' : 'Retry Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Empty state
  if (!hasRetrievals) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center mb-4">
          <Search className="w-5 h-5 mr-2 text-cyan-400" />
          <h4 className="text-xl font-semibold text-white">External Sources & Citations</h4>
        </div>
        
        <div className="text-center py-8">
          <Database className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg mb-2">No external sources retrieved</p>
          <p className="text-slate-500 text-sm">
            This analysis was conducted using internal knowledge without external research.
          </p>
        </div>
        
        {/* Evidence status when no retrievals */}
        {provenance?.evidence_backed !== undefined && (
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-center">
              <div className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                provenance.evidence_backed 
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700'
                  : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
              }`}>
                {provenance.evidence_backed ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mr-2" />
                )}
                {provenance.evidence_backed ? 'Evidence-Backed Analysis' : 'Internal Knowledge Only'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      {/* Rate Limit Banner */}
      <RateLimitBanner />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center text-slate-400 hover:text-slate-200 mr-2"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <Search className="w-5 h-5 mr-2 text-cyan-400" />
          <h4 className="text-xl font-semibold text-white">Evidence & Retrievals</h4>
        </div>

        <div className="flex items-center space-x-4">
          {/* Source count badge */}
          <div className="bg-cyan-900/30 border border-cyan-700 px-3 py-2 rounded-lg">
            <div className="flex items-center text-cyan-400">
              <Globe className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">{displayCount} Sources</span>
            </div>
          </div>

          {/* Evidence status */}
          {provenance?.evidence_backed !== undefined && (
            <div className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
              isEvidenceBacked
                ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700'
                : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
            }`}>
              {isEvidenceBacked ? (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              {isEvidenceBacked ? `Evidence-backed (${displayCount} sources)` : 'UNVERIFIED'}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center px-3 py-2 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-700 rounded-lg text-blue-400 text-sm font-medium transition-colors"
                title="Force refresh evidence sources"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            )}

            {onRequestReview && !isEvidenceBacked && (
              <button
                onClick={onRequestReview}
                className="flex items-center px-3 py-2 bg-orange-900/30 hover:bg-orange-800/40 border border-orange-700 rounded-lg text-orange-400 text-sm font-medium transition-colors"
                title="Request human review"
              >
                <Shield className="w-4 h-4 mr-2" />
                Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Render content only if not collapsed */}
      {!isCollapsed && (
        <>
          {/* Retrievals Grid */}
          <div className="space-y-4">
            {retrievals.map((retrieval, index) => (
              <RetrievalCard key={retrieval.id || index} retrieval={retrieval} index={index} />
            ))}
          </div>

          {/* Footer metadata */}
          <div className="mt-6 pt-4 border-t border-slate-700 text-sm text-slate-400">
            <p className="text-center">
              External sources retrieved and analyzed to enhance strategic insights with real-world context
            </p>
          </div>
        </>
      )}
    </div>
  );
};

// Individual retrieval card component (Ph4.md enhanced)
interface RetrievalCardProps {
  retrieval: Retrieval;
  index: number;
}

const RetrievalCard: React.FC<RetrievalCardProps> = ({ retrieval, index }) => {
  const { id, title, url, snippet, source, score } = retrieval;

  // Utility to extract domain from URL
  const getDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Unknown Source';
    }
  };

  // Utility to truncate snippet if too long
  const truncateSnippet = (text: string, maxLength: number = 300): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Get source type badge
  const getSourceBadge = (source: string) => {
    const badges = {
      perplexity: { color: 'bg-purple-900/40 text-purple-400', label: 'AI' },
      uncomtrade: { color: 'bg-blue-900/40 text-blue-400', label: 'Trade' },
      worldbank: { color: 'bg-green-900/40 text-green-400', label: 'Econ' },
      gdelt: { color: 'bg-orange-900/40 text-orange-400', label: 'News' },
      imf: { color: 'bg-red-900/40 text-red-400', label: 'Finance' }
    };
    return badges[source as keyof typeof badges] || { color: 'bg-gray-900/40 text-gray-400', label: 'EXT' };
  };

  const sourceBadge = getSourceBadge(source);

  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-cyan-500/50 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="bg-cyan-900/40 text-cyan-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium mr-3">
            {index + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center mb-1">
              <h5 className="font-medium text-white text-sm leading-tight group-hover:text-cyan-300 transition-colors">
                {title || 'Untitled Source'}
              </h5>
              <div className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${sourceBadge.color}`}>
                {sourceBadge.label}
              </div>
            </div>
            <div className="flex items-center text-xs text-slate-400">
              <Globe className="w-3 h-3 mr-1" />
              <span>{getDomain(url)}</span>
              {score && (
                <>
                  <span className="mx-2">•</span>
                  <span>Score: {score.toFixed(2)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* External link button */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-slate-400 hover:text-cyan-400 transition-colors ml-4 group-hover:scale-105"
          title="Open source in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Snippet */}
      {snippet && (
        <div className="bg-slate-600/50 rounded-lg p-3 border border-slate-600">
          <div className="flex items-start">
            <FileText className="w-4 h-4 text-slate-400 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-slate-300 text-sm leading-relaxed">
              {truncateSnippet(snippet)}
            </p>
          </div>
        </div>
      )}

      {/* Retrieval ID for provenance (hidden in production) */}
      {process.env.NODE_ENV === 'development' && id && (
        <div className="mt-2 text-xs text-slate-500 font-mono">
          Retrieval ID: {id}
        </div>
      )}
    </div>
  );
};

export default PerplexityDashboard;