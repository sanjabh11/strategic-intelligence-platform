// Public Forecast Registry Component
// Community predictions with game-theoretic analysis
// Part of Monetization Strategy Phase 2 - Community Engagement

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Clock, Users, Target, Filter,
  Plus, Search, ChevronRight, Award, BarChart3, Calendar,
  CheckCircle, XCircle, HelpCircle, Globe, Zap, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Forecast {
  id: string;
  title: string;
  description: string;
  category: 'geopolitical' | 'financial' | 'technology' | 'economic' | 'social' | 'other';
  question: string;
  resolution_criteria: string;
  resolution_date: string | null;
  current_probability: number | null;
  prediction_count: number;
  view_count: number;
  is_resolved: boolean;
  resolution_outcome: 'yes' | 'no' | 'ambiguous' | 'canceled' | null;
  tags: string[];
  created_at: string;
  creator_id: string;
}

interface UserPrediction {
  id: string;
  forecast_id: string;
  probability: number;
  confidence: number | null;
  reasoning: string;
  created_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  total_predictions: number;
  resolved_predictions: number;
  brier_score: number | null;
  accuracy_rate: number | null;
  rank: number;
  badges: string[];
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'geopolitical', label: 'Geopolitical', icon: Globe },
  { id: 'financial', label: 'Financial', icon: TrendingUp },
  { id: 'technology', label: 'Technology', icon: Zap },
  { id: 'economic', label: 'Economic', icon: BarChart3 },
  { id: 'social', label: 'Social', icon: Users },
];

const CATEGORY_COLORS: Record<string, string> = {
  geopolitical: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  financial: 'bg-green-500/20 text-green-400 border-green-500/30',
  technology: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  economic: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  social: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  other: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

interface ForecastRegistryProps {
  userId?: string;
}

const ForecastRegistry: React.FC<ForecastRegistryProps> = ({ userId }) => {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
  const [userPrediction, setUserPrediction] = useState<UserPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail' | 'create' | 'leaderboard'>('list');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  // Prediction form state
  const [predictionForm, setPredictionForm] = useState({
    probability: 50,
    confidence: 70,
    reasoning: ''
  });

  // New forecast form state
  const [newForecast, setNewForecast] = useState({
    title: '',
    description: '',
    category: 'other' as Forecast['category'],
    question: '',
    resolution_criteria: '',
    resolution_date: '',
    tags: ''
  });

  // Fetch forecasts
  const fetchForecasts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('forecasts')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (!showResolved) {
        query = query.eq('is_resolved', false);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,question.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setForecasts(data || []);
    } catch (err) {
      console.error('Error fetching forecasts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, showResolved, searchQuery]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('forecast_scores')
        .select('*')
        .order('brier_score', { ascending: true })
        .limit(20);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  }, []);

  // Fetch user's prediction for selected forecast
  const fetchUserPrediction = useCallback(async (forecastId: string) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('forecast_predictions')
        .select('*')
        .eq('forecast_id', forecastId)
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setUserPrediction(data);
        setPredictionForm({
          probability: data.probability * 100,
          confidence: (data.confidence || 0.7) * 100,
          reasoning: data.reasoning || ''
        });
      } else {
        setUserPrediction(null);
        setPredictionForm({ probability: 50, confidence: 70, reasoning: '' });
      }
    } catch (err) {
      console.error('Error fetching prediction:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchForecasts();
    fetchLeaderboard();
  }, [fetchForecasts, fetchLeaderboard]);

  useEffect(() => {
    if (selectedForecast) {
      fetchUserPrediction(selectedForecast.id);
    }
  }, [selectedForecast, fetchUserPrediction]);

  // Submit prediction
  const handleSubmitPrediction = async () => {
    if (!userId || !selectedForecast) return;

    try {
      const predictionData = {
        forecast_id: selectedForecast.id,
        user_id: userId,
        probability: predictionForm.probability / 100,
        confidence: predictionForm.confidence / 100,
        reasoning: predictionForm.reasoning,
        is_public: false
      };

      if (userPrediction) {
        await supabase
          .from('forecast_predictions')
          .update(predictionData)
          .eq('id', userPrediction.id);
      } else {
        await supabase
          .from('forecast_predictions')
          .insert(predictionData);
      }

      // Update aggregate probability
      await supabase.rpc('update_forecast_probability', { p_forecast_id: selectedForecast.id });

      // Refresh
      await fetchForecasts();
      await fetchUserPrediction(selectedForecast.id);
    } catch (err) {
      console.error('Error submitting prediction:', err);
    }
  };

  // Create new forecast
  const handleCreateForecast = async () => {
    if (!userId || !newForecast.title || !newForecast.question || !newForecast.resolution_criteria) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('forecasts')
        .insert({
          creator_id: userId,
          title: newForecast.title,
          description: newForecast.description,
          category: newForecast.category,
          question: newForecast.question,
          resolution_criteria: newForecast.resolution_criteria,
          resolution_date: newForecast.resolution_date || null,
          tags: newForecast.tags.split(',').map(t => t.trim()).filter(Boolean),
          is_public: true,
          current_probability: 0.5
        })
        .select()
        .single();

      if (error) throw error;

      setForecasts(prev => [data, ...prev]);
      setView('list');
      setNewForecast({
        title: '',
        description: '',
        category: 'other',
        question: '',
        resolution_criteria: '',
        resolution_date: '',
        tags: ''
      });
    } catch (err) {
      console.error('Error creating forecast:', err);
    }
  };

  // Format probability display
  const formatProbability = (prob: number | null) => {
    if (prob === null) return '?%';
    return `${Math.round(prob * 100)}%`;
  };

  // Render forecast card
  const renderForecastCard = (forecast: Forecast) => (
    <div
      key={forecast.id}
      className={`bg-slate-800 rounded-xl border transition-all cursor-pointer ${
        forecast.is_resolved ? 'border-slate-700 opacity-75' : 'border-slate-700 hover:border-cyan-500/50'
      }`}
      onClick={() => {
        setSelectedForecast(forecast);
        setView('detail');
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <span className={`px-2 py-1 rounded-full text-xs border ${CATEGORY_COLORS[forecast.category]}`}>
            {forecast.category}
          </span>
          {forecast.is_resolved && (
            <span className={`px-2 py-1 rounded-full text-xs ${
              forecast.resolution_outcome === 'yes' ? 'bg-green-500/20 text-green-400' :
              forecast.resolution_outcome === 'no' ? 'bg-red-500/20 text-red-400' :
              'bg-slate-600 text-slate-400'
            }`}>
              {forecast.resolution_outcome === 'yes' ? 'Resolved: Yes' :
               forecast.resolution_outcome === 'no' ? 'Resolved: No' :
               'Resolved'}
            </span>
          )}
        </div>

        {/* Question */}
        <h3 className="font-semibold text-white mb-2 line-clamp-2">{forecast.question}</h3>
        
        {/* Probability Display */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-slate-400">Community Probability</span>
            <span className={`font-bold ${
              (forecast.current_probability || 0) >= 0.7 ? 'text-green-400' :
              (forecast.current_probability || 0) <= 0.3 ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {formatProbability(forecast.current_probability)}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                (forecast.current_probability || 0) >= 0.7 ? 'bg-green-500' :
                (forecast.current_probability || 0) <= 0.3 ? 'bg-red-500' :
                'bg-yellow-500'
              }`}
              style={{ width: `${(forecast.current_probability || 0.5) * 100}%` }}
            />
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {forecast.prediction_count}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {forecast.view_count}
            </span>
          </div>
          {forecast.resolution_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(forecast.resolution_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Render forecast detail
  const renderForecastDetail = () => {
    if (!selectedForecast) return null;

    return (
      <div className="space-y-6">
        <button
          onClick={() => { setSelectedForecast(null); setView('list'); }}
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
        >
          ← Back to Forecasts
        </button>

        {/* Main Info */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-sm border ${CATEGORY_COLORS[selectedForecast.category]}`}>
              {selectedForecast.category}
            </span>
            {selectedForecast.is_resolved && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                selectedForecast.resolution_outcome === 'yes' ? 'bg-green-500/20 text-green-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {selectedForecast.resolution_outcome === 'yes' ? 
                  <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                Resolved: {selectedForecast.resolution_outcome?.toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">{selectedForecast.question}</h2>

          {selectedForecast.description && (
            <p className="text-slate-400 mb-4">{selectedForecast.description}</p>
          )}

          {/* Big Probability Display */}
          <div className="bg-slate-700 rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-2">Community Prediction</div>
              <div className={`text-6xl font-bold ${
                (selectedForecast.current_probability || 0) >= 0.7 ? 'text-green-400' :
                (selectedForecast.current_probability || 0) <= 0.3 ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {formatProbability(selectedForecast.current_probability)}
              </div>
              <div className="text-sm text-slate-500 mt-2">
                Based on {selectedForecast.prediction_count} predictions
              </div>
            </div>

            <div className="h-4 bg-slate-600 rounded-full overflow-hidden mt-4">
              <div
                className={`h-full rounded-full transition-all ${
                  (selectedForecast.current_probability || 0) >= 0.7 ? 'bg-green-500' :
                  (selectedForecast.current_probability || 0) <= 0.3 ? 'bg-red-500' :
                  'bg-yellow-500'
                }`}
                style={{ width: `${(selectedForecast.current_probability || 0.5) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0% (No)</span>
              <span>100% (Yes)</span>
            </div>
          </div>

          {/* Resolution Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Resolution Criteria</div>
              <div className="text-white">{selectedForecast.resolution_criteria}</div>
            </div>
            {selectedForecast.resolution_date && (
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Resolution Date</div>
                <div className="text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedForecast.resolution_date).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Make Prediction */}
        {!selectedForecast.is_resolved && userId && (
          <div className="bg-slate-800 rounded-xl p-6 border border-cyan-500/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              {userPrediction ? 'Update Your Prediction' : 'Make Your Prediction'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Your Probability Estimate: {predictionForm.probability}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="99"
                  value={predictionForm.probability}
                  onChange={(e) => setPredictionForm(p => ({ ...p, probability: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Very Unlikely</span>
                  <span>Uncertain</span>
                  <span>Very Likely</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Confidence in your estimate: {predictionForm.confidence}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={predictionForm.confidence}
                  onChange={(e) => setPredictionForm(p => ({ ...p, confidence: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Reasoning (optional)</label>
                <textarea
                  value={predictionForm.reasoning}
                  onChange={(e) => setPredictionForm(p => ({ ...p, reasoning: e.target.value }))}
                  placeholder="Why do you think this probability is accurate?"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <button
                onClick={handleSubmitPrediction}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg"
              >
                {userPrediction ? 'Update Prediction' : 'Submit Prediction'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render leaderboard
  const renderLeaderboard = () => (
    <div className="bg-slate-800 rounded-xl border border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Forecast Leaderboard
        </h3>
        <p className="text-sm text-slate-400">Top forecasters by Brier score (lower is better)</p>
      </div>

      <div className="divide-y divide-slate-700">
        {leaderboard.map((entry, idx) => (
          <div key={entry.user_id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                idx === 0 ? 'bg-amber-500 text-white' :
                idx === 1 ? 'bg-slate-400 text-white' :
                idx === 2 ? 'bg-amber-700 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {idx + 1}
              </div>
              <div>
                <div className="text-white font-medium">Forecaster #{entry.user_id.slice(0, 6)}</div>
                <div className="text-xs text-slate-500">
                  {entry.resolved_predictions} resolved predictions
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-cyan-400">
                {entry.brier_score?.toFixed(3) || 'N/A'}
              </div>
              <div className="text-xs text-slate-500">
                {entry.accuracy_rate ? `${(entry.accuracy_rate * 100).toFixed(0)}% accurate` : ''}
              </div>
            </div>
          </div>
        ))}

        {leaderboard.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No forecasters ranked yet. Be the first!
          </div>
        )}
      </div>
    </div>
  );

  // Render create forecast form
  const renderCreateForm = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-2xl">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Plus className="w-5 h-5 text-cyan-400" />
        Create New Forecast
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Forecast Question *</label>
          <input
            type="text"
            value={newForecast.question}
            onChange={(e) => setNewForecast(p => ({ ...p, question: e.target.value }))}
            placeholder="Will X happen by Y date?"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={newForecast.title}
            onChange={(e) => setNewForecast(p => ({ ...p, title: e.target.value }))}
            placeholder="Short descriptive title"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Resolution Criteria *</label>
          <textarea
            value={newForecast.resolution_criteria}
            onChange={(e) => setNewForecast(p => ({ ...p, resolution_criteria: e.target.value }))}
            placeholder="How will this forecast be resolved? Be specific."
            rows={3}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Category</label>
            <select
              value={newForecast.category}
              onChange={(e) => setNewForecast(p => ({ ...p, category: e.target.value as Forecast['category'] }))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="geopolitical">Geopolitical</option>
              <option value="financial">Financial</option>
              <option value="technology">Technology</option>
              <option value="economic">Economic</option>
              <option value="social">Social</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Resolution Date</label>
            <input
              type="date"
              value={newForecast.resolution_date}
              onChange={(e) => setNewForecast(p => ({ ...p, resolution_date: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={newForecast.tags}
            onChange={(e) => setNewForecast(p => ({ ...p, tags: e.target.value }))}
            placeholder="gold, central banks, 2025"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleCreateForecast}
            disabled={!newForecast.question || !newForecast.resolution_criteria}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium"
          >
            Create Forecast
          </button>
          <button
            onClick={() => setView('list')}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Target className="w-10 h-10" />
            <div>
              <h2 className="text-2xl font-bold">Forecast Registry</h2>
              <p className="text-cyan-200">Public predictions powered by game theory</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('leaderboard')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                view === 'leaderboard' ? 'bg-white/20' : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <Award className="w-4 h-4" />
              Leaderboard
            </button>
            {userId && (
              <button
                onClick={() => setView('create')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Forecast
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {view === 'list' && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search forecasts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div className="flex gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600"
            />
            Show Resolved
          </label>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <>
          {view === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forecasts.map(renderForecastCard)}
              {forecasts.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500">
                  <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No forecasts found. Create the first one!</p>
                </div>
              )}
            </div>
          )}
          {view === 'detail' && renderForecastDetail()}
          {view === 'create' && renderCreateForm()}
          {view === 'leaderboard' && renderLeaderboard()}
        </>
      )}
    </div>
  );
};

export default ForecastRegistry;
