// WelcomeToConsole - Onboarding Component
// Displays for first-time visitors or users with <3 analysis runs
// Aligned with Whop Technical Design Brief §6

import React, { useState, useEffect } from 'react';
import { 
  Brain, Sparkles, Search, Zap, Users, Target,
  ArrowRight, X, CheckCircle2
} from 'lucide-react';

interface WelcomeToConsoleProps {
  onDismiss?: () => void;
  analysisRunCount?: number;
}

const WelcomeToConsole: React.FC<WelcomeToConsoleProps> = ({ 
  onDismiss,
  analysisRunCount = 0 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if should show welcome
    const dismissed = localStorage.getItem('strategy-console-welcome-dismissed');
    const dismissedAt = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    
    // Show if: never dismissed, OR dismissed >30 days ago AND still <3 runs
    const shouldShow = !dismissed || (daysSinceDismissed > 30 && analysisRunCount < 3);
    
    // Also show for first visit
    const isFirstVisit = !localStorage.getItem('strategy-console-visited');
    
    if (shouldShow || isFirstVisit) {
      setIsVisible(true);
      localStorage.setItem('strategy-console-visited', 'true');
    }
  }, [analysisRunCount]);

  const handleDismiss = () => {
    localStorage.setItem('strategy-console-welcome-dismissed', Date.now().toString());
    setIsVisible(false);
    onDismiss?.();
  };

  const handleGetStarted = () => {
    handleDismiss();
    // Focus on the prompt input if available
    const promptInput = document.querySelector('textarea');
    if (promptInput) {
      promptInput.focus();
    }
  };

  if (!isVisible) return null;

  const features = [
    {
      icon: Brain,
      title: 'Evidence-Backed Analysis',
      description: 'Real citations from verified sources - no hallucinations'
    },
    {
      icon: Zap,
      title: 'Multiple Analysis Engines',
      description: 'Recursive equilibrium, quantum strategies, forecasting & more'
    },
    {
      icon: Users,
      title: 'Audience-Tailored Views',
      description: 'Student, researcher, teacher - get explanations that fit you'
    },
    {
      icon: Target,
      title: 'Strategic Clarity',
      description: 'Turn complex questions into defensible, structured insights'
    }
  ];

  const steps = [
    {
      title: 'Describe Your Scenario',
      description: 'Enter a strategic situation with multiple actors and choices'
    },
    {
      title: 'Select Analysis Engines',
      description: 'Choose from baseline to advanced quantum and forecasting'
    },
    {
      title: 'Run Analysis',
      description: 'Get evidence-backed equilibria, strategies, and predictions'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-slate-700">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome to Strategy Console</h2>
              <p className="text-slate-400 text-sm">Evidence-backed strategic analysis in seconds</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Hero Message */}
          <div className="text-center">
            <p className="text-lg text-slate-300">
              Turn complex strategic questions into <span className="text-cyan-400 font-semibold">clean, defensible insights</span> with real citations and advanced game theory.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-700 rounded-lg">
                      <Icon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white text-sm">{feature.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* How It Works */}
          <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">How It Works</h3>
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div className="flex-1 text-center">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      {idx + 1}
                    </div>
                    <h4 className="text-xs font-medium text-white">{step.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                  </div>
                  {idx < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-slate-600 mx-2 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Run Count Message */}
          {analysisRunCount > 0 && analysisRunCount < 3 && (
            <div className="flex items-center gap-2 text-sm text-slate-400 justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>You've run {analysisRunCount} analysis{analysisRunCount !== 1 ? 'es' : ''}. Try a few more to unlock the full power!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={handleDismiss}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Don't show again
          </button>
          <button
            onClick={handleGetStarted}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeToConsole;
