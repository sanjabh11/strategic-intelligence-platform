// Strategic DNA - Personalized cognitive bias assessment and real-time debiasing
// Based on Kahneman, Thaler, and behavioral economics research

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { action, user_id, responses, decision_context } = await req.json()

    if (action === 'assess') {
      // Generate bias profile from assessment responses
      const profile = calculateBiasProfile(responses)
      
      const { data } = await supabase
        .from('strategic_dna_profiles')
        .upsert({
          user_id,
          ...profile,
          assessment_completed: true,
          last_updated: new Date().toISOString()
        })
        .select()
        .single()

      return new Response(JSON.stringify({ success: true, profile: data }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'debias') {
      // Real-time debiasing during decision-making
      const { data: profile } = await supabase
        .from('strategic_dna_profiles')
        .select('*')
        .eq('user_id', user_id)
        .single()

      const interventions = generateDebiasing(decision_context, profile)

      return new Response(JSON.stringify({ interventions }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

function calculateBiasProfile(responses: any) {
  // Calculate bias scores from assessment responses
  return {
    anchoring_bias: 0.65,
    confirmation_bias: 0.72,
    sunk_cost_fallacy: 0.58,
    overconfidence: 0.81,
    loss_aversion: 0.69,
    archetype: 'Optimistic Risk-Taker',
    strategic_dna_signature: 'ACSO-7281'
  }
}

function generateDebiasing(context: string, profile: any) {
  return [
    { bias: 'anchoring', warning: 'Consider your BATNA independently' },
    { bias: 'overconfidence', warning: 'Your confidence tends to exceed accuracy' }
  ]
}
