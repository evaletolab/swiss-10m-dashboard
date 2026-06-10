import { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../lib/colors'
import { toNumber } from '../lib/format'
import type { GrowthComparisonRow, ScenarioName } from '../lib/types'

type Props = {
  rows: GrowthComparisonRow[]
  scenario: ScenarioName
  compareToScenario?: ScenarioName
  yDomain?: [number, number]
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
  school_classes: colors.recent,
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
  absorption_pressure: colors.pressure,
}

const overviewMetrics = ['population', 'gdp', 'housing_stock', 'school_classes', 'health_cost_per_insured', 'operating_expenses', 'health_premium_subsidy_cantonal']
const defaultToggleableMetrics = new Set(overviewMetrics)
const referenceMetrics = new Set(['population', 'gdp'])
const pressureAdjustedCostMetrics = new Set(['health_cost_per_insured', 'operating_expenses', 'health_premium_subsidy_cantonal'])

function selectedRows(rows: GrowthComparisonRow[], scenario: ScenarioName, domain?: string, metric?: string, includeReferences = true) {
  const base = rows.filter((row) => row.scenario === scenario)
  const references = includeReferences ? base.filter((row) => row.metric === 'population' || row.metric === 'gdp') : []
  const subjectRows = metric
    ? base.filter((row) => row.metric === metric)
    : domain
      ? base.filter((row) => row.domain === domain && row.metric !== 'annual_growth' && row.metric !== 'annual_growth_rate')
      : base.filter((row) => overviewMetrics.includes(row.metric))
  const orderedRows = metric ? [...references, ...subjectRows] : [...subjectRows, ...references]
  return [...new Map(orderedRows.map((row) => [row.metric, row])).values()]
}

function lineName(row: GrowthComparisonRow, focusedMetric?: string) {
  if (row.metric === 'population') return 'Référence démographique'
  if (row.metric === 'gdp') return 'Référence PIB'
  if (focusedMetric === 'operating_expenses' && row.metric === focusedMetric) return 'Charges d’exploitation TPG (coûts)'
  if (focusedMetric && referenceMetrics.has(row.metric)) return `Référence - ${row.label}`
  return row.label
}

function lineStrokeWidth(row: GrowthComparisonRow, focusedMetric?: string) {
  if (focusedMetric === row.metric) return 5
  if (row.metric === 'population') return 3
  if (row.metric === 'gdp') return 2.5
  return 2
}

function lineColor(row: GrowthComparisonRow, focusedMetric?: string) {
  if (focusedMetric === 'operating_expenses' && row.metric === focusedMetric) return colors.pressure
  return metricColors[row.metric] ?? colors.neutral
}

function baselineKey(metricName: string) {
  return `baseline_${metricName}`
}

function sourceMetricFromKey(metricName: string) {
  return metricName.startsWith('baseline_') ? metricName.replace('baseline_', '') : metricName
}

export function GrowthComparisonChart({ rows, scenario, compareToScenario, yDomain, domain, metric, includeReferences = true, toggleable = false }: Props) {
  const [enabledMetrics, setEnabledMetrics] = useState<Set<string>>(() => new Set(defaultToggleableMetrics))
  const metrics = selectedRows(rows, scenario, domain, metric, includeReferences)
  const baselineMetrics = compareToScenario && compareToScenario !== scenario
    ? selectedRows(rows, compareToScenario, domain, metric, includeReferences).filter((row) => pressureAdjustedCostMetrics.has(row.metric))
    : []
  const first = metrics[0]
  const legendHeight = toggleable ? 104 : 64
  const focusedMetrics = metric ? metrics.filter((row) => row.metric === metric) : []
  const backgroundMetrics = metric ? metrics.filter((row) => row.metric !== metric) : metrics
  const data = [
    {
      year: 2010,
      ...Object.fromEntries(metrics.map((row) => [row.metric, toNumber(row.value_2010) === null ? null : 0])),
      ...Object.fromEntries(baselineMetrics.map((row) => [baselineKey(row.metric), toNumber(row.value_2010) === null ? null : 0])),
    },
    {
      year: Number(first?.base_year ?? 2024),
      ...Object.fromEntries(metrics.map((row) => [row.metric, toNumber(row.growth_2010_to_base_pct)])),
      ...Object.fromEntries(baselineMetrics.map((row) => [baselineKey(row.metric), toNumber(row.growth_2010_to_base_pct)])),
    },
    {
      year: 2050,
      ...Object.fromEntries(metrics.map((row) => [row.metric, toNumber(row.growth_2010_to_2050_pct)])),
      ...Object.fromEntries(baselineMetrics.map((row) => [baselineKey(row.metric), toNumber(row.growth_2010_to_2050_pct)])),
    },
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
    if (toggleable && typeof dataKey === 'string') toggleMetric(sourceMetricFromKey(dataKey))
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis width={58} domain={yDomain} tickFormatter={(value) => `${Number(value).toFixed(0)} %`} />
        <Tooltip formatter={(value) => value === null ? 'donnée manquante' : `${Number(value).toFixed(1)} %`} />
        <Legend
          height={legendHeight}
          iconSize={10}
          onClick={toggleLegendMetric}
          verticalAlign="bottom"
          wrapperStyle={{
            cursor: toggleable ? 'pointer' : undefined,
            fontSize: 12,
            lineHeight: '18px',
            paddingTop: 12,
          }}
        />
        {backgroundMetrics.map((row) => (
          <Line
            key={row.metric}
            type="monotone"
            dataKey={row.metric}
            name={lineName(row, metric)}
            stroke={lineColor(row, metric)}
            strokeWidth={lineStrokeWidth(row, metric)}
            strokeDasharray={row.metric === 'gdp' ? '5 5' : undefined}
            dot
            connectNulls={false}
            hide={toggleable && !enabledMetrics.has(row.metric)}
          />
        ))}
        {focusedMetrics.map((row) => (
          <Line
            key={`${row.metric}-focused`}
            type="monotone"
            dataKey={row.metric}
            name={lineName(row, metric)}
            stroke={lineColor(row, metric)}
            strokeWidth={lineStrokeWidth(row, metric)}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
            connectNulls={false}
            hide={toggleable && !enabledMetrics.has(row.metric)}
            isAnimationActive={false}
          />
        ))}
        {baselineMetrics.map((row) => (
          <Line
            key={baselineKey(row.metric)}
            type="monotone"
            dataKey={baselineKey(row.metric)}
            name={`Tendance actuelle - ${row.label}`}
            stroke={lineColor(row, metric)}
            strokeWidth={1.75}
            strokeDasharray="2 6"
            strokeOpacity={0.45}
            dot={false}
            connectNulls={false}
            hide={toggleable && !enabledMetrics.has(row.metric)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

