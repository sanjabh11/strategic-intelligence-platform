// Game Interface - Play multiplayer games
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MultiplayerSession, PlayerAction, Participant } from '../types/multiplayer'
import { Users, Play, Clock, ArrowLeft, Trophy, CheckCircle } from 'lucide-react'

interface GameInterfaceProps {
  sessionId: string
  onExit: () => void
}

export const GameInterface: React.FC<GameInterfaceProps> = ({ sessionId, onExit }) => {
  const [session, setSession] = useState<MultiplayerSession | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [myAction, setMyAction] = useState<PlayerAction | null>(null)
  const [result, setResult] = useState<{ action: PlayerAction; opponentAction?: PlayerAction; payoff: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    joinGame()
    const interval = setInterval(checkGameState, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  const joinGame = async () => {
    try {
      // Fetch session
      const { data: sessionData } = await supabase
        .from('multiplayer_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionData) setSession(sessionData)

      // Join as participant (mock player ID for now)
      const playerId = `player-${Math.random().toString(36).substr(2, 9)}`
      const { data: partData, error: partError } = await supabase
        .from('multiplayer_participants')
        .insert({
          session_id: sessionId,
          participant_id: playerId,
          player_role: sessionData?.current_players === 0 ? 'player_1' : 'player_2',
          current_payoff: 0,
          actions_taken: []
        })
        .select()
        .single()
      
      if (partError) {
        console.error('Error joining as participant:', partError)
        throw partError
      }

      if (partData) {
        setParticipant(partData)
        // Update player count
        await supabase.rpc('increment_player_count', { session_id: sessionId })
      }
    } catch (err) {
      console.error('Error joining game:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkGameState = async () => {
    if (!participant) return
    
    const { data } = await supabase
      .from('multiplayer_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (data) setSession(data)
  }

  const submitAction = async (action: PlayerAction) => {
    if (!participant) return
    
    setMyAction(action)
    
    // Update participant action
    await supabase
      .from('multiplayer_participants')
      .update({ current_action: action })
      .eq('id', participant.id)

    // Check if all players have acted
    setTimeout(() => {
      resolveRound(action)
    }, 2000)
  }

  const resolveRound = async (myActionValue: PlayerAction) => {
    // Simulate opponent action (in real implementation, wait for actual opponent)
    const opponentAction: PlayerAction = Math.random() > 0.5 ? 'cooperate' : 'defect'
    
    // Calculate payoffs based on game type
    let payoff = 0
    if (session?.game_type === 'prisoners_dilemma') {
      if (myActionValue === 'cooperate' && opponentAction === 'cooperate') payoff = 3
      else if (myActionValue === 'cooperate' && opponentAction === 'defect') payoff = 0
      else if (myActionValue === 'defect' && opponentAction === 'cooperate') payoff = 5
      else payoff = 1
    }

    setResult({ action: myActionValue, opponentAction, payoff })

    // Update total payoff
    if (participant) {
      await supabase
        .from('multiplayer_participants')
        .update({ current_payoff: participant.current_payoff + payoff })
        .eq('id', participant.id)
    }
  }

  const nextRound = () => {
    setMyAction(null)
    setResult(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Joining game...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Game not found</p>
          <button onClick={onExit} className="px-4 py-2 bg-slate-700 text-white rounded">
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{session.session_name}</h1>
            <p className="text-slate-400">Round {session.current_round + 1} of {session.rounds}</p>
          </div>
          <button onClick={onExit} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Exit
          </button>
        </div>

        {/* Game Board */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">{session.game_type.replace(/_/g, ' ').toUpperCase()}</h2>
          
          {/* Payoff Matrix */}
          <div className="bg-slate-700 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Payoff Matrix</h3>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  <th className="p-2 text-slate-300">Opponent Cooperates</th>
                  <th className="p-2 text-slate-300">Opponent Defects</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 text-slate-300">You Cooperate</td>
                  <td className="p-2 text-center"><span className="bg-emerald-600 text-white px-3 py-1 rounded font-semibold">3</span></td>
                  <td className="p-2 text-center"><span className="bg-amber-600 text-white px-3 py-1 rounded font-semibold">0</span></td>
                </tr>
                <tr>
                  <td className="p-2 text-slate-300">You Defect</td>
                  <td className="p-2 text-center"><span className="bg-amber-600 text-white px-3 py-1 rounded font-semibold">5</span></td>
                  <td className="p-2 text-center"><span className="bg-red-600 text-white px-3 py-1 rounded font-semibold">1</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Actions */}
          {!myAction && !result && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Your Decision</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => submitAction('cooperate')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white p-6 rounded-lg font-semibold text-lg"
                >
                  🤝 Cooperate
                </button>
                <button
                  onClick={() => submitAction('defect')}
                  className="bg-red-600 hover:bg-red-500 text-white p-6 rounded-lg font-semibold text-lg"
                >
                  ⚔️ Defect
                </button>
              </div>
            </div>
          )}

          {myAction && !result && (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Waiting for opponent...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="bg-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                  <h3 className="text-xl font-bold text-white">Round Complete!</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-sm text-slate-400 mb-1">You</div>
                    <div className="text-lg font-bold text-white capitalize">{result.action}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-400 mb-1">Opponent</div>
                    <div className="text-lg font-bold text-white capitalize">{result.opponentAction}</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-1">Your Payoff</div>
                  <div className="text-3xl font-bold text-cyan-400">+{result.payoff}</div>
                </div>
              </div>
              <button
                onClick={nextRound}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold"
              >
                Next Round <Play className="w-4 h-4 inline ml-2" />
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Total Score</div>
            <div className="text-2xl font-bold text-cyan-400">{participant?.current_payoff || 0}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Players</div>
            <div className="text-2xl font-bold text-emerald-400">{session.current_players}/{session.max_players}</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Round</div>
            <div className="text-2xl font-bold text-amber-400">{session.current_round + 1}/{session.rounds}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameInterface
