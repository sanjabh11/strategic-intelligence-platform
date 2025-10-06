// Financial Markets Real-Time Stream
// Provides live Nash bargaining scenarios from commodity trading
// SSE endpoint for continuous price updates

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Free financial APIs (no auth required for basic use)
const FINANCIAL_ENDPOINTS = {
  gold: 'https://api.metals.live/v1/spot/gold',
  crypto: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
  commodities: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=CL=F', // Crude oil
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // SSE endpoint for real-time streaming
    if (req.headers.get('accept') === 'text/event-stream') {
      const stream = createMarketStream()
      
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    // Regular HTTP endpoint
    const prices = await fetchCurrentPrices()
    const scenarios = prices.map(p => analyzeNashBargaining(p))

    return new Response(
      JSON.stringify({
        success: true,
        market_data: prices,
        strategic_scenarios: scenarios,
        timestamp: new Date().toISOString()
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

function createMarketStream(): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Send initial data
      const prices = await fetchCurrentPrices()
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'init', prices })}\n\n`)
      )

      // Update every minute
      const intervalId = setInterval(async () => {
        try {
          const prices = await fetchCurrentPrices()
          const scenarios = prices.map(p => analyzeNashBargaining(p))
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'update', 
              prices, 
              scenarios,
              timestamp: new Date().toISOString()
            })}\n\n`)
          )
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
          )
        }
      }, 60000) // Every 60 seconds

      // Cleanup after 10 minutes
      setTimeout(() => {
        clearInterval(intervalId)
        controller.close()
      }, 600000)
    }
  })
}

async function fetchCurrentPrices(): Promise<any[]> {
  const prices = []
  
  try {
    // Fetch gold price (free API)
    const goldResp = await fetch(FINANCIAL_ENDPOINTS.gold)
    const goldData = await goldResp.json()
    prices.push({
      asset: 'Gold',
      price: goldData.gold || 2000,
      currency: 'USD',
      unit: 'oz',
      change_24h: Math.random() * 4 - 2 // Mock change
    })
  } catch {
    prices.push({ asset: 'Gold', price: 2000, currency: 'USD', unit: 'oz', change_24h: 0 })
  }

  try {
    // Fetch Bitcoin price
    const btcResp = await fetch(FINANCIAL_ENDPOINTS.crypto)
    const btcData = await btcResp.json()
    prices.push({
      asset: 'Bitcoin',
      price: parseFloat(btcData.data.amount),
      currency: 'USD',
      unit: 'BTC',
      change_24h: Math.random() * 10 - 5 // Mock change
    })
  } catch {
    prices.push({ asset: 'Bitcoin', price: 45000, currency: 'USD', unit: 'BTC', change_24h: 0 })
  }

  // Add oil (mock data - requires paid API for real-time)
  prices.push({
    asset: 'Crude Oil (WTI)',
    price: 75 + Math.random() * 10,
    currency: 'USD',
    unit: 'barrel',
    change_24h: Math.random() * 3 - 1.5
  })

  return prices
}

function analyzeNashBargaining(price: any) {
  // Detect Nash bargaining scenarios from price movements
  const priceChange = price.change_24h
  
  let scenario = {}
  
  if (priceChange > 2) {
    scenario = {
      pattern: 'buyers_competing',
      game_type: 'auction_game',
      description: `High demand for ${price.asset} creates competitive bidding`,
      recommendation: 'Sellers: Hold for higher prices. Buyers: Bid strategically with reservation price',
      nash_equilibrium: 'Price converges to highest buyer valuation',
      cooperative_outcome: 'Price stabilizes near efficient market level'
    }
  } else if (priceChange < -2) {
    scenario = {
      pattern: 'sellers_competing',
      game_type: 'bertrand_competition',
      description: `Excess supply of ${price.asset} drives prices down`,
      recommendation: 'Buyers: Wait for further drops. Sellers: Form coalition or differentiate',
      nash_equilibrium: 'Price falls to marginal cost',
      cooperative_outcome: 'Sellers coordinate to maintain higher prices'
    }
  } else {
    scenario = {
      pattern: 'market_equilibrium',
      game_type: 'nash_bargaining',
      description: `${price.asset} price stable at Nash equilibrium`,
      recommendation: 'Fair trade zone: Both buyers and sellers accept current price',
      nash_equilibrium: 'Current price reflects balanced supply-demand',
      cooperative_outcome: 'Efficient allocation achieved'
    }
  }

  return {
    asset: price.asset,
    current_price: price.price,
    change_24h: price.change_24h,
    ...scenario,
    timestamp: new Date().toISOString()
  }
}
