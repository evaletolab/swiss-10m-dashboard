import { Area, AreaChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../lib/colors'
import { formatNumber, toNumber } from '../lib/format'
import type { NullableNumber, ScenarioName } from '../lib/types'

type StateBudgetProjectionRow = {
  year: NullableNumber
  scenario: string
  scenario_label: string
  total_state_budget_million_chf?: NullableNumber
  health_premium_subsidy_cantonal_million_chf?: NullableNumber
  transport_operating_subsidy_million_chf?: NullableNumber
  housing_aid_subsidies_million_chf?: NullableNumber
  social_assistance_geneva_million_chf?: NullableNumber
  other_state_budget_million_chf?: NullableNumber
  cohesion_sociale_million_chf?: NullableNumber
  formation_million_chf?: NullableNumber
  sante_million_chf?: NullableNumber
  mobilite_million_chf?: NullableNumber
  securite_population_million_chf?: NullableNumber
  justice_million_chf?: NullableNumber
  amenagement_logement_million_chf?: NullableNumber
  environnement_energie_million_chf?: NullableNumber
  etats_majors_transversal_million_chf?: NullableNumber
  impots_finances_million_chf?: NullableNumber
  culture_sport_loisirs_million_chf?: NullableNumber
  economie_emploi_million_chf?: NullableNumber
  data_type?: string
}

type Props = {
  rows: StateBudgetProjectionRow[]
  scenario: ScenarioName
}

type Component = {
  key: string
  label: string
  color: string
}

const aidComponents: Component[] = [
  { key: 'health_premium_subsidy_cantonal_million_chf', label: 'Subsides maladie cantonaux', color: colors.health },
  { key: 'transport_operating_subsidy_million_chf', label: 'Subvention exploitation TPG', color: colors.transport },
  { key: 'housing_aid_subsidies_million_chf', label: 'Subventions logement', color: colors.housing },
  { key: 'social_assistance_geneva_million_chf', label: 'Aide sociale Genève', color: colors.cagr },
  { key: 'other_state_budget_million_chf', label: 'Autres postes État', color: '#cbd5e1' },
]

const policyComponents: Component[] = [
  { key: 'cohesion_sociale_million_chf', label: 'Cohésion sociale', color: '#be123c' },
  { key: 'formation_million_chf', label: 'Formation', color: '#1d4ed8' },
  { key: 'sante_million_chf', label: 'Santé', color: '#dc2626' },
  { key: 'mobilite_million_chf', label: 'Mobilité', color: '#7c3aed' },
  { key: 'securite_population_million_chf', label: 'Sécurité et population', color: '#0f766e' },
  { key: 'justice_million_chf', label: 'Justice', color: '#475569' },
  { key: 'amenagement_logement_million_chf', label: 'Aménagement et logement', color: '#0d9488' },
  { key: 'environnement_energie_million_chf', label: 'Environnement et énergie', color: '#16a34a' },
  { key: 'etats_majors_transversal_million_chf', label: 'Prestations transversales', color: '#f97316' },
  { key: 'impots_finances_million_chf', label: 'Impôts et finances', color: '#64748b' },
  { key: 'culture_sport_loisirs_million_chf', label: 'Culture, sport et loisirs', color: '#db2777' },
  { key: 'economie_emploi_million_chf', label: 'Économie et emploi', color: '#ca8a04' },
  { key: 'other_state_budget_million_chf', label: 'Autres / non ventilé', color: '#cbd5e1' },
]

function rowValue(row: StateBudgetProjectionRow, key: string) {
  return toNumber(row[key as keyof StateBudgetProjectionRow])
}

function hasAnyValue(rows: StateBudgetProjectionRow[], components: Component[]) {
  return rows.some((row) => components.some((component) => {
    if (component.key === 'other_state_budget_million_chf') return false
    return rowValue(row, component.key) !== null
  }))
}

function rowTotal(row: StateBudgetProjectionRow, components: Component[]) {
  return components.reduce((sum, component) => sum + (rowValue(row, component.key) ?? 0), 0)
}

export function DirectPublicAidBudgetChart({ rows, scenario }: Props) {
  const visibleRows = rows
    .filter((row) => row.scenario === 'observed' || (row.scenario === scenario && Number(row.year) === 2050))
    .filter((row) => toNumber(row.total_state_budget_million_chf) !== null || Number(row.year) === 2050)
    .map((row) => ({ ...row, year: Number(row.year) }))
  const hasPolicyBreakdown = hasAnyValue(visibleRows, policyComponents)
  const components = hasPolicyBreakdown ? policyComponents : aidComponents
  const chartData = visibleRows.map((row) => Object.fromEntries([
    ['year', row.year],
    ['total_state_budget_million_chf', toNumber(row.total_state_budget_million_chf)],
    ...components.map((component) => [component.key, rowValue(row, component.key)]),
  ]))
  const observedRows = visibleRows.filter((row) => row.scenario === 'observed')
  const latestObserved = observedRows.at(-1)
  const projection = visibleRows.find((row) => row.scenario === scenario && Number(row.year) === 2050)
  const latestObservedTotal = latestObserved ? toNumber(latestObserved.total_state_budget_million_chf) : null
  const projectionTotal = projection ? toNumber(projection.total_state_budget_million_chf) : null

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" ticks={[2010, 2015, 2020, 2024, 2050]} />
              <YAxis tickFormatter={(value) => `${Number(value / 1000).toFixed(0)} Md`} width={58} />
              <Tooltip formatter={(value, name) => [`${formatNumber(Number(value), 1)} M CHF`, String(name)]} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, lineHeight: '18px', paddingTop: 10 }} />
              {components.map((item) => (
                <Area
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.label}
                  stackId="budget"
                  stroke={item.color}
                  fill={item.color}
                  fillOpacity={item.key === 'other_state_budget_million_chf' ? 0.35 : 0.75}
                  connectNulls={false}
                />
              ))}
              <ReferenceLine x={2050} stroke={colors.pressure} strokeDasharray="4 4" label="Projection 2050" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lecture</p>
          <p className="mt-3 leading-6">
            Le stack montre les charges de fonctionnement nominales de l’État. Le point 2050 est une projection du scénario sélectionné, ajustée par le facteur de tension d’absorption calculé plus haut.
          </p>
          <p className="mt-3 leading-6">
            {hasPolicyBreakdown
              ? 'La ventilation par politiques publiques est active.'
              : 'La ventilation historique complète par politiques publiques manque encore: les postes observés sont donc agrégés dans “Autres postes État”.'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dernier observé</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{latestObserved?.year ?? 'n/a'}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{formatNumber(latestObservedTotal, 1)} M</p>
          <p className="mt-2 text-sm text-slate-600">Charges de fonctionnement hors imputations internes et subventions à redistribuer.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Projection</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">2050</p>
          <p className="mt-1 text-2xl font-semibold text-orange-600">{formatNumber(projectionTotal, 1)} M</p>
          <p className="mt-2 text-sm text-slate-600">Projection nominale CAGR + delta de tension du scénario.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Postes affichés</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{hasPolicyBreakdown ? 'Politiques publiques' : 'Aides + solde'}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{formatNumber(latestObserved ? rowTotal(latestObserved, components) : null, 1)} M</p>
          <p className="mt-2 text-sm text-slate-600">Total visible dans le stack pour le dernier point observé.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <strong>Limite de donnée:</strong> le code accepte déjà les postes par politique publique de 2010 à 2024, mais le CSV officiel complet n’est pas encore installé. Tant qu’il manque, le graphique garde un agrégat “Autres postes État” pour éviter une fausse précision.
      </div>
    </div>
  )
}
