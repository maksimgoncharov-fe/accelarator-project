import { scenarioDefinitions, type ScenarioDefinition } from './fixtures.ts'

/** Scenarios this boundary implements (the required set). */
export const SUPPORTED_SCENARIOS = [
  'normal',
  'empty',
  'list-error',
  'details-error',
  'coaches-error',
  'create-error',
] as const

export type ScenarioName = (typeof SUPPORTED_SCENARIOS)[number]

let current: ScenarioName = 'normal'
let latencyOverride: number | null = null

export function isScenarioName(value: unknown): value is ScenarioName {
  return typeof value === 'string' && (SUPPORTED_SCENARIOS as readonly string[]).includes(value)
}

export function setScenario(name: string | null | undefined): void {
  current = isScenarioName(name) ? name : 'normal'
}

export function getScenario(): ScenarioName {
  return current
}

export function setLatencyOverride(ms: number | null): void {
  latencyOverride = ms
}

export function getLatencyMs(): number {
  return latencyOverride ?? scenarioDefinitions.normal?.defaultLatencyMs ?? 0
}

export type RequestKey =
  | 'list'
  | 'details'
  | 'coaches'
  | 'create'

const REQUEST_LABELS: Record<RequestKey, string> = {
  list: 'GET /api/sessions',
  details: 'GET /api/sessions/',
  coaches: 'GET /api/coaches',
  create: 'POST /api/sessions',
}

/**
 * Returns the fixture-defined override for this request in the active scenario,
 * or undefined when the normal handler should answer.
 */
export function getOverride(
  key: RequestKey,
  sessionId?: string,
): { status: number; body: unknown } | undefined {
  const definition: ScenarioDefinition | undefined = scenarioDefinitions[current]
  if (!definition || current === 'normal') return undefined
  if (definition.status === undefined || definition.request === undefined) return undefined
  const label = REQUEST_LABELS[key]
  const matches =
    key === 'details' ? definition.request.startsWith(label) : definition.request === label
  if (!matches) return undefined
  if (definition.targetSessionId && definition.targetSessionId !== sessionId) return undefined
  return { status: definition.status, body: definition.body }
}
