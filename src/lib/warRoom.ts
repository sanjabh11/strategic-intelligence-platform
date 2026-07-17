import type { StrategistAnalysis } from './strategistContract';

// War Room Route State Type

export interface WarRoomDecisionLogDraft {
  title?: string;
  summary?: string;
  entries?: Array<{ timestamp: string; actor: string; action: string; rationale: string }>;
  pendingEntry?: string;
  sourceSurface?: string;
  strategistBrief?: StrategistAnalysis | Record<string, unknown>;
  linkedForecastId?: string;
  linkedForecastTitle?: string;
}

export interface WarRoomScenarioVersionDraft {
  title?: string;
  versionLabel?: string;
  scenarioText?: string;
  changes?: string[];
  baseScenarioId?: string;
  sourceSurface?: string;
  templateId?: string;
  studioBrief?: string;
  report?: string | Record<string, unknown>;
}

export interface WarRoomRouteState {
  scenarioId?: string;
  analysisId?: string;
  strategistId?: string;
  sessionId?: string;
  decisionLogDraft?: WarRoomDecisionLogDraft;
  scenarioVersionDraft?: WarRoomScenarioVersionDraft;
}
