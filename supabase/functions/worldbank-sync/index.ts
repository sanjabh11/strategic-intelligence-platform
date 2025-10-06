// World Bank Historical Data Sync
// Backfills strategy_outcomes with empirical success rates
// Updates strategic_patterns with real-world validation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Map strategic patterns to World Bank indicators
const PATTERN_TO_INDICATOR = {
  'trade_cooperation': 'TG.VAL.TOTL.GD.ZS', // Trade as % of GDP
  'development_aid': 'DT.ODA.ODAT.CD', // Official development assistance  
  'economic_coordination': 'NY.GDP.PCAP.KD.ZG', // GDP per capita growth
  'resource_allocation': 'EG.USE.PCAP.KG.OE', // Energy use per capita
  'policy_cooperation': 'SE.XPD.TOTL.GD.ZS', // Education expenditure
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action = 'backfill', years = 5 } = await req.json().catch(() => ({}))

    if (action === 'backfill') {
      // Backfill historical outcomes
      const outcomes = await backfillHistoricalOutcomes(years)
      
      const { data: inserted } = await supabase
        .from('strategy_outcomes')
        .insert(outcomes)
        .select()

      // Update strategic patterns with empirical success rates
      await updatePatternSuccessRates(supabase, outcomes)

      return new Response(
        JSON.stringify({
          success: true,
          outcomes_added: outcomes.length,
          patterns_updated: Object.keys(PATTERN_TO_INDICATOR).length,
          years_covered: years,
          last_sync: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default: return sync status
    const { data: outcomeCount } = await supabase
      .from('strategy_outcomes')
      .select('id', { count: 'exact', head: true })

    return new Response(
      JSON.stringify({
        status: 'ready',
        historical_outcomes: outcomeCount,
        indicators_tracked: Object.keys(PATTERN_TO_INDICATOR).length,
        last_sync: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function backfillHistoricalOutcomes(years: number): Promise<any[]> {
  const outcomes: any[] = []
  const currentYear = new Date().getFullYear()
  
  // For each strategic pattern, fetch World Bank data
  for (const [pattern, indicator] of Object.entries(PATTERN_TO_INDICATOR)) {
    const data = await fetchWorldBankData(indicator, currentYear - years, currentYear)
    
    // Calculate success rate from historical data
    const successRate = calculateSuccessRate(data)
    
    outcomes.push({
      pattern_name: pattern,
      indicator_code: indicator,
      success_rate: successRate,
      sample_size: data.length,
      data_source: 'world_bank',
      time_period_start: `${currentYear - years}-01-01`,
      time_period_end: `${currentYear}-12-31`,
      confidence_level: calculateConfidence(data.length),
      raw_data: data.slice(0, 10), // Store sample
      created_at: new Date().toISOString()
    })
  }

  return outcomes
}

async function fetchWorldBankData(indicator: string, startYear: number, endYear: number): Promise<any[]> {
  // World Bank API: http://api.worldbank.org/v2/country/all/indicator/{indicator}?date={startYear}:{endYear}&format=json
  
  try {
    const url = `http://api.worldbank.org/v2/country/all/indicator/${indicator}?date=${startYear}:${endYear}&format=json&per_page=1000`
    const response = await fetch(url)
    const json = await response.json()
    
    // World Bank returns [metadata, data]
    const data = json[1] || []
    
    return data.filter((d: any) => d.value !== null).map((d: any) => ({
      country: d.country.value,
      year: d.date,
      value: d.value
    }))
  } catch (error) {
    console.error(`Failed to fetch ${indicator}:`, error)
    return []
  }
}

function calculateSuccessRate(data: any[]): number {
  if (data.length === 0) return 0.5 // Default neutral

  // Calculate success based on positive growth trends
  const values = data.map(d => d.value).filter(v => !isNaN(v))
  if (values.length < 2) return 0.5

  // Count positive changes
  let positiveChanges = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) positiveChanges++
  }

  const successRate = positiveChanges / (values.length - 1)
  return Math.min(Math.max(successRate, 0.1), 0.95) // Clamp between 0.1 and 0.95
}

function calculateConfidence(sampleSize: number): number {
  // Confidence based on sample size
  if (sampleSize >= 100) return 0.95
  if (sampleSize >= 50) return 0.85
  if (sampleSize >= 20) return 0.75
  if (sampleSize >= 10) return 0.65
  return 0.50
}

async function updatePatternSuccessRates(supabase: any, outcomes: any[]) {
  // Update strategic_patterns table with empirical success rates
  for (const outcome of outcomes) {
    await supabase
      .from('strategic_patterns')
      .update({
        success_rate: outcome.success_rate,
        last_validated: new Date().toISOString(),
        validation_source: 'world_bank_empirical'
      })
      .ilike('signature_hash', `%${outcome.pattern_name}%`)
  }
}
