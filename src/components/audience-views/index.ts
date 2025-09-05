// Audience Views Module Index
// Central exports for all audience-specific components

export { default as AudienceViewRouter } from './AudienceViewRouter';
export { default as StudentView } from './StudentView';
export { default as LearnerView } from './LearnerView';
export { default as ResearcherView } from './ResearcherView';
export { default as TeacherView } from './TeacherView';
export { default as SourceViewer } from './SourceViewer';

// Re-export types for convenience
export type {
  AudienceType,
  AudienceAnalysisData,
  StudentViewData,
  LearnerViewData,
  ResearcherViewData,
  TeacherViewData,
  AudienceViewProps,
  SourceCitation
} from '../../types/audience-views';