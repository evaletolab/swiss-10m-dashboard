import { writeJson, numberOrNull } from '../lib/csv.ts'
import { ensureDataDirs } from '../lib/paths.ts'
import { buildInfrastructureNeeds } from './infrastructure_needs.ts'
import { latestFertilityIndicators } from './indicators.ts'
import { buildGrowthComparison } from './growth_comparison.ts'
import { buildScenarios } from './scenarios.ts'
import { buildStateBudgetProjection } from './state_budget_projection.ts'

function latestObservedYear(rows: Array<Record<string, unknown>>) {
  const years = rows
    .filter((row) => row.scenario === 'observed' && numberOrNull(row.population) !== null)
    .map((row) => Number(row.year))
  const latest = Math.max(...years)
  if (!Number.isFinite(latest) || latest < 2023) throw new Error('Missing recent observed population year')
  return latest
}

async function main() {
  await ensureDataDirs()
  const ch = await buildScenarios('ch')
  const ge = await buildScenarios('ge')
  const needs = await buildInfrastructureNeeds()
  await buildGrowthComparison()
  await buildStateBudgetProjection()
  const fertility = await latestFertilityIndicators()
  const chBaseYear = latestObservedYear(ch)
  const geBaseYear = latestObservedYear(ge)
  const baseYear = Math.min(chBaseYear, geBaseYear)
  const targetYear = 2050
  const chBase = numberOrNull(ch.find((row) => row.year === chBaseYear && row.scenario === 'observed')?.population)
  const geBase = numberOrNull(ge.find((row) => row.year === geBaseYear && row.scenario === 'observed')?.population)
  const geTrend2050 = numberOrNull(ge.find((row) => row.year === targetYear && row.scenario === 'linear_trend_2000_base_year')?.population)
  const geInitiative2050 = numberOrNull(ge.find((row) => row.year === targetYear && row.scenario === 'initiative_linear')?.population)
  const needGap = needs.find((row) => row.year === targetYear && row.scenario === 'initiative_linear')
  const summary = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    baseYear,
    targetYear,
    switzerland: {
      baseYear: chBaseYear,
      populationBase: chBase,
      populationInitiativeTarget: 10000000,
      linearTrend2050: numberOrNull(ch.find((row) => row.year === targetYear && row.scenario === 'linear_trend_2000_base_year')?.population),
      cagrTrend2050: numberOrNull(ch.find((row) => row.year === targetYear && row.scenario === 'cagr_trend_2000_base_year')?.population),
      initiativeAnnualGrowthLinear: numberOrNull(ch.find((row) => row.year === targetYear && row.scenario === 'initiative_linear')?.total_growth_since_base_year) === null ? null : Math.round(Number(ch.find((row) => row.year === targetYear && row.scenario === 'initiative_linear')?.total_growth_since_base_year) / (targetYear - chBaseYear)),
      initiativeAnnualGrowthRate: null,
    },
    geneva: {
      baseYear: geBaseYear,
      populationBase: geBase,
      linearTrend2050: geTrend2050,
      initiativeTranslated2050: geInitiative2050,
      populationGap2050: geTrend2050 !== null && geInitiative2050 !== null ? geTrend2050 - geInitiative2050 : null,
      housingNeedGap2050: numberOrNull(needGap?.required_housing_units),
      classNeedGap2050: numberOrNull(needGap?.required_classes),
      doctorNeedGap2050: numberOrNull(needGap?.required_doctors),
    },
    fertility,
  }
  await writeJson('data/generated/summary.json', summary)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
