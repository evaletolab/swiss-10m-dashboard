import { formatGridValue } from '../lib/series'
import { toNumber } from '../lib/format'
import type { GrowthComparisonRow, ScenarioName } from '../lib/types'

const primaryMetrics = new Set([
  'population',
  'annual_growth',
  'annual_growth_rate',
  'gdp',
  'housing_stock',
  'subsidized_housing',
  'students',
  'school_classes',
  'physicians',
  'hospital_beds',
  'social_assistance_spending',
  'health_premium_subsidy_cantonal',
  'tpg_passengers',
  'transport_revenue',
  'operating_subsidy',
  'operating_expenses',
])

const statusLabels: Record<string, string> = {
  observed: 'observé',
  official_proxy: 'proxy officiel',
  estimated: 'estimé',
  assumption: 'hypothèse',
  missing: 'manquant',
}

function annualizedGrowthLabel(totalGrowthPct: number | null, startYear: number, endYear: number) {
  if (totalGrowthPct === null || endYear <= startYear) return 'donnée manquante'
  const annualGrowth = (Math.pow(1 + totalGrowthPct / 100, 1 / (endYear - startYear)) - 1) * 100
  return `${annualGrowth.toFixed(1)} %/an`
}

type Props = {
  baseYear: number
  targetYear: number
  scenario: ScenarioName
  rows: GrowthComparisonRow[]
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      {statusLabels[value] ?? value}
    </span>
  )
}

function ValueCell({ value, unit, status }: { value: GrowthComparisonRow['value_2010']; unit: string; status: string }) {
  return (
    <td className="px-4 py-3 text-slate-700">
      <div>{formatGridValue(value, unit)}</div>
      <StatusBadge value={status} />
    </td>
  )
}

export function ComparisonGrid({ baseYear, targetYear, scenario, rows }: Props) {
  const selectedRows = rows
    .filter((row) => row.scenario === scenario && primaryMetrics.has(row.metric))
    .sort((a, b) => `${a.domain}-${a.metric}`.localeCompare(`${b.domain}-${b.metric}`))
  const scenarioLabel = selectedRows[0]?.scenario_label ?? 'scénario'
  const weightedGrowth = toNumber(rows.find((row) => row.scenario === scenario && row.metric === 'absorption_pressure')?.growth_2010_to_2050_pct)
  const weightedGrowthLabel = weightedGrowth === null ? 'donnée manquante' : `${weightedGrowth.toFixed(1)} %`
  const annualWeightedGrowthLabel = annualizedGrowthLabel(weightedGrowth, 2010, targetYear)

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Lecture centrale: trajectoire et besoins</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Valeurs brutes par domaine: 2010 observé, base observée {baseYear}, puis estimation {targetYear} selon {scenarioLabel}. Les cellules manquantes restent visibles.
          <br />
          <strong className="text-slate-900">Estimation {targetYear} selon {scenarioLabel}: tension pondérée annualisée de {annualWeightedGrowthLabel}, soit {weightedGrowthLabel} cumulés.</strong>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Domaine</th>
              <th className="px-4 py-3 font-medium">Indicateur</th>
              <th className="px-4 py-3 font-medium">2010 observé</th>
              <th className="px-4 py-3 font-medium">Base observée {baseYear}</th>
              <th className="px-4 py-3 font-medium">{targetYear} estimé</th>
              <th className="px-4 py-3 font-medium">Lecture</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {selectedRows.map((row) => (
              <tr key={`${row.scenario}-${row.metric}`}>
                <td className="px-4 py-3 font-medium text-slate-900">{row.domain}</td>
                <td className="px-4 py-3 text-slate-700">{row.label}</td>
                <ValueCell value={row.value_2010} unit={row.unit} status={row.data_type_2010} />
                <ValueCell value={row.value_base} unit={row.unit} status={row.data_type_base} />
                <ValueCell value={row.value_2050} unit={row.unit} status={row.data_type_2050} />
                <td className="max-w-xs px-4 py-3 text-slate-600">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

