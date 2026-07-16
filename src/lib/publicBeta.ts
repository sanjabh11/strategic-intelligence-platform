// Public Beta Configuration
// Controls which features are accessible during the public beta phase

const BETA_MODE = import.meta.env.VITE_PUBLIC_BETA_MODE ?? '';

export const isPublicAnalysisOnlyBeta: boolean = BETA_MODE === 'analysis_only';

export const publicCommoditiesEnabled: boolean =
  import.meta.env.VITE_PUBLIC_COMMODITIES_ENABLED === 'true';

export const publicInsightsEnabled: boolean =
  import.meta.env.VITE_PUBLIC_INSIGHTS_ENABLED === 'true';
