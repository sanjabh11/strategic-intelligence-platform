// Local Query History Cache Hook
// Manages browser localStorage for storing last 5 strategic analysis queries

import { useState, useEffect, useCallback } from 'react';
import type { AnalysisResult } from '../types/strategic-analysis';

export interface CachedQuery {
  id: string;
  query: string;
  timestamp: string;
  analysisResult: AnalysisResult | null;
  mode: 'standard' | 'education_quick';
  processingTimeMs?: number;
  externalSourcesCount: number;
  hash: string; // For deduplication
}

const CACHE_KEY = 'strategic-queries-history';
const MAX_CACHE_ENTRIES = 5;
const CACHE_EXPIRY_DAYS = 7;

export const useQueryHistoryCache = () => {
  const [cachedQueries, setCachedQueries] = useState<CachedQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate hash for query deduplication
  const generateQueryHash = (query: string): string => {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  };

  // Load cache from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CachedQuery[];

        // Filter out expired entries
        const now = new Date().getTime();
        const validQueries = parsed.filter(query => {
          const queryTime = new Date(query.timestamp).getTime();
          return (now - queryTime) < (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        });

        setCachedQueries(validQueries);
      }
    } catch (error) {
      console.warn('Failed to load query history cache:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save cache to localStorage
  const saveCacheToStorage = useCallback((queries: CachedQuery[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(queries));
    } catch (error) {
      console.warn('Failed to save query history cache:', error);
    }
  }, []);

  // Add new query to cache
  const addQueryToCache = useCallback((queryData: {
    query: string;
    analysisResult: AnalysisResult | null;
    mode: 'standard' | 'education_quick';
    processingTimeMs?: number;
    externalSourcesCount: number;
  }) => {
    const now = new Date().toISOString();
    const queryHash = generateQueryHash(queryData.query);

    const newCachedQuery: CachedQuery = {
      id: crypto.randomUUID(),
      query: queryData.query,
      timestamp: now,
      analysisResult: queryData.analysisResult,
      mode: queryData.mode,
      processingTimeMs: queryData.processingTimeMs,
      externalSourcesCount: queryData.externalSourcesCount,
      hash: queryHash
    };

    setCachedQueries(prevQueries => {
      // Check if this query already exists (by hash)
      const existingIndex = prevQueries.findIndex(q => q.hash === queryHash);

      let updatedQueries: CachedQuery[];

      if (existingIndex >= 0) {
        // Update existing query with new timestamp and result
        updatedQueries = [
          {
            ...newCachedQuery,
            id: prevQueries[existingIndex].id, // Keep original ID
            timestamp: now // Update timestamp
          },
          ...prevQueries.slice(0, existingIndex),
          ...prevQueries.slice(existingIndex + 1)
        ];
      } else {
        // Add new query and maintain max size (LRU eviction)
        updatedQueries = [newCachedQuery, ...prevQueries].slice(0, MAX_CACHE_ENTRIES);
      }

      // Save to localStorage
      saveCacheToStorage(updatedQueries);

      return updatedQueries;
    });
  }, [saveCacheToStorage]);

  // Restore query from cache
  const restoreQueryFromCache = useCallback((cachedQuery: CachedQuery) => {
    return {
      query: cachedQuery.query,
      analysisResult: cachedQuery.analysisResult,
      mode: cachedQuery.mode,
      timestamp: cachedQuery.timestamp,
      processingTimeMs: cachedQuery.processingTimeMs
    };
  }, []);

  // Remove query from cache
  const removeQueryFromCache = useCallback((queryId: string) => {
    setCachedQueries(prevQueries => {
      const updatedQueries = prevQueries.filter(q => q.id !== queryId);
      saveCacheToStorage(updatedQueries);
      return updatedQueries;
    });
  }, [saveCacheToStorage]);

  // Clear all cached queries
  const clearCache = useCallback(() => {
    setCachedQueries([]);
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const totalQueries = cachedQueries.length;
    const externalQueries = cachedQueries.filter(q => q.externalSourcesCount > 0).length;
    const recentQueries = cachedQueries.filter(q => {
      const queryAge = Date.now() - new Date(q.timestamp).getTime();
      return queryAge < (24 * 60 * 60 * 1000); // Last 24 hours
    }).length;
    const avgProcessingTime = cachedQueries.length > 0
      ? cachedQueries.reduce((sum, q) => sum + (q.processingTimeMs || 0), 0) / cachedQueries.length
      : 0;

    return {
      totalQueries,
      externalQueries,
      recentQueries,
      avgProcessingTime: Math.round(avgProcessingTime),
      cacheSizeBytes: JSON.stringify(cachedQueries).length,
      oldestQuery: cachedQueries.length > 0 ? cachedQueries[cachedQueries.length - 1].timestamp : null
    };
  }, [cachedQueries]);

  return {
    // State
    cachedQueries,
    isLoading,

    // Actions
    addQueryToCache,
    restoreQueryFromCache,
    removeQueryFromCache,
    clearCache,

    // Utilities
    getCacheStats,

    // Constants
    MAX_CACHE_ENTRIES,
    CACHE_EXPIRY_DAYS
  };
};

export default useQueryHistoryCache;