// Corporate War Room Component
// Monetization Feature F5: Real-Time Corporate Wargaming Lobby
// Enterprise-grade strategic simulation with team collaboration

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Shield, Users, Clock, Target, Zap, Map, Flag,
    Play, Pause, SkipForward, AlertTriangle, TrendingUp,
    MessageSquare, Settings, Crown, ChevronRight, Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WarRoomSession {
    id: string;
    name: string;
    scenario: string;
    status: 'lobby' | 'briefing' | 'active' | 'debrief' | 'completed';
    currentRound: number;
    totalRounds: number;
    teams: WarRoomTeam[];
    createdAt: string;
    timerEndAt?: string;
}

interface WarRoomTeam {
    id: string;
    name: string;
    color: string;
    players: WarRoomPlayer[];
    resources: TeamResources;
    strategy?: string;
    score: number;
}

interface WarRoomPlayer {
    id: string;
    name: string;
    role: 'leader' | 'analyst' | 'negotiator' | 'observer';
    isOnline: boolean;
    avatar?: string;
}

interface TeamResources {
    capital: number;
    marketShare: number;
    reputation: number;
    rdCapacity: number;
}

interface ScenarioTemplate {
    id: string;
    title: string;
    description: string;
    duration: string;
    teamCount: number;
    rounds: number;
    category: 'market_entry' | 'merger' | 'disruption' | 'crisis' | 'pricing';
    difficulty: 'standard' | 'advanced' | 'expert';
    isEnterprise: boolean;
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
    {
        id: 'market-entry-1',
        title: 'Tech Market Entry',
        description: 'Three companies compete to enter an emerging AI market. Balance R&D investment, go-to-market timing, and strategic partnerships.',
        duration: '45 min',
        teamCount: 3,
        rounds: 6,
        category: 'market_entry',
        difficulty: 'standard',
        isEnterprise: false
    },
    {
        id: 'merger-defense-1',
        title: 'Hostile Acquisition Defense',
        description: 'A target company must defend against a hostile takeover while acquirer assembles financing. Board members, shareholders, and regulators all play roles.',
        duration: '60 min',
        teamCount: 4,
        rounds: 8,
        category: 'merger',
        difficulty: 'advanced',
        isEnterprise: true
    },
    {
        id: 'disruption-1',
        title: 'Digital Disruption Response',
        description: 'Incumbent retailers face a new e-commerce competitor. Decide how to respond: compete, partner, or pivot.',
        duration: '30 min',
        teamCount: 2,
        rounds: 4,
        category: 'disruption',
        difficulty: 'standard',
        isEnterprise: false
    },
    {
        id: 'pricing-1',
        title: 'Airline Pricing War',
        description: 'Three airlines compete on a popular route. Model fare responses, capacity decisions, and alliance strategies.',
        duration: '45 min',
        teamCount: 3,
        rounds: 5,
        category: 'pricing',
        difficulty: 'expert',
        isEnterprise: true
    }
];

const TEAM_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface CorporateWarRoomProps {
    userId?: string;
    isEnterprise?: boolean;
}

const CorporateWarRoom: React.FC<CorporateWarRoomProps> = ({ userId, isEnterprise = false }) => {
    const [view, setView] = useState<'lobby' | 'session'>('lobby');
    const [sessions, setSessions] = useState<WarRoomSession[]>([]);
    const [activeSession, setActiveSession] = useState<WarRoomSession | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedScenario, setSelectedScenario] = useState<ScenarioTemplate | null>(null);
    const [timerRemaining, setTimerRemaining] = useState<number | null>(null);

    // Fetch active war room sessions
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const { data, error } = await supabase
                    .from('warroom_sessions')
                    .select('*')
                    .in('status', ['lobby', 'active'])
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching sessions:', error);
                    setSessions([]);
                } else if (data) {
                    // Map database fields to component interface
                    const mapped: WarRoomSession[] = (data || []).map(item => ({
                        id: item.id,
                        name: item.name,
                        scenario: item.scenario,
                        status: item.status as any,
                        currentRound: item.current_round,
                        totalRounds: item.total_rounds,
                        teams: (item.teams as any[]) || [],
                        createdAt: item.created_at,
                        timerEndAt: item.timer_end_at
                    }));
                    setSessions(mapped);
                } else {
                    setSessions([]);
                }
            } catch (err) {
                console.error('Session fetch error:', err);
                setSessions([]);
            }
        };

        fetchSessions();
    }, []);

    // Timer countdown
    useEffect(() => {
        if (activeSession?.timerEndAt) {
            const interval = setInterval(() => {
                const remaining = Math.max(0, new Date(activeSession.timerEndAt!).getTime() - Date.now());
                setTimerRemaining(Math.floor(remaining / 1000));
                if (remaining <= 0) clearInterval(interval);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [activeSession?.timerEndAt]);

    // Format timer
    const formatTimer = (seconds: number): string => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Create new session
    const handleCreateSession = useCallback((scenario: ScenarioTemplate) => {
        if (!isEnterprise && scenario.isEnterprise) {
            return; // Block non-enterprise users
        }

        const newSession: WarRoomSession = {
            id: crypto.randomUUID(),
            name: `${scenario.title} - ${new Date().toLocaleDateString()}`,
            scenario: scenario.title,
            status: 'lobby',
            currentRound: 0,
            totalRounds: scenario.rounds,
            teams: Array.from({ length: scenario.teamCount }, (_, i) => ({
                id: `team-${i}`,
                name: `Team ${i + 1}`,
                color: TEAM_COLORS[i % TEAM_COLORS.length],
                players: [],
                resources: { capital: 100, marketShare: Math.floor(100 / scenario.teamCount), reputation: 80, rdCapacity: 60 },
                score: 0
            })),
            createdAt: new Date().toISOString()
        };

        setActiveSession(newSession);
        setView('session');
        setShowCreateModal(false);
    }, [isEnterprise]);

    // Render lobby
    const renderLobby = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-xl text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg">
                            <Shield className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Corporate War Room</h2>
                            <p className="text-indigo-200">Strategic simulation for enterprise teams</p>
                        </div>
                    </div>
                    {isEnterprise && (
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full flex items-center gap-1">
                            <Crown className="w-4 h-4" />
                            Enterprise
                        </span>
                    )}
                </div>
            </div>

            {/* Enterprise upsell */}
            {!isEnterprise && (
                <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5 text-amber-400" />
                            <div>
                                <p className="font-medium text-amber-300">Unlock Enterprise War Games</p>
                                <p className="text-sm text-slate-400">Access advanced scenarios with team collaboration features</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium">
                            Upgrade to Enterprise
                        </button>
                    </div>
                </div>
            )}

            {/* Scenarios */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-200">War Game Scenarios</h3>
                    <button className="text-indigo-400 text-sm hover:text-indigo-300">View All</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SCENARIO_TEMPLATES.map(scenario => (
                        <div
                            key={scenario.id}
                            className={`bg-slate-800 rounded-xl p-5 border transition-all ${scenario.isEnterprise && !isEnterprise
                                ? 'border-slate-700 opacity-60'
                                : 'border-slate-700 hover:border-indigo-500 cursor-pointer'
                                }`}
                            onClick={() => {
                                if (!scenario.isEnterprise || isEnterprise) {
                                    handleCreateSession(scenario);
                                }
                            }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Map className="w-5 h-5 text-indigo-400" />
                                    <span className="font-medium text-white">{scenario.title}</span>
                                </div>
                                {scenario.isEnterprise ? (
                                    <span className="px-2 py-0.5 bg-amber-900/50 text-amber-400 text-xs rounded-full flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Enterprise
                                    </span>
                                ) : (
                                    <span className={`px-2 py-1 rounded text-xs ${scenario.difficulty === 'standard' ? 'bg-green-900/50 text-green-400' :
                                        scenario.difficulty === 'advanced' ? 'bg-blue-900/50 text-blue-400' :
                                            'bg-purple-900/50 text-purple-400'
                                        }`}>
                                        {scenario.difficulty}
                                    </span>
                                )}
                            </div>

                            <p className="text-sm text-slate-400 mb-4">{scenario.description}</p>

                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {scenario.duration}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {scenario.teamCount} teams
                                </span>
                                <span className="flex items-center gap-1">
                                    <Target className="w-3 h-3" /> {scenario.rounds} rounds
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Active Sessions */}
            {sessions.length > 0 && (
                <div>
                    <h3 className="font-semibold text-slate-200 mb-4">Active Sessions</h3>
                    <div className="space-y-2">
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-indigo-500 cursor-pointer flex items-center justify-between"
                                onClick={() => { setActiveSession(session); setView('session'); }}
                            >
                                <div>
                                    <div className="font-medium text-white">{session.name}</div>
                                    <div className="text-sm text-slate-400">{session.scenario} • {session.teams.length} teams</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded text-xs ${session.status === 'lobby' ? 'bg-slate-700 text-slate-300' :
                                        session.status === 'active' ? 'bg-green-900/50 text-green-400' :
                                            'bg-blue-900/50 text-blue-400'
                                        }`}>
                                        {session.status}
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-slate-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // Render active session
    const renderSession = () => {
        if (!activeSession) return null;

        return (
            <div className="space-y-4">
                {/* Session Header */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <button
                                onClick={() => setView('lobby')}
                                className="text-slate-400 hover:text-white text-sm mb-2"
                            >
                                ← Back to Lobby
                            </button>
                            <h2 className="text-xl font-bold text-white">{activeSession.name}</h2>
                            <p className="text-slate-400">{activeSession.scenario}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-400">Round</div>
                            <div className="text-2xl font-bold text-indigo-400">
                                {activeSession.currentRound}/{activeSession.totalRounds}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timer */}
                {timerRemaining !== null && (
                    <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-4 text-center">
                        <div className="text-sm text-amber-400 mb-1">Time Remaining</div>
                        <div className="text-4xl font-mono font-bold text-amber-300">{formatTimer(timerRemaining)}</div>
                    </div>
                )}

                {/* Teams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeSession.teams.map(team => (
                        <div
                            key={team.id}
                            className="bg-slate-800 rounded-xl p-4 border-2"
                            style={{ borderColor: team.color }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                                    <span className="font-medium text-white">{team.name}</span>
                                </div>
                                <span className="text-lg font-bold" style={{ color: team.color }}>{team.score} pts</span>
                            </div>

                            {/* Resources */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-slate-700/50 rounded p-2 text-center">
                                    <div className="text-xs text-slate-400">Capital</div>
                                    <div className="font-bold text-green-400">${team.resources.capital}M</div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2 text-center">
                                    <div className="text-xs text-slate-400">Market Share</div>
                                    <div className="font-bold text-blue-400">{team.resources.marketShare}%</div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2 text-center">
                                    <div className="text-xs text-slate-400">Reputation</div>
                                    <div className="font-bold text-purple-400">{team.resources.reputation}</div>
                                </div>
                                <div className="bg-slate-700/50 rounded p-2 text-center">
                                    <div className="text-xs text-slate-400">R&D</div>
                                    <div className="font-bold text-amber-400">{team.resources.rdCapacity}</div>
                                </div>
                            </div>

                            {/* Players */}
                            <div className="text-sm text-slate-500">
                                {team.players.length} player(s) •
                                <span className="ml-1 text-slate-400">Waiting...</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4 pt-4">
                    {activeSession.status === 'lobby' && (
                        <button
                            onClick={() => {
                                setActiveSession(prev => prev ? { ...prev, status: 'briefing' } : null);
                            }}
                            className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium flex items-center gap-2"
                        >
                            <Play className="w-5 h-5" />
                            Start Briefing
                        </button>
                    )}

                    {activeSession.status === 'briefing' && (
                        <button
                            onClick={() => {
                                setActiveSession(prev => prev ? {
                                    ...prev,
                                    status: 'active',
                                    currentRound: 1,
                                    timerEndAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
                                } : null);
                            }}
                            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium flex items-center gap-2"
                        >
                            <Zap className="w-5 h-5" />
                            Begin War Game
                        </button>
                    )}

                    {activeSession.status === 'active' && (
                        <>
                            <button className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium flex items-center gap-2">
                                <Pause className="w-5 h-5" />
                                Pause
                            </button>
                            <button
                                onClick={() => {
                                    const nextRound = activeSession.currentRound + 1;
                                    if (nextRound > activeSession.totalRounds) {
                                        setActiveSession(prev => prev ? { ...prev, status: 'debrief' } : null);
                                    } else {
                                        setActiveSession(prev => prev ? {
                                            ...prev,
                                            currentRound: nextRound,
                                            timerEndAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
                                        } : null);
                                    }
                                }}
                                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium flex items-center gap-2"
                            >
                                <SkipForward className="w-5 h-5" />
                                Next Round
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {view === 'lobby' ? renderLobby() : renderSession()}
        </div>
    );
};

export default CorporateWarRoom;
