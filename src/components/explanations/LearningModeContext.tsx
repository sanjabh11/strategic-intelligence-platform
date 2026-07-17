import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LearningModeContextType {
  isLearningMode: boolean;
  toggleLearningMode: () => void;
  setLearningMode: (enabled: boolean) => void;
  isFirstVisit: boolean;
  markVisited: () => void;
}

const LearningModeContext = createContext<LearningModeContextType | undefined>(undefined);

interface LearningModeProviderProps {
  children: ReactNode;
}

export const LearningModeProvider: React.FC<LearningModeProviderProps> = ({ children }) => {
  // Initialize from localStorage or default to false for experienced users
  const [isLearningMode, setIsLearningMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('strategic-intel-learning-mode');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Track first visit to show welcome message
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    if (typeof window !== 'undefined') {
      const visited = localStorage.getItem('strategic-intel-visited');
      return !visited;
    }
    return true;
  });

  // Persist learning mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('strategic-intel-learning-mode', JSON.stringify(isLearningMode));
    }
  }, [isLearningMode]);

  const toggleLearningMode = () => {
    setIsLearningMode((prev: any) => !prev);
  };

  const setLearningMode = (enabled: boolean) => {
    setIsLearningMode(enabled);
  };

  const markVisited = () => {
    setIsFirstVisit(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('strategic-intel-visited', 'true');
    }
  };

  const value: LearningModeContextType = {
    isLearningMode,
    toggleLearningMode,
    setLearningMode,
    isFirstVisit,
    markVisited
  };

  return (
    <LearningModeContext.Provider value={value}>
      {children}
    </LearningModeContext.Provider>
  );
};

// Hook for using learning mode context
export const useLearningMode = () => {
  const context = useContext(LearningModeContext);
  if (context === undefined) {
    throw new Error('useLearningMode must be used within a LearningModeProvider');
  }
  return context;
};

// Welcome message component for first-time users
export const WelcomeMessage: React.FC = () => {
  const { isFirstVisit, markVisited, setLearningMode } = useLearningMode();
  const [isVisible, setIsVisible] = useState(isFirstVisit);

  useEffect(() => {
    setIsVisible(isFirstVisit);
  }, [isFirstVisit]);

  if (!isVisible) return null;

  const handleEnableLearningMode = () => {
    setLearningMode(true);
    markVisited();
    setIsVisible(false);
  };

  const handleSkip = () => {
    markVisited();
    setIsVisible(false);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 max-w-sm p-4">
      <div className="pointer-events-auto rounded-2xl border border-slate-600 bg-slate-800/95 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="text-2xl leading-none">👋</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Welcome to Strategic Intelligence</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Turn on <strong>Learning Mode</strong> if you want chart and concept explanations while you explore.
              This prompt stays out of the way so you can keep navigating the product.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleEnableLearningMode}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
              >
                Enable Learning Mode
              </button>
              <button
                onClick={handleSkip}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-600"
              >
                Dismiss
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              You can toggle Learning Mode later from the header at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
