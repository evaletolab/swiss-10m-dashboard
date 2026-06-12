import { numberOrNull, readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'

const START_YEAR = 2010
const BASE_YEAR = 2024
const TARGET_YEAR = 2050

const scenarioLabels: Record<string, string> = {
  linear_trend_2000_base_year: 'Tendance linéaire',
  cagr_trend_2000_base_year: 'Tendance CAGR',
  recent_trend_2015_base_year: 'Tendance récente',
  initiative_linear: 'Scénario initiative',
}

const projectedScenarios = Object.keys(scenarioLabels)

const columns = [
  'year',
  'scenario',
  'scenario_label',
  'total_state_budget_million_chf',
  'health_premium_subsidy_cantonal_million_chf',
  'transport_operating_subsidy_million_chf',
  'housing_aid_subsidies_million_chf',
  'social_assistance_geneva_million_chf',
  'other_state_budget_million_chf',
  'cohesion_sociale_million_chf',
  'formation_million_chf',
  'sante_million_chf',
  'mobilite_million_chf',
  'securite_population_million_chf',
  'justice_million_chf',
  'amenagement_logement_million_chf',
  'environnement_energie_million_chf',
  'etats_majors_transversal_million_chf',
  'impots_finances_million_chf',
  'culture_sport_loisirs_million_chf',
  'economie_emploi_million_chf',
  'data_type',
  'source_id',
  'source_note',
]

type Row = Record<string, string>

function rowForYear(rows: Row[], year: number) {
  return rows.find((row) => Number(row.year) === year)
}

function genevaSocialAssistance(rows: Row[], year: number) {
  return rows
    .map((row) => ({ year: Number(row.year), value: numberOrNull(row.social_assistance_million_chf), sourceId: String(row.source_id ?? '') }))
    .filter((row): row is { year: number, value: number, sourceId: string } =>
      Number.isFinite(row.year)
      && row.year <= year
      && row.value !== null
      && !row.sourceId.includes('bfs_fibs_social_assistance_ch'))
    .sort((a, b) => b.year - a.year)[0] ?? null
}

function cagrEstimate(startValue: number | null, endValue: number | null, startYear: number, endYear: number, targetYear = TARGET_YEAR) {
  if (startValue === null || endValue === null || startValue <= 0 || endValue <= 0 || endYear <= startYear) return null
  const rate = Math.pow(endValue / startValue, 1 / (endYear - startYear)) - 1
  return Number((endValue * Math.pow(1 + rate, targetYear - endYear)).toFixed(2))
}

function applyPressureUplift(value: number | null, upliftPct: number | null) {
  if (value === null || upliftPct === null) return value
  return Number((value * (1 + upliftPct / 100)).toFixed(2))
}

function pressureDeltaByScenario(rows: Row[], scenario: string) {
  return numberOrNull(rows.find((row) => row.scenario === scenario && row.metric === 'absorption_pressure')?.growth_base_to_2050_pct)
}

function firstLastValues(rows: Row[], field: string) {
  const values = rows
    .map((row) => ({ year: Number(row.year), value: numberOrNull(row[field]) }))
    .filter((row): row is { year: number, value: number } => Number.isFinite(row.year) && row.year <= BASE_YEAR && row.value !== null)
    .sort((a, b) => a.year - b.year)
  return { first: values[0] ?? null, last: values.at(-1) ?? null }
}

function estimate2050(rows: Row[], field: string, upliftPct: number | null) {
  const { first, last } = firstLastValues(rows, field)
  const trend = cagrEstimate(first?.value ?? null, last?.value ?? null, first?.year ?? START_YEAR, last?.year ?? BASE_YEAR)
  return applyPressureUplift(trend, upliftPct)
}

function totalKnown(row: CsvRow) {
  return [
    'health_premium_subsidy_cantonal_million_chf',
    'transport_operating_subsidy_million_chf',
    'housing_aid_subsidies_million_chf',
    'social_assistance_geneva_million_chf',
    'cohesion_sociale_million_chf',
    'formation_million_chf',
    'sante_million_chf',
    'mobilite_million_chf',
    'securite_population_million_chf',
    'justice_million_chf',
    'amenagement_logement_million_chf',
    'environnement_energie_million_chf',
    'etats_majors_transversal_million_chf',
    'impots_finances_million_chf',
    'culture_sport_loisirs_million_chf',
    'economie_emploi_million_chf',
  ].reduce((sum, field) => sum + (numberOrNull(row[field]) ?? 0), 0)
}

function withOtherStateBudget(row: CsvRow) {
  const total = numberOrNull(row.total_state_budget_million_chf)
  return {
    ...row,
    other_state_budget_million_chf: total === null ? null : Math.max(Number((total - totalKnown(row)).toFixed(2)), 0),
  }
}

function historicalRow(input: {
  year: number
  stateBudget: Row | undefined
  socialRows: Row[]
  transportRows: Row[]
}) {
  const social = rowForYear(input.socialRows, input.year)
  const transport = rowForYear(input.transportRows, input.year)
  const socialAssistance = genevaSocialAssistance(input.socialRows, input.year)
  const row = withOtherStateBudget({
    year: input.year,
    scenario: 'observed',
    scenario_label: 'Observé',
    total_state_budget_million_chf: numberOrNull(input.stateBudget?.total_charges_million_chf),
    health_premium_subsidy_cantonal_million_chf: numberOrNull(social?.health_premium_subsidy_cantonal_million_chf),
    transport_operating_subsidy_million_chf: numberOrNull(transport?.operating_subsidy_million_chf),
    housing_aid_subsidies_million_chf: numberOrNull(social?.housing_aid_subsidies_million_chf),
    social_assistance_geneva_million_chf: socialAssistance?.year === input.year ? socialAssistance.value : null,
    cohesion_sociale_million_chf: numberOrNull(input.stateBudget?.cohesion_sociale_million_chf),
    formation_million_chf: numberOrNull(input.stateBudget?.formation_million_chf),
    sante_million_chf: numberOrNull(input.stateBudget?.sante_million_chf),
    mobilite_million_chf: numberOrNull(input.stateBudget?.mobilite_million_chf),
    securite_population_million_chf: numberOrNull(input.stateBudget?.securite_population_million_chf),
    justice_million_chf: numberOrNull(input.stateBudget?.justice_million_chf),
    amenagement_logement_million_chf: numberOrNull(input.stateBudget?.amenagement_logement_million_chf),
    environnement_energie_million_chf: numberOrNull(input.stateBudget?.environnement_energie_million_chf),
    etats_majors_transversal_million_chf: numberOrNull(input.stateBudget?.etats_majors_transversal_million_chf),
    impots_finances_million_chf: numberOrNull(input.stateBudget?.impots_finances_million_chf),
    culture_sport_loisirs_million_chf: numberOrNull(input.stateBudget?.culture_sport_loisirs_million_chf),
    economie_emploi_million_chf: numberOrNull(input.stateBudget?.economie_emploi_million_chf),
    data_type: input.stateBudget?.data_type ?? 'mixed_observed',
    source_id: [
      input.stateBudget?.source_id,
      social?.source_id,
      transport?.source_id,
    ].filter(Boolean).join(';'),
    source_note: 'Historique nominal. Les postes par politique publique sont affichés si un CSV manuel officiel est installé; sinon le reste du budget est agrégé dans “Autres postes”.',
  })
  return row
}

function projectionRows(input: {
  observedRows: CsvRow[]
  growthRows: Row[]
}) {
  const projectionInput = input.observedRows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])) as Row)
  return projectedScenarios.map((scenario) => {
    const upliftPct = pressureDeltaByScenario(input.growthRows, scenario)
    const row = withOtherStateBudget({
      year: TARGET_YEAR,
      scenario,
      scenario_label: scenarioLabels[scenario],
      total_state_budget_million_chf: estimate2050(projectionInput, 'total_state_budget_million_chf', upliftPct),
      health_premium_subsidy_cantonal_million_chf: estimate2050(projectionInput, 'health_premium_subsidy_cantonal_million_chf', upliftPct),
      transport_operating_subsidy_million_chf: estimate2050(projectionInput, 'transport_operating_subsidy_million_chf', upliftPct),
      housing_aid_subsidies_million_chf: estimate2050(projectionInput, 'housing_aid_subsidies_million_chf', upliftPct),
      social_assistance_geneva_million_chf: estimate2050(projectionInput, 'social_assistance_geneva_million_chf', upliftPct),
      cohesion_sociale_million_chf: estimate2050(projectionInput, 'cohesion_sociale_million_chf', upliftPct),
      formation_million_chf: estimate2050(projectionInput, 'formation_million_chf', upliftPct),
      sante_million_chf: estimate2050(projectionInput, 'sante_million_chf', upliftPct),
      mobilite_million_chf: estimate2050(projectionInput, 'mobilite_million_chf', upliftPct),
      securite_population_million_chf: estimate2050(projectionInput, 'securite_population_million_chf', upliftPct),
      justice_million_chf: estimate2050(projectionInput, 'justice_million_chf', upliftPct),
      amenagement_logement_million_chf: estimate2050(projectionInput, 'amenagement_logement_million_chf', upliftPct),
      environnement_energie_million_chf: estimate2050(projectionInput, 'environnement_energie_million_chf', upliftPct),
      etats_majors_transversal_million_chf: estimate2050(projectionInput, 'etats_majors_transversal_million_chf', upliftPct),
      impots_finances_million_chf: estimate2050(projectionInput, 'impots_finances_million_chf', upliftPct),
      culture_sport_loisirs_million_chf: estimate2050(projectionInput, 'culture_sport_loisirs_million_chf', upliftPct),
      economie_emploi_million_chf: estimate2050(projectionInput, 'economie_emploi_million_chf', upliftPct),
      data_type: 'estimated',
      source_id: 'geneva_state_budget_functioning_totals;absorption_pressure_v1',
      source_note: `Projection 2050 CAGR historique, ajustée par l’écart de tension d’absorption (${upliftPct ?? 0} pts) du scénario.`,
    })
    return row
  })
}

export async function buildStateBudgetProjection() {
  const stateBudgetRows = await readCsv('data/normalized/ge_state_budget_posts.csv')
  const socialRows = await readCsv('data/normalized/ge_social_spending.csv')
  const transportRows = await readCsv('data/normalized/ge_public_transport_finance.csv')
  const growthRows = await readCsv('data/generated/growth_comparison_ge.csv')
  const observedRows = Array.from({ length: BASE_YEAR - START_YEAR + 1 }, (_, index) => START_YEAR + index)
    .map((year) => historicalRow({
      year,
      stateBudget: rowForYear(stateBudgetRows, year),
      socialRows,
      transportRows,
    }))
  const rows = [...observedRows, ...projectionRows({ observedRows, growthRows })]
  await writeCsv('data/generated/state_budget_projection_ge.csv', rows, columns)
  return rows
}
