// Audience View Router Component
// Routes to appropriate audience-specific component based on analysis data

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Users, BookOpen, Microscope, School } from 'lucide-react';
import { AudienceType, AudienceAnalysisData, AUDIENCE_CONFIGS } from '../../types/audience-views';
import StudentView from './StudentView';
import LearnerView from './LearnerView';
import ResearcherView from './ResearcherView';
import TeacherView from './TeacherView';
import SourceViewer from './SourceViewer';

interface AudienceViewRouterProps {
  analysisData?: AudienceAnalysisData;
  analysisRunId?: string;
  audience?: AudienceType;
  onAudienceChange?: (audience: AudienceType) => void;
  isLoading?: boolean;
  error?: string;
}

const AudienceViewRouter: React.FC<AudienceViewRouterProps> = ({
  analysisData,
  analysisRunId,
  audience: propAudience,
  onAudienceChange,
  isLoading = false,
  error
}) => {
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>(propAudience || 'learner');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

  // Update local audience state when prop changes
  useEffect(() => {
    if (propAudience) {
      setSelectedAudience(propAudience);
    }
  }, [propAudience]);

  const handleAudienceChange = (audience: AudienceType) => {
    setSelectedAudience(audience);
    onAudienceChange?.(audience);
  };

  const handleSourceClick = (sourceId: string) => {
    setSelectedSource(sourceId);
    setIsSourceModalOpen(true);
  };

  const closeSourceModal = () => {
    setIsSourceModalOpen(false);
    setSelectedSource(null);
  };

  const getCurrentSource = () => {
    if (!selectedSource || !analysisData?.data.sources) return null;
    return analysisData.data.sources.find(s => s.id === selectedSource) || null;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mr-3" />
          <span className="text-slate-300">Loading audience analysis...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-red-500/20">
        <div className="flex items-center text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Analysis Error: {error}</span>
        </div>
      </div>
    );
  }

  // No data state
  if (!analysisData) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
        <div className="text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No audience analysis available</p>
          {analysisRunId && (
            <p className="text-sm mt-2">Run ID: {analysisRunId}</p>
          )}
        </div>
      </div>
    );
  }

  const renderAudienceSelector = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Select Audience View</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(AUDIENCE_CONFIGS) as AudienceType[]).map((audienceType) => {
          const config = AUDIENCE_CONFIGS[audienceType];
          const isSelected = selectedAudience === audienceType;

          const getIconComponent = () => {
            switch (audienceType) {
              case 'student': return <Users className="w-5 h-5" />;
              case 'learner': return <BookOpen className="w-5 h-5" />;
              case 'researcher': return <Microscope className="w-5 h-5" />;
              case 'teacher': return <School className="w-5 h-5" />;
              default: return <Users className="w-5 h-5" />;
            }
          };

          return (
            <button
              key={audienceType}
              onClick={() => handleAudienceChange(audienceType)}
              className={`p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
                  : 'border-slate-600 bg-slate-700 hover:border-slate-500 text-slate-300 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {getIconComponent()}
                <div className="text-left">
                  <div className="font-medium text-sm">{config.label}</div>
                  <div className="text-xs opacity-70">{config.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderAudienceView = () => {
    const commonProps = {
      analysisData,
      onSourceClick: handleSourceClick,
      isLoading: false,
      error: undefined
    };

    switch (selectedAudience) {
      case 'student':
        return <StudentView {...commonProps} />;
      case 'learner':
        return <LearnerView {...commonProps} />;
      case 'researcher':
        return <ResearcherView {...commonProps} />;
      case 'teacher':
        return <TeacherView {...commonProps} />;
      default:
        return (
          <div className="bg-slate-800 rounded-xl p-6 border border-yellow-500/20">
            <div className="text-yellow-400 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Unknown audience type: {selectedAudience}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderAudienceSelector()}
      {renderAudienceView()}

      {/* Source Viewer Modal */}
      {isSourceModalOpen && getCurrentSource() && (
        <SourceViewer
          source={getCurrentSource()!}
          isOpen={isSourceModalOpen}
          onClose={closeSourceModal}
        />
      )}
    </div>
  );
};

export default AudienceViewRouter;