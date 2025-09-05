// Audience-specific Types for Strategic Intelligence Platform
// These types define the structure of analysis_json field for different audiences

export interface SourceCitation {
  id: string;
  title: string;
  url: string;
  snippet: string;
  relevance_score?: number;
  date?: string;
}

// Student View Types (Aligned with Ph2.md schema)
export interface StudentViewData {
  one_paragraph_summary: {
    text: string;
  };
  top_2_actions: Array<{
    action: string;
    rationale: string;
    expected_outcome: {
      value: number;
      confidence: number;
      sources: Array<{
        id: string;
        score: number;
        excerpt?: string;
      }>;
    };
  }>;
  key_terms: Array<{
    term: string;
    definition: string;
  }>;
  two_quiz_questions: Array<{
    q: string;
    answer: string;
    difficulty: "easy" | "medium";
  }>;
  provenance: {
    retrieval_count: number;
    retrieval_ids: string[];
    evidence_backed: boolean;
  };
}

// Learner View Types (Aligned with Ph2.md schema)
export interface LearnerViewData {
  summary: {
    text: string;
  };
  decision_table: Array<{
    actor: string;
    action: string;
    payoff_estimate: {
      value: number;
      confidence: number;
      sources: Array<{
        id: string;
        score: number;
        excerpt?: string;
      }>;
    };
    risk_notes: string;
  }>;
  expected_value_ranking: Array<{
    action: string;
    ev: number;
    ev_confidence: number;
  }>;
  sensitivity_advice: {
    most_sensitive_parameters: Array<{
      param: string;
      impact_score: number;
    }>;
    tipping_points: Array<{
      param: string;
      threshold: number;
    }>;
  };
  exercise: {
    task: string;
    hints: string[];
  };
  provenance: {
    retrieval_count: number;
    retrieval_ids: string[];
    evidence_backed: boolean;
  };
}

// Researcher View Types (Aligned with Ph2.md schema)
export interface ResearcherViewData {
  long_summary: {
    text: string;
  };
  assumptions: Array<{
    name: string;
    value: number;
    justification: string;
  }>;
  payoff_matrix: {
    players: string[];
    actions_by_player: string[][];
    matrix_values: number[][][];
  };
  solver_config: {
    seed: number;
    method: "recursive_nash" | "replicator" | "best_response";
    iterations: number;
  };
  simulation_results: {
    equilibria: Array<{
      type: "pure" | "mixed";
      profile: {
        player: string;
        action_probabilities: number[];
      };
      stability: number;
      confidence: number;
    }>;
    sensitivity: {
      param_samples: Array<{
        param: string;
        range: [number, number];
        effect_on_outcome: number;
      }>;
    };
  };
  notebook_snippet: string;
  data_exports: {
    payoff_csv_url: string;
    simulations_json_url: string;
  };
  provenance: {
    retrieval_count: number;
    retrieval_ids: string[];
    evidence_backed: boolean;
  };
}

// Teacher View Types (Aligned with Ph2.md schema)
export interface TeacherViewData {
  lesson_outline: {
    duration_minutes: number;
    learning_objectives: string[];
    summary: string;
  };
  simulation_setup: {
    roles: Array<{
      role: string;
      instructions: string;
      payoff_card_url?: string;
    }>;
    rounds: number;
    timing_minutes_per_round: number;
  };
  grading_rubric: Array<{
    criteria: string;
    max_points: number;
    description: string;
  }>;
  student_handouts: string[];
  sample_solutions: string[];
  provenance: {
    retrieval_count: number;
    retrieval_ids: string[];
    evidence_backed: boolean;
  };
}

// Common types from Ph2.md
export interface NumericObject {
  value: number;
  confidence: number;
  sources: Array<{
    id: string;
    score: number;
    excerpt?: string;
  }>;
}

export interface Provenance {
  retrieval_count: number;
  retrieval_ids: string[];
  evidence_backed: boolean;
}

// Unified Audience Analysis Type
export type AudienceType = 'student' | 'learner' | 'researcher' | 'teacher';

export interface AudienceAnalysisData {
  analysis_id: string;
  audience: AudienceType;
  summary?: { text: string };
  data: StudentViewData | LearnerViewData | ResearcherViewData | TeacherViewData;
  provenance: Provenance;
  metadata?: {
    generated_at: string;
    model_version: string;
    processing_time_ms: number;
  };
}

// Component Props Types
export interface AudienceViewProps {
  analysisData: AudienceAnalysisData;
  onSourceClick?: (sourceId: string) => void;
  isLoading?: boolean;
  error?: string;
  audience?: AudienceType;
}

export interface AudienceViewRouterProps {
  analysisRunId?: string;
  audience?: AudienceType;
  onAudienceChange?: (audience: AudienceType) => void;
}

export interface SourceViewerProps {
  source: SourceCitation;
  isOpen: boolean;
  onClose: () => void;
}

// Utility Types
export interface AudienceConfig {
  key: AudienceType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const AUDIENCE_CONFIGS: Record<AudienceType, AudienceConfig> = {
  student: {
    key: 'student',
    label: 'Student',
    description: 'Simplified summary with key concepts',
    icon: 'graduation-cap',
    color: 'cyan'
  },
  learner: {
    key: 'learner',
    label: 'Learner',
    description: 'Interactive learning with exercises',
    icon: 'book-open',
    color: 'emerald'
  },
  researcher: {
    key: 'researcher',
    label: 'Researcher',
    description: 'Detailed analysis with data exports',
    icon: 'microscope',
    color: 'purple'
  },
  teacher: {
    key: 'teacher',
    label: 'Teacher',
    description: 'Educational materials and assessments',
    icon: 'chalkboard-teacher',
    color: 'orange'
  }
};