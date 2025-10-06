import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Info, Lightbulb } from 'lucide-react';
import { ExplanationSection } from './ExplanationContent';

// Simple tooltip component for quick help
interface HelpTooltipProps {
  content: string;
  children?: React.ReactNode;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        className="inline-flex items-center justify-center w-5 h-5 ml-2 text-slate-400 hover:text-cyan-400 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children || <HelpCircle className="w-4 h-4" />}
      </button>
      
      {isVisible && (
        <div className="absolute z-50 w-64 p-3 bg-slate-800 border border-slate-600 rounded-lg shadow-xl -top-2 left-6">
          <div className="text-sm text-slate-200">{content}</div>
          <div className="absolute w-2 h-2 bg-slate-800 border-l border-t border-slate-600 transform rotate-45 -left-1 top-4"></div>
        </div>
      )}
    </div>
  );
};

// Expandable explanation panel
interface ExpandableExplanationProps {
  section: ExplanationSection;
  isLearningMode?: boolean;
  defaultExpanded?: boolean;
}

export const ExpandableExplanation: React.FC<ExpandableExplanationProps> = ({
  section,
  isLearningMode = false,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || isLearningMode);

  if (!isLearningMode && !defaultExpanded) {
    return null;
  }

  return (
    <div className="mb-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-600/30 transition-colors rounded-lg"
      >
        <div className="flex items-center">
          <Info className="w-4 h-4 mr-2 text-blue-400" />
          <span className="text-sm font-medium text-slate-300">How to understand this chart</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-600/50 pt-3">
          <div className="text-sm text-slate-300 mb-3">{section.detailed}</div>
          
          {section.analogy && (
            <div className="mb-3 p-3 bg-slate-600/30 rounded-md border-l-2 border-cyan-500">
              <div className="flex items-start">
                <Lightbulb className="w-4 h-4 mr-2 text-yellow-400 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-yellow-400 mb-1">Think of it like this:</div>
                  <div className="text-sm text-slate-300">{section.analogy}</div>
                </div>
              </div>
            </div>
          )}
          
          {section.keyPoints && section.keyPoints.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-400 mb-2">Key Points:</div>
              <ul className="space-y-1">
                {section.keyPoints.map((point, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Chart header with integrated help
interface ChartHeaderProps {
  title: string;
  icon: React.ReactNode;
  helpContent: ExplanationSection;
  isLearningMode?: boolean;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({
  title,
  icon,
  helpContent,
  isLearningMode = false
}) => {
  return (
    <div>
      <div className="flex items-center mb-4">
        {icon}
        <h4 className="text-xl font-semibold text-white">{title}</h4>
        <HelpTooltip content={helpContent.quickTip} />
      </div>
      <ExpandableExplanation section={helpContent} isLearningMode={isLearningMode} />
    </div>
  );
};

// Learning mode indicator badge
interface LearningModeBadgeProps {
  isActive: boolean;
  onClick: () => void;
}

export const LearningModeBadge: React.FC<LearningModeBadgeProps> = ({ isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-cyan-600 text-white shadow-lg'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      <HelpCircle className="w-4 h-4 mr-1.5" />
      {isActive ? 'Learning Mode: ON' : 'Learning Mode: OFF'}
    </button>
  );
};
