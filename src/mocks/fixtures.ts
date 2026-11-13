// The only module that imports the assessment fixture JSON (read-only input).
import type {
  CoachSummary,
  SessionDetails,
  SessionsResponse,
} from '../api/types.ts'
import clockJson from '../../frontend-accelerator-assessment/fixtures/fixture-clock.json'
import coachesJson from '../../frontend-accelerator-assessment/fixtures/coaches.json'
import scenariosJson from '../../frontend-accelerator-assessment/fixtures/mock-scenarios.json'
import sessionsJson from '../../frontend-accelerator-assessment/fixtures/sessions.json'

const detailModules = import.meta.glob<SessionDetails>(
  '../../frontend-accelerator-assessment/fixtures/session-details/*.json',
  { eager: true, import: 'default' },
)

export const referenceNow: string = clockJson.referenceNow
export const coachFixtures = coachesJson.data as CoachSummary[]
export const sessionsFixture = sessionsJson as unknown as SessionsResponse
export const detailFixtures: SessionDetails[] = Object.values(detailModules)
export const scenarioDefinitions = scenariosJson as unknown as Record<string, ScenarioDefinition>

export interface ScenarioDefinition {
  description?: string
  request?: string
  status?: number
  body?: unknown
  targetSessionId?: string
  defaultLatencyMs?: number
}
