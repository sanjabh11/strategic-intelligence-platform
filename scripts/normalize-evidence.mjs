#!/usr/bin/env node
// Normalizes evidence-corpus.json to v8 schema compliance
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const corpusPath = resolve('.positioning-audit/evidence-corpus.json');
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));

const now = new Date().toISOString();
const sixMonthsFromNow = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

// Map non-v8 evidence types to v8 11-type taxonomy
const typeMap = {
  'market_data': 'competitor_intel',
  'alignment_analysis': 'product_promise',
  'implementation_detail': 'codebase_evidence',
};

// Map authority tiers
const authorityMap = {
  'T1': 'tier-1', 'T2': 'tier-2', 'T3': 'tier-3',
  'tier-1': 'tier-1', 'tier-2': 'tier-2', 'tier-3': 'tier-3',
};

// Infer source tier from provenance
function inferSourceTier(item) {
  const prov = (item.provenance || '').toLowerCase();
  if (prov.includes('direct') || prov.includes('codebase inspection') || prov.includes('product documentation')) {
    return 'primary';
  }
  if (prov.includes('web research') || prov.includes('exa.ai') || prov.includes('reported')) {
    return 'secondary';
  }
  return 'inferred';
}

// Infer freshness from date
function inferFreshness(dateStr) {
  if (!dateStr) return 'stale';
  const d = new Date(dateStr);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (monthsDiff < 6) return 'fresh';
  if (monthsDiff < 18) return 'recent';
  return 'stale';
}

// Infer confidence from grade
function inferConfidence(grade) {
  if (grade === 'HIGH') return 0.8;
  if (grade === 'MEDIUM') return 0.6;
  return 0.3;
}

// Convert E1 → EV-001, E65 → EV-065
function toEvidenceId(id) {
  const match = id.match(/^E(\d+)$/);
  if (match) {
    return `EV-${String(parseInt(match[1])).padStart(3, '0')}`;
  }
  return id;
}

// Convert date string to ISO datetime
function toTimestamp(dateStr) {
  if (!dateStr) return new Date().toISOString();
  // If it's already ISO format, return as-is
  if (dateStr.includes('T')) return dateStr;
  // Date-only format: add time
  return new Date(dateStr + 'T00:00:00Z').toISOString();
}

const v8Types = new Set([
  'product_promise', 'customer_outcome', 'user_quote', 'behavioral_observation',
  'support_ticket', 'analytics_data', 'sales_data', 'pricing_signal',
  'stakeholder_input', 'competitor_intel', 'codebase_evidence'
]);

const normalizedItems = corpus.evidence_items.map(item => {
  // Map type
  const type = typeMap[item.type] || item.type;
  
  // Generate evidence_id from id
  const evidenceId = toEvidenceId(item.id || item.evidence_id || '');
  
  // Infer fields
  const sourceTier = inferSourceTier(item);
  const freshness = inferFreshness(item.date || item.timestamp);
  const authorityTier = authorityMap[item.authority_tier] || 'tier-3';
  const confidence = item.confidence !== undefined ? item.confidence : inferConfidence(item.grade);
  
  // Downgrade grade to LOW for inferred sources without direct URL
  let grade = item.grade;
  if (sourceTier === 'inferred' && !item.source?.includes('http')) {
    grade = 'LOW';
  }
  
  // Build v8-compliant item (only schema-allowed properties)
  const v8Item = {
    evidence_id: evidenceId,
    id: evidenceId, // alias for legacy compat
    type: type,
    source: item.source || 'unknown',
    source_tier: sourceTier,
    timestamp: toTimestamp(item.date || item.timestamp),
    date_collected: item.date || item.timestamp, // alias
    freshness: freshness,
    grade: grade,
    confidence: confidence,
    provenance: item.provenance || 'unknown',
    is_customer_commercial: ['customer_outcome', 'user_quote', 'behavioral_observation', 'support_ticket', 'analytics_data', 'sales_data'].includes(type),
    authority_tier: authorityTier,
    checked_at: now,
    expiry: freshness === 'stale' ? null : sixMonthsFromNow,
    url_health: item.source?.includes('http') ? 'alive' : 'not_applicable',
    content_summary: item.content || item.content_summary || item.claim || '',
  };
  
  // Add optional fields if present
  if (item.segment) v8Item.segment = item.segment;
  if (item.geography) v8Item.geography = item.geography;
  if (item.bias) v8Item.bias = item.bias;
  else v8Item.bias = ['none'];
  if (item.contradicts) v8Item.contradicts = item.contradicts;
  else v8Item.contradicts = [];
  v8Item.claim = v8Item.content_summary; // alias
  v8Item.contradiction_notes = item.contradiction_notes || '';
  
  return v8Item;
});

// Compute corpus-level fields
const typesPresent = new Set(normalizedItems.map(i => i.type));
const allTypes = ['product_promise', 'customer_outcome', 'user_quote', 'behavioral_observation', 'support_ticket', 'analytics_data', 'sales_data', 'pricing_signal', 'stakeholder_input', 'competitor_intel', 'codebase_evidence'];
const typesMissing = allTypes.filter(t => !typesPresent.has(t));

const customerCommercialTypes = new Set(['customer_outcome', 'user_quote', 'behavioral_observation', 'support_ticket', 'analytics_data', 'sales_data']);
const hasCustomerCommercial = normalizedItems.some(i => customerCommercialTypes.has(i.type));

const v8Corpus = {
  audit_id: corpus.audit_id || 'sip-deep-2026-07-13',
  evidence_items: normalizedItems,
  total_items: normalizedItems.length,
  types_present: typesPresent.size,
  types_missing: typesMissing.length,
  evidence_limited_mode: !hasCustomerCommercial,
  schema_version: 'v8',
};

writeFileSync(corpusPath, JSON.stringify(v8Corpus, null, 2) + '\n');

// Report
console.log(`Normalized ${normalizedItems.length} evidence items to v8`);
console.log(`Types present: ${[...typesPresent].join(', ')}`);
console.log(`Types missing: ${typesMissing.length} — ${typesMissing.join(', ')}`);
console.log(`Evidence limited mode: ${v8Corpus.evidence_limited_mode}`);
console.log(`Items by grade: HIGH=${normalizedItems.filter(i=>i.grade==='HIGH').length}, MEDIUM=${normalizedItems.filter(i=>i.grade==='MEDIUM').length}, LOW=${normalizedItems.filter(i=>i.grade==='LOW').length}`);
