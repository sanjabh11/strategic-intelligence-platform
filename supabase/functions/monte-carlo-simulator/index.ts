// @ts-nocheck
// Supabase Edge Function: Monte Carlo Simulator
// Monetization Feature F1: Shadow Market ABM Simulator
// Runs 1000+ agent-based model iterations for financial market simulation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Agent Types
interface MarketAgent {
    id: string;
    type: 'central_bank' | 'miner' | 'retail_trader' | 'institutional' | 'arbitrage_bot';
    name: string;
    capital: number;
    holdingPosition: number;
    behaviorProfile: {
        riskTolerance: number;
        reactionSpeed: number;
        herdingBias: number;
        panicThreshold: number;
    };
    strategy: 'accumulate' | 'hold' | 'reduce' | 'trade' | 'hodl';
}

interface SimulationConfig {
    iterations: number;
    timeHorizon: number; // weeks
    initialPrice: number;
    volatilityFactor: number;
    macroConditions: {
        inflationRate: number;
        dollarStrengthIndex: number;
        geopoliticalRisk: number;
        interestRate: number;
    };
}

interface SimulationResult {
    priceDistribution: {
        mean: number;
        median: number;
        stdDev: number;
        percentile5: number;
        percentile25: number;
        percentile75: number;
        percentile95: number;
        min: number;
        max: number;
    };
    pricePaths: number[][];
    aggregateMetrics: {
        bullishProbability: number;
        bearishProbability: number;
        crashProbability: number;
        squeezeProbability: number;
    };
    dominantStrategy: string;
    stabilityScore: number;
    confidenceInterval: [number, number];
    executionTimeMs: number;
}

class MonteCarloEngine {
    private supabase: any;
    private agents: MarketAgent[];
    private config: SimulationConfig;

    constructor(supabaseClient: any, agents: MarketAgent[], config: SimulationConfig) {
        this.supabase = supabaseClient;
        this.agents = agents;
        this.config = config;
    }

    async runSimulation(): Promise<SimulationResult> {
        const startTime = Date.now();
        const iterations = Math.min(this.config.iterations, 10000); // Cap at 10000
        const timeSteps = this.config.timeHorizon;

        const allFinalPrices: number[] = [];
        const pricePaths: number[][] = [];
        const samplePaths = Math.min(20, iterations); // Store 20 sample paths for visualization

        // Run Monte Carlo iterations
        for (let i = 0; i < iterations; i++) {
            const path = this.simulateSinglePath(timeSteps);
            allFinalPrices.push(path[path.length - 1]);

            if (i < samplePaths) {
                pricePaths.push(path);
            }
        }

        // Calculate statistics
        const sortedPrices = [...allFinalPrices].sort((a, b) => a - b);
        const n = sortedPrices.length;

        const mean = allFinalPrices.reduce((a, b) => a + b, 0) / n;
        const variance = allFinalPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        const percentile = (arr: number[], p: number) => arr[Math.floor(arr.length * p / 100)];

        const priceDistribution = {
            mean: Math.round(mean),
            median: Math.round(sortedPrices[Math.floor(n / 2)]),
            stdDev: Math.round(stdDev),
            percentile5: Math.round(percentile(sortedPrices, 5)),
            percentile25: Math.round(percentile(sortedPrices, 25)),
            percentile75: Math.round(percentile(sortedPrices, 75)),
            percentile95: Math.round(percentile(sortedPrices, 95)),
            min: Math.round(sortedPrices[0]),
            max: Math.round(sortedPrices[n - 1])
        };

        // Calculate outcome probabilities
        const basePrice = this.config.initialPrice;
        const bullishCount = allFinalPrices.filter(p => p > basePrice * 1.05).length;
        const bearishCount = allFinalPrices.filter(p => p < basePrice * 0.95).length;
        const crashCount = allFinalPrices.filter(p => p < basePrice * 0.8).length;
        const squeezeCount = allFinalPrices.filter(p => p > basePrice * 1.2).length;

        const aggregateMetrics = {
            bullishProbability: Math.round((bullishCount / n) * 100) / 100,
            bearishProbability: Math.round((bearishCount / n) * 100) / 100,
            crashProbability: Math.round((crashCount / n) * 100) / 100,
            squeezeProbability: Math.round((squeezeCount / n) * 100) / 100
        };

        // Determine dominant strategy
        const netBuyingPressure = this.agents
            .filter(a => a.type === 'central_bank')
            .reduce((sum, a) => sum + (a.strategy === 'accumulate' ? 1 : a.strategy === 'reduce' ? -1 : 0), 0);

        const dominantStrategy = netBuyingPressure > 0
            ? 'Central Bank Accumulation'
            : netBuyingPressure < 0
                ? 'Reserve Diversification'
                : 'Market Equilibrium';

        // Stability score based on volatility
        const coefficientOfVariation = stdDev / mean;
        const stabilityScore = Math.max(0, Math.min(1, 1 - coefficientOfVariation));

        const executionTimeMs = Date.now() - startTime;

        return {
            priceDistribution,
            pricePaths,
            aggregateMetrics,
            dominantStrategy,
            stabilityScore: Math.round(stabilityScore * 100) / 100,
            confidenceInterval: [
                Math.round(priceDistribution.percentile5),
                Math.round(priceDistribution.percentile95)
            ],
            executionTimeMs
        };
    }

    private simulateSinglePath(timeSteps: number): number[] {
        const path: number[] = [this.config.initialPrice];
        let price = this.config.initialPrice;

        for (let t = 1; t <= timeSteps; t++) {
            // Calculate aggregate agent actions
            let netDemand = 0;

            for (const agent of this.agents) {
                const action = this.simulateAgentAction(agent, price, t);
                netDemand += action.demandChange * agent.capital;
            }

            // Apply macro conditions
            const macroImpact = this.calculateMacroImpact();

            // Price change = base volatility + demand impact + macro + noise
            const baseVolatility = this.config.volatilityFactor * 0.02; // ~2% weekly
            const demandImpact = netDemand * 0.0001; // Scale factor
            const noise = (Math.random() - 0.5) * baseVolatility * 2;

            const priceChange = macroImpact + demandImpact + noise;
            price = price * (1 + priceChange);
            price = Math.max(price * 0.5, Math.min(price * 2, price)); // Bound prices

            path.push(Math.round(price));
        }

        return path;
    }

    private simulateAgentAction(agent: MarketAgent, currentPrice: number, time: number): { demandChange: number } {
        let demandChange = 0;

        switch (agent.type) {
            case 'central_bank':
                // Central banks have long-term accumulation goals
                if (agent.strategy === 'accumulate') {
                    demandChange = agent.behaviorProfile.riskTolerance * 0.5;
                } else if (agent.strategy === 'reduce') {
                    demandChange = -agent.behaviorProfile.riskTolerance * 0.3;
                }
                break;

            case 'miner':
                // Miners respond to price vs production cost
                const productionCost = 1200; // Base production cost
                if (currentPrice > productionCost * 1.5) {
                    demandChange = -0.3; // Sell more when profitable
                } else if (currentPrice < productionCost * 1.1) {
                    demandChange = 0.2; // Reduce supply when margins thin
                }
                break;

            case 'retail_trader':
                // Retail exhibits herding and panic behavior
                const recentTrend = Math.random() - 0.5; // Simplified
                demandChange = recentTrend * agent.behaviorProfile.herdingBias;

                // Panic selling
                if (Math.random() < agent.behaviorProfile.panicThreshold * 0.1) {
                    demandChange = -Math.abs(demandChange) * 2;
                }
                break;

            case 'institutional':
                // Institutional investors mean-revert
                const deviation = (currentPrice - this.config.initialPrice) / this.config.initialPrice;
                demandChange = -deviation * 0.2; // Mean reversion
                break;

            case 'arbitrage_bot':
                // Bots exploit small inefficiencies
                demandChange = (Math.random() - 0.5) * 0.1;
                break;
        }

        return { demandChange };
    }

    private calculateMacroImpact(): number {
        const { inflationRate, dollarStrengthIndex, geopoliticalRisk, interestRate } = this.config.macroConditions;

        // Inflation push-up
        const inflationImpact = (inflationRate - 2) * 0.002; // 0.2% per 1% above 2%

        // Dollar inverse relationship
        const dollarImpact = (100 - dollarStrengthIndex) * 0.001;

        // Geopolitical risk premium
        const riskImpact = geopoliticalRisk * 0.005;

        // Interest rate inverse relationship
        const interestImpact = -(interestRate - 3) * 0.001;

        return inflationImpact + dollarImpact + riskImpact + interestImpact;
    }

    async storeResult(runId: string, result: SimulationResult): Promise<void> {
        try {
            await this.supabase.from('monte_carlo_simulations').insert({
                run_id: runId,
                iterations: this.config.iterations,
                time_horizon: this.config.timeHorizon,
                initial_price: this.config.initialPrice,
                price_distribution: result.priceDistribution,
                aggregate_metrics: result.aggregateMetrics,
                dominant_strategy: result.dominantStrategy,
                stability_score: result.stabilityScore,
                confidence_interval: result.confidenceInterval,
                execution_time_ms: result.executionTimeMs,
                created_at: new Date().toISOString()
            });
        } catch (error) {
            console.warn('Failed to store simulation result:', error);
        }
    }
}

// Default agent templates
const DEFAULT_AGENTS: MarketAgent[] = [
    {
        id: 'pboc', type: 'central_bank', name: 'PBoC (China)', capital: 2235,
        holdingPosition: 2235, strategy: 'accumulate',
        behaviorProfile: { riskTolerance: 0.7, reactionSpeed: 0.3, herdingBias: 0.1, panicThreshold: 0.1 }
    },
    {
        id: 'fed', type: 'central_bank', name: 'Federal Reserve', capital: 8133,
        holdingPosition: 8133, strategy: 'hold',
        behaviorProfile: { riskTolerance: 0.3, reactionSpeed: 0.2, herdingBias: 0.05, panicThreshold: 0.05 }
    },
    {
        id: 'newmont', type: 'miner', name: 'Newmont Mining', capital: 1000,
        holdingPosition: 0, strategy: 'trade',
        behaviorProfile: { riskTolerance: 0.5, reactionSpeed: 0.6, herdingBias: 0.2, panicThreshold: 0.2 }
    },
    {
        id: 'retail_herd', type: 'retail_trader', name: 'Retail Traders', capital: 500,
        holdingPosition: 100, strategy: 'trade',
        behaviorProfile: { riskTolerance: 0.8, reactionSpeed: 0.9, herdingBias: 0.7, panicThreshold: 0.4 }
    },
    {
        id: 'hedge_fund', type: 'institutional', name: 'Institutional Investors', capital: 2000,
        holdingPosition: 500, strategy: 'trade',
        behaviorProfile: { riskTolerance: 0.4, reactionSpeed: 0.5, herdingBias: 0.2, panicThreshold: 0.15 }
    }
];

// JSON response helper
function jsonResponse(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
        },
    });
}

// Main handler
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return jsonResponse(200, { ok: true });
    if (req.method !== 'POST') return jsonResponse(405, { ok: false, message: 'Method Not Allowed' });

    try {
        const ref = Deno.env.get('SUPABASE_PROJECT_REF') || 'jxdihzqoaxtydolmltdr';
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${ref}.supabase.co`;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceKey) {
            return jsonResponse(500, { ok: false, message: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, serviceKey);
        const body = await req.json().catch(() => ({}));

        // Extract configuration
        const config: SimulationConfig = {
            iterations: Math.min(body.iterations || 1000, 10000),
            timeHorizon: body.timeHorizon || 26, // 6 months default
            initialPrice: body.initialPrice || 2350,
            volatilityFactor: body.volatilityFactor || 1.0,
            macroConditions: {
                inflationRate: body.macroConditions?.inflationRate || 3.5,
                dollarStrengthIndex: body.macroConditions?.dollarStrengthIndex || 100,
                geopoliticalRisk: body.macroConditions?.geopoliticalRisk || 0.5,
                interestRate: body.macroConditions?.interestRate || 5.25
            }
        };

        // Use provided agents or defaults
        const agents: MarketAgent[] = body.agents || DEFAULT_AGENTS;

        // Apply custom agent modifications
        if (body.agentModifications) {
            for (const mod of body.agentModifications) {
                const agent = agents.find(a => a.id === mod.id);
                if (agent) {
                    if (mod.strategy) agent.strategy = mod.strategy;
                    if (mod.behaviorProfile) {
                        Object.assign(agent.behaviorProfile, mod.behaviorProfile);
                    }
                }
            }
        }

        // Run simulation
        const engine = new MonteCarloEngine(supabase, agents, config);
        const result = await engine.runSimulation();

        // Store result if runId provided
        if (body.runId) {
            await engine.storeResult(body.runId, result);
        }

        return jsonResponse(200, {
            ok: true,
            response: result
        });

    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Monte Carlo simulation error:', e);
        return jsonResponse(500, { ok: false, message: msg });
    }
});
