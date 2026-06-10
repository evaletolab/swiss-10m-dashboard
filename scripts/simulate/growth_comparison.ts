import { numberOrNull, readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'

const START_YEAR = 2010
const TARGET_YEAR = 2050

type Row = Record<string, string>

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

  const baseYear = latestObservedYear(geScenarios)
  const demography2010 = rowForYear(geDemography, START_YEAR)
  const demographyBase = rowForYear(geDemography, baseYear)
  const population2010 = numberOrNull(demography2010?.population)
  const populationBase = numberOrNull(demographyBase?.population)
  const population2009 = numberOrNull(rowForYear(geDemography, START_YEAR - 1)?.population)
  const populationPreviousBase = numberOrNull(rowForYear(geDemography, baseYear - 1)?.population)

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

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Démographie',
      metric: 'annual_growth_rate',
      label: 'Croissance relative annuelle',
      unit: '%',
      value2010: population2009 === null ? null : numberOrNull(demography2010?.total_growth) === null ? null : Number((numberOrNull(demography2010?.total_growth)! / population2009 * 100).toFixed(2)),
      valueBase: populationPreviousBase === null ? null : numberOrNull(demographyBase?.total_growth) === null ? null : Number((numberOrNull(demographyBase?.total_growth)! / populationPreviousBase * 100).toFixed(2)),
      value2050: population2050 === null ? null : numberOrNull(scenario2050?.annual_growth) === null ? null : Number((numberOrNull(scenario2050?.annual_growth)! / population2050 * 100).toFixed(2)),
      sourceId: 'ocstat_geneva_population',
      note: 'Croissance annuelle rapportée à la population de l’année précédente.',
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
        ? 'Stock observé depuis la première année disponible; 2010 rétropolé linéairement pour afficher la croissance cumulée, 2050 = stock base + besoin additionnel du scénario.'
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
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Écoles',
      metric: 'school_classes',
      label: 'Classes scolaires',
      unit: 'classes',
      value2010: numberOrNull(education2010?.school_classes),
      valueBase: classesBase,
      value2050: classesBase === null || requiredClasses === null ? null : classesBase + requiredClasses,
      dataType2050: classesBase === null || requiredClasses === null ? 'missing' : 'estimated',
      sourceId: 'ge_education_annuary',
      note: 'Classes observées; 2050 = classes base + besoin additionnel si le stock existe.',
    })

    const health2010 = rowForYear(health, START_YEAR)
    const healthBase = rowForYear(health, baseYear)
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
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Aide sociale',
      metric: 'social_assistance_spending',
      label: socialIsSwissProxy ? 'Aide sociale économique (Suisse)' : 'Dépenses d’aide sociale',
      unit: 'M CHF',
      value2010: socialValue2010,
      valueBase: socialValueBase,
      value2050: cagrEstimate(socialValue2010, socialValueBase, START_YEAR, baseYear),
      dataType2010: socialIsSwissProxy && socialValue2010 !== null ? 'official_proxy' : undefined,
      dataTypeBase: socialIsSwissProxy && socialValueBase !== null ? 'official_proxy' : undefined,
      dataType2050: socialValue2010 === null || socialValueBase === null ? 'missing' : 'estimated',
      sourceId: socialSourceId,
      note: socialIsSwissProxy
        ? 'Dépenses nettes d’aide sociale économique OFS FIBS Suisse; proxy de croissance en attente de l’export cantonal Genève.'
        : 'Dépenses nettes d’aide sociale économique; à compléter par fichier OCSTAT ou comptes de l’État.',
    })

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Aide santé',
      metric: 'health_premium_subsidy_cantonal',
      label: 'Subsides maladie cantonaux',
      unit: 'M CHF',
      value2010: numberOrNull(social2010?.health_premium_subsidy_cantonal_million_chf),
      valueBase: numberOrNull(socialBase?.health_premium_subsidy_cantonal_million_chf),
      value2050: cagrEstimate(numberOrNull(social2010?.health_premium_subsidy_cantonal_million_chf), numberOrNull(socialBase?.health_premium_subsidy_cantonal_million_chf), START_YEAR, baseYear),
      dataType2050: numberOrNull(social2010?.health_premium_subsidy_cantonal_million_chf) === null || numberOrNull(socialBase?.health_premium_subsidy_cantonal_million_chf) === null ? 'missing' : 'estimated',
      sourceId: 'ofsp_health_premium_subsidies',
      note: 'Part cantonale des réductions de primes LAMal; 2050 estimé par tendance 2010-base.',
    })

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Santé',
      metric: 'health_cost_per_insured',
      label: 'Coût santé par assuré',
      unit: 'CHF/an',
      value2010: numberOrNull(health2010?.health_cost_per_insured),
      valueBase: numberOrNull(healthBase?.health_cost_per_insured),
      value2050: cagrEstimate(numberOrNull(health2010?.health_cost_per_insured), numberOrNull(healthBase?.health_cost_per_insured), START_YEAR, baseYear),
      dataType2050: numberOrNull(health2010?.health_cost_per_insured) === null || numberOrNull(healthBase?.health_cost_per_insured) === null ? 'missing' : 'estimated',
      sourceId: 'ofsp_dashboard_health_insurance',
      note: 'Coûts annuels par assuré; 2050 estimé par tendance 2010-base.',
    })

    const doctorsBase = numberOrNull(healthBase?.physicians)
    const bedsBase = numberOrNull(healthBase?.total_hospital_beds)
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

    const transport2010 = rowForYear(transport, START_YEAR)
    const transportBase = rowForYear(transport, baseYear)
    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Transports publics',
      metric: 'tpg_passengers',
      label: 'Fréquentation TPG',
      unit: 'voyageurs/an',
      value2010: numberOrNull(transport2010?.tpg_passengers),
      valueBase: numberOrNull(transportBase?.tpg_passengers),
      value2050: cagrEstimate(numberOrNull(transport2010?.tpg_passengers), numberOrNull(transportBase?.tpg_passengers), START_YEAR, baseYear),
      dataType2050: numberOrNull(transport2010?.tpg_passengers) === null || numberOrNull(transportBase?.tpg_passengers) === null ? 'missing' : 'estimated',
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

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Transports publics',
      metric: 'operating_subsidy',
      label: 'Subvention / indemnité TPG',
      unit: 'M CHF',
      value2010: numberOrNull(finance2010?.operating_subsidy_million_chf),
      valueBase: numberOrNull(financeBase?.operating_subsidy_million_chf),
      value2050: cagrEstimate(numberOrNull(finance2010?.operating_subsidy_million_chf), numberOrNull(financeBase?.operating_subsidy_million_chf), START_YEAR, baseYear),
      dataType2050: numberOrNull(finance2010?.operating_subsidy_million_chf) === null || numberOrNull(financeBase?.operating_subsidy_million_chf) === null ? 'missing' : 'estimated',
      sourceId: 'tpg_annual_reports_finance',
      note: 'Indemnité/subvention d’exploitation; 2050 estimé par tendance si la série est fournie.',
    })

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Transports publics',
      metric: 'operating_expenses',
      label: 'Charges d’exploitation TPG',
      unit: 'M CHF',
      value2010: numberOrNull(finance2010?.operating_expenses_million_chf),
      valueBase: numberOrNull(financeBase?.operating_expenses_million_chf),
      value2050: cagrEstimate(numberOrNull(finance2010?.operating_expenses_million_chf), numberOrNull(financeBase?.operating_expenses_million_chf), START_YEAR, baseYear),
      dataType2050: numberOrNull(finance2010?.operating_expenses_million_chf) === null || numberOrNull(financeBase?.operating_expenses_million_chf) === null ? 'missing' : 'estimated',
      sourceId: 'tpg_annual_reports_finance',
      note: 'Charges d’exploitation selon comptes de résultat TPG; 2050 estimé par tendance.',
    })

    addMetric(rows, {
      scenario,
      scenarioLabel,
      domain: 'Transports publics',
      metric: 'adult_annual_subscription',
      label: 'Abonnement annuel adulte',
      unit: 'CHF',
      value2010: numberOrNull(finance2010?.adult_annual_subscription_chf),
      valueBase: numberOrNull(financeBase?.adult_annual_subscription_chf),
      value2050: cagrEstimate(numberOrNull(finance2010?.adult_annual_subscription_chf), numberOrNull(financeBase?.adult_annual_subscription_chf), START_YEAR, baseYear),
      dataType2050: numberOrNull(finance2010?.adult_annual_subscription_chf) === null || numberOrNull(financeBase?.adult_annual_subscription_chf) === null ? 'missing' : 'estimated',
      sourceId: 'tpg_annual_reports_finance',
      note: 'Proxy prix usager: abonnement annuel adulte Tout Genève/zone 10.',
    })
  }

  for (const row of rows) row.base_year = baseYear
  await writeCsv('data/generated/growth_comparison_ge.csv', rows)
  return rows
}

