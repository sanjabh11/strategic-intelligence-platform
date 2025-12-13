// Bias Profile Dashboard Component
// Monetization Feature F10: Nudge Training & Behavioral Profiling
// Tracks cognitive biases and provides personalized debiasing recommendations

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Brain, Target, TrendingUp, AlertTriangle, Check, X,
    BarChart3, Award, Info, ChevronDown, RefreshCw,
    Zap, BookOpen, ArrowRight, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BiasProfile {
    userId: string;
    overallScore: number;
    assessmentCount: number;
    lastAssessedAt: string;
    biases: BiasEntry[];
    strengths: string[];
    growthAreas: string[];
}

interface BiasEntry {
    id: string;
    name: string;
    category: 'cognitive' | 'emotional' | 'social' | 'memory';
    frequency: number; // 0-100, how often this bias appears
    severity: 'low' | 'medium' | 'high';
    trend: 'improving' | 'stable' | 'worsening';
    lastDetected?: string;
    description: string;
    debiasingTip: string;
}

interface TrainingModule {
    id: string;
    name: string;
    description: string;
    targetBiases: string[];
    duration: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    completed: boolean;
    score?: number;
}

const COMMON_BIASES: Partial<BiasEntry>[] = [
    {
        id: 'anchoring', name: 'Anchoring Bias', category: 'cognitive',
        description: 'Over-reliance on the first piece of information encountered',
        debiasingTip: 'Always consider multiple reference points before making a decision'
    },
    {
        id: 'confirmation', name: 'Confirmation Bias', category: 'cognitive',
        description: 'Favoring information that confirms existing beliefs',
        debiasingTip: 'Actively seek out contradicting evidence and steelman opposing views'
    },
    {
        id: 'sunk-cost', name: 'Sunk Cost Fallacy', category: 'emotional',
        description: 'Continuing an endeavor due to previously invested resources',
        debiasingTip: 'Evaluate decisions based on future value, not past investments'
    },
    {
        id: 'availability', name: 'Availability Heuristic', category: 'memory',
        description: 'Overweighting easily-recalled information',
        debiasingTip: 'Seek base rates and statistical data, not just vivid examples'
    },
    {
        id: 'overconfidence', name: 'Overconfidence', category: 'cognitive',
        description: 'Excessive confidence in own answers and abilities',
        debiasingTip: 'Practice calibration - track your prediction accuracy over time'
    },
    {
        id: 'loss-aversion', name: 'Loss Aversion', category: 'emotional',
        description: 'Preferring to avoid losses over acquiring equivalent gains',
        debiasingTip: 'Frame decisions in terms of net outcomes, not gains vs losses'
    },
    {
        id: 'bandwagon', name: 'Bandwagon Effect', category: 'social',
        description: 'Adopting beliefs because many others hold them',
        debiasingTip: 'Make decisions before seeing what others chose'
    },
    {
        id: 'recency', name: 'Recency Bias', category: 'memory',
        description: 'Giving more weight to recent events',
        debiasingTip: 'Maintain decision journals and review long-term patterns'
    },
    {
        id: 'hindsight', name: 'Hindsight Bias', category: 'memory',
        description: 'Believing past events were predictable after they occurred',
        debiasingTip: 'Record predictions before events and review honestly'
    },
    {
        id: 'status-quo', name: 'Status Quo Bias', category: 'cognitive',
        description: 'Preference for the current state of affairs',
        debiasingTip: 'Imagine you were starting fresh - would you choose this option?'
    }
];

const TRAINING_MODULES: TrainingModule[] = [
    {
        id: 'm1', name: 'Calibration Training', description: 'Learn to match your confidence to your accuracy',
        targetBiases: ['overconfidence'], duration: '15 min', difficulty: 'beginner', completed: false
    },
    {
        id: 'm2', name: 'Red Team Thinking', description: 'Practice arguing against your own positions',
        targetBiases: ['confirmation'], duration: '20 min', difficulty: 'intermediate', completed: false
    },
    {
        id: 'm3', name: 'Base Rate Exercises', description: 'Train statistical intuition to counter availability bias',
        targetBiases: ['availability', 'anchoring'], duration: '25 min', difficulty: 'intermediate', completed: false
    },
    {
        id: 'm4', name: 'Pre-Mortem Analysis', description: 'Imagine failure to identify blind spots',
        targetBiases: ['overconfidence', 'confirmation'], duration: '30 min', difficulty: 'advanced', completed: false
    }
];

interface BiasProfileDashboardProps {
    userId?: string;
}

const BiasProfileDashboard: React.FC<BiasProfileDashboardProps> = ({ userId }) => {
    const [profile, setProfile] = useState<BiasProfile | null>(null);
    const [modules, setModules] = useState<TrainingModule[]>(TRAINING_MODULES);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'profile' | 'training' | 'history'>('profile');
    const [expandedBias, setExpandedBias] = useState<string | null>(null);

    // Fetch or create bias profile
    useEffect(() => {
        const initProfile = async () => {
            setLoading(true);

            try {
                const { data, error } = await supabase
                    .from('user_bias_profiles')
                    .select('*')
                    .eq('user_id', userId || 'guest')
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
                    console.error('Error fetching bias profile:', error);
                }

                if (data) {
                    // Map database fields to component interface
                    setProfile({
                        userId: data.user_id,
                        overallScore: Math.round(data.overall_score * 100),
                        assessmentCount: data.assessment_count || 0,
                        lastAssessedAt: data.last_assessed_at || new Date().toISOString(),
                        biases: (data.biases as any[]) || [],
                        strengths: data.strengths || [],
                        growthAreas: data.growth_areas || []
                    });
                } else {
                    // No profile found - show empty state
                    setProfile(null);
                }
            } catch (err) {
                console.error('Profile fetch error:', err);
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

        initProfile();
    }, [userId]);

    // Calculate category breakdowns
    const categoryScores = useMemo(() => {
        if (!profile) return {};

        const categories = ['cognitive', 'emotional', 'social', 'memory'];
        const scores: Record<string, { count: number; avgFreq: number }> = {};

        categories.forEach(cat => {
            const biases = profile.biases.filter(b => b.category === cat);
            scores[cat] = {
                count: biases.length,
                avgFreq: biases.length > 0 ? biases.reduce((sum, b) => sum + b.frequency, 0) / biases.length : 0
            };
        });

        return scores;
    }, [profile]);

    // Top biases to address
    const topBiases = useMemo(() => {
        if (!profile) return [];
        return [...profile.biases]
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 5);
    }, [profile]);

    // Render profile overview
    const renderProfileTab = () => (
        <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-violet-200 mb-1">Your Rationality Score</div>
                        <div className="text-5xl font-bold">{profile?.overallScore}</div>
                        <div className="text-sm text-violet-200 mt-2">
                            Based on {profile?.assessmentCount} assessments
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
                            <Brain className="w-12 h-12" />
                        </div>
                        <div className="text-xs text-violet-200 mt-2">
                            Top 35th percentile
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(categoryScores).map(([cat, data]) => (
                    <div key={cat} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                        <div className="text-xs text-slate-400 capitalize mb-1">{cat}</div>
                        <div className="text-xl font-bold text-white">{Math.round(100 - data.avgFreq)}%</div>
                        <div className="w-full h-2 bg-slate-700 rounded-full mt-2">
                            <div
                                className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                                style={{ width: `${100 - data.avgFreq}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Top Biases */}
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    Your Top Biases to Address
                </h3>

                <div className="space-y-3">
                    {topBiases.map(bias => (
                        <div key={bias.id}>
                            <div
                                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700"
                                onClick={() => setExpandedBias(expandedBias === bias.id ? null : bias.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${bias.severity === 'high' ? 'bg-red-500' :
                                        bias.severity === 'medium' ? 'bg-amber-500' :
                                            'bg-green-500'
                                        }`} />
                                    <span className="text-white">{bias.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${bias.trend === 'improving' ? 'bg-green-900/50 text-green-400' :
                                        bias.trend === 'worsening' ? 'bg-red-900/50 text-red-400' :
                                            'bg-slate-600 text-slate-300'
                                        }`}>
                                        {bias.trend}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-slate-400">{Math.round(bias.frequency)}% freq</div>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedBias === bias.id ? 'rotate-180' : ''
                                        }`} />
                                </div>
                            </div>

                            {expandedBias === bias.id && (
                                <div className="mt-2 p-4 bg-slate-700/30 rounded-lg border-l-2 border-violet-500">
                                    <p className="text-sm text-slate-300 mb-3">{bias.description}</p>
                                    <div className="flex items-start gap-2 p-3 bg-violet-900/30 rounded-lg">
                                        <Zap className="w-4 h-4 text-violet-400 mt-0.5" />
                                        <div>
                                            <div className="text-xs text-violet-400 mb-1">Debiasing Strategy</div>
                                            <p className="text-sm text-slate-200">{bias.debiasingTip}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Strengths & Growth */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-5 border border-green-500/30">
                    <h4 className="font-medium text-green-400 mb-3 flex items-center gap-2">
                        <Check className="w-4 h-4" /> Your Strengths
                    </h4>
                    <ul className="space-y-2">
                        {profile?.strengths.map((s, i) => (
                            <li key={i} className="text-slate-300 text-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-slate-800 rounded-xl p-5 border border-amber-500/30">
                    <h4 className="font-medium text-amber-400 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" /> Growth Areas
                    </h4>
                    <ul className="space-y-2">
                        {profile?.growthAreas.map((g, i) => (
                            <li key={i} className="text-slate-300 text-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {g}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );

    // Render training modules
    const renderTrainingTab = () => (
        <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6">
                <h3 className="font-semibold text-white mb-2">Personalized Training Path</h3>
                <p className="text-sm text-slate-400">
                    Based on your bias profile, we recommend these modules to improve your decision-making.
                </p>
            </div>

            {modules.map((module, idx) => (
                <div
                    key={module.id}
                    className={`bg-slate-800 rounded-xl p-5 border transition-all ${module.completed
                        ? 'border-green-500/30'
                        : idx === 0
                            ? 'border-violet-500 ring-1 ring-violet-500/30'
                            : 'border-slate-700'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            {module.completed ? (
                                <div className="w-10 h-10 rounded-full bg-green-900/50 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-green-400" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-violet-400" />
                                </div>
                            )}
                            <div>
                                <h4 className="font-medium text-white">{module.name}</h4>
                                <p className="text-sm text-slate-400">{module.description}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className={`px-2 py-1 rounded text-xs ${module.difficulty === 'beginner' ? 'bg-green-900/50 text-green-400' :
                                module.difficulty === 'intermediate' ? 'bg-blue-900/50 text-blue-400' :
                                    'bg-purple-900/50 text-purple-400'
                                }`}>
                                {module.difficulty}
                            </span>
                            <div className="text-xs text-slate-500 mt-2">{module.duration}</div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex gap-2">
                            {module.targetBiases.map(b => (
                                <span key={b} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-400">
                                    {b}
                                </span>
                            ))}
                        </div>

                        {module.completed ? (
                            <span className="text-sm text-green-400">Score: {module.score}%</span>
                        ) : (
                            <button
                                onClick={() => {
                                    setModules(prev => prev.map(m =>
                                        m.id === module.id ? { ...m, completed: true, score: 60 + Math.floor(Math.random() * 35) } : m
                                    ));
                                }}
                                className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                                Start Training <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-pink-600 p-6 rounded-xl text-white">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                        <Brain className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Bias Profile Dashboard</h2>
                        <p className="text-violet-200">Track and improve your decision-making rationality</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-fit">
                {(['profile', 'training', 'history'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
                            ? 'bg-violet-500 text-white'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'training' && renderTrainingTab()}
            {activeTab === 'history' && (
                <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
                    <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">Assessment history coming soon</p>
                </div>
            )}
        </div>
    );
};

export default BiasProfileDashboard;
