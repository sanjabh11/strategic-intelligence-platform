// @ts-nocheck
// Supabase Edge Function: Trading Signal Generator
// Monetization Feature F9: Algorithmic Trading Signal Generator
// Analyzes market data through game-theoretic lens to generate buy/sell signals

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface MarketSnapshot {
    asset: string;
    currentPrice: number;
    volume24h: number;
    priceChange24h: number;
    orderBookImbalance?: number;
    openInterest?: number;
    fundingRate?: number;
}

interface SignalResult {
    signal: 'BUY' | 'SELL' | 'HOLD';
    strength: 'STRONG' | 'MODERATE' | 'WEAK';
    confidence: number;
    rationale: string[];
    gameTheoreticAnalysis: {
        type: string;
        dominantStrategy: string;
        equilibriumState: string;
        playerPositioning: string;
    };
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    priceTargets?: {
        entry: number;
        stopLoss: number;
        takeProfit: number;
    };
    timeframe: string;
    disclaimer: string;
}

interface PatternDetection {
    pattern: string;
    confidence: number;
    implication: 'bullish' | 'bearish' | 'neutral';
    gameTheoreticRationale: string;
}

class TradingSignalEngine {
    private supabase: any;

    constructor(supabaseClient: any) {
        this.supabase = supabaseClient;
    }

    async generateSignal(snapshot: MarketSnapshot): Promise<SignalResult> {
        const patterns = this.detectPatterns(snapshot);
        const gameAnalysis = this.performGameTheoreticAnalysis(snapshot, patterns);
        const signal = this.computeSignal(patterns, gameAnalysis);

        return {
            ...signal,
            disclaimer: 'This is not financial advice. Past performance does not guarantee future results. Trading involves substantial risk of loss. Always conduct your own research and consult with a licensed financial advisor.'
        };
    }

    private detectPatterns(snapshot: MarketSnapshot): PatternDetection[] {
        const patterns: PatternDetection[] = [];

        // Pattern 1: Crowded Trade Detection (Prisoner's Dilemma scenario)
        if (snapshot.openInterest && snapshot.volume24h) {
            const crowdingRatio = snapshot.openInterest / snapshot.volume24h;
            if (crowdingRatio > 5) {
                patterns.push({
                    pattern: 'Crowded Trade',
                    confidence: Math.min(0.9, crowdingRatio / 10),
                    implication: 'bearish',
                    gameTheoreticRationale: 'High open interest relative to volume suggests a Prisoner\'s Dilemma: if one large player exits, others will rush to exit creating a cascade. First-mover advantage to defect (sell).'
                });
            }
        }

        // Pattern 2: Liquidity Trap (Coordination Game)
        if (snapshot.orderBookImbalance !== undefined) {
            if (Math.abs(snapshot.orderBookImbalance) > 0.7) {
                const isBuyImbalance = snapshot.orderBookImbalance > 0;
                patterns.push({
                    pattern: 'Liquidity Trap',
                    confidence: Math.abs(snapshot.orderBookImbalance),
                    implication: isBuyImbalance ? 'bearish' : 'bullish',
                    gameTheoreticRationale: `Order book heavily ${isBuyImbalance ? 'bid' : 'ask'}-weighted. This creates a Coordination Game where market makers may coordinate to move price ${isBuyImbalance ? 'down to fill bids' : 'up to trigger stops'}.`
                });
            }
        }

        // Pattern 3: Short Squeeze Setup (Chicken Game)
        if (snapshot.fundingRate !== undefined) {
            if (snapshot.fundingRate < -0.01) {
                patterns.push({
                    pattern: 'Short Squeeze Setup',
                    confidence: Math.min(0.85, Math.abs(snapshot.fundingRate) * 10),
                    implication: 'bullish',
                    gameTheoreticRationale: 'Negative funding rate indicates crowded shorts. This is a "Game of Chicken" - shorts must decide who capitulates first. A small catalyst can trigger forced covering.'
                });
            } else if (snapshot.fundingRate > 0.02) {
                patterns.push({
                    pattern: 'Long Squeeze Setup',
                    confidence: Math.min(0.85, snapshot.fundingRate * 10),
                    implication: 'bearish',
                    gameTheoreticRationale: 'Extreme positive funding suggests overleveraged longs. Game of Chicken dynamics - cascade of liquidations likely on price dip.'
                });
            }
        }

        // Pattern 4: Momentum Exhaustion (Mixed Strategy Nash Equilibrium)
        if (Math.abs(snapshot.priceChange24h) > 10) {
            const isUp = snapshot.priceChange24h > 0;
            patterns.push({
                pattern: 'Momentum Exhaustion',
                confidence: Math.min(0.75, Math.abs(snapshot.priceChange24h) / 20),
                implication: isUp ? 'bearish' : 'bullish',
                gameTheoreticRationale: `Extended ${isUp ? 'upward' : 'downward'} move creates game theoretic instability. Participants now face mixed-strategy Nash equilibrium where random profit-taking becomes dominant.`
            });
        }

        // Pattern 5: Accumulation/Distribution (Signaling Game)
        if (snapshot.volume24h > 0 && Math.abs(snapshot.priceChange24h) < 2) {
            const volumeToMovementRatio = snapshot.volume24h / (Math.abs(snapshot.priceChange24h) + 0.1);
            if (volumeToMovementRatio > 1000000) {
                patterns.push({
                    pattern: 'Silent Accumulation',
                    confidence: 0.6,
                    implication: 'bullish',
                    gameTheoreticRationale: 'High volume with minimal price movement suggests large player accumulation. This is a Signaling Game where institutional buyers mask their intentions.'
                });
            }
        }

        return patterns;
    }

    private performGameTheoreticAnalysis(snapshot: MarketSnapshot, patterns: PatternDetection[]) {
        // Determine game type based on patterns
        let gameType = 'Normal Form Game';
        let dominantStrategy = 'HOLD';
        let equilibriumState = 'Stable';
        let playerPositioning = 'Balanced';

        const bullishPatterns = patterns.filter(p => p.implication === 'bullish');
        const bearishPatterns = patterns.filter(p => p.implication === 'bearish');

        const bullishScore = bullishPatterns.reduce((sum, p) => sum + p.confidence, 0);
        const bearishScore = bearishPatterns.reduce((sum, p) => sum + p.confidence, 0);

        if (patterns.some(p => p.pattern === 'Crowded Trade')) {
            gameType = "Prisoner's Dilemma";
            equilibriumState = 'Unstable - Defection Likely';
        } else if (patterns.some(p => p.pattern.includes('Squeeze'))) {
            gameType = 'Game of Chicken';
            equilibriumState = 'Critical - Catalyst Needed';
        } else if (patterns.some(p => p.pattern === 'Liquidity Trap')) {
            gameType = 'Coordination Game';
            equilibriumState = 'Multiple Equilibria - Direction Uncertain';
        }

        if (bullishScore > bearishScore + 0.5) {
            dominantStrategy = 'BUY';
            playerPositioning = 'Retail short, Smart money long';
        } else if (bearishScore > bullishScore + 0.5) {
            dominantStrategy = 'SELL';
            playerPositioning = 'Retail long, Smart money exiting';
        }

        return {
            type: gameType,
            dominantStrategy,
            equilibriumState,
            playerPositioning
        };
    }

    private computeSignal(patterns: PatternDetection[], gameAnalysis: any): Omit<SignalResult, 'disclaimer'> {
        const bullishConfidence = patterns
            .filter(p => p.implication === 'bullish')
            .reduce((sum, p) => sum + p.confidence, 0);

        const bearishConfidence = patterns
            .filter(p => p.implication === 'bearish')
            .reduce((sum, p) => sum + p.confidence, 0);

        const netSignal = bullishConfidence - bearishConfidence;
        const totalConfidence = bullishConfidence + bearishConfidence;

        let signal: 'BUY' | 'SELL' | 'HOLD';
        let strength: 'STRONG' | 'MODERATE' | 'WEAK';
        let confidence: number;

        if (Math.abs(netSignal) < 0.3 || totalConfidence < 0.5) {
            signal = 'HOLD';
            strength = 'WEAK';
            confidence = 0.3;
        } else if (netSignal > 0.8) {
            signal = 'BUY';
            strength = 'STRONG';
            confidence = Math.min(0.9, netSignal / 2);
        } else if (netSignal > 0.3) {
            signal = 'BUY';
            strength = 'MODERATE';
            confidence = Math.min(0.7, 0.4 + netSignal / 3);
        } else if (netSignal < -0.8) {
            signal = 'SELL';
            strength = 'STRONG';
            confidence = Math.min(0.9, Math.abs(netSignal) / 2);
        } else if (netSignal < -0.3) {
            signal = 'SELL';
            strength = 'MODERATE';
            confidence = Math.min(0.7, 0.4 + Math.abs(netSignal) / 3);
        } else {
            signal = 'HOLD';
            strength = 'MODERATE';
            confidence = 0.5;
        }

        // Risk assessment
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
        if (patterns.some(p => p.pattern.includes('Squeeze'))) {
            riskLevel = 'EXTREME';
        } else if (patterns.some(p => p.pattern === 'Crowded Trade')) {
            riskLevel = 'HIGH';
        } else if (totalConfidence > 1) {
            riskLevel = 'MEDIUM';
        } else {
            riskLevel = 'LOW';
        }

        const rationale = patterns.map(p => `${p.pattern}: ${p.gameTheoreticRationale}`);

        return {
            signal,
            strength,
            confidence: Math.round(confidence * 100) / 100,
            rationale,
            gameTheoreticAnalysis: gameAnalysis,
            riskLevel,
            timeframe: '24h-7d'
        };
    }
}

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

        if (!body.snapshot) {
            return jsonResponse(400, {
                ok: false,
                message: 'Missing required field: snapshot (MarketSnapshot)'
            });
        }

        const engine = new TradingSignalEngine(supabase);
        const signal = await engine.generateSignal(body.snapshot);

        // Store signal if requested
        if (body.storeSignal) {
            await supabase.from('trading_signals').insert({
                asset: body.snapshot.asset,
                signal: signal.signal,
                strength: signal.strength,
                confidence: signal.confidence,
                risk_level: signal.riskLevel,
                game_type: signal.gameTheoreticAnalysis.type,
                rationale: signal.rationale,
                created_at: new Date().toISOString()
            }).catch(() => null);
        }

        return jsonResponse(200, {
            ok: true,
            response: signal
        });

    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Trading signal error:', e);
        return jsonResponse(500, { ok: false, message: msg });
    }
});
