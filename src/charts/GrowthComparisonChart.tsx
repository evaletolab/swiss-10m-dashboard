import { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../lib/colors'
import { toNumber } from '../lib/format'
import type { GrowthComparisonRow, ScenarioName } from '../lib/types'

type Props = {
  rows: GrowthComparisonRow[]
  scenario: ScenarioName
  domain?: string
  metric?: string
  includeReferences?: boolean
  toggleable?: boolean
}

const metricColors: Record<string, string> = {
  population: colors.observed,
  gdp: colors.linear,
  housing_stock: colors.housing,
  subsidized_housing: colors.cagr,
  students: colors.transport,
  school_classes: colors.linear,
  physicians: colors.health,
  hospital_beds: colors.cagr,
  tpg_passengers: colors.transport,
  transport_revenue: colors.cagr,
  operating_subsidy: colors.health,
  operating_expenses: colors.housing,
  adult_annual_subscription: colors.neutral,
  health_cost_per_insured: colors.health,
  social_assistance_spending: colors.cagr,
  health_premium_subsidy_cantonal: colors.health,
}

const overviewMetrics = ['population', 'gdp', 'housing_stock', 'students', 'health_cost_per_insured', 'operating_expenses', 'health_premium_subsidy_cantonal']
const referenceMetrics = new Set(['population', 'gdp'])

function selectedRows(rows: GrowthComparisonRow[], scenario: ScenarioName, domain?: string, metric?: string, includeReferences = true) {
  const base = rows.filter((row) => row.scenario === scenario)
  const references = includeReferences ? base.filter((row) => row.metric === 'population' || row.metric === 'gdp') : []
  const subjectRows = metric
    ? base.filter((row) => row.metric === metric)
    : domain
      ? base.filter((row) => row.domain === domain && row.metric !== 'annual_growth' && row.metric !== 'annual_growth_rate')
      : base.filter((row) => overviewMetrics.includes(row.metric))
  return [...new Map([...subjectRows, ...references].map((row) => [row.metric, row])).values()]
}

function lineName(row: GrowthComparisonRow, focusedMetric?: string) {
  if (row.metric === 'population') return 'Référence démographique'
  if (row.metric === 'gdp') return 'Référence PIB'
  if (focusedMetric && referenceMetrics.has(row.metric)) return `Référence - ${row.label}`
  return row.label
}

function lineStrokeWidth(row: GrowthComparisonRow, focusedMetric?: string) {
  if (row.metric === 'population') return 4
  if (focusedMetric === row.metric) return 3
  if (row.metric === 'gdp') return 2.5
  return 2
}

export function GrowthComparisonChart({ rows, scenario, domain, metric, includeReferences = true, toggleable = false }: Props) {
  const [enabledMetrics, setEnabledMetrics] = useState<Set<string>>(() => new Set(overviewMetrics))
  const metrics = selectedRows(rows, scenario, domain, metric, includeReferences)
  const first = metrics[0]
  const data = [
    { year: 2010, ...Object.fromEntries(metrics.map((row) => [row.metric, toNumber(row.value_2010) === null ? null : 0])) },
    { year: Number(first?.base_year ?? 2024), ...Object.fromEntries(metrics.map((row) => [row.metric, toNumber(row.growth_2010_to_base_pct)])) },
    { year: 2050, ...Object.fromEntries(metrics.map((row) => [row.metric, toNumber(row.growth_2010_to_2050_pct)])) },
  ]

  function toggleMetric(metricName: string) {
    setEnabledMetrics((current) => {
      const next = new Set(current)
      if (next.has(metricName)) next.delete(metricName)
      else next.add(metricName)
      return next
    })
  }

  function toggleLegendMetric(payload: unknown) {
    const dataKey = (payload as { dataKey?: unknown }).dataKey
    if (toggleable && typeof dataKey === 'string') toggleMetric(dataKey)
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis tickFormatter={(value) => `${Number(value).toFixed(0)} %`} />
        <Tooltip formatter={(value) => value === null ? 'donnée manquante' : `${Number(value).toFixed(1)} %`} />
        <Legend onClick={toggleLegendMetric} wrapperStyle={toggleable ? { cursor: 'pointer' } : undefined} />
        {metrics.map((row) => (
          <Line
            key={row.metric}
            type="monotone"
            dataKey={row.metric}
            name={lineName(row, metric)}
            stroke={metricColors[row.metric] ?? colors.neutral}
            strokeWidth={lineStrokeWidth(row, metric)}
            strokeDasharray={row.metric === 'gdp' ? '5 5' : undefined}
            dot
            connectNulls={false}
            hide={toggleable && !enabledMetrics.has(row.metric)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

