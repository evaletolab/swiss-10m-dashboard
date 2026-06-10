import { readCsv, writeCsv, numberOrNull, type CsvRow } from '../lib/csv.ts'

export type ScenarioName = 'observed' | 'linear_trend_2000_base_year' | 'cagr_trend_2000_base_year' | 'recent_trend_2015_base_year' | 'initiative_linear' | 'initiative_cagr' | 'bfs_reference'

function getPopulation(rows: Record<string, string>[], year: number) {
  const value = rows.find((row) => Number(row.year) === year)?.population
  return numberOrNull(value)
}

function latestObservedYear(rows: Record<string, string>[]) {
  const years = rows
    .map((row) => ({ year: Number(row.year), population: numberOrNull(row.population) }))
    .filter((row) => Number.isInteger(row.year) && row.population !== null && row.population > 0)
    .map((row) => row.year)
  const latest = Math.max(...years)
  if (!Number.isFinite(latest) || latest < 2023) throw new Error('Missing recent observed population year')
  return latest
}

function linearProjection(startYear: number, startPopulation: number, annualGrowth: number, scenario: ScenarioName, notes: string): CsvRow[] {
  return Array.from({ length: 2050 - startYear + 1 }, (_, index) => {
    const year = startYear + index
    return {
      year,
      scenario,
      population: Math.round(startPopulation + annualGrowth * index),
      annual_growth: index === 0 ? null : Math.round(annualGrowth),
      total_growth_since_base_year: Math.round(annualGrowth * index),
      notes,
    }
  })
}

function cagrProjection(startYear: number, startPopulation: number, rate: number, scenario: ScenarioName, notes: string): CsvRow[] {
  return Array.from({ length: 2050 - startYear + 1 }, (_, index) => {
    const year = startYear + index
    const population = startPopulation * Math.pow(1 + rate, index)
    const previous = index === 0 ? null : startPopulation * Math.pow(1 + rate, index - 1)
    return {
      year,
      scenario,
      population: Math.round(population),
      annual_growth: previous === null ? null : Math.round(population - previous),
      total_growth_since_base_year: Math.round(population - startPopulation),
      notes,
    }
  })
}

export async function buildScenarios(input: 'ch' | 'ge') {
  const rows = await readCsv(`data/normalized/${input}_demography.csv`)
  const startYear = latestObservedYear(rows)
  const base = getPopulation(rows, startYear)
  const pop2000 = getPopulation(rows, 2000)
  const pop2015 = getPopulation(rows, 2015)
  if (!base || !pop2000 || !pop2015) throw new Error(`Missing ${input} population base for scenarios`)

  const observed = rows.map((row) => ({
    year: Number(row.year),
    scenario: 'observed',
    population: numberOrNull(row.population),
    annual_growth: numberOrNull(row.total_growth),
    total_growth_since_base_year: Number(row.year) >= startYear && numberOrNull(row.population) !== null ? Number(row.population) - base : null,
    notes: row.source_note ?? '',
  }))

  const linearAnnual = (base - pop2000) / (startYear - 2000)
  const cagrRate = Math.pow(base / pop2000, 1 / (startYear - 2000)) - 1
  const recentAnnual = (base - pop2015) / (startYear - 2015)
  const initiativeTarget = input === 'ch' ? 10_000_000 : Math.round(base + (10_000_000 - 9_000_000) * 0.058)
  const initiativeAnnual = (initiativeTarget - base) / (2050 - startYear)
  const initiativeRate = Math.pow(initiativeTarget / base, 1 / (2050 - startYear)) - 1

  const scenarios = [
    ...observed,
    ...linearProjection(startYear, base, linearAnnual, 'linear_trend_2000_base_year', `Extrapolation linéaire de la tendance 2000-${startYear}`),
    ...cagrProjection(startYear, base, cagrRate, 'cagr_trend_2000_base_year', `Extrapolation CAGR 2000-${startYear}`),
    ...linearProjection(startYear, base, recentAnnual, 'recent_trend_2015_base_year', `Extrapolation linéaire récente 2015-${startYear}`),
    ...linearProjection(startYear, base, initiativeAnnual, 'initiative_linear', 'Trajectoire linéaire compatible avec le scénario initiative'),
    ...cagrProjection(startYear, base, initiativeRate, 'initiative_cagr', 'Trajectoire CAGR compatible avec le scénario initiative'),
  ]

  await writeCsv(`data/generated/scenarios_${input}.csv`, scenarios, ['year', 'scenario', 'population', 'annual_growth', 'total_growth_since_base_year', 'notes'])
  return scenarios
}
