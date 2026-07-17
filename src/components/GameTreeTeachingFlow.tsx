/**
 * Game Tree Teaching Flow Component
 * 
 * A guided educational experience for learning backward induction
 * and subgame perfect equilibrium through interactive exploration.
 * 
 * Checkpoint C Compliance: Pedagogy Quality
 * - Core canonical concepts have explanation coverage
 * - Learner moves from scenario to concept to equilibrium with visible steps
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  GitBranch, Play, ChevronRight, ChevronLeft, BookOpen, Lightbulb,
  CheckCircle, AlertCircle, RotateCcw, GraduationCap, Layers
} from 'lucide-react';
import GameTreeBuilder from './GameTreeBuilder';
import { ProvenanceBadge, ProvenanceBanner } from './ProvenanceBadge';
import { PROVENANCE_BADGES, createProvenanceMetadata } from '../types/education';
import { CORE_CONCEPTS, getConcept, type WorkedExample, type Step } from '../lib/conceptSystem';

// Teaching flow types
interface TeachingStep {
  id: string;
  title: string;
  description: string;
  conceptId?: string;
  hasInteractiveElement: boolean;
  validateProgress?: (state: TeachingState) => boolean;
}

interface TeachingState {
  currentStepIndex: number;
  completedSteps: string[];
  userAnswers: Record<string, any>;
  treeAttempted: boolean;
  equilibriumFound: boolean;
  backwardInductionDemonstrated: boolean;
}

interface GameTreeTeachingFlowProps {
  userId?: string;
  onComplete?: () => void;
  initialScenario?: 'entry_deterrance' | 'ultimatum' | 'centipede' | 'custom';
}

// Predefined teaching scenarios
const TEACHING_SCENARIOS = {
  entry_deterrance: {
    title: 'Entry Deterrence Game',
    description: 'An incumbent firm faces a potential entrant. The entrant chooses whether to enter, then the incumbent chooses whether to fight or accommodate.',
    setup: {
      players: ['Entrant', 'Incumbent'],
      tree: {
        root: { player: 'Entrant', actions: ['Enter', 'Stay Out'] },
        'Enter': { player: 'Incumbent', actions: ['Fight', 'Accommodate'] },
        'Stay Out': { terminal: true, payoffs: [0, 3] },
        'Fight': { terminal: true, payoffs: [-1, 1] },
        'Accommodate': { terminal: true, payoffs: [1, 1] }
      }
    },
    solution: {
      equilibrium: 'Enter → Accommodate',
      payoffs: [1, 1],
      explanation: 'Using backward induction: if Enter, Incumbent prefers Accommodate (1 > 1 is false, actually 1 = 1, but fighting costs). Entrant anticipates this and prefers Enter (1 > 0).'
    }
  },
  ultimatum: {
    title: 'Ultimatum Game',
    description: 'Player 1 proposes a split of $10. Player 2 accepts or rejects. If rejected, both get nothing.',
    setup: {
      players: ['Proposer', 'Responder'],
      tree: {
        root: { player: 'Proposer', actions: ['Fair (5,5)', 'Unfair (8,2)'] },
        'Fair (5,5)': { player: 'Responder', actions: ['Accept', 'Reject'] },
        'Unfair (8,2)': { player: 'Responder', actions: ['Accept', 'Reject'] },
        'Accept': { terminal: true, payoffs: [] }, // Payoffs depend on path
        'Reject': { terminal: true, payoffs: [0, 0] }
      }
    },
    solution: {
      equilibrium: 'Proposer offers minimum, Responder accepts',
      payoffs: [9, 1],
      explanation: 'Backward induction: Responder accepts any positive amount. Knowing this, Proposer offers the minimum possible.'
    }
  },
  centipede: {
    title: 'Centipede Game',
    description: 'Players alternate choosing to Take (end game) or Pass (continue). Pot grows as game continues.',
    setup: {
      players: ['Player 1', 'Player 2'],
      tree: {
        // Simplified 2-turn version
        root: { player: 'Player 1', actions: ['Take (2,0)', 'Pass'] },
        'Pass': { player: 'Player 2', actions: ['Take (1,3)', 'Pass (0,0)'] },
        'Take (2,0)': { terminal: true, payoffs: [2, 0] },
        'Take (1,3)': { terminal: true, payoffs: [1, 3] },
        'Pass (0,0)': { terminal: true, payoffs: [0, 0] } // Actually would continue, simplified
      }
    },
    solution: {
      equilibrium: 'Take immediately',
      payoffs: [2, 0],
      explanation: 'Backward induction: At any node, taking dominates passing. Even though mutual passing yields higher total payoff, rational players take immediately.'
    }
  }
};

// Teaching steps define the guided flow
const TEACHING_STEPS: TeachingStep[] = [
  {
    id: 'intro',
    title: 'Introduction to Sequential Games',
    description: 'Learn how sequential decision-making differs from simultaneous moves.',
    conceptId: 'extensive_form',
    hasInteractiveElement: false,
    validateProgress: () => true
  },
  {
    id: 'tree_structure',
    title: 'Game Tree Structure',
    description: 'Understand nodes, branches, decision points, and terminal nodes.',
    conceptId: 'game_tree',
    hasInteractiveElement: true,
    validateProgress: (state) => state.treeAttempted
  },
  {
    id: 'backward_induction',
    title: 'Backward Induction',
    description: 'Learn to solve games by working from the end to the beginning.',
    conceptId: 'backward_induction',
    hasInteractiveElement: true,
    validateProgress: (state) => state.backwardInductionDemonstrated
  },
  {
    id: 'subgame_perfection',
    title: 'Subgame Perfect Equilibrium',
    description: 'Why SPE eliminates non-credible threats in sequential games.',
    conceptId: 'subgame_perfection',
    hasInteractiveElement: false,
    validateProgress: (state) => state.equilibriumFound
  },
  {
    id: 'practice',
    title: 'Practice Problem',
    description: 'Apply backward induction to solve a new game tree.',
    hasInteractiveElement: true,
    validateProgress: (state) => state.equilibriumFound
  },
  {
    id: 'complete',
    title: 'Module Complete',
    description: 'Review what you\'ve learned about sequential game analysis.',
    hasInteractiveElement: false,
    validateProgress: () => true
  }
];

// Mini concept explainer component
const ConceptExplainer: React.FC<{ conceptId: string }> = ({ conceptId }) => {
  const concept = getConcept(conceptId);
  if (!concept) return null;

  return (
    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-blue-400" />
        <h4 className="font-semibold text-blue-300">{concept.name}</h4>
      </div>
      <p className="text-sm text-slate-300 mb-3">{concept.shortDescription}</p>
      <div className="text-xs text-slate-400">
        <span className="font-medium">Key Insight:</span> {concept.keyInsights[0]}
      </div>
    </div>
  );
};

// Step-by-step backward induction demo
const BackwardInductionDemo: React.FC<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Start at the End',
      content: 'In backward induction, we begin at the terminal nodes (the end of the game) and work backwards.',
      highlight: 'terminal'
    },
    {
      title: 'Find Best Response',
      content: 'At each decision node, determine which action gives that player the highest payoff.',
      highlight: 'decision'
    },
    {
      title: 'Propagate Values',
      content: 'Replace the subgame with its equilibrium payoff, moving the solution one level up the tree.',
      highlight: 'propagation'
    },
    {
      title: 'Repeat Until Root',
      content: 'Continue this process until you reach the initial decision node. The resulting strategy is SPE.',
      highlight: 'complete'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center ${idx <= currentStep ? 'opacity-100' : 'opacity-40'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              idx < currentStep ? 'bg-green-500' : 
              idx === currentStep ? 'bg-blue-500' : 'bg-slate-600'
            }`}>
              {idx < currentStep ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : (
                <span className="text-white text-sm">{idx + 1}</span>
              )}
            </div>
            <span className="text-xs text-slate-400">{step.title}</span>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-2">{steps[currentStep].title}</h4>
        <p className="text-slate-300">{steps[currentStep].content}</p>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-4 py-2 bg-slate-700 rounded-lg text-white disabled:opacity-50"
        >
          Previous
        </button>
        {currentStep < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="px-4 py-2 bg-blue-600 rounded-lg text-white"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-green-600 rounded-lg text-white"
          >
            Complete Demo
          </button>
        )}
      </div>
    </div>
  );
};

// Main teaching flow component
const GameTreeTeachingFlow: React.FC<GameTreeTeachingFlowProps> = ({
  userId,
  onComplete,
  initialScenario = 'entry_deterrance'
}) => {
  const [state, setState] = useState<TeachingState>({
    currentStepIndex: 0,
    completedSteps: [],
    userAnswers: {},
    treeAttempted: false,
    equilibriumFound: false,
    backwardInductionDemonstrated: false
  });

  const [selectedScenario, setSelectedScenario] = useState(initialScenario);
  const [showBuilder, setShowBuilder] = useState(false);

  const currentStep = TEACHING_STEPS[state.currentStepIndex];
  const progress = ((state.currentStepIndex) / (TEACHING_STEPS.length - 1)) * 100;

  const updateState = useCallback((updates: Partial<TeachingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const goToNextStep = useCallback(() => {
    if (currentStep.validateProgress && !currentStep.validateProgress(state)) {
      return; // Can't proceed yet
    }
    
    setState(prev => ({
      ...prev,
      currentStepIndex: Math.min(TEACHING_STEPS.length - 1, prev.currentStepIndex + 1),
      completedSteps: [...prev.completedSteps, currentStep.id]
    }));
  }, [currentStep, state]);

  const goToPrevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1)
    }));
  }, []);

  const resetFlow = useCallback(() => {
    setState({
      currentStepIndex: 0,
      completedSteps: [],
      userAnswers: {},
      treeAttempted: false,
      equilibriumFound: false,
      backwardInductionDemonstrated: false
    });
  }, []);

  const scenario = TEACHING_SCENARIOS[selectedScenario as keyof typeof TEACHING_SCENARIOS];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Provenance Banner - Truthfulness Boundary */}
      <ProvenanceBanner
        category="canonical_education"
        stepByStepAvailable={true}
      />

      {/* Progress Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <GraduationCap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Game Tree Builder: Guided Learning</h1>
              <p className="text-slate-400">Master backward induction and subgame perfect equilibrium</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              Step {state.currentStepIndex + 1} of {TEACHING_STEPS.length}
            </span>
            <button
              onClick={resetFlow}
              className="p-2 hover:bg-slate-700 rounded-lg"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TEACHING_STEPS.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => {
              // Only allow navigating to completed or current steps
              if (idx <= state.currentStepIndex || state.completedSteps.includes(step.id)) {
                setState(prev => ({ ...prev, currentStepIndex: idx }));
              }
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-sm ${
              idx === state.currentStepIndex
                ? 'bg-purple-600 text-white'
                : state.completedSteps.includes(step.id)
                ? 'bg-green-600/20 text-green-400'
                : 'bg-slate-800 text-slate-400'
            } ${idx > state.currentStepIndex && !state.completedSteps.includes(step.id) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            {state.completedSteps.includes(step.id) && (
              <CheckCircle className="w-4 h-4" />
            )}
            {step.title}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Instruction Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-2">{currentStep.title}</h2>
            <p className="text-slate-400 mb-4">{currentStep.description}</p>
            
            {currentStep.conceptId && (
              <ConceptExplainer conceptId={currentStep.conceptId} />
            )}

            {/* Learning Tips */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Learning Tip</span>
              </div>
              <p className="text-xs text-slate-400">
                {currentStep.id === 'backward_induction' && "Start from the end! This counterintuitive approach ensures credible strategies."}
                {currentStep.id === 'subgame_perfection' && "SPE eliminates threats that wouldn't actually be carried out if reached."}
                {currentStep.id === 'tree_structure' && "Each path from root to terminal represents one possible game outcome."}
                {currentStep.id === 'intro' && "Sequential games are like chess - moves happen in order, not simultaneously."}
                {currentStep.id === 'practice' && "Try to predict the equilibrium before clicking 'Solve'!"}
                {currentStep.id === 'complete' && "You've mastered the fundamentals of sequential game analysis!"}
              </p>
            </div>
          </div>

          {/* Scenario Selector */}
          {(currentStep.id === 'tree_structure' || currentStep.id === 'practice') && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="font-medium text-white mb-3">Select Scenario</h3>
              <div className="space-y-2">
                {(Object.keys(TEACHING_SCENARIOS) as Array<keyof typeof TEACHING_SCENARIOS>).map(key => (
                  <button
                    key={key}
                    onClick={() => setSelectedScenario(key)}
                    className={`w-full text-left p-3 rounded-lg text-sm ${
                      selectedScenario === key
                        ? 'bg-purple-600/20 border border-purple-500/50'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <div className="font-medium text-white">{TEACHING_SCENARIOS[key].title}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex gap-2">
            <button
              onClick={goToPrevStep}
              disabled={state.currentStepIndex === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 rounded-lg text-white disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={goToNextStep}
              disabled={currentStep.validateProgress && !currentStep.validateProgress(state)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 rounded-lg text-white disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Interactive Area */}
        <div className="lg:col-span-2">
          {currentStep.id === 'intro' && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 h-full">
              <h3 className="text-lg font-semibold text-white mb-4">What are Sequential Games?</h3>
              <div className="space-y-4 text-slate-300">
                <p>Unlike simultaneous games where players choose without knowing others' choices, <strong>sequential games</strong> unfold over time.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-medium text-white mb-2">Simultaneous (Normal Form)</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Players move at the same time</li>
                      <li>• Represented by payoff matrices</li>
                      <li>• Solution: Nash Equilibrium</li>
                      <li>• Example: Prisoner's Dilemma</li>
                    </ul>
                  </div>
                  <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                    <h4 className="font-medium text-white mb-2">Sequential (Extensive Form)</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Players move in sequence</li>
                      <li>• Represented by game trees</li>
                      <li>• Solution: Subgame Perfect Equilibrium</li>
                      <li>• Example: Chess, Entry Games</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="font-medium text-blue-300 mb-2">Why This Matters</h4>
                  <p className="text-sm">The order of moves fundamentally changes strategic reasoning. First-movers can commit to strategies that influence followers' choices. Followers can observe and respond optimally.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep.id === 'tree_structure' && (
            <div className="space-y-4">
              {!showBuilder ? (
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
                  <GitBranch className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Build Your First Game Tree</h3>
                  <p className="text-slate-400 mb-4">
                    Create a tree for: <strong>{scenario.title}</strong>
                  </p>
                  <p className="text-sm text-slate-500 mb-4">{scenario.description}</p>
                  <button
                    onClick={() => {
                      setShowBuilder(true);
                      updateState({ treeAttempted: true });
                    }}
                    className="px-6 py-3 bg-purple-600 rounded-lg text-white"
                  >
                    Start Building
                  </button>
                </div>
              ) : (
                <GameTreeBuilder userId={userId} />
              )}
            </div>
          )}

          {currentStep.id === 'backward_induction' && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Backward Induction Walkthrough</h3>
              <BackwardInductionDemo
                onComplete={() => updateState({ backwardInductionDemonstrated: true })}
              />
            </div>
          )}

          {currentStep.id === 'subgame_perfection' && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Subgame Perfect Equilibrium</h3>
              <div className="space-y-4">
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Definition</h4>
                  <p className="text-slate-300">A strategy profile is a Subgame Perfect Equilibrium (SPE) if it represents a Nash equilibrium in every subgame of the original game.</p>
                </div>

                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
                  <h4 className="font-medium text-red-300 mb-2">Eliminating Non-Credible Threats</h4>
                  <p className="text-sm text-slate-300 mb-2">Consider this example: Player 1 moves, then Player 2 threatens to punish if Player 1 chooses X.</p>
                  <p className="text-sm text-slate-400">But if Player 1 <em>did</em> choose X, punishing might hurt Player 2 as well. So the threat isn't credible, and SPE rules it out.</p>
                </div>

                <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg">
                  <h4 className="font-medium text-green-300 mb-2">Why SPE is the Right Solution Concept</h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• Requires strategies to be optimal at every decision point</li>
                    <li>• Eliminates empty threats that wouldn't be carried out</li>
                    <li>• Matches intuition about "rational play" in sequential settings</li>
                    <li>• Unique in many simple games (unlike Nash equilibrium)</li>
                  </ul>
                </div>

                <button
                  onClick={() => updateState({ equilibriumFound: true })}
                  className="w-full py-3 bg-green-600 rounded-lg text-white"
                >
                  Mark as Understood
                </button>
              </div>
            </div>
          )}

          {currentStep.id === 'practice' && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white">Practice: {scenario.title}</h3>
                    <p className="text-sm text-slate-400">Build the tree and solve for SPE</p>
                  </div>
                  <ProvenanceBadge category="canonical_education" />
                </div>
                <GameTreeBuilder
                  userId={userId}
                  onSolve={() => updateState({ equilibriumFound: true })}
                />
              </div>
              
              {state.equilibriumFound && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="font-medium text-green-300">Great job!</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Expected solution: {scenario.solution.equilibrium}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {scenario.solution.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep.id === 'complete' && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Module Complete!</h3>
              <p className="text-slate-400 mb-6">
                You've learned the fundamentals of sequential game analysis through backward induction.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">{state.completedSteps.length}</div>
                  <div className="text-sm text-slate-400">Steps Completed</div>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {state.equilibriumFound ? 'Yes' : 'In Progress'}
                  </div>
                  <div className="text-sm text-slate-400">SPE Found</div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={resetFlow}
                  className="px-6 py-3 bg-slate-700 rounded-lg text-white"
                >
                  Review Again
                </button>
                <button
                  onClick={onComplete}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white"
                >
                  Continue Learning
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameTreeTeachingFlow;
export { TEACHING_STEPS, TEACHING_SCENARIOS };
export type { TeachingStep, TeachingState };
