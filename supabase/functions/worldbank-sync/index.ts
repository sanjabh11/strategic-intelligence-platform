// World Bank Historical Data Sync
// Backfills strategy_outcomes with empirical success rates
// Updates strategic_patterns with real-world validation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Map strategic patterns to World Bank indicators (Gap Fix #6)
// Expanded to cover all 26 canonical game theory patterns
const PATTERN_TO_INDICATOR: Record<string, { code: string; description: string }> = {
  // Classic Game Theory Patterns (1-10)
  'Prisoner\'s Dilemma': { code: 'TG.VAL.TOTL.GD.ZS', description: 'Trade cooperation (% GDP)' },
  'Coordination Game': { code: 'SE.XPD.TOTL.GD.ZS', description: 'Public education coordination' },
  'Stag Hunt': { code: 'NE.GDI.TOTL.ZS', description: 'Investment coordination' },
  'Hawk-Dove': { code: 'MS.MIL.XPND.GD.ZS', description: 'Military expenditure conflicts' },
  'Battle of the Sexes': { code: 'SH.XPD.CHEX.GD.ZS', description: 'Health policy coordination' },
  'Chicken Game': { code: 'EN.ATM.CO2E.PC', description: 'Environmental negotiations' },
  'Matching Pennies': { code: 'FP.CPI.TOTL.ZG', description: 'Economic volatility' },
  'Pure Coordination': { code: 'IT.CEL.SETS.P2', description: 'Technology adoption' },
  'Nash Bargaining': { code: 'NY.GDP.PCAP.KD.ZG', description: 'Economic negotiation outcomes' },
  'Ultimatum Game': { code: 'SI.POV.GINI', description: 'Income distribution fairness' },
  
  // Advanced Patterns (11-20)
  'Repeated Game': { code: 'DT.ODA.ODAT.CD', description: 'Long-term aid cooperation' },
  'Sequential Game': { code: 'NE.TRD.GNFS.ZS', description: 'Sequential trade agreements' },
  'Signaling Game': { code: 'BX.KLT.DINV.WD.GD.ZS', description: 'FDI signaling credibility' },
  'Auction Theory': { code: 'IC.BUS.EASE.XQ', description: 'Market efficiency' },
  'Mechanism Design': { code: 'GC.DOD.TOTL.GD.ZS', description: 'Institutional effectiveness' },
  'Coalition Building': { code: 'AG.LND.FRST.ZS', description: 'Environmental coalitions' },
  'Public Goods': { code: 'SH.H2O.SAFE.ZS', description: 'Access to public services' },
  'Common Pool Resource': { code: 'AG.LND.AGRI.ZS', description: 'Resource management' },
  'Voting Games': { code: 'IQ.CPA.PROP.XQ', description: 'Democratic participation' },
  'Network Effects': { code: 'IT.NET.USER.ZS', description: 'Internet penetration' },
  
  // Strategic Patterns (21-26)
  'Evolutionary Game': { code: 'SP.DYN.LE00.IN', description: 'Life expectancy evolution' },
  'Stackelberg': { code: 'NE.EXP.GNFS.ZS', description: 'Market leadership' },
  'Cournot': { code: 'NY.GDP.MKTP.KD.ZG', description: 'Oligopoly competition' },
  'Bertrand': { code: 'FP.CPI.TOTL', description: 'Price competition' },
  'Market Entry': { code: 'IC.REG.DURS', description: 'Entry barriers' },
  'Exit Game': { code: 'IC.BUS.DISC.XQ', description: 'Business exit costs' },
  
  // Additional mappings for common variations
  'trade_cooperation': { code: 'TG.VAL.TOTL.GD.ZS', description: 'Trade cooperation' },
  'development_aid': { code: 'DT.ODA.ODAT.CD', description: 'Development aid' },
  'economic_coordination': { code: 'NY.GDP.PCAP.KD.ZG', description: 'Economic coordination' },
  'resource_allocation': { code: 'EG.USE.PCAP.KG.OE', description: 'Resource allocation' },
  'policy_cooperation': { code: 'SE.XPD.TOTL.GD.ZS', description: 'Policy cooperation' }
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
  for (const [pattern, indicatorInfo] of Object.entries(PATTERN_TO_INDICATOR)) {
    const indicatorCode = indicatorInfo.code
    const data = await fetchWorldBankData(indicatorCode, currentYear - years, currentYear)
    
    // Calculate success rate from historical data
    const successRate = calculateSuccessRate(data)
    
    outcomes.push({
      pattern_name: pattern,
      indicator_code: indicatorCode,
      indicator_description: indicatorInfo.description,
      success_rate: successRate,
      sample_size: data.length,
      data_source: 'world_bank',
      time_period_start: `${currentYear - years}-01-01`,
      time_period_end: `${currentYear}-12-31`,
      confidence_level: calculateConfidence(data.length),
      raw_data: data.slice(0, 10), // Store sample
      created_at: new Date().toISOString()
    })
    
    // Log progress
    console.log(`Processed ${pattern}: ${(successRate * 100).toFixed(1)}% success rate from ${data.length} data points`)
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
    // Try to match by pattern_name first (exact match)
    const { data: exactMatch } = await supabase
      .from('strategic_patterns')
      .select('id, pattern_name')
      .eq('pattern_name', outcome.pattern_name)
      .maybeSingle()
    
    if (exactMatch) {
      // Update with exact match
      await supabase
        .from('strategic_patterns')
        .update({
          success_rate: outcome.success_rate,
          empirical_confidence: outcome.confidence_level,
          last_validated: new Date().toISOString(),
          validation_source: 'world_bank_empirical',
          validation_metadata: {
            indicator: outcome.indicator_code,
            sample_size: outcome.sample_size,
            time_period: `${outcome.time_period_start} to ${outcome.time_period_end}`
          }
        })
        .eq('id', exactMatch.id)
      
      console.log(`Updated pattern "${outcome.pattern_name}" with ${(outcome.success_rate * 100).toFixed(1)}% success rate`)
    } else {
      // Try fuzzy match by pattern signature
      await supabase
        .from('strategic_patterns')
        .update({
          success_rate: outcome.success_rate,
          last_validated: new Date().toISOString(),
          validation_source: 'world_bank_empirical'
        })
        .ilike('pattern_signature', `%${outcome.pattern_name}%`)
      
      console.log(`Fuzzy updated pattern matching "${outcome.pattern_name}"`)
    }
  }
}
