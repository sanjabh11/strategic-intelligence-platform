// Labs Container - Premium Modules Hub
// Groups advanced modules (Multiplayer, Bias, Coach, Mediator, Intel) under one route
// Tier-gated access per Whop monetization strategy

import React, { useState } from 'react';
import { 
  Users, Target, Lightbulb, Scale, Globe, 
  Lock, Sparkles, Crown, ArrowRight, ChevronLeft
} from 'lucide-react';
import { useSubscription, SubscriptionTier } from '../hooks/useSubscription';
import { MultiplayerLobby } from './MultiplayerLobby';
import { BiasSimulator } from './BiasSimulator';
import { PersonalLifeCoach } from './PersonalLifeCoach';
import { AIMediator } from './AIMediator';
import { GeopoliticalDashboard } from './GeopoliticalDashboard';

// Module configuration
interface LabModule {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  minTier: 'pro' | 'elite';
  color: string;
  component: React.ComponentType;
}

const LAB_MODULES: LabModule[] = [
  {
    id: 'multiplayer',
    name: 'Multiplayer Strategy',
    description: 'Real-time strategic games with other users',
    icon: Users,
    minTier: 'pro',
    color: 'cyan',
    component: MultiplayerLobby
  },
  {
    id: 'bias',
    name: 'Bias Training Simulator',
    description: 'Identify and overcome cognitive biases in decision-making',
    icon: Target,
    minTier: 'pro',
    color: 'amber',
    component: BiasSimulator
  },
  {
    id: 'coach',
    name: 'Strategic Life Coach',
    description: 'AI-powered personal strategy coaching',
    icon: Lightbulb,
    minTier: 'pro',
    color: 'emerald',
    component: PersonalLifeCoach
  },
  {
    id: 'mediator',
    name: 'AI Mediator',
    description: 'Conflict resolution and negotiation assistance',
    icon: Scale,
    minTier: 'pro',
    color: 'purple',
    component: AIMediator
  },
  {
    id: 'intel',
    name: 'Geopolitics Live Intel',
    description: 'Real-time geopolitical analysis and forecasting',
    icon: Globe,
    minTier: 'elite',
    color: 'rose',
    component: GeopoliticalDashboard
  }
];

// Map subscription tiers to Whop tiers
const mapToWhopTier = (tier: SubscriptionTier): 'basic' | 'pro' | 'elite' => {
  switch (tier) {
    case 'free':
    case 'analyst':
      return 'basic';
    case 'pro':
    case 'academic':
      return 'pro';
    case 'enterprise':
      return 'elite';
    default:
      return 'basic';
  }
};

const tierHierarchy: Record<string, number> = {
  'basic': 1,
  'pro': 2,
  'elite': 3
};

const Labs: React.FC = () => {
  const { currentTier, loading: subLoading } = useSubscription();
  const whopTier = mapToWhopTier(currentTier);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const canAccessModule = (module: LabModule): boolean => {
    return tierHierarchy[whopTier] >= tierHierarchy[module.minTier];
  };

  const handleModuleClick = (module: LabModule) => {
    if (canAccessModule(module)) {
      setActiveModule(module.id);
    }
  };

  // If a module is active, render it
  if (activeModule) {
    const module = LAB_MODULES.find(m => m.id === activeModule);
    if (module) {
      const ModuleComponent = module.component;
      return (
        <div className="min-h-screen bg-slate-900">
          {/* Back Navigation */}
          <div className="bg-slate-800 border-b border-slate-700">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <button
                onClick={() => setActiveModule(null)}
                className="flex items-center text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Back to Labs
              </button>
            </div>
          </div>
          <ModuleComponent />
        </div>
      );
    }
  }

  // Render Labs grid
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-medium">Premium Modules</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Strategy Labs
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Advanced strategic analysis tools for professionals. 
            Multiplayer games, bias training, coaching, mediation, and live intel.
          </p>
        </div>

        {/* Tier Status */}
        <div className="mb-8 flex justify-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
            whopTier === 'elite' 
              ? 'bg-amber-500/20 text-amber-400'
              : whopTier === 'pro'
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-slate-700 text-slate-400'
          }`}>
            {whopTier === 'elite' ? (
              <Crown className="w-5 h-5" />
            ) : whopTier === 'pro' ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
            <span className="font-medium capitalize">{whopTier} Access</span>
          </div>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LAB_MODULES.map((module) => {
            const Icon = module.icon;
            const isAccessible = canAccessModule(module);
            const colorClasses = {
              cyan: 'from-cyan-500 to-cyan-600',
              amber: 'from-amber-500 to-amber-600',
              emerald: 'from-emerald-500 to-emerald-600',
              purple: 'from-purple-500 to-purple-600',
              rose: 'from-rose-500 to-rose-600'
            };

            return (
              <div
                key={module.id}
                onClick={() => handleModuleClick(module)}
                className={`relative bg-slate-800 rounded-xl border overflow-hidden transition-all ${
                  isAccessible
                    ? 'border-slate-700 hover:border-slate-600 cursor-pointer hover:shadow-lg'
                    : 'border-slate-700/50 opacity-75'
                }`}
              >
                {/* Tier Badge */}
                <div className={`absolute top-4 right-4 px-2 py-1 rounded text-xs font-medium ${
                  module.minTier === 'elite'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {module.minTier.toUpperCase()}
                </div>

                <div className="p-6">
                  {/* Icon */}
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${colorClasses[module.color as keyof typeof colorClasses]} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {module.name}
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {module.description}
                  </p>

                  {/* Action */}
                  {isAccessible ? (
                    <button className="flex items-center text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                      Launch Module
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  ) : (
                    <div className="flex items-center text-sm text-slate-500">
                      <Lock className="w-4 h-4 mr-2" />
                      Upgrade to {module.minTier}
                    </div>
                  )}
                </div>

                {/* Locked Overlay */}
                {!isAccessible && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                    <div className="text-center p-4">
                      <Lock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">
                        Requires {module.minTier.charAt(0).toUpperCase() + module.minTier.slice(1)} tier
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Upgrade CTA for non-Pro/Elite users */}
        {whopTier === 'basic' && (
          <div className="mt-10 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl p-8 border border-purple-500/20 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">
              Unlock All Labs Features
            </h3>
            <p className="text-slate-400 mb-6 max-w-xl mx-auto">
              Upgrade to Pro or Elite to access multiplayer games, bias training, 
              strategic coaching, AI mediation, and live geopolitical intelligence.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-5 h-5" />
              View Upgrade Options
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Labs;
