// WelcomeToConsole - Onboarding Component
// Displays for first-time visitors or users with <3 analysis runs
// Aligned with Whop Technical Design Brief §6

import React, { useState, useEffect } from 'react';
import {
  Brain, Zap, Users, Target,
  ArrowRight, X, CheckCircle2
} from 'lucide-react';
import { track, AnalyticsEvents } from '../lib/analytics';
import { validateClaims } from '../lib/claimRegistry';

interface WelcomeToConsoleProps {
  onDismiss?: () => void;
  analysisRunCount?: number;
}

const WelcomeToConsole: React.FC<WelcomeToConsoleProps> = ({ 
  onDismiss,
  analysisRunCount = 0 
}) => {
  const [isVisible, setIsVisible] = useState(false);

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

      // Validate onboarding claims against claim registry
      const featureText = 'Evidence-Backed Analysis Real citations from verified sources every claim traceable Multiple Analysis Engines Audience-Tailored Views Strategic Clarity';
      const { valid, violations } = validateClaims(featureText);
      if (!valid && import.meta.env.DEV) {
        console.warn('[claimRegistry] Onboarding text violations:', violations);
      }
    }
  }, [analysisRunCount]);

  const handleDismiss = () => {
    localStorage.setItem('strategy-console-welcome-dismissed', Date.now().toString());
    setIsVisible(false);
    track(AnalyticsEvents.ONBOARDING_DISMISS);
    onDismiss?.();
  };

  const handleGetStarted = () => {
    handleDismiss();
    track(AnalyticsEvents.ONBOARDING_GET_STARTED);
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
      description: 'Real citations from verified sources — every claim traceable'
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
    <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 shadow-lg shadow-cyan-950/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 p-2">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">New to Strategy Console?</h2>
            <p className="mt-1 text-sm text-slate-300">
              Start with one question, run the analysis, then open deeper evidence or governance only when you need it.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:text-white"
          aria-label="Dismiss welcome card"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div key={idx} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-700 p-2">
                  <Icon className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">{feature.title}</h4>
                  <p className="mt-1 text-xs text-slate-400">{feature.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Fast path</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={idx} className="rounded-lg border border-slate-700 bg-slate-800/80 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400">
                  {idx + 1}
                </div>
                <h4 className="text-sm font-medium text-white">{step.title}</h4>
              </div>
              <p className="text-xs text-slate-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-400">
          {analysisRunCount > 0 && analysisRunCount < 3 ? (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              You&apos;ve run {analysisRunCount} analysis{analysisRunCount !== 1 ? 'es' : ''}. Keep exploring to compare evidence and governance paths.
            </span>
          ) : (
            <span>Need concept explanations later? Learning Mode stays available in the header.</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDismiss}
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            Don&apos;t show again
          </button>
          <button
            onClick={handleGetStarted}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
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
