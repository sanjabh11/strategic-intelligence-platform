// Strategic DNA Analysis Component
// Advanced personality assessment and cognitive bias analysis for strategic decision-making

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dna, Brain, Target, TrendingUp, AlertTriangle, Shield, Users, Zap,
  Eye, Lightbulb, CheckCircle, XCircle, BarChart3, Award
} from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar
} from 'recharts';

interface StrategicPersonality {
  dimension: string;
  score: number; // 0-100
  interpretation: string;
  strengths?: string[];
  weaknesses?: string[];
  traits: {
    name: string;
    level: 'low' | 'moderate' | 'high';
    description: string;
  }[];
}

interface CognitiveBias {
  bias: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  mitigation: string[];
  examples: string[];
  detected: boolean;
  confidence: number;
}

interface StrategicBiography {
  decisionsMade: number;
  successRate: number;
  preferredStyle: 'aggressive' | 'cooperative' | 'defensive' | 'innovative';
  riskTolerance: number;
  timeHorizon: number; // Short-term vs long-term focus
  collaborationIndex: number;
}

interface StrategicDNAProps {
  userId?: string;
  decisionHistory?: any[];
  isLearningMode?: boolean;
  onRecommendationClick?: (recommendation: string) => void;
}

const StrategicDNA: React.FC<StrategicDNAProps> = ({
  userId = 'demo_user',
  decisionHistory = [],
  isLearningMode = false,
  onRecommendationClick
}) => {

  // No mock personality profile. Await real data; render empty state when none is available.
  const personalityProfile = useMemo<StrategicPersonality[]>(() => [], []);

  // No mock cognitive bias analysis. Await real data; render empty state when none is available.
  const cognitiveBiases = useMemo<CognitiveBias[]>(() => [], [decisionHistory]);

  // Strategic biography
  const strategicBiography = useMemo<StrategicBiography>(() => ({
    decisionsMade: 0,
    successRate: 0,
    preferredStyle: 'innovative',
    riskTolerance: 0,
    timeHorizon: 0,
    collaborationIndex: 0
  }), []);

  // Generate personalized recommendations
  const strategicRecommendations = useMemo(() => {
    const recommendations = [];

    // Analyze personality profile
    const patience = personalityProfile.find(p => p.dimension === 'Strategic Patience')?.score || 50;
    const innovation = personalityProfile.find(p => p.dimension === 'Innovation Drive')?.score || 50;
    const uncertainty = personalityProfile.find(p => p.dimension === 'Uncertainty Tolerance')?.score || 50;

    if (patience > 80) {
      recommendations.push({
        type: 'strength_leverage',
        title: 'Maximize Long-Term Vision',
        description: 'Your patience is a strategic advantage. Use it to outperform competitors in long-term plays.',
        priority: 'high',
        action: 'Focus on building patience-dependent strategies'
      });
    }

    if (innovation > 80) {
      recommendations.push({
        type: 'innovation_focus',
        title: 'Accelerate Innovation Pipeline',
        description: 'Your creativity exceeds traditional approaches. Develop faster innovation cycles.',
        priority: 'high',
        action: 'Create parallel innovation streams'
      });
    }

    if (uncertainty < 50) {
      recommendations.push({
        type: 'risk_mitigation',
        title: 'Strengthen Risk Management',
        description: 'Consider additional risk assessment frameworks to complement your planning style.',
        priority: 'medium',
        action: 'Develop risk quantification techniques'
      });
    }

    // Bias mitigation recommendations
    const highSeverityBiases = cognitiveBiases.filter(b => b.severity === 'high' || b.severity === 'critical');
    highSeverityBiases.forEach(bias => {
      recommendations.push({
        type: 'bias_mitigation',
        title: `Mitigate ${bias.bias}`,
        description: bias.description,
        priority: 'high',
        action: bias.mitigation[0],
        bias: bias.bias
      });
    });

    return recommendations;
  }, [personalityProfile, cognitiveBiases]);

  const [activeView, setActiveView] = useState<'overview' | 'personality' | 'biases' | 'recommendations'>('overview');

  // Safe number validation function
  const safeNumber = (v: any): number | null => (typeof v === 'number' && isFinite(v) ? v : null);

  // Radar chart data for personality profile
  const radarData = personalityProfile.map(personality => ({
    dimension: personality.dimension,
    score: safeNumber(personality.score) || 0,
    fullMark: 100
  }));

  // Bias severity distribution
  const biasSeverityData = Object.entries(
    cognitiveBiases.reduce((acc, bias) => {
      acc[bias.severity] = (acc[bias.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([severity, count]) => ({
    name: severity.toUpperCase(),
    value: count,
    color: severity === 'critical' ? '#ef4444' :
           severity === 'high' ? '#f97316' :
           severity === 'medium' ? '#eab308' : '#22c55e'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Dna className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Strategic DNA Analysis</h2>
              <p className="text-purple-100">Your cognitive personality and strategic decision patterns</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{strategicBiography.decisionsMade}</div>
            <div className="text-sm text-purple-100">Decisions Analyzed</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
        {[
          { id: 'overview', label: 'Overview', icon: Brain },
          { id: 'personality', label: 'Personality', icon: Dna },
          { id: 'biases', label: 'Biases', icon: AlertTriangle },
          { id: 'recommendations', label: 'Recommendations', icon: Lightbulb }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as any)}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeView === id
                ? 'bg-slate-700 text-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strategic Biography */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <Award className="w-5 h-5 mr-2 text-blue-400" />
              <h3 className="text-lg font-semibold text-slate-200">Strategic Biography</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Success Rate</span>
                <span className="font-mono text-emerald-400">{strategicBiography.successRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Preferred Style</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded capitalize">
                  {strategicBiography.preferredStyle}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Risk Tolerance</span>
                <span className="font-mono text-orange-400">{strategicBiography.riskTolerance}/100</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Time Horizon</span>
                <span className="font-mono text-purple-400">{strategicBiography.timeHorizon}% Long-term</span>
              </div>
            </div>
          </div>

          {/* Cognitive Bias Overview */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
              <h3 className="text-lg font-semibold text-slate-200">Cognitive Health</h3>
            </div>

            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={biasSeverityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                  >
                    {biasSeverityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} biases`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center text-sm text-slate-400">
              Bias Severity Distribution
            </div>
          </div>
        </div>
      )}

      {/* Personality Profile Section */}
      {activeView === 'personality' && (
        <div className="space-y-6">
          {/* Radar Chart */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center mb-6">
              <Target className="w-6 h-6 mr-3 text-purple-400" />
              <h3 className="text-xl font-semibold text-slate-200">Strategic Personality Profile</h3>
            </div>

            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsRadarChart data={radarData}>
                  <PolarGrid gridType="polygon" />
                  <PolarAngleAxis dataKey="dimension" tick={{fill: '#94a3b8', fontSize: 12}} />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{fill: '#94a3b8', fontSize: 10}}
                  />
                  <Radar
                    name="Strategic Score"
                    dataKey="score"
                    stroke="#a855f7"
                    fill="#a855f7"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                </RechartsRadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Personality Dimensions Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personalityProfile.map((personality) => (
              <div key={personality.dimension} className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-slate-200 mb-2">
                  {personality.dimension}
                </h4>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Score</span>
                    <span className="font-mono text-purple-400">{(safeNumber(personality.score) || 0).toString()}/100</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{width: `${safeNumber(personality.score) || 0}%`}}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-3">
                  {personality.interpretation}
                </p>
                {personality.traits && (
                  <div className="space-y-1">
                    {personality.traits.map((trait, idx) => (
                      <div key={idx} className="flex items-center text-xs">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          trait.level === 'high' ? 'bg-emerald-400' :
                          trait.level === 'moderate' ? 'bg-yellow-400' : 'bg-red-400'
                        }`} />
                        <span className="text-slate-300">{trait.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cognitive Biases Section */}
      {activeView === 'biases' && (
        <div className="space-y-4">
          {cognitiveBiases.map((bias) => (
            <div
              key={bias.bias}
              className={`rounded-lg p-4 border ${
                bias.severity === 'critical' ? 'border-red-500 bg-red-500/10' :
                bias.severity === 'high' ? 'border-orange-500 bg-orange-500/10' :
                bias.severity === 'medium' ? 'border-yellow-500 bg-yellow-500/10' :
                'border-green-500 bg-green-500/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded ${
                    bias.severity === 'critical' ? 'bg-red-500/20' :
                    bias.severity === 'high' ? 'bg-orange-500/20' :
                    bias.severity === 'medium' ? 'bg-yellow-500/20' :
                    'bg-green-500/20'
                  }`}>
                    {bias.detected ? (
                      <XCircle className={`w-5 h-5 ${
                        bias.severity === 'critical' ? 'text-red-400' :
                        bias.severity === 'high' ? 'text-orange-400' :
                        bias.severity === 'medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`} />
                    ) : (
                      <CheckCircle className={`w-5 h-5 ${
                        bias.severity === 'critical' ? 'text-red-400' :
                        bias.severity === 'high' ? 'text-orange-400' :
                        bias.severity === 'medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`} />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-200">{bias.bias}</h3>
                    <p className="text-slate-400 text-sm mb-3">{bias.description}</p>

                    <div className="mb-3">
                      <div className="text-xs font-medium text-slate-300 mb-2">Impact:</div>
                      <p className="text-xs text-slate-400">{bias.impact}</p>
                    </div>

                    {(bias.mitigation && bias.mitigation.length > 0) && (
                      <div>
                        <div className="text-xs font-medium text-slate-300 mb-2">Mitigation Strategies:</div>
                        <ul className="text-xs text-slate-400 space-y-1">
                          {bias.mitigation.map((strategy, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="mt-0.5 mr-1">•</span>
                              {strategy}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {bias.examples && bias.examples.length > 0 && isLearningMode && (
                      <div className="mt-3 pt-3 border-t border-slate-600">
                        <div className="text-xs font-medium text-slate-300 mb-2">Common Examples:</div>
                        <ul className="text-xs text-slate-400 space-y-1">
                          {bias.examples.map((example, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="mt-0.5 mr-1">•</span>
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    bias.severity === 'critical' ? 'text-red-400' :
                    bias.severity === 'high' ? 'text-orange-400' :
                    bias.severity === 'medium' ? 'text-yellow-400' :
                    'text-green-400'
                  } capitalize`}>
                    {bias.severity}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {bias.confidence}% Confidence
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations Section */}
      {activeView === 'recommendations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {strategicRecommendations.map((rec, index) => (
            <div
              key={index}
              className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-purple-500/50 transition-all cursor-pointer"
              onClick={() => onRecommendationClick?.(rec.title)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded ${
                  rec.priority === 'high' ? 'bg-red-500/20' :
                  rec.priority === 'medium' ? 'bg-yellow-500/20' :
                  'bg-green-500/20'
                }`}>
                  <Lightbulb className={`w-4 h-4 ${
                    rec.priority === 'high' ? 'text-red-400' :
                    rec.priority === 'medium' ? 'text-yellow-400' :
                    'text-green-400'
                  }`} />
                </div>
                <span className={`px-2 py-1 text-xs rounded capitalize ${
                  rec.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                  rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {rec.priority} Priority
                </span>
              </div>

              <h3 className="font-semibold text-slate-200 mb-2">{rec.title}</h3>
              <p className="text-slate-400 text-sm mb-3">{rec.description}</p>

              <div className="bg-slate-600/50 p-2 rounded">
                <p className="text-xs text-purple-300 font-medium">Recommended Action:</p>
                <p className="text-xs text-slate-300">{rec.action}</p>
              </div>

              {rec.bias && (
                <div className="mt-2 text-xs text-slate-500">
                  Addresses: {rec.bias}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Learning Mode Enhancement */}
      {isLearningMode && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <Eye className="w-4 h-4 mr-2 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Strategic DNA Insights</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 space-y-1">
            <p>• Understanding your strategic DNA helps you leverage strengths and mitigate weaknesses</p>
            <p>• Cognitive biases affect up to 70% of strategic decisions without proper awareness</p>
            <p>• Regular personality reassessment helps track strategic development progress</p>
            <p>• Bias mitigation strategies can improve decision success rates by 25-35%</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategicDNA;