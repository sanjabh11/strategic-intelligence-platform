/**
 * Semantic Router — ProphetHacks-inspired per-category skill routing.
 *
 * Maps citizen forecast intents to P0 forecast skill files and injects
 * skill guidance into agent LLM system prompts.
 *
 * Source: https://www.prophetarena.co/research/prophethacks
 * Pattern: CodexProphet's semantic routing + per-category skill files
 */

import type { CitizenForecastIntent } from './publicForecasting.ts'
import {
  FORECAST_SKILLS,
  routeForecastSkill as routeSkillByIntent,
  type ForecastSkillCategory,
  type ForecastSkillFile,
} from './forecastSkills.ts'

export type { ForecastSkillCategory, ForecastSkillFile }

export interface SemanticRouteResult {
  skillFile: ForecastSkillFile
  category: ForecastSkillCategory
  label: string
  routingConfidence: number
  intent: CitizenForecastIntent
}

/**
 * Route a forecast prompt to the appropriate skill file based on intent.
 * Does NOT replace existing inferIntent() — adds a layer on top.
 */
export function routeForecastSkill(
  prompt: string,
  intent: CitizenForecastIntent,
  intentConfidence?: number,
): SemanticRouteResult {
  const skillFile = routeSkillByIntent(intent)
  return {
    skillFile,
    category: skillFile.category,
    label: skillFile.label,
    routingConfidence: intentConfidence ?? 0.7,
    intent,
  }
}

/**
 * Build a skill-enhanced system prompt for an agent role.
 * Injects evidence hierarchy, domain traps, and calibration warnings
 * from the skill file into the agent's LLM system prompt.
 */
export function buildSkillEnhancedSystemPrompt(
  roleId: string,
  skillFile: ForecastSkillFile,
  basePrompt: string,
): string {
  const evidenceGuide = skillFile.evidenceHierarchy
    .slice(0, 4)
    .map((src, i) => `  ${i + 1}. ${src}`)
    .join('\n')

  const traps = skillFile.domainTraps.slice(0, 3).join('; ')
  const calibrationNotes = skillFile.calibrationWarnings.slice(0, 2).join('; ')
  const noMoveGuidance = skillFile.noMoveGuidance || 'When evidence is thin or contradictory, "no move" is a valid output.'

  return `${basePrompt}

SKILL FILE: ${skillFile.label}
Evidence priority (consult in order):
${evidenceGuide}

Domain traps to avoid: ${traps}
Calibration warnings: ${calibrationNotes}
No-move guidance: ${noMoveGuidance}

Probability validation: ${skillFile.probabilityValidationRules.join('; ')}

When adjusting your probability, apply bounded nudges (max ±10pp) and only move when evidence is relevant, credible, and not already priced in.`
}

/**
 * Get the skill file for a given category directly.
 */
export function getSkillFile(category: ForecastSkillCategory): ForecastSkillFile {
  return FORECAST_SKILLS[category] || FORECAST_SKILLS.general
}
