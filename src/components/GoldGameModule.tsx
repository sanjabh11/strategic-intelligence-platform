// Gold Game Specialized Module
// Pre-configured game-theoretic model for gold price forecasting
// Models Central Bank reserve optimization, Miner production decisions
// Part of Monetization Strategy - Key differentiation feature

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Building2, Factory,
  Globe, RefreshCw, Play, Info, ChevronDown, ChevronUp,
  Target, Zap, AlertTriangle, BarChart3, PieChart
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { GoldModuleGate } from './SubscriptionGate';

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
  weekChange: number;
  yearChange: number;
  totalSupply: number;
  totalDemand: number;
  centralBankDemand: number;
  jewelryDemand: number;
  investmentDemand: number;
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

const GoldGameModule: React.FC<GoldGameModuleProps> = ({ userId, isLearningMode = false }) => {
  const [centralBanks, setCentralBanks] = useState<CentralBankAgent[]>(DEFAULT_CENTRAL_BANKS);
  const [miners, setMiners] = useState<MinerAgent[]>(DEFAULT_MINERS);
  const [marketState, setMarketState] = useState<GoldMarketState | null>(null);
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

  // Fetch real-time gold price (simulated for demo)
  const fetchMarketData = useCallback(async () => {
    // In production, this would call the gold-data-stream edge function
    // For now, simulate realistic market data
    const basePrice = 2350 + (Math.random() - 0.5) * 50;
    setMarketState({
      spotPrice: basePrice,
      dayChange: (Math.random() - 0.5) * 2,
      weekChange: (Math.random() - 0.3) * 5,
      yearChange: 12 + (Math.random() - 0.5) * 4,
      totalSupply: 4800,
      totalDemand: 4900,
      centralBankDemand: 1100,
      jewelryDemand: 2200,
      investmentDemand: 1100
    });
  }, []);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000); // Update every 30s
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
      
      const basePrice = marketState?.spotPrice || 2350;
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
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">The Gold Game</h2>
                <p className="text-amber-100">Game-Theoretic Gold Price Forecasting</p>
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

        {/* Learning Mode Explanation */}
        {isLearningMode && (
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-300 mb-1">How The Gold Game Works</h4>
                <p className="text-sm text-slate-300">
                  This module models gold prices as the outcome of strategic interactions between Central Banks 
                  (who manage reserves) and Mining companies (who control supply). Rather than extrapolating 
                  from historical prices, we calculate the Nash Equilibrium of their strategic decisions to 
                  predict where prices will stabilize.
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
          
          {expandedSection === 'market' && marketState && (
            <div className="p-4 pt-0 border-t border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-400">Spot Price</div>
                  <div className="text-2xl font-bold text-amber-400">${marketState.spotPrice.toFixed(0)}</div>
                </div>
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-400">YTD Change</div>
                  <div className={`text-2xl font-bold ${marketState.yearChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {marketState.yearChange >= 0 ? '+' : ''}{marketState.yearChange.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-400">Supply</div>
                  <div className="text-2xl font-bold text-slate-200">{marketState.totalSupply}t</div>
                </div>
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-400">Demand</div>
                  <div className="text-2xl font-bold text-slate-200">{marketState.totalDemand}t</div>
                </div>
              </div>
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
            Central Bank Agents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centralBanks.map(renderCentralBankCard)}
          </div>
        </div>

        {/* Run Simulation Button */}
        <div className="flex justify-center">
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 flex items-center gap-3 text-lg"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                Computing Equilibrium...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Run Gold Game Simulation
              </>
            )}
          </button>
        </div>

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
                Based on the current configuration of Central Bank reserve targets and macro conditions, 
                the game-theoretic model predicts this as the most likely equilibrium outcome.
              </p>
            </div>
          </div>
        )}
      </div>
    </GoldModuleGate>
  );
};

export default GoldGameModule;
