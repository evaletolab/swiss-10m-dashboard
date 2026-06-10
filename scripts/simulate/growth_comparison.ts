import { numberOrNull, readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'

const START_YEAR = 2010
const TARGET_YEAR = 2050

type Row = Record<string, string>

const pressureWeights = {
  housing: 0.35,
  schools: 0.2,
  health: 0.2,
  transport: 0.25,
}

const scenarioLabels: Record<string, string> = {
  linear_trend_2000_base_year: 'Tendance linéaire',
  cagr_trend_2000_base_year: 'Tendance CAGR',
  recent_trend_2015_base_year: 'Tendance récente',
  initiative_linear: 'Scénario initiative',
  initiative_cagr: 'Scénario initiative CAGR',
}

function rowForYear(rows: Row[], year: number) {
  return rows.find((row) => Number(row.year) === year)
}

function scenarioRow(rows: Row[], year: number, scenario: string) {
  return rows.find((row) => Number(row.year) === year && row.scenario === scenario)
}

function latestObservedYear(rows: Row[]) {
  const years = rows
    .filter((row) => row.scenario === 'observed' && numberOrNull(row.population) !== null)
    .map((row) => Number(row.year))
  const latest = Math.max(...years)
  if (!Number.isFinite(latest)) throw new Error('Missing observed scenario year')
  return latest
}

function cumulativeGrowth(value: number | null, reference: number | null) {
  if (value === null || reference === null || reference === 0) return null
  return Number((((value / reference) - 1) * 100).toFixed(2))
}

function cagrEstimate(startValue: number | null, endValue: number | null, startYear: number, endYear: number, targetYear = TARGET_YEAR) {
  if (startValue === null || endValue === null || startValue <= 0 || endValue <= 0 || endYear <= startYear) return null
  const rate = Math.pow(endValue / startValue, 1 / (endYear - startYear)) - 1
  return Number((endValue * Math.pow(1 + rate, targetYear - endYear)).toFixed(2))
}

function linearTrendEstimate(startValue: number | null, endValue: number | null, startYear: number, endYear: number, targetYear = TARGET_YEAR) {
  if (startValue === null || endValue === null || endYear <= startYear) return null
  const annualChange = (endValue - startValue) / (endYear - startYear)
  return Number((endValue + annualChange * (targetYear - endYear)).toFixed(2))
}

function ratioPct(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || denominator <= 0) return null
  return Number((numerator / denominator * 100).toFixed(2))
}

function weightedPressure(components: Array<{ value: number | null, weight: number }>) {
  const available = components.filter((component): component is { value: number, weight: number } => component.value !== null)
  const totalWeight = available.reduce((sum, component) => sum + component.weight, 0)
  if (totalWeight === 0) return null
  return Number((available.reduce((sum, component) => sum + component.value * component.weight, 0) / totalWeight).toFixed(2))
}

function applyPressureUplift(value: number | null, upliftPct: number | null) {
  if (value === null || upliftPct === null) return null
  return Number((value * (1 + upliftPct / 100)).toFixed(2))
}

function assumptionValue(rows: Row[], key: string) {
  return numberOrNull(rows.find((row) => row.key === key)?.value)
}

function linearBackcast(rows: Row[], field: string, startYear: number, endYear: number) {
  const observed = rows
    .map((row) => ({ year: Number(row.year), value: numberOrNull(row[field]) }))
    .filter((row): row is { year: number, value: number } => Number.isFinite(row.year) && row.value !== null && row.year > startYear && row.year <= endYear)
    .sort((a, b) => a.year - b.year)
  const first = observed[0]
  const last = observed.at(-1)
  if (!first || !last || first.year === last.year) return null
  const annualChange = (last.value - first.value) / (last.year - first.year)
  return Number((first.value - annualChange * (first.year - startYear)).toFixed(2))
}

function smoothedLinearEstimate(rows: Row[], field: string, baseYear: number, windowYears = 10) {
  const baseValue = numberOrNull(rowForYear(rows, baseYear)?.[field])
  const windowStartYear = baseYear - windowYears
  const windowStartValue = numberOrNull(rowForYear(rows, windowStartYear)?.[field])
  const startYear = windowStartValue === null ? START_YEAR : windowStartYear
  const startValue = windowStartValue ?? numberOrNull(rowForYear(rows, START_YEAR)?.[field])
  return linearTrendEstimate(startValue, baseValue, startYear, baseYear)
}

function addMetric(rows: CsvRow[], input: {
  scenario: string
  scenarioLabel: string
  domain: string
  metric: string
  label: string
  unit: string
  value2010: number | null
  valueBase: number | null
  value2050: number | null
  dataType2010?: string
  dataTypeBase?: string
  dataType2050?: string
  sourceId: string
  note: string
}) {
  rows.push({
    scenario: input.scenario,
    scenario_label: input.scenarioLabel,
    domain: input.domain,
    metric: input.metric,
    label: input.label,
    unit: input.unit,
    year_2010: START_YEAR,
    base_year: null,
    target_year: TARGET_YEAR,
    value_2010: input.value2010,
    value_base: input.valueBase,
    value_2050: input.value2050,
    growth_2010_to_base_pct: cumulativeGrowth(input.valueBase, input.value2010),
    growth_2010_to_2050_pct: cumulativeGrowth(input.value2050, input.value2010),
    growth_base_to_2050_pct: cumulativeGrowth(input.value2050, input.valueBase),
    data_type_2010: input.dataType2010 ?? (input.value2010 === null ? 'missing' : 'observed'),
    data_type_base: input.dataTypeBase ?? (input.valueBase === null ? 'missing' : 'observed'),
    data_type_2050: input.dataType2050 ?? (input.value2050 === null ? 'missing' : 'estimated'),
    source_id: input.sourceId,
    note: input.note,
  })
}

function addCumulativePercentMetric(rows: CsvRow[], input: {
  scenario: string
  scenarioLabel: string
  domain: string
  metric: string
  label: string
  valueBase: number | null
  value2050: number | null
  dataTypeBase?: string
  dataType2050?: string
  sourceId: string
  note: string
}) {
  rows.push({
    scenario: input.scenario,
    scenario_label: input.scenarioLabel,
    domain: input.domain,
    metric: input.metric,
    label: input.label,
    unit: '%',
    year_2010: START_YEAR,
    base_year: null,
    target_year: TARGET_YEAR,
    value_2010: 0,
    value_base: input.valueBase,
    value_2050: input.value2050,
    growth_2010_to_base_pct: input.valueBase,
    growth_2010_to_2050_pct: input.value2050,
    growth_base_to_2050_pct: input.valueBase === null || input.value2050 === null ? null : Number((input.value2050 - input.valueBase).toFixed(2)),
    data_type_2010: 'observed',
    data_type_base: input.dataTypeBase ?? (input.valueBase === null ? 'missing' : 'observed'),
    data_type_2050: input.dataType2050 ?? (input.value2050 === null ? 'missing' : 'estimated'),
    source_id: input.sourceId,
    note: input.note,
  })
}

function addPressureMetric(rows: CsvRow[], input: {
  scenario: string
  scenarioLabel: string
  valueBase: number | null
  value2050: number | null
}) {
  rows.push({
    scenario: input.scenario,
    scenario_label: input.scenarioLabel,
    domain: 'Tension',
    metric: 'absorption_pressure',
    label: 'Tension d’absorption',
    unit: 'points',
    year_2010: START_YEAR,
    base_year: null,
    target_year: TARGET_YEAR,
    value_2010: 0,
    value_base: input.valueBase,
    value_2050: input.value2050,
    growth_2010_to_base_pct: input.valueBase,
    growth_2010_to_2050_pct: input.value2050,
    growth_base_to_2050_pct: input.valueBase === null || input.value2050 === null ? null : Number((input.value2050 - input.valueBase).toFixed(2)),
    data_type_2010: 'observed',
    data_type_base: input.valueBase === null ? 'missing' : 'estimated',
    data_type_2050: input.value2050 === null ? 'missing' : 'estimated',
    source_id: 'absorption_pressure_v1',
    note: 'Indice composite V1: effort d’absorption logement 35%, écoles 20%, santé 20%, transports 25%. Ce n’est pas une inflation, mais une tension relative aux capacités 2024.',
  })
}

export async function buildGrowthComparison() {
  const geDemography = await readCsv('data/normalized/ge_demography.csv')
  const geScenarios = await readCsv('data/generated/scenarios_ge.csv')
  const infrastructure = await readCsv('data/generated/infrastructure_needs_ge.csv')
  const housing = await readCsv('data/normalized/ge_housing.csv')
  const subsidizedHousing = await readCsv('data/normalized/ge_housing_subsidized.csv')
  const economy = await readCsv('data/normalized/ge_economy.csv')
  const education = await readCsv('data/normalized/ge_education.csv')
  const health = await readCsv('data/normalized/ge_health.csv')
  const socialSpending = await readCsv('data/normalized/ge_social_spending.csv')
  const transport = await readCsv('data/normalized/ge_transport.csv')
  const transportFinance = await readCsv('data/normalized/ge_public_transport_finance.csv')
  const assumptions = await readCsv('data/normalized/assumptions.csv')

  const baseYear = latestObservedYear(geScenarios)
  const demography2010 = rowForYear(geDemography, START_YEAR)
  const demographyBase = rowForYear(geDemography, baseYear)
  const population2010 = numberOrNull(demography2010?.population)
  const populationBase = numberOrNull(demographyBase?.population)
  const avgHouseholdSize = assumptionValue(assumptions, 'avg_household_size')
  const studentsPerClassAssumption = assumptionValue(assumptions, 'students_per_class')
  const doctorsPer1000Target = assumptionValue(assumptions, 'doctors_per_1000_target')
  const dailyTripsPerPerson = assumptionValue(assumptions, 'daily_trips_per_person')

  const scenarios = Array.from(new Set(geScenarios.map((row) => row.scenario))).filter((scenario) => scenario !== 'observed')
  const rows: CsvRow[] = []

  for (const scenario of scenarios) {
    const scenarioLabel = scenarioLabels[scenario] ?? scenario
    const scenario2050 = scenarioRow(geScenarios, TARGET_YEAR, scenario)
    const needs2050 = scenarioRow(infrastructure, TARGET_YEAR, scenario)
    const population2050 = numberOrNull(scenario2050?.population)

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Démographie',
      metric: 'population',
      label: 'Population résidante',
      unit: 'habitants',
      value2010: population2010,
      valueBase: populationBase,
      value2050: population2050,
      sourceId: 'ocstat_geneva_population',
      note: 'Population observée puis scénario 2050.',
    })

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Démographie',
      metric: 'annual_growth',
      label: 'Croissance annuelle',
      unit: 'habitants/an',
      value2010: numberOrNull(demography2010?.total_growth),
      valueBase: numberOrNull(demographyBase?.total_growth),
      value2050: numberOrNull(scenario2050?.annual_growth),
      sourceId: 'ocstat_geneva_population',
      note: 'Variation annuelle observée; 2050 correspond à la croissance annuelle du scénario.',
    })

    addCumulativePercentMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Démographie',
      metric: 'population_growth_cumulative',
      label: 'Croissance cumulée population',
      valueBase: cumulativeGrowth(populationBase, population2010),
      value2050: cumulativeGrowth(population2050, population2010),
      sourceId: 'ocstat_geneva_population',
      note: 'Croissance réelle cumulée depuis 2010: 2010 = 0 %, base observée puis projection 2050 selon le scénario.',
    })

    const economy2010 = rowForYear(economy, START_YEAR)
    const economyBase = rowForYear(economy, baseYear)
    const gdp2010 = numberOrNull(economy2010?.gdp_million_chf)
    const gdpBase = numberOrNull(economyBase?.gdp_million_chf)
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Économie',
      metric: 'gdp',
      label: 'PIB cantonal',
      unit: 'M CHF',
      value2010: gdp2010,
      valueBase: gdpBase,
      value2050: cagrEstimate(gdp2010, gdpBase, START_YEAR, baseYear),
      dataType2050: gdp2010 === null || gdpBase === null ? 'missing' : 'estimated',
      sourceId: 'bfs_ocstat_geneva_gdp',
      note: 'PIB cantonal; 2050 estimé par CAGR 2010-base si la série est fournie.',
    })

    const housing2010 = rowForYear(housing, START_YEAR)
    const housingBase = rowForYear(housing, baseYear)
    const observedHousing2010 = numberOrNull(housing2010?.housing_stock)
    const housing2010Stock = observedHousing2010 ?? linearBackcast(housing, 'housing_stock', START_YEAR, baseYear)
    const housingBaseStock = numberOrNull(housingBase?.housing_stock)
    const additionalHousing = numberOrNull(needs2050?.required_housing_units)
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Logement',
      metric: 'housing_stock',
      label: 'Logements totaux',
      unit: 'logements',
      value2010: housing2010Stock,
      valueBase: housingBaseStock,
      value2050: housingBaseStock === null || additionalHousing === null ? null : housingBaseStock + additionalHousing,
      dataType2010: observedHousing2010 === null && housing2010Stock !== null ? 'estimated' : undefined,
      dataType2050: housingBaseStock === null || additionalHousing === null ? 'missing' : 'estimated',
      sourceId: 'ocstat_geneva_housing',
      note: observedHousing2010 === null && housing2010Stock !== null
        ? 'Stock observé depuis la première année disponible; 2010 est une estimation extrapolée linéairement pour afficher la croissance cumulée, 2050 = stock base + besoin additionnel du scénario.'
        : 'Stock observé; 2050 = stock base + besoin additionnel du scénario.',
    })

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Logement',
      metric: 'subsidized_housing',
      label: 'Logements subventionnés',
      unit: 'logements',
      value2010: numberOrNull(rowForYear(subsidizedHousing, START_YEAR)?.subsidized_total),
      valueBase: numberOrNull(rowForYear(subsidizedHousing, baseYear)?.subsidized_total),
      value2050: null,
      dataType2050: 'missing',
      sourceId: 'ocstat_geneva_housing_subsidized',
      note: 'Série observée sans projection politique 2050.',
    })

    const education2010 = rowForYear(education, START_YEAR)
    const educationBase = rowForYear(education, baseYear)
    const students2010 = numberOrNull(education2010?.students_total) ?? numberOrNull(education2010?.students_public_subsidized)
    const studentsBase = numberOrNull(educationBase?.students_total) ?? numberOrNull(educationBase?.students_public_subsidized)
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Écoles',
      metric: 'students',
      label: 'Élèves et étudiants',
      unit: 'personnes',
      value2010: students2010,
      valueBase: studentsBase,
      value2050: students2010 === null || studentsBase === null ? null : cagrEstimate(students2010, studentsBase, START_YEAR, baseYear),
      dataType2050: students2010 === null || studentsBase === null ? 'missing' : 'estimated',
      sourceId: 'ge_education_annuary',
      note: 'Effectifs scolaires; 2050 estimé par tendance si la série est fournie.',
    })

    const classesBase = numberOrNull(educationBase?.school_classes)
    const requiredClasses = numberOrNull(needs2050?.required_classes)
    const classes2010 = numberOrNull(education2010?.school_classes)
    const classes2010Estimated = String(education2010?.source_id ?? '').includes('bfs_class_size_estimated_classes')
    const classesBaseEstimated = String(educationBase?.source_id ?? '').includes('bfs_class_size_estimated_classes')
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Écoles',
      metric: 'school_classes',
      label: 'Classes scolaires',
      unit: 'classes',
      value2010: classes2010,
      valueBase: classesBase,
      value2050: classesBase === null || requiredClasses === null ? null : classesBase + requiredClasses,
      dataType2010: classes2010 === null ? 'missing' : classes2010Estimated ? 'estimated' : 'observed',
      dataTypeBase: classesBase === null ? 'missing' : classesBaseEstimated ? 'estimated' : 'observed',
      dataType2050: classesBase === null || requiredClasses === null ? 'missing' : 'estimated',
      sourceId: 'ge_education_annuary',
      note: classesBaseEstimated
        ? 'Classes équivalentes estimées depuis les effectifs et la taille moyenne OFS; 2050 = base estimée + besoin additionnel.'
        : 'Classes observées; 2050 = classes base + besoin additionnel si le stock existe.',
    })

    const health2010 = rowForYear(health, START_YEAR)
    const healthBase = rowForYear(health, baseYear)
    const doctorsBase = numberOrNull(healthBase?.physicians)
    const bedsBase = numberOrNull(healthBase?.total_hospital_beds)
    const transport2010 = rowForYear(transport, START_YEAR)
    const transportBase = rowForYear(transport, baseYear)
    const tpgPassengers2010 = numberOrNull(transport2010?.tpg_passengers)
    const tpgPassengersBase = numberOrNull(transportBase?.tpg_passengers)
    const additionalPopulationBase = populationBase === null || population2010 === null ? null : populationBase - population2010
    const requiredHousingBase = avgHouseholdSize === null || additionalPopulationBase === null ? null : additionalPopulationBase / avgHouseholdSize
    const requiredClassesBase = studentsBase === null || students2010 === null
      ? null
      : (studentsBase - students2010) / (numberOrNull(educationBase?.students_per_class) ?? studentsPerClassAssumption ?? 21)
    const theoreticalDoctorsBase = populationBase === null || doctorsPer1000Target === null ? null : populationBase * doctorsPer1000Target / 1000
    const requiredDoctorsBase = additionalPopulationBase === null || doctorsPer1000Target === null ? null : additionalPopulationBase * doctorsPer1000Target / 1000
    const tpgDailyBase = tpgPassengersBase === null ? null : tpgPassengersBase / 365
    const requiredDailyTripsBase = additionalPopulationBase === null || dailyTripsPerPerson === null ? null : additionalPopulationBase * dailyTripsPerPerson

    const pressureBase = weightedPressure([
      { value: ratioPct(requiredHousingBase, housingBaseStock), weight: pressureWeights.housing },
      { value: ratioPct(requiredClassesBase, classesBase), weight: pressureWeights.schools },
      { value: ratioPct(requiredDoctorsBase, theoreticalDoctorsBase), weight: pressureWeights.health },
      { value: ratioPct(requiredDailyTripsBase, tpgDailyBase), weight: pressureWeights.transport },
    ])
    const pressureScenario = weightedPressure([
      { value: ratioPct(additionalHousing, housingBaseStock), weight: pressureWeights.housing },
      { value: ratioPct(requiredClasses, classesBase), weight: pressureWeights.schools },
      { value: ratioPct(numberOrNull(needs2050?.required_doctors), theoreticalDoctorsBase), weight: pressureWeights.health },
      { value: ratioPct(numberOrNull(needs2050?.required_daily_transit_trips), tpgDailyBase), weight: pressureWeights.transport },
    ])
    addPressureMetric(rows, {
      scenario,
      scenarioLabel,
      valueBase: pressureBase,
      value2050: pressureBase === null || pressureScenario === null ? null : Number((pressureBase + pressureScenario).toFixed(2)),
    })

    const social2010 = rowForYear(socialSpending, START_YEAR)
    const socialBase = rowForYear(socialSpending, baseYear)
    const socialRawSourceId = String(socialBase?.source_id ?? social2010?.source_id ?? 'ocstat_geneva_social_assistance')
    const socialSourceId = socialRawSourceId.includes('bfs_fibs_social_assistance_ch')
      ? 'bfs_fibs_social_assistance_ch'
      : socialRawSourceId.includes('bfs_fibs_social_assistance_ge')
        ? 'bfs_fibs_social_assistance_ge'
        : 'ocstat_geneva_social_assistance'
    const socialIsSwissProxy = socialSourceId.includes('bfs_fibs_social_assistance_ch')
    const socialValue2010 = numberOrNull(social2010?.social_assistance_million_chf)
    const socialValueBase = numberOrNull(socialBase?.social_assistance_million_chf)
    const socialTrend2050 = cagrEstimate(socialValue2010, socialValueBase, START_YEAR, baseYear)
    const socialAdjusted2050 = applyPressureUplift(socialTrend2050, pressureScenario)
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Aide sociale',
      metric: 'social_assistance_spending',
      label: socialIsSwissProxy ? 'Aide sociale économique (Suisse)' : 'Dépenses d’aide sociale',
      unit: 'M CHF',
      value2010: socialValue2010,
      valueBase: socialValueBase,
      value2050: socialAdjusted2050,
      dataType2010: socialIsSwissProxy && socialValue2010 !== null ? 'official_proxy' : undefined,
      dataTypeBase: socialIsSwissProxy && socialValueBase !== null ? 'official_proxy' : undefined,
      dataType2050: socialAdjusted2050 === null ? 'missing' : 'estimated',
      sourceId: socialSourceId,
      note: socialIsSwissProxy
        ? 'Dépenses nettes d’aide sociale économique OFS FIBS Suisse; proxy de croissance en attente de l’export cantonal Genève. 2050 = tendance coût majorée par la tension d’absorption du scénario.'
        : 'Dépenses nettes d’aide sociale économique; 2050 = tendance coût majorée par la tension d’absorption du scénario.',
    })

    const healthSubsidy2010 = numberOrNull(social2010?.health_premium_subsidy_cantonal_million_chf)
    const healthSubsidyBase = numberOrNull(socialBase?.health_premium_subsidy_cantonal_million_chf)
    const healthSubsidyTrend2050 = smoothedLinearEstimate(socialSpending, 'health_premium_subsidy_cantonal_million_chf', baseYear, 10)
    const healthSubsidyAdjusted2050 = applyPressureUplift(healthSubsidyTrend2050, pressureScenario)
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Aide santé',
      metric: 'health_premium_subsidy_cantonal',
      label: 'Subsides maladie cantonaux',
      unit: 'M CHF',
      value2010: healthSubsidy2010,
      valueBase: healthSubsidyBase,
      value2050: healthSubsidyAdjusted2050,
      dataType2010: healthSubsidy2010 === null ? 'missing' : 'observed',
      dataTypeBase: healthSubsidyBase === null ? 'missing' : 'observed',
      dataType2050: healthSubsidyAdjusted2050 === null ? 'missing' : 'estimated',
      sourceId: 'ofsp_health_premium_subsidies;rts_geneva_health_subsidy_reform_2020',
      note: 'Part cantonale des réductions de primes LAMal; rupture de régime 2020 documentée, 2050 = lissage linéaire 10 ans majoré par la tension d’absorption du scénario.',
    })

    const healthCost2010 = numberOrNull(health2010?.health_cost_per_insured)
    const healthCostBase = numberOrNull(healthBase?.health_cost_per_insured)
    const healthCostTrend2050 = cagrEstimate(healthCost2010, healthCostBase, START_YEAR, baseYear)
    const healthCostAdjusted2050 = applyPressureUplift(healthCostTrend2050, pressureScenario)
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Santé',
      metric: 'health_cost_per_insured',
      label: 'Coût santé par assuré',
      unit: 'CHF/an',
      value2010: healthCost2010,
      valueBase: healthCostBase,
      value2050: healthCostAdjusted2050,
      dataType2050: healthCostAdjusted2050 === null ? 'missing' : 'estimated',
      sourceId: 'ofsp_dashboard_health_insurance',
      note: 'Coûts annuels par assuré; 2050 = tendance coût majorée par la tension d’absorption du scénario.',
    })

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Santé',
      metric: 'physicians',
      label: 'Médecins',
      unit: 'médecins',
      value2010: numberOrNull(health2010?.physicians),
      valueBase: doctorsBase,
      value2050: doctorsBase === null ? null : doctorsBase + (numberOrNull(needs2050?.required_doctors) ?? 0),
      dataType2050: doctorsBase === null ? 'missing' : 'estimated',
      sourceId: 'ocstat_geneva_health_system',
      note: 'Série médecins historique lacunaire; ne pas confondre avec le besoin additionnel.',
    })

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Santé',
      metric: 'hospital_beds',
      label: 'Lits hospitaliers',
      unit: 'lits',
      value2010: numberOrNull(health2010?.total_hospital_beds),
      valueBase: bedsBase,
      value2050: bedsBase === null ? null : bedsBase + (numberOrNull(needs2050?.required_hospital_beds) ?? 0),
      dataType2050: bedsBase === null ? 'missing' : 'estimated',
      sourceId: 'ocstat_geneva_health_system',
      note: 'Lits observés; 2050 = stock base + besoin additionnel si le stock existe.',
    })

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Transports publics',
      metric: 'tpg_passengers',
      label: 'Fréquentation TPG',
      unit: 'voyageurs/an',
      value2010: tpgPassengers2010,
      valueBase: tpgPassengersBase,
      value2050: cagrEstimate(tpgPassengers2010, tpgPassengersBase, START_YEAR, baseYear),
      dataType2050: tpgPassengers2010 === null || tpgPassengersBase === null ? 'missing' : 'estimated',
      sourceId: 'ocstat_geneva_transport',
      note: 'Fréquentation annuelle; 2050 estimé par tendance si la série est complète.',
    })

    const finance2010 = rowForYear(transportFinance, START_YEAR)
    const financeBase = rowForYear(transportFinance, baseYear)
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Transports publics',
      metric: 'transport_revenue',
      label: 'Revenus des transports TPG',
      unit: 'M CHF',
      value2010: numberOrNull(finance2010?.transport_revenue_million_chf),
      valueBase: numberOrNull(financeBase?.transport_revenue_million_chf),
      value2050: cagrEstimate(numberOrNull(finance2010?.transport_revenue_million_chf), numberOrNull(financeBase?.transport_revenue_million_chf), START_YEAR, baseYear),
      dataType2050: numberOrNull(finance2010?.transport_revenue_million_chf) === null || numberOrNull(financeBase?.transport_revenue_million_chf) === null ? 'missing' : 'estimated',
      sourceId: 'tpg_annual_reports_finance',
      note: 'Revenus des transports selon comptes de résultat TPG; 2050 estimé par tendance.',
    })

    const operatingSubsidy2010 = numberOrNull(finance2010?.operating_subsidy_million_chf)
    const operatingSubsidyBase = numberOrNull(financeBase?.operating_subsidy_million_chf)
    const operatingSubsidyTrend2050 = cagrEstimate(operatingSubsidy2010, operatingSubsidyBase, START_YEAR, baseYear)
    const operatingSubsidyAdjusted2050 = applyPressureUplift(operatingSubsidyTrend2050, pressureScenario)
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Transports publics',
      metric: 'operating_subsidy',
      label: 'Subvention / indemnité TPG',
      unit: 'M CHF',
      value2010: operatingSubsidy2010,
      valueBase: operatingSubsidyBase,
      value2050: operatingSubsidyAdjusted2050,
      dataType2050: operatingSubsidyAdjusted2050 === null ? 'missing' : 'estimated',
      sourceId: 'tpg_annual_reports_finance',
      note: 'Indemnité/subvention d’exploitation; 2050 = tendance coût majorée par la tension d’absorption du scénario.',
    })

    const operatingExpenses2010 = numberOrNull(finance2010?.operating_expenses_million_chf)
    const operatingExpensesBase = numberOrNull(financeBase?.operating_expenses_million_chf)
    const operatingExpensesTrend2050 = cagrEstimate(operatingExpenses2010, operatingExpensesBase, START_YEAR, baseYear)
    const operatingExpensesAdjusted2050 = applyPressureUplift(operatingExpensesTrend2050, pressureScenario)
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Transports publics',
      metric: 'operating_expenses',
      label: 'Charges d’exploitation TPG',
      unit: 'M CHF',
      value2010: operatingExpenses2010,
      valueBase: operatingExpensesBase,
      value2050: operatingExpensesAdjusted2050,
      dataType2050: operatingExpensesAdjusted2050 === null ? 'missing' : 'estimated',
      sourceId: 'tpg_annual_reports_finance',
      note: 'Charges d’exploitation selon comptes de résultat TPG; 2050 = tendance coût majorée par la tension d’absorption du scénario.',
    })
  }

  for (const row of rows) row.base_year = baseYear
  await writeCsv('data/generated/growth_comparison_ge.csv', rows)
  return rows
}

