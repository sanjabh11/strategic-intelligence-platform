# Firecrawl API Integration Plan

## Current Architecture Overview
- **Strategic Intelligence Platform** with quantum game theory analysis
- **Existing Edge Functions**: evidence-retrieval (Perplexity), quantum-strategy-service, bayes-belief-updating
- **UI Components**: StrategySimulator, PerplexityDashboard, various visualization components
- **Current Evidence Sources**: Perplexity AI, mock academic/news sources

## Why Firecrawl Integration?
Firecrawl provides structured web scraping that complements Perplexity's general knowledge by offering:
- **Company-specific intelligence** from official websites
- **Industry reports and whitepapers** from authoritative sources
- **Geopolitical analysis** from think tanks and news aggregators
- **Real-time market data** from financial institutions
- **Competitor and stakeholder analysis**

## Implementation Strategy

### Phase 1: Backend Edge Function Development
**Target File**: `supabase/functions/firecrawl-research/index.ts`

**APIs to Implement**:
1. `/scrape` - Single page structured extraction
2. `/crawl` - Multi-page website crawling
3. `/search` - Web search with structured results

**Request Types**:
```typescript
interface FirecrawlResearchRequest {
  runId: string;
  urls?: string[]; // For targeted scraping
  query?: string; // For search/crawl operations
  mode: 'scrape' | 'crawl' | 'search';
  config: {
    maxPages: number;
    extractSchemas: boolean;
    includeMetadata: boolean;
    returnFormat: 'markdown' | 'json' | 'structured';
  };
  context: {
    domain: string;
    stakeholders: string[];
    strategic_context: string;
  };
}
```

### Phase 2: Integration with Evidence Retrieval Pipeline
**Modification**: `supabase/functions/evidence-retrieval/index.ts`

**Integration Points**:
- Add `include_firecrawl?: boolean` to `sourceConfig`
- Extend `EvidenceSource` interface to support web page type
- Create `mockFirecrawlRetrieval()` function initially
- Update meta-analysis to handle web scraping confidence scores

### Phase 3: UI Dashboard Component
**Target File**: `src/components/FirecrawlDashboard.tsx`

**Features**:
- URL input with validation
- Scrape/Crawl/Search mode selection
- Results visualization
- Integration with evidence pipeline
- Relevant rating system

### Phase 4: Advanced Features
**Caching System**:
- URL-based result caching
- Timestamps and freshness checking
- LRU eviction for cache space management

**Rate Limiting & Error Handling**:
- Request throttling (Firecrawl API limits)
- Retry logic for failed requests
- Fallback to cached results when API unavailable

## Quality Assurance
- **4.5/5 Quality Threshold**: Implementation should exceed this benchmark
- **Performance**: API response times < 2 seconds for cached results
- **Accuracy**: Structured data extraction with proper schema validation
- **Reliability**: Graceful degradation when services are unavailable

## Risk Mitigation
- **API Key Security**: Environment variable configuration
- **Cost Control**: Request limiting and caching minimize API usage
- **Data Privacy**: No sensitive data collection in web scraping
- **Content Policies**: Respect robots.txt and ethical web scraping

## Success Metrics
- Successful integration with 0 API failures
- Response times under 3 seconds for new requests
- Cache hit rate > 70% improving subsequent query performance
- Clean integration with existing strategic analysis pipeline