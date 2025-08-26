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
    setIsLearningMode(prev => !prev);
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="text-2xl mb-4">👋</div>
          <h3 className="text-xl font-semibold text-white mb-3">Welcome to Strategic Intelligence!</h3>
          <p className="text-slate-300 mb-6">
            This platform uses advanced game theory to analyze strategic situations. 
            Would you like to enable <strong>Learning Mode</strong> to see helpful explanations for all charts and concepts?
          </p>
          
          <div className="flex space-x-3 justify-center">
            <button
              onClick={handleEnableLearningMode}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
            >
              Yes, help me learn!
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500 transition-colors"
            >
              Skip for now
            </button>
          </div>
          
          <p className="text-xs text-slate-400 mt-4">
            You can always toggle Learning Mode later using the button in the header.
          </p>
        </div>
      </div>
    </div>
  );
};
