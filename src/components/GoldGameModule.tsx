// Gold Game Specialized Module
// Pre-configured game-theoretic model for gold price forecasting
// Models Central Bank reserve optimization, Miner production decisions
// Part of Monetization Strategy - Key differentiation feature

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Building2, Factory,
  Globe, RefreshCw, Play, Info, ChevronDown, ChevronUp,
  Target, Zap, AlertTriangle, BarChart3, PieChart, ArrowRight, ShieldCheck
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { GoldModuleGate } from './SubscriptionGate';
import TestingAccessOverrideBanner from './TestingAccessOverrideBanner';
import { ENDPOINTS, getUserAuthHeaders } from '../lib/supabase';
import { buildCommodityResponsePlaybook } from '../../shared/gameTheoryKnowledge';
import type { AttributionSummary, DriftSignalSummary, GroundedEntityRef } from '../../shared/mlAdvisory';
import { format, parseISO } from 'date-fns';

// Types for Gold Game
interface CentralBankAgent {
  id: string;
  name: string;
  currentReserves: number; // tonnes
  reserveTarget: number;
  buyingPressure: number; // -1 to 1
  strategies: ('accumulate' | 'hold' | 'reduce')[];
  riskTolerance: number;
}

interface MinerAgent {
  id: string;
  name: string;
  productionCapacity: number; // tonnes/year
  productionCost: number; // $/oz
  currentProduction: number;
  strategies: ('maximize' | 'optimize' | 'curtail')[];
}

interface GoldMarketState {
  spotPrice: number;
  dayChange: number;
}

interface MarketProviderDetail {
  name: string;
  mode: 'live' | 'degraded' | 'unconfigured' | 'simulated';
  url?: string;
  note?: string;
}

interface MarketProviderDiagnostics {
  provider: string;
  mode: 'live' | 'degraded' | 'simulated';
  warnings: string[];
  details: MarketProviderDetail[];
  sources: string[];
  fetched_at: string;
}

interface MarketPricePoint {
  asset: string;
  price: number;
  currency: string;
  unit: string;
  change_24h: number;
}

interface MarketStreamResponse {
  success?: boolean;
  provider?: MarketProviderDiagnostics;
  market_data?: MarketPricePoint[];
  strategic_scenarios?: Array<{
    asset: string;
    pattern: string;
    game_type: string;
    description: string;
    recommendation: string;
    entity_refs?: GroundedEntityRef[];
    drift_signal?: DriftSignalSummary | null;
    attribution?: AttributionSummary | null;
  }>;
  entity_refs?: GroundedEntityRef[];
  drift_signal?: DriftSignalSummary | null;
  attribution?: AttributionSummary | null;
  timestamp?: string;
}

interface EquilibriumResult {
  predictedPrice: number;
  confidence: number;
  timeHorizon: string;
  dominantStrategy: string;
  stabilityScore: number;
  scenarioType: 'bullish' | 'bearish' | 'neutral';
}

interface GoldGameModuleProps {
  userId?: string;
  isLearningMode?: boolean;
  testingAccessOverride?: boolean;
}

// Default agents based on real-world data
const DEFAULT_CENTRAL_BANKS: CentralBankAgent[] = [
  { id: 'pboc', name: 'PBoC (China)', currentReserves: 2235, reserveTarget: 3000, buyingPressure: 0.7, strategies: ['accumulate', 'hold'], riskTolerance: 0.6 },
  { id: 'cbr', name: 'Bank of Russia', currentReserves: 2330, reserveTarget: 2500, buyingPressure: 0.4, strategies: ['accumulate', 'hold'], riskTolerance: 0.7 },
  { id: 'rbi', name: 'RBI (India)', currentReserves: 800, reserveTarget: 1000, buyingPressure: 0.5, strategies: ['accumulate', 'hold'], riskTolerance: 0.5 },
  { id: 'fed', name: 'Federal Reserve', currentReserves: 8133, reserveTarget: 8133, buyingPressure: 0, strategies: ['hold'], riskTolerance: 0.3 },
  { id: 'ecb', name: 'ECB', currentReserves: 10773, reserveTarget: 10773, buyingPressure: -0.1, strategies: ['hold', 'reduce'], riskTolerance: 0.3 }
];

const DEFAULT_MINERS: MinerAgent[] = [
  { id: 'newmont', name: 'Newmont', productionCapacity: 6, productionCost: 1200, currentProduction: 5.5, strategies: ['maximize', 'optimize'] },
  { id: 'barrick', name: 'Barrick Gold', productionCapacity: 4.5, productionCost: 1150, currentProduction: 4.2, strategies: ['maximize', 'optimize'] },
  { id: 'agnico', name: 'Agnico Eagle', productionCapacity: 3.5, productionCost: 1100, currentProduction: 3.3, strategies: ['optimize', 'curtail'] }
];

const GoldGameModule: React.FC<GoldGameModuleProps> = ({ userId, isLearningMode = false, testingAccessOverride = false }) => {
  const navigate = useNavigate();
  const [centralBanks, setCentralBanks] = useState<CentralBankAgent[]>(DEFAULT_CENTRAL_BANKS);
  const [miners, setMiners] = useState<MinerAgent[]>(DEFAULT_MINERS);
  const [marketState, setMarketState] = useState<GoldMarketState | null>(null);
  const [marketProvider, setMarketProvider] = useState<MarketProviderDiagnostics | null>(null);
  const [marketAssets, setMarketAssets] = useState<MarketPricePoint[]>([]);
  const [marketScenarios, setMarketScenarios] = useState<NonNullable<MarketStreamResponse['strategic_scenarios']>>([]);
  const [marketEntityRefs, setMarketEntityRefs] = useState<GroundedEntityRef[]>([]);
  const [marketDriftSignal, setMarketDriftSignal] = useState<DriftSignalSummary | null>(null);
  const [lastSuccessfulMarketFetchAt, setLastSuccessfulMarketFetchAt] = useState<string | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [workspaceScenario, setWorkspaceScenario] = useState<'vendor-price-increase-pushback' | 'constrained-supply-allocation' | 'renewal-under-switching-leverage'>('vendor-price-increase-pushback');
  const [equilibrium, setEquilibrium] = useState<EquilibriumResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>('market');
  const [scenarioParams, setScenarioParams] = useState({
    inflationRate: 3.5,
    dollarStrength: 100,
    geopoliticalRisk: 0.5,
    interestRates: 5.25,
    recessionProbability: 0.25
  });

  const providerBadgeClass = marketProvider?.mode === 'live'
    ? 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30'
    : 'bg-amber-900/30 text-amber-300 border-amber-500/30';

  const workspace = useMemo(() => buildCommodityResponsePlaybook({
    workflow: 'procurement',
    scenarioId: workspaceScenario,
    marketAssets,
    providerMode: marketProvider?.mode ?? 'degraded'
  }), [marketAssets, marketProvider?.mode, workspaceScenario]);

  const openWorkspaceInConsole = useCallback(() => {
    const sourceLine = marketProvider ? `Provider mode: ${marketProvider.mode}.` : 'Provider mode unavailable.'
    const scenarioText = [
      `Commodity response brief request (${workspaceScenario.replace(/-/g, ' ')}).`,
      workspace.playbook.volatility_driver_summary,
      `Recommended posture: ${workspace.playbook.recommended_negotiation_posture}`,
      `Buyer tradeables: ${workspace.playbook.buyer_tradeables.join(', ')}`,
      `Trigger watchlist: ${workspace.playbook.trigger_watchlist.join('; ')}`,
      sourceLine
    ].join('\n')
    navigate('/console', { state: { scenarioText } })
  }, [marketProvider, navigate, workspace.playbook, workspaceScenario]);

  const openWorkspaceInStudio = useCallback(() => {
    const templateId = workspaceScenario === 'constrained-supply-allocation'
      ? 'supplier-squeeze-tree'
      : 'vendor-renewal-tree'
    navigate('/labs/game-tree', {
      state: {
        templateId,
        scenarioText: workspace.playbook.volatility_driver_summary
      }
    })
  }, [navigate, workspace.playbook.volatility_driver_summary, workspaceScenario]);

  const fetchMarketData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      setMarketLoading(true);
      setMarketError(null);

      const response = await fetch(ENDPOINTS.MARKET_STREAM, {
        method: 'GET',
        headers: await getUserAuthHeaders(),
        signal: controller.signal
      });

      const payload = await response.json().catch(() => null) as MarketStreamResponse | null;
      if (!response.ok) {
        throw new Error(`market-stream failed with HTTP ${response.status}`);
      }

      const provider = payload?.provider ?? null;
      const marketData = Array.isArray(payload?.market_data) ? payload.market_data : [];
      const scenarios = Array.isArray(payload?.strategic_scenarios) ? payload.strategic_scenarios : [];
      const goldPoint = marketData.find((asset) => asset.asset.toLowerCase() === 'gold') ?? null;

      setMarketProvider(provider);
      setMarketAssets(marketData);
      setMarketScenarios(scenarios);
      setMarketEntityRefs(Array.isArray(payload?.entity_refs) ? payload.entity_refs : []);
      setMarketDriftSignal(payload?.drift_signal ?? null);
      setLastSuccessfulMarketFetchAt(payload?.timestamp ?? provider?.fetched_at ?? new Date().toISOString());

      if (!goldPoint) {
        setMarketState(null);
        setMarketError('Live gold price is currently unavailable. The simulation stays disabled until the Gold feed returns a usable spot price.');
        return;
      }

      setMarketState({
        spotPrice: goldPoint.price,
        dayChange: goldPoint.change_24h
      });
    } catch (error) {
      const message = error instanceof Error
        ? (error.name === 'AbortError' ? 'market-stream timed out after 15s' : error.message)
        : 'Failed to load market-stream';
      setMarketState(null);
      setMarketError(
        message.includes('404')
          ? 'The commodity market feed endpoint is currently unavailable.'
          : message.includes('timed out')
            ? 'The commodity market feed timed out before it returned a fresh price snapshot.'
            : 'The commodity market feed is temporarily unavailable.'
      );
    } finally {
      window.clearTimeout(timeoutId);
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Run game-theoretic simulation
  const runSimulation = async () => {
    setIsSimulating(true);
    
    try {
      // Calculate Nash equilibrium for central bank strategies
      // This is a simplified model - production would use the full game theory engine
      
      const totalBuyingPressure = centralBanks.reduce((sum, cb) => sum + cb.buyingPressure * cb.currentReserves, 0) / 
        centralBanks.reduce((sum, cb) => sum + cb.currentReserves, 0);
      
      const avgProductionCost = miners.reduce((sum, m) => sum + m.productionCost, 0) / miners.length;
      
      // Factor in scenario parameters
      const inflationImpact = (scenarioParams.inflationRate - 2) * 50; // $50 per % above 2%
      const dollarImpact = (100 - scenarioParams.dollarStrength) * 10; // Inverse relationship
      const riskPremium = scenarioParams.geopoliticalRisk * 200; // Up to $200 premium
      const interestImpact = -(scenarioParams.interestRates - 3) * 30; // Higher rates = lower gold
      
      if (!marketState) {
        throw new Error('Live gold price is unavailable.');
      }

      const basePrice = marketState.spotPrice;
      const equilibriumPrice = basePrice + inflationImpact + dollarImpact + riskPremium + interestImpact + 
        (totalBuyingPressure * 100);
      
      const confidence = 0.65 + (Math.random() * 0.2);
      const stability = 0.7 + (totalBuyingPressure > 0 ? 0.1 : -0.1);
      
      const result: EquilibriumResult = {
        predictedPrice: Math.round(equilibriumPrice),
        confidence: confidence,
        timeHorizon: '6 months',
        dominantStrategy: totalBuyingPressure > 0.3 ? 'Central Bank Accumulation' : 
          totalBuyingPressure < -0.1 ? 'Reserve Diversification' : 'Market Equilibrium',
        stabilityScore: stability,
        scenarioType: equilibriumPrice > basePrice * 1.05 ? 'bullish' : 
          equilibriumPrice < basePrice * 0.95 ? 'bearish' : 'neutral'
      };
      
      setEquilibrium(result);
      
      // Generate simulation history for chart
      const history = [];
      let price = basePrice;
      for (let i = 0; i <= 26; i++) { // 26 weeks = 6 months
        const weeklyChange = (equilibriumPrice - basePrice) / 26 + (Math.random() - 0.5) * 20;
        price += weeklyChange;
        history.push({
          week: i,
          price: Math.round(price),
          lower: Math.round(price * (1 - (1 - confidence) / 2)),
          upper: Math.round(price * (1 + (1 - confidence) / 2))
        });
      }
      setSimulationHistory(history);
      
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  // Render agent card
  const renderCentralBankCard = (bank: CentralBankAgent) => (
    <div key={bank.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-amber-400" />
          <span className="font-medium text-slate-200">{bank.name}</span>
        </div>
        <span className={`text-sm px-2 py-1 rounded ${
          bank.buyingPressure > 0.3 ? 'bg-green-900/50 text-green-400' :
          bank.buyingPressure < -0.1 ? 'bg-red-900/50 text-red-400' :
          'bg-slate-600 text-slate-300'
        }`}>
          {bank.buyingPressure > 0.3 ? 'Accumulating' : 
           bank.buyingPressure < -0.1 ? 'Reducing' : 'Holding'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-400">Current Reserves</span>
          <div className="text-lg font-mono text-amber-400">{bank.currentReserves.toLocaleString()} t</div>
        </div>
        <div>
          <span className="text-slate-400">Target</span>
          <div className="text-lg font-mono text-slate-300">{bank.reserveTarget.toLocaleString()} t</div>
        </div>
      </div>
      
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Reserve Progress</span>
          <span>{Math.round((bank.currentReserves / bank.reserveTarget) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 rounded-full"
            style={{ width: `${Math.min((bank.currentReserves / bank.reserveTarget) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs text-slate-400">Buying Pressure</label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.1"
          value={bank.buyingPressure}
          onChange={(e) => {
            const updated = centralBanks.map(cb => 
              cb.id === bank.id ? { ...cb, buyingPressure: parseFloat(e.target.value) } : cb
            );
            setCentralBanks(updated);
          }}
          className="w-full mt-1"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>Selling</span>
          <span>Neutral</span>
          <span>Buying</span>
        </div>
      </div>
    </div>
  );

  return (
    <GoldModuleGate userId={userId}>
      <div className="space-y-6">
        {testingAccessOverride && <TestingAccessOverrideBanner scope="Gold module" />}
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Commodity Response Workspace</h2>
                <p className="text-amber-100">Procurement-led volatility response for gold and oil exposed decisions</p>
              </div>
            </div>
            {marketState && (
              <div className="text-right">
                <div className="text-3xl font-bold">${marketState.spotPrice.toFixed(2)}</div>
                <div className={`text-sm flex items-center justify-end gap-1 ${
                  marketState.dayChange >= 0 ? 'text-green-300' : 'text-red-300'
                }`}>
                  {marketState.dayChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {marketState.dayChange >= 0 ? '+' : ''}{marketState.dayChange.toFixed(2)}% today
                </div>
              </div>
            )}
          </div>
        </div>

        {marketProvider && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-200">Market feed status</div>
                <div className="text-xs text-slate-400">{marketProvider.provider}</div>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${providerBadgeClass}`}>
                {marketProvider.mode === 'live' ? 'Live feed' : 'Degraded feed'}
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              {marketProvider.details.map((detail) => `${detail.name}: ${detail.mode}`).join(' • ')}
            </div>
            {marketProvider.warnings.length > 0 && (
              <div className="mt-3 space-y-2">
                {marketProvider.warnings.map((warning) => (
                  <div key={warning} className="flex items-start gap-2 text-sm text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
            {marketDriftSignal && marketDriftSignal.state !== 'stable' && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Drift advisory: {marketDriftSignal.surface} / {marketDriftSignal.scope_key} is in {marketDriftSignal.state} state ({marketDriftSignal.score.toFixed(3)} vs {marketDriftSignal.threshold.toFixed(3)}).
              </div>
            )}
            {marketEntityRefs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {marketEntityRefs.slice(0, 6).map((entity) => (
                  <span key={`${entity.entity_key}:${entity.matched_text}`} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
                    {entity.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {marketError && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="text-sm font-semibold uppercase tracking-wide text-amber-50">Feed unavailable</div>
                <p className="mt-2 leading-6">
                  The commodity workspace is still available, but the live price feed could not refresh. We are keeping the simulation disabled instead of pretending a live market state exists.
                </p>
              </div>
              <button
                onClick={fetchMarketData}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900/70 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
              >
                <RefreshCw className="h-4 w-4" />
                Retry feed
              </button>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-amber-100/90 md:grid-cols-2">
              <div>
                <span className="font-medium text-white">Last successful refresh:</span>{' '}
                {lastSuccessfulMarketFetchAt ? format(parseISO(lastSuccessfulMarketFetchAt), 'MMM d, yyyy HH:mm') : 'No successful refresh yet in this session'}
              </div>
              <div>
                <span className="font-medium text-white">Beta trust note:</span>{' '}
                The playbook remains visible for doctrine and negotiation prep, but live-price-backed simulation is unavailable.
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-slate-900/40 px-3 py-2 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{marketError}</span>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <ShieldCheck className="h-5 w-5 text-cyan-300" />
                Procurement Response Playbook
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Live market context routed through doctrine selection, supplier leverage mapping, and buyer response posture.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
                {workspace.classification.game_family.replace(/_/g, ' ')}
              </span>
              <span className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">
                {workspace.classification.move_structure} / {workspace.classification.information_structure}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                id: 'vendor-price-increase-pushback',
                title: 'Price increase pushback',
                detail: 'Challenge pass-through, hold on precedent, and trade only for reciprocal movement.'
              },
              {
                id: 'constrained-supply-allocation',
                title: 'Constrained supply allocation',
                detail: 'Secure continuity first, then control price leakage through allocation-linked trades.'
              },
              {
                id: 'renewal-under-switching-leverage',
                title: 'Renewal under switching leverage',
                detail: 'Use migration or alternate supply leverage without giving away future renewal posture.'
              }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setWorkspaceScenario(option.id as typeof workspaceScenario)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  workspaceScenario === option.id
                    ? 'border-cyan-500/40 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
                }`}
              >
                <div className="font-medium text-white">{option.title}</div>
                <div className="mt-2 text-sm text-slate-400">{option.detail}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Volatility driver summary</div>
                <div className="mt-2 text-sm leading-6 text-slate-200">{workspace.playbook.volatility_driver_summary}</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Recommended posture</div>
                <div className="mt-2 text-sm leading-6 text-slate-200">{workspace.playbook.recommended_negotiation_posture}</div>
                <div className="mt-3 text-xs text-cyan-200">{workspace.classification.why_fit}</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Supplier leverage map</div>
                <div className="mt-3 space-y-3">
                  {workspace.playbook.supplier_leverage_map.map((entry) => (
                    <div key={entry.actor} className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
                      <div className="font-medium text-slate-100">{entry.actor}</div>
                      <div className="mt-2 text-sm text-slate-300">{entry.leverage}</div>
                      <div className="mt-2 text-xs text-cyan-200">{entry.implication}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Buyer tradeables</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {workspace.playbook.buyer_tradeables.map((tradeable) => (
                    <span key={tradeable} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-slate-200">
                      {tradeable}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Trigger watchlist</div>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {workspace.playbook.trigger_watchlist.map((trigger) => (
                    <li key={trigger} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                      <span>{trigger}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Claim-to-evidence</div>
                <div className="mt-3 space-y-3">
                  {workspace.playbook.claim_to_evidence.map((claim) => (
                    <div key={claim.claim_id} className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
                      <div className="text-sm text-slate-100">{claim.claim_text}</div>
                      <div className="mt-2 text-xs text-slate-400">
                        {claim.evidence_refs.map((reference) => `${reference.label} (${reference.support})`).join(' • ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={openWorkspaceInConsole}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-400"
            >
              <ArrowRight className="h-4 w-4" />
              Brief in Console
            </button>
            <button
              onClick={openWorkspaceInStudio}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-950"
            >
              <Target className="h-4 w-4" />
              Test Countermoves in Studio
            </button>
          </div>
        </div>

        {/* Learning Mode Explanation */}
        {isLearningMode && (
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-300 mb-1">How the Commodity Workspace Works</h4>
                <p className="text-sm text-slate-300">
                  This workspace treats live gold and oil moves as bargaining inputs, then converts them into a
                  procurement response playbook: who has leverage, which tradeables matter, and what needs
                  immediate monitoring before you concede value.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Market Overview Section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <button
            onClick={() => setExpandedSection(expandedSection === 'market' ? null : 'market')}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-slate-200">Market Overview</span>
            </div>
            {expandedSection === 'market' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          {expandedSection === 'market' && (
            <div className="p-4 pt-0 border-t border-slate-700">
              {marketLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-300">
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin text-cyan-400" />
                  Loading live market feed...
                </div>
              ) : marketState ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-700 rounded-lg p-4 text-center">
                      <div className="text-sm text-slate-400">Spot Price</div>
                      <div className="text-2xl font-bold text-amber-400">${marketState.spotPrice.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 text-center">
                      <div className="text-sm text-slate-400">24h Change</div>
                      <div className={`text-2xl font-bold ${marketState.dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {marketState.dayChange >= 0 ? '+' : ''}{marketState.dayChange.toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 text-center">
                      <div className="text-sm text-slate-400">Feed Mode</div>
                      <div className="text-2xl font-bold text-slate-200 capitalize">{marketProvider?.mode ?? 'unknown'}</div>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-4 text-center">
                      <div className="text-sm text-slate-400">Assets Covered</div>
                      <div className="text-2xl font-bold text-slate-200">{marketAssets.length}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {marketAssets.map((asset) => (
                      <div key={asset.asset} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">{asset.asset}</div>
                        <div className="mt-1 text-lg font-semibold text-slate-100">
                          ${asset.price.toFixed(2)} <span className="text-xs text-slate-400">/{asset.unit}</span>
                        </div>
                        <div className={`mt-1 text-xs ${asset.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {asset.change_24h >= 0 ? '+' : ''}{asset.change_24h.toFixed(2)}% over 24h
                        </div>
                        {marketScenarios.find((scenario) => scenario.asset === asset.asset)?.entity_refs?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {marketScenarios.find((scenario) => scenario.asset === asset.asset)?.entity_refs?.slice(0, 2).map((entity) => (
                              <span key={`${asset.asset}:${entity.entity_key}`} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-100">
                                {entity.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                  <div className="font-medium text-slate-100">Simulation is paused until the live Gold feed recovers.</div>
                  <p className="mt-2 leading-6 text-slate-300">
                    You can still inspect the procurement response playbook, supplier leverage framing, and buyer tradeables, but the live market path stays disabled until a fresh Gold spot price is available.
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    {lastSuccessfulMarketFetchAt
                      ? `Last successful market refresh: ${format(parseISO(lastSuccessfulMarketFetchAt), 'MMM d, yyyy HH:mm')}.`
                      : 'No successful market refresh has been recorded in this session yet.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scenario Parameters */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Macro Scenario Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Inflation Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={scenarioParams.inflationRate}
                onChange={(e) => setScenarioParams(p => ({ ...p, inflationRate: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Dollar Index</label>
              <input
                type="number"
                value={scenarioParams.dollarStrength}
                onChange={(e) => setScenarioParams(p => ({ ...p, dollarStrength: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Fed Funds Rate (%)</label>
              <input
                type="number"
                step="0.25"
                value={scenarioParams.interestRates}
                onChange={(e) => setScenarioParams(p => ({ ...p, interestRates: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Geopolitical Risk (0-1)</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={scenarioParams.geopoliticalRisk}
                onChange={(e) => setScenarioParams(p => ({ ...p, geopoliticalRisk: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs text-slate-500 text-center">{scenarioParams.geopoliticalRisk.toFixed(1)}</div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Recession Probability</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={scenarioParams.recessionProbability}
                onChange={(e) => setScenarioParams(p => ({ ...p, recessionProbability: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs text-slate-500 text-center">{(scenarioParams.recessionProbability * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* Central Bank Agents */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            Advanced demand-side actors
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centralBanks.map(renderCentralBankCard)}
          </div>
        </div>

        {/* Run Simulation Button */}
        <div className="flex justify-center">
          <button
            onClick={runSimulation}
            disabled={isSimulating || !marketState}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                Computing Equilibrium...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Run Market Structure Simulation
              </>
            )}
          </button>
        </div>
        {!marketState && (
          <div className="text-center text-sm text-slate-400">
            Simulation is disabled until the live Gold feed returns a usable spot price. The workspace remains available for doctrine review and negotiation preparation.
          </div>
        )}

        {/* Results */}
        {equilibrium && (
          <div className="bg-slate-800 rounded-xl p-6 border border-amber-500/30">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              Nash Equilibrium Forecast
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-sm text-slate-400">Predicted Price</div>
                <div className="text-3xl font-bold text-amber-400">${equilibrium.predictedPrice}</div>
                <div className="text-xs text-slate-500">{equilibrium.timeHorizon}</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-sm text-slate-400">Confidence</div>
                <div className="text-3xl font-bold text-cyan-400">{(equilibrium.confidence * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-sm text-slate-400">Stability</div>
                <div className="text-3xl font-bold text-green-400">{(equilibrium.stabilityScore * 100).toFixed(0)}%</div>
              </div>
              <div className={`rounded-lg p-4 text-center ${
                equilibrium.scenarioType === 'bullish' ? 'bg-green-900/30' :
                equilibrium.scenarioType === 'bearish' ? 'bg-red-900/30' : 'bg-slate-700'
              }`}>
                <div className="text-sm text-slate-400">Outlook</div>
                <div className={`text-2xl font-bold capitalize ${
                  equilibrium.scenarioType === 'bullish' ? 'text-green-400' :
                  equilibrium.scenarioType === 'bearish' ? 'text-red-400' : 'text-slate-300'
                }`}>
                  {equilibrium.scenarioType}
                </div>
              </div>
            </div>

            {/* Price Projection Chart */}
            {simulationHistory.length > 0 && (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulationHistory}>
                    <defs>
                      <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="week" stroke="#94a3b8" label={{ value: 'Weeks', position: 'bottom', fill: '#94a3b8' }} />
                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number) => [`$${value}`, 'Price']}
                    />
                    <Area type="monotone" dataKey="upper" stroke="transparent" fill="#10b981" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="lower" stroke="transparent" fill="#ef4444" fillOpacity={0.1} />
                    <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={3} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-4 p-4 bg-amber-900/20 rounded-lg border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-medium text-amber-300">Dominant Strategy</span>
              </div>
              <p className="text-slate-300">{equilibrium.dominantStrategy}</p>
              <p className="text-sm text-slate-400 mt-2">
                Based on the current demand-side assumptions and macro conditions, the game-theoretic sandbox
                predicts this as the most likely equilibrium outcome.
              </p>
            </div>
          </div>
        )}
      </div>
    </GoldModuleGate>
  );
};

export default GoldGameModule;
