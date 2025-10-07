// Multiplayer Lobby - Create and join games
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MultiplayerSession, GameType } from '../types/multiplayer'
import { Users, Plus, Play, Clock, Trophy, TrendingUp } from 'lucide-react'
import { GameInterface } from './GameInterface'

const GAME_DESCRIPTIONS: Record<GameType, { name: string; description: string; icon: string }> = {
  prisoners_dilemma: {
    name: "Prisoner's Dilemma",
    description: '2-player cooperation vs defection classic',
    icon: '🔗'
  },
  public_goods: {
    name: 'Public Goods Game',
    description: 'N-player contribution to collective resource',
    icon: '🏛️'
  },
  stag_hunt: {
    name: 'Stag Hunt',
    description: 'Coordination game with risky cooperation',
    icon: '🦌'
  }
}

export const MultiplayerLobby: React.FC = () => {
  const [sessions, setSessions] = useState<MultiplayerSession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchSessions = async () => {
    try {
      const { data } = await supabase
        .from('multiplayer_sessions')
        .select('*')
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) setSessions(data)
    } catch (err) {
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const createSession = async (gameType: GameType) => {
    try {
      const { data, error } = await supabase
        .from('multiplayer_sessions')
        .insert({
          session_name: `${GAME_DESCRIPTIONS[gameType].name} - ${new Date().toLocaleTimeString()}`,
          game_type: gameType,
          max_players: gameType === 'public_goods' ? 4 : 2,
          current_players: 0,
          status: 'waiting',
          rounds: 5,
          current_round: 0,
          payoff_matrix: getDefaultMatrix(gameType),
          game_state: {}
        })
        .select()
        .single()

      if (error) throw error
      if (data) setActiveSession(data.id)
    } catch (err) {
      console.error('Error creating session:', err)
    }
  }

  const joinSession = (sessionId: string) => {
    setActiveSession(sessionId)
  }

  if (activeSession) {
    return <GameInterface sessionId={activeSession} onExit={() => setActiveSession(null)} />
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-cyan-400" />
            Multiplayer Game Theory
          </h1>
          <p className="text-slate-400">Play strategic games with others, test game theory in real-time</p>
        </div>

        {/* Create Game Section */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              Create New Game
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(GAME_DESCRIPTIONS) as GameType[]).map(type => (
              <button
                key={type}
                onClick={() => createSession(type)}
                className="bg-slate-700 hover:bg-slate-600 rounded-lg p-4 border border-slate-600 hover:border-cyan-500 transition-all text-left"
              >
                <div className="text-3xl mb-2">{GAME_DESCRIPTIONS[type].icon}</div>
                <div className="font-semibold text-white mb-1">{GAME_DESCRIPTIONS[type].name}</div>
                <div className="text-sm text-slate-400">{GAME_DESCRIPTIONS[type].description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Available Games */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-400" />
            Available Games ({sessions.length})
          </h2>
          
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading games...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active games. Create one above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className="bg-slate-700 rounded-lg p-4 flex items-center justify-between hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{GAME_DESCRIPTIONS[session.game_type].icon}</div>
                    <div>
                      <div className="font-semibold text-white">{session.session_name}</div>
                      <div className="text-sm text-slate-400">
                        {session.current_players}/{session.max_players} players • Round {session.current_round}/{session.rounds}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      session.status === 'waiting' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      {session.status === 'waiting' ? 'Waiting' : 'In Progress'}
                    </span>
                    <button
                      onClick={() => joinSession(session.id)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-medium"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Active Games</div>
            <div className="text-2xl font-bold text-cyan-400">{sessions.length}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Total Players</div>
            <div className="text-2xl font-bold text-emerald-400">
              {sessions.reduce((sum, s) => sum + s.current_players, 0)}
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Games Today</div>
            <div className="text-2xl font-bold text-amber-400">12</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getDefaultMatrix(gameType: GameType): number[][] {
  switch (gameType) {
    case 'prisoners_dilemma':
      return [[3, 0], [5, 1]]
    case 'stag_hunt':
      return [[4, 0], [3, 2]]
    case 'public_goods':
      return [[2, 1], [3, 0]]
    default:
      return [[3, 0], [5, 1]]
  }
}

export default MultiplayerLobby
