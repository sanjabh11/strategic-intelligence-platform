// Firecrawl Research Dashboard Component
import React, { useState } from 'react';
import { supabase, isLocalMode } from '../lib/supabase';
import { Loader2, Globe, Search, Link, AlertCircle, CheckCircle, ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useStrategyAnalysis } from '../hooks/useStrategyAnalysis';

interface FirecrawlResult {
  id: string;
  title: string;
  content: string;
  url: string;
  source_type: 'web';
  relevance_score: number;
  credibility_score: number;
  temporal_distance: number;
  citation_format: {
    apa: string;
    mla: string;
    chicago: string;
  };
  metadata?: {
    pageTitle: string;
    description?: string;
    publishDate?: string;
    lastModified?: string;
    author?: string;
    siteName: string;
    wordCount: number;
    readingTime: number;
  };
}

interface FirecrawlResponse {
  ok: boolean;
  response: {
    runId: string;
    evidence: FirecrawlResult[];
    processingStats: {
      pagesScraped: number;
      processingTimeMs: number;
      apiCalls: number;
      cacheHits: number;
    };
    qualityMetrics: {
      dataFreshness: number;
      sourceCredibility: number;
      relevanceScore: number;
    };
  };
  message?: string;
}

const FirecrawlDashboard: React.FC = () => {
  const { analysis } = useStrategyAnalysis();
  const [mode, setMode] = useState<'scrape' | 'search'>('search');
  const [query, setQuery] = useState('');
  const [urls, setUrls] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FirecrawlResult[]>([]);
  const [processingStats, setProcessingStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runId = crypto.randomUUID();

  const handleAddUrl = () => {
    setUrls([...urls, '']);
  };

  const handleRemoveUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleResearch = async () => {
    if (isLocalMode) {
      setError('Web research is disabled in local/demo mode. Enable cloud mode to use Firecrawl.');
      return;
    }
    if (mode === 'search' && !query.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (mode === 'scrape' && !urls.some(url => url.trim())) {
      setError('Please enter at least one URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setProcessingStats(null);

    try {
      let firecrawlRequest;

      if (mode === 'search') {
        firecrawlRequest = {
          runId,
          mode: 'search',
          query: query.trim(),
          config: {
            maxPages: 5,
            returnFormat: 'markdown',
            includeMetadata: true,
            extractSchemas: false
          },
          context: {
            domain: 'strategic-research',
            stakeholders: ['researcher', 'analyst'],
            strategicContext: query.trim()
          }
        };
      } else {
        firecrawlRequest = {
          runId,
          mode: 'scrape',
          urls: urls.filter(url => url.trim()),
          config: {
            returnFormat: 'markdown',
            includeMetadata: true,
            extractSchemas: true
          },
          context: {
            domain: 'web-analysis',
            stakeholders: ['intelligence-analyst'],
            strategicContext: 'Strategic web research and content analysis'
          }
        };
      }

      const { data, error } = await supabase.functions.invoke('firecrawl-research', {
        body: firecrawlRequest
      });

      if (error) {
        throw error;
      }

      const response: FirecrawlResponse = data;

      if (!response.ok) {
        throw new Error(response.message || 'Research request failed');
      }

      setResults(response.response.evidence || []);
      setProcessingStats(response.response.processingStats);

    } catch (err) {
      console.error('Firecrawl research error:', err);
      setError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toLocaleDateString();
  };

  const getCredibilityColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRelevanceColor = (score: number): string => {
    if (score >= 0.8) return 'text-emerald-400';
    if (score >= 0.6) return 'text-blue-400';
    return 'text-purple-400';
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Globe className="w-6 h-6 mr-3 text-blue-400" />
          <h2 className="text-2xl font-semibold text-slate-200">Web Research Dashboard</h2>
        </div>
        <div className="text-sm text-slate-400">
          Powered by Firecrawl API
        </div>
      </div>

      {/* Local mode notice */}
      {isLocalMode && (
        <div className="bg-amber-900/40 border border-amber-600 text-amber-200 rounded-lg p-3 mb-4 flex items-start">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5" />
          <div>
            Firecrawl is disabled in local/demo mode. Switch to cloud mode and configure keys to enable.
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setMode('search')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              mode === 'search'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Search className="w-4 h-4 mr-2" />
            Web Search
          </button>
          <button
            onClick={() => setMode('scrape')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              mode === 'scrape'
                ? 'bg-green-600 border-green-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Link className="w-4 h-4 mr-2" />
            URL Scrape
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-4 mb-6">
        {mode === 'search' ? (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search Query
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter strategic search terms (e.g., 'Apple AI strategy competition markets')"
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              URLs to Scrape
            </label>
            {urls.map((url, index) => (
              <div key={index} className="flex space-x-2 mb-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(index, e.target.value)}
                  placeholder="https://example.com/company-intelligence"
                  className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-slate-400"
                />
                {urls.length > 1 && (
                  <button
                    onClick={() => handleRemoveUrl(index)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddUrl}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + Add another URL
            </button>
          </div>
        )}

        {/* Research Button */}
        <button
          onClick={handleResearch}
          disabled={loading || isLocalMode}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              {mode === 'search' ? <Search className="w-5 h-5 mr-2" /> : <Link className="w-5 h-5 mr-2" />}
              {mode === 'search' ? 'Search Web' : 'Scrape URLs'}
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Processing Stats */}
      {processingStats && (
        <div className="bg-slate-700 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-slate-300 mb-3">Processing Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-mono text-cyan-400">{processingStats.pagesScraped}</div>
              <div className="text-sm text-slate-400">Pages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-green-400">{processingStats.processingTimeMs}ms</div>
              <div className="text-sm text-slate-400">Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-blue-400">{processingStats.apiCalls}</div>
              <div className="text-sm text-slate-400">API Calls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono text-purple-400">{processingStats.cacheHits}</div>
              <div className="text-sm text-slate-400">Cache Hits</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {results.length > 0 && (
        <div>
          <h3 className="font-medium text-slate-300 mb-4">
            Found {results.length} Strategic Intelligence Sources
          </h3>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={result.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-200 mb-2 truncate">{result.title}</h4>
                    <div className="flex items-center space-x-4 mb-2 text-sm">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        {result.metadata?.siteName || 'Web Source'}
                      </a>
                      <span className="text-slate-400">
                        {result.temporal_distance === 0 ? 'Today' : `${result.temporal_distance} days ago`}
                        {result.metadata?.publishDate && ` (${formatDate(result.temporal_distance)})`}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <div className="text-center">
                      <div className={`font-mono text-sm ${getCredibilityColor(result.credibility_score)}`}>
                        {(result.credibility_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-400">Credibility</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-mono text-sm ${getRelevanceColor(result.relevance_score)}`}>
                        {(result.relevance_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-400">Relevance</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 rounded p-3 mb-3">
                  <p className="text-slate-300 text-sm line-clamp-3">
                    {result.content.length > 300
                      ? `${result.content.substring(0, 300)}...`
                      : result.content
                    }
                  </p>
                </div>

                {result.metadata && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.metadata.wordCount && (
                      <span className="px-2 py-1 bg-slate-600 text-xs text-slate-400 rounded">
                        {result.metadata.wordCount.toLocaleString()} words
                      </span>
                    )}
                    {result.metadata.readingTime && (
                      <span className="px-2 py-1 bg-slate-600 text-xs text-slate-400 rounded">
                        ~{result.metadata.readingTime} min read
                      </span>
                    )}
                    {result.metadata.author && (
                      <span className="px-2 py-1 bg-slate-600 text-xs text-slate-400 rounded">
                        By {result.metadata.author}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2">
                  <button
                    className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Relevant
                  </button>
                  <button
                    className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  >
                    <ThumbsDown className="w-3 h-3 mr-1" />
                    Not Relevant
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FirecrawlDashboard;