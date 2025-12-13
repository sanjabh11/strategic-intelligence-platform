// Scenario Template Library
// Pre-built game theory scenarios for quick analysis
// Supports educational, financial, and strategic contexts
// Part of Monetization Strategy - Key content feature

import React, { useState, useMemo } from 'react';
import {
  BookOpen, Search, Filter, Play, Star, Clock, Users, 
  TrendingUp, Building2, Globe, Cpu, Scale, Shield,
  Landmark, Factory, Briefcase, GraduationCap, Swords
} from 'lucide-react';

export interface ScenarioTemplate {
  id: string;
  title: string;
  category: 'classic' | 'financial' | 'geopolitical' | 'business' | 'educational' | 'technology';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  scenarioText: string;
  players: { name: string; actions: string[] }[];
  gameType: 'simultaneous' | 'sequential' | 'repeated';
  expectedEquilibrium: string;
  realWorldExample: string;
  learningObjectives: string[];
  tags: string[];
  isPremium: boolean;
  estimatedTime: string;
  popularity: number;
}

// Comprehensive template library
const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  // Classic Game Theory
  {
    id: 'prisoners-dilemma',
    title: "Prisoner's Dilemma",
    category: 'classic',
    difficulty: 'beginner',
    description: 'The foundational game theory scenario exploring cooperation vs. defection dynamics.',
    scenarioText: "Two suspects are arrested by police. Each can either remain silent (cooperate) or testify against the other (defect). If both remain silent, they get 1 year each. If both testify, they get 5 years each. If one testifies and the other remains silent, the testifier goes free while the silent one gets 10 years.",
    players: [
      { name: 'Suspect A', actions: ['Remain Silent', 'Testify'] },
      { name: 'Suspect B', actions: ['Remain Silent', 'Testify'] }
    ],
    gameType: 'simultaneous',
    expectedEquilibrium: 'Both Defect (Testify) - Nash Equilibrium',
    realWorldExample: 'Arms race between nations, corporate price wars, climate agreements',
    learningObjectives: [
      'Understand dominant strategies',
      'Recognize Nash equilibrium',
      'Explore the tension between individual and collective rationality'
    ],
    tags: ['cooperation', 'defection', 'Nash', 'dominant strategy'],
    isPremium: false,
    estimatedTime: '5 min',
    popularity: 98
  },
  {
    id: 'stag-hunt',
    title: 'Stag Hunt',
    category: 'classic',
    difficulty: 'beginner',
    description: 'A coordination game where cooperation yields the best outcome but requires trust.',
    scenarioText: "Two hunters can either hunt a stag together or hunt hares individually. A stag provides more meat (payoff 5 each) but requires both hunters. A hare can be caught alone (payoff 2). If one hunts stag while the other hunts hare, the stag hunter gets nothing (payoff 0).",
    players: [
      { name: 'Hunter A', actions: ['Hunt Stag', 'Hunt Hare'] },
      { name: 'Hunter B', actions: ['Hunt Stag', 'Hunt Hare'] }
    ],
    gameType: 'simultaneous',
    expectedEquilibrium: 'Two Nash Equilibria: Both Stag (Pareto optimal) or Both Hare (Risk dominant)',
    realWorldExample: 'International climate agreements, technology standard adoption',
    learningObjectives: [
      'Understand coordination games',
      'Distinguish between Pareto and risk dominance',
      'Explore the role of trust in strategic interaction'
    ],
    tags: ['coordination', 'trust', 'Pareto', 'risk dominance'],
    isPremium: false,
    estimatedTime: '5 min',
    popularity: 85
  },
  {
    id: 'chicken-game',
    title: 'Game of Chicken',
    category: 'classic',
    difficulty: 'intermediate',
    description: 'An anti-coordination game where players want to choose different actions.',
    scenarioText: "Two drivers race toward each other. Each can either swerve or continue straight. If both swerve, they tie (payoff 0 each). If one swerves, they're the 'chicken' (payoff -1) while the other wins (payoff +1). If neither swerves, they crash (payoff -10 each).",
    players: [
      { name: 'Driver A', actions: ['Swerve', 'Straight'] },
      { name: 'Driver B', actions: ['Swerve', 'Straight'] }
    ],
    gameType: 'simultaneous',
    expectedEquilibrium: 'Two asymmetric Nash Equilibria plus one mixed strategy equilibrium',
    realWorldExample: 'Cuban Missile Crisis, labor negotiations, market entry decisions',
    learningObjectives: [
      'Understand brinkmanship',
      'Learn mixed strategy equilibria',
      'Analyze asymmetric outcomes'
    ],
    tags: ['brinkmanship', 'mixed strategy', 'anti-coordination'],
    isPremium: false,
    estimatedTime: '10 min',
    popularity: 75
  },
  // Financial
  {
    id: 'gold-central-banks',
    title: 'Central Bank Gold Reserve Game',
    category: 'financial',
    difficulty: 'advanced',
    description: 'Model how Central Banks strategically manage gold reserves amid dollar hegemony.',
    scenarioText: "Major Central Banks (China, Russia, Fed) decide on gold reserve policies. Each can 'Accumulate' (buy gold), 'Hold' (maintain current reserves), or 'Reduce' (sell gold). If all accumulate, gold prices surge but dollar weakens. If all hold, status quo continues. Mixed strategies create winners and losers based on first-mover advantages.",
    players: [
      { name: 'PBoC (China)', actions: ['Accumulate', 'Hold', 'Reduce'] },
      { name: 'Bank of Russia', actions: ['Accumulate', 'Hold', 'Reduce'] },
      { name: 'Federal Reserve', actions: ['Accumulate', 'Hold', 'Reduce'] }
    ],
    gameType: 'simultaneous',
    expectedEquilibrium: 'Multiple equilibria depending on dollar confidence and inflation expectations',
    realWorldExample: 'Post-2008 de-dollarization trends, BRICS reserve diversification',
    learningObjectives: [
      'Model multi-player strategic interactions',
      'Understand currency reserve dynamics',
      'Analyze coordination under uncertainty'
    ],
    tags: ['gold', 'central banks', 'reserves', 'currency', 'monetary policy'],
    isPremium: true,
    estimatedTime: '20 min',
    popularity: 92
  },
  {
    id: 'cournot-competition',
    title: 'Cournot Quantity Competition',
    category: 'financial',
    difficulty: 'intermediate',
    description: 'Classic oligopoly model where firms compete on production quantities.',
    scenarioText: "Two oil producers decide production levels. Market price depends on total supply: P = 100 - Q. Each firm has marginal cost of $10. Higher production means more revenue but lower prices. What quantity should each produce?",
    players: [
      { name: 'Producer A', actions: ['Low Output (20)', 'Medium Output (30)', 'High Output (40)'] },
      { name: 'Producer B', actions: ['Low Output (20)', 'Medium Output (30)', 'High Output (40)'] }
    ],
    gameType: 'simultaneous',
    expectedEquilibrium: 'Both choose Medium Output - Nash equilibrium at q = 30 each',
    realWorldExample: 'OPEC production decisions, semiconductor fab capacity',
    learningObjectives: [
      'Understand Cournot equilibrium',
      'Calculate best response functions',
      'Analyze oligopoly dynamics'
    ],
    tags: ['oligopoly', 'Cournot', 'production', 'pricing'],
    isPremium: false,
    estimatedTime: '15 min',
    popularity: 70
  },
  {
    id: 'market-entry',
    title: 'Market Entry Game',
    category: 'business',
    difficulty: 'intermediate',
    description: 'Sequential game where an incumbent faces a potential entrant.',
    scenarioText: "A startup considers entering a market dominated by an incumbent. The incumbent can either 'Accommodate' (share market) or 'Fight' (price war). Entry costs are high but the market is profitable. If the incumbent fights, both lose money short-term.",
    players: [
      { name: 'Startup', actions: ['Enter', 'Stay Out'] },
      { name: 'Incumbent', actions: ['Accommodate', 'Fight'] }
    ],
    gameType: 'sequential',
    expectedEquilibrium: 'Subgame Perfect: Enter, Accommodate (if fighting is not credible)',
    realWorldExample: 'Tech startups vs. big tech, airline industry new entrants',
    learningObjectives: [
      'Understand subgame perfect equilibrium',
      'Analyze credible vs. non-credible threats',
      'Model sequential strategic interaction'
    ],
    tags: ['entry deterrence', 'sequential', 'credible threats'],
    isPremium: true,
    estimatedTime: '15 min',
    popularity: 78
  },
  // Geopolitical
  {
    id: 'nuclear-deterrence',
    title: 'Nuclear Deterrence (MAD)',
    category: 'geopolitical',
    difficulty: 'advanced',
    description: 'Model Mutually Assured Destruction dynamics between nuclear powers.',
    scenarioText: "Two nuclear powers face a crisis. Each can 'Escalate' (threaten nuclear use), 'Conventional Response', or 'De-escalate'. Nuclear exchange destroys both (-1000). Conventional conflict favors the stronger (-10 vs -50). De-escalation maintains status quo (0).",
    players: [
      { name: 'Power A', actions: ['Escalate', 'Conventional', 'De-escalate'] },
      { name: 'Power B', actions: ['Escalate', 'Conventional', 'De-escalate'] }
    ],
    gameType: 'simultaneous',
    expectedEquilibrium: 'Multiple equilibria; MAD creates mutual de-escalation incentive',
    realWorldExample: 'Cold War standoffs, Ukraine crisis nuclear rhetoric',
    learningObjectives: [
      'Understand deterrence theory',
      'Analyze extreme payoff asymmetries',
      'Model credibility in high-stakes games'
    ],
    tags: ['deterrence', 'MAD', 'security', 'escalation'],
    isPremium: true,
    estimatedTime: '25 min',
    popularity: 88
  },
  {
    id: 'trade-war',
    title: 'Trade War Tariff Game',
    category: 'geopolitical',
    difficulty: 'intermediate',
    description: 'Model tariff escalation dynamics between major economies.',
    scenarioText: "US and China decide on tariff policies. Each can impose 'High Tariffs', 'Moderate Tariffs', or 'Free Trade'. Tariffs protect domestic industries but invite retaliation. Free trade maximizes total welfare but may hurt specific sectors.",
    players: [
      { name: 'United States', actions: ['High Tariffs', 'Moderate', 'Free Trade'] },
      { name: 'China', actions: ['High Tariffs', 'Moderate', 'Free Trade'] }
    ],
    gameType: 'simultaneous',
    expectedEquilibrium: 'Prisoner\'s Dilemma structure leads to mutual tariffs despite Free Trade being Pareto optimal',
    realWorldExample: '2018-2020 US-China trade war, EU trade negotiations',
    learningObjectives: [
      'Apply game theory to trade policy',
      'Understand tariff retaliation dynamics',
      'Analyze collective action problems in trade'
    ],
    tags: ['trade', 'tariffs', 'international', 'policy'],
    isPremium: false,
    estimatedTime: '15 min',
    popularity: 82
  },
  // Technology
  {
    id: 'ai-safety-coordination',
    title: 'AI Safety Coordination Game',
    category: 'technology',
    difficulty: 'advanced',
    description: 'Model coordination challenges in AI safety standards among tech giants.',
    scenarioText: "Major AI labs (OpenAI, Google, Anthropic) decide on safety investment levels. 'High Safety' slows development but reduces catastrophic risk. 'Low Safety' speeds development but increases risk. First-mover advantage vs. collective responsibility.",
    players: [
      { name: 'Lab A', actions: ['High Safety', 'Moderate Safety', 'Low Safety'] },
      { name: 'Lab B', actions: ['High Safety', 'Moderate Safety', 'Low Safety'] },
      { name: 'Lab C', actions: ['High Safety', 'Moderate Safety', 'Low Safety'] }
    ],
    gameType: 'simultaneous',
    expectedEquilibrium: 'Race to bottom without coordination; regulation may shift equilibrium',
    realWorldExample: 'Current AI development landscape, voluntary commitments',
    learningObjectives: [
      'Analyze coordination in emerging technology',
      'Understand race dynamics',
      'Explore role of regulation in equilibrium selection'
    ],
    tags: ['AI', 'safety', 'coordination', 'technology', 'regulation'],
    isPremium: true,
    estimatedTime: '20 min',
    popularity: 95
  },
  {
    id: 'platform-competition',
    title: 'Platform Network Effects Game',
    category: 'technology',
    difficulty: 'intermediate',
    description: 'Model competition between platforms with network effects.',
    scenarioText: "Two social media platforms compete for users. Each can 'Invest Heavily' (burn cash for growth), 'Moderate Investment', or 'Monetize' (extract value from existing users). Network effects create winner-take-all dynamics.",
    players: [
      { name: 'Platform A', actions: ['Invest Heavily', 'Moderate', 'Monetize'] },
      { name: 'Platform B', actions: ['Invest Heavily', 'Moderate', 'Monetize'] }
    ],
    gameType: 'repeated',
    expectedEquilibrium: 'Investment race until one dominates or both exhausted',
    realWorldExample: 'Facebook vs MySpace, Uber vs Lyft, streaming wars',
    learningObjectives: [
      'Understand network effects in strategy',
      'Analyze winner-take-all markets',
      'Model repeated games with dynamic payoffs'
    ],
    tags: ['platforms', 'network effects', 'competition', 'growth'],
    isPremium: false,
    estimatedTime: '15 min',
    popularity: 79
  },
  // Educational
  {
    id: 'matching-pennies',
    title: 'Matching Pennies',
    category: 'educational',
    difficulty: 'beginner',
    description: 'A zero-sum game demonstrating mixed strategy equilibrium.',
    scenarioText: "Two players simultaneously show a penny. Player A wins if the pennies match (both Heads or both Tails). Player B wins if they don't match. Winner gets $1 from the loser.",
    players: [
      { name: 'Player A', actions: ['Heads', 'Tails'] },
      { name: 'Player B', actions: ['Heads', 'Tails'] }
    ],
    gameType: 'simultaneous',
    expectedEquilibrium: 'Mixed Strategy: Each player randomizes 50-50',
    realWorldExample: 'Penalty kicks in soccer, poker bluffing',
    learningObjectives: [
      'Understand zero-sum games',
      'Calculate mixed strategy equilibrium',
      'Recognize games without pure strategy equilibrium'
    ],
    tags: ['zero-sum', 'mixed strategy', 'randomization'],
    isPremium: false,
    estimatedTime: '5 min',
    popularity: 72
  },
  {
    id: 'battle-of-sexes',
    title: 'Battle of the Sexes',
    category: 'educational',
    difficulty: 'beginner',
    description: 'A coordination game with conflicting preferences.',
    scenarioText: "A couple wants to spend the evening together but prefers different activities. Partner A prefers the Opera (payoff 3), Partner B prefers the Football game (payoff 3). Going together to either is better than going alone (payoff 1).",
    players: [
      { name: 'Partner A', actions: ['Opera', 'Football'] },
      { name: 'Partner B', actions: ['Opera', 'Football'] }
    ],
    gameType: 'simultaneous',
    expectedEquilibrium: 'Two pure strategy equilibria (both Opera or both Football) plus mixed',
    realWorldExample: 'Technology standards, meeting scheduling, team coordination',
    learningObjectives: [
      'Understand coordination with conflicting preferences',
      'Analyze multiple equilibria',
      'Explore focal points and conventions'
    ],
    tags: ['coordination', 'preferences', 'multiple equilibria'],
    isPremium: false,
    estimatedTime: '5 min',
    popularity: 68
  }
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  classic: BookOpen,
  financial: TrendingUp,
  geopolitical: Globe,
  business: Briefcase,
  educational: GraduationCap,
  technology: Cpu
};

const CATEGORY_COLORS: Record<string, string> = {
  classic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  financial: 'bg-green-500/20 text-green-400 border-green-500/30',
  geopolitical: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  business: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  educational: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  technology: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
};

interface ScenarioTemplateLibraryProps {
  onSelectTemplate: (template: ScenarioTemplate) => void;
  userTier?: 'free' | 'analyst' | 'pro' | 'enterprise' | 'academic';
}

const ScenarioTemplateLibrary: React.FC<ScenarioTemplateLibraryProps> = ({
  onSelectTemplate,
  userTier = 'free'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);

  const canAccessPremium = userTier !== 'free';

  const filteredTemplates = useMemo(() => {
    return SCENARIO_TEMPLATES.filter(template => {
      const matchesSearch = !searchQuery || 
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !selectedCategory || template.category === selectedCategory;
      const matchesDifficulty = !selectedDifficulty || template.difficulty === selectedDifficulty;
      const matchesPremium = !showPremiumOnly || template.isPremium;
      
      return matchesSearch && matchesCategory && matchesDifficulty && matchesPremium;
    }).sort((a, b) => b.popularity - a.popularity);
  }, [searchQuery, selectedCategory, selectedDifficulty, showPremiumOnly]);

  const categories = ['classic', 'financial', 'geopolitical', 'business', 'educational', 'technology'];
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-xl text-white">
        <div className="flex items-center gap-4">
          <BookOpen className="w-10 h-10" />
          <div>
            <h2 className="text-2xl font-bold">Scenario Template Library</h2>
            <p className="text-indigo-200">Pre-built game theory scenarios for quick analysis</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                !selectedCategory ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              All
            </button>
            {categories.map(cat => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    selectedCategory === cat ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty and Premium Filters */}
        <div className="flex gap-4 mt-4">
          <div className="flex gap-2">
            {difficulties.map(diff => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(selectedDifficulty === diff ? null : diff)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedDifficulty === diff ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showPremiumOnly}
              onChange={(e) => setShowPremiumOnly(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600"
            />
            Premium Only
          </label>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-400">
        Showing {filteredTemplates.length} of {SCENARIO_TEMPLATES.length} scenarios
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => {
          const CategoryIcon = CATEGORY_ICONS[template.category];
          const isLocked = template.isPremium && !canAccessPremium;
          
          return (
            <div
              key={template.id}
              className={`bg-slate-800 rounded-xl border transition-all ${
                isLocked ? 'border-slate-700 opacity-75' : 'border-slate-700 hover:border-indigo-500/50 cursor-pointer'
              }`}
              onClick={() => !isLocked && onSelectTemplate(template)}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg border ${CATEGORY_COLORS[template.category]}`}>
                    <CategoryIcon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {template.isPremium && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                        Premium
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-xs">{template.popularity}</span>
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="font-semibold text-slate-200 mb-2">{template.title}</h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-3">{template.description}</p>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {template.players.length} players
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {template.estimatedTime}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    template.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                    template.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {template.difficulty}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                    isLocked 
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }`}
                  disabled={isLocked}
                >
                  {isLocked ? (
                    <>
                      <Shield className="w-4 h-4" />
                      Upgrade to Access
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Use Template
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No scenarios match your filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory(null);
              setSelectedDifficulty(null);
              setShowPremiumOnly(false);
            }}
            className="mt-2 text-indigo-400 hover:text-indigo-300"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export { SCENARIO_TEMPLATES };
export default ScenarioTemplateLibrary;
