// Bias Intervention Simulator - Main Component
import React, { useState, useMemo } from 'react'
import { SCENARIOS } from '../data/biasScenarios'
import { UserDecision, BIAS_DESCRIPTIONS } from '../types/bias'
import { Brain, CheckCircle, XCircle, AlertTriangle, Lightbulb, Target, ArrowRight, ArrowLeft, BarChart3 } from 'lucide-react'

export const BiasSimulator: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [decisions, setDecisions] = useState<UserDecision[]>([])

  const scenario = SCENARIOS[currentIndex]

  const stats = useMemo(() => {
    const optimal = decisions.filter(d => d.was_optimal).length
    const biasSet = new Set(decisions.flatMap(d => d.biases_triggered))
    return {
      optimalRate: decisions.length > 0 ? (optimal / decisions.length) * 100 : 0,
      uniqueBiases: biasSet.size,
      totalDecisions: decisions.length
    }
  }, [decisions])

  const categoryColors: Record<string, string> = {
    career: 'bg-blue-500', investment: 'bg-emerald-500', negotiation: 'bg-purple-500',
    purchase: 'bg-amber-500', relationship: 'bg-pink-500'
  }

  const handleSelect = (optionIndex: number) => {
    setSelectedOption(optionIndex)
    setShowResult(true)
    const option = scenario.options[optionIndex]
    setDecisions(prev => [...prev, {
      scenario_id: scenario.id,
      selected_option: optionIndex,
      biases_triggered: option.biases_triggered,
      was_optimal: option.optimal_choice,
      timestamp: new Date()
    }])
  }

  const handleNext = () => {
    if (currentIndex < SCENARIOS.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOption(null)
      setShowResult(false)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setSelectedOption(null)
      setShowResult(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Brain className="w-8 h-8 text-cyan-400" />
            Bias Intervention Simulator
          </h1>
          <p className="text-slate-400">Practice identifying and overcoming cognitive biases</p>
        </div>

        {/* Progress */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Scenario {currentIndex + 1} / {SCENARIOS.length}</span>
            {stats.totalDecisions > 0 && (
              <span className="text-sm font-semibold text-cyan-400">
                {stats.optimalRate.toFixed(0)}% Optimal
              </span>
            )}
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / SCENARIOS.length) * 100}%` }} />
          </div>
          {stats.uniqueBiases > 0 && (
            <div className="mt-2 text-xs text-slate-400">{stats.uniqueBiases} bias types detected</div>
          )}
        </div>

        {/* Scenario Card */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${categoryColors[scenario.category]}`}>
              {scenario.category.toUpperCase()}
            </span>
            <span className={`text-sm font-semibold ${scenario.difficulty === 'easy' ? 'text-emerald-400' : scenario.difficulty === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
              {scenario.difficulty.charAt(0).toUpperCase() + scenario.difficulty.slice(1)}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-4">{scenario.title}</h3>
          <div className="bg-slate-700 rounded-lg p-4 mb-4">
            <p className="text-slate-300 leading-relaxed">{scenario.situation}</p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-4">
            {scenario.options.map((option, idx) => {
              const isSelected = selectedOption === idx
              const shouldShow = showResult && isSelected
              return (
                <button
                  key={idx}
                  onClick={() => !showResult && handleSelect(idx)}
                  disabled={showResult}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected && !showResult ? 'border-cyan-500 bg-cyan-900/20' :
                    shouldShow ? option.optimal_choice ? 'border-emerald-500 bg-emerald-900/20' : 'border-red-500 bg-red-900/20' :
                    'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                  } ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      shouldShow ? option.optimal_choice ? 'bg-emerald-600' : 'bg-red-600' :
                      isSelected ? 'bg-cyan-600' : 'bg-slate-600'
                    } text-white text-sm font-bold`}>
                      {shouldShow ? (option.optimal_choice ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />) :
                       String.fromCharCode(65 + idx)}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{option.text}</p>
                      {shouldShow && (
                        <div className="mt-3 space-y-2">
                          {option.biases_triggered.length > 0 && (
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-amber-400">Biases:</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {option.biases_triggered.map(bias => (
                                    <span key={bias} className="text-xs bg-amber-900/30 text-amber-300 px-2 py-1 rounded">
                                      {BIAS_DESCRIPTIONS[bias].icon} {BIAS_DESCRIPTIONS[bias].name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="bg-slate-800 rounded p-3">
                            <p className="text-sm text-slate-300 mb-2">{option.explanation}</p>
                            <p className="text-xs text-cyan-400 italic">
                              <Lightbulb className="w-3 h-3 inline mr-1" />
                              {option.strategic_reasoning}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {showResult && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Target className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-1">Key Learning</p>
                  <p className="text-sm text-slate-300">{scenario.learning_point}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={handlePrevious} disabled={currentIndex === 0}
            className={`px-4 py-2 rounded flex items-center gap-2 ${
              currentIndex === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}>
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>
          <div className="text-sm text-slate-400">
            {currentIndex + 1} of {SCENARIOS.length} scenarios
          </div>
          <button onClick={handleNext} disabled={currentIndex === SCENARIOS.length - 1 || !showResult}
            className={`px-4 py-2 rounded flex items-center gap-2 ${
              currentIndex === SCENARIOS.length - 1 || !showResult ?
              'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}>
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Summary */}
        {stats.totalDecisions > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Optimal Rate</div>
              <div className="text-2xl font-bold text-emerald-400">{stats.optimalRate.toFixed(0)}%</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Biases Found</div>
              <div className="text-2xl font-bold text-amber-400">{stats.uniqueBiases}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Completed</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.totalDecisions}/10</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BiasSimulator
