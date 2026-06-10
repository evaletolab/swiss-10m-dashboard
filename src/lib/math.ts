import { toNumber } from './format'
import type { ScenarioRow } from './types'

export function scenarioValue(rows: ScenarioRow[], scenario: string, year: number) {
  return toNumber(rows.find((row) => row.scenario === scenario && Number(row.year) === year)?.population)
}
