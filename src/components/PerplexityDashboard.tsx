// Perplexity Dashboard Component - External Sources Display
import React from 'react';
import { ExternalLink, Search, Database, CheckCircle2, AlertTriangle, Globe, FileText } from 'lucide-react';
import type { AnalysisResult, Retrieval } from '../types/strategic-analysis';

interface PerplexityDashboardProps {
  analysis: AnalysisResult;
}

const PerplexityDashboard: React.FC<PerplexityDashboardProps> = ({ analysis }) => {
  const { retrievals, retrieval_count, provenance } = analysis;
  const hasRetrievals = retrievals && retrievals.length > 0;
  const displayCount = retrieval_count || retrievals?.length || 0;

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Search className="w-5 h-5 mr-2 text-cyan-400" />
          <h4 className="text-xl font-semibold text-white">External Sources & Citations</h4>
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
              provenance.evidence_backed 
                ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700'
                : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
            }`}>
              {provenance.evidence_backed ? (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              {provenance.evidence_backed ? 'Evidence-Backed' : 'Limited Evidence'}
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
};

// Individual retrieval card component
interface RetrievalCardProps {
  retrieval: Retrieval;
  index: number;
}

const RetrievalCard: React.FC<RetrievalCardProps> = ({ retrieval, index }) => {
  const { id, title, url, snippet } = retrieval;
  
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

  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-cyan-500/50 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="bg-cyan-900/40 text-cyan-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium mr-3">
            {index + 1}
          </div>
          <div className="flex-1">
            <h5 className="font-medium text-white text-sm leading-tight mb-1 group-hover:text-cyan-300 transition-colors">
              {title || 'Untitled Source'}
            </h5>
            <div className="flex items-center text-xs text-slate-400">
              <Globe className="w-3 h-3 mr-1" />
              <span>{getDomain(url)}</span>
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
      
      {/* Source ID for debugging (hidden in production) */}
      {process.env.NODE_ENV === 'development' && id && (
        <div className="mt-2 text-xs text-slate-500 font-mono">
          ID: {id}
        </div>
      )}
    </div>
  );
};

export default PerplexityDashboard;