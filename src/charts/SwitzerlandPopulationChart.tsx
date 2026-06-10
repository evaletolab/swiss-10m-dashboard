import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { colors } from '../lib/colors'
import { toNumber } from '../lib/format'
import { START_YEAR } from '../lib/series'
import type { ScenarioRow } from '../lib/types'

type Props = { rows: ScenarioRow[] }

export function SwitzerlandPopulationChart({ rows }: Props) {
  const data = Array.from(new Set(rows.map((row) => Number(row.year))))
    .filter((year) => year >= START_YEAR)
    .sort((a, b) => a - b)
    .map((year) => ({
    year,
    observed: toNumber(rows.find((row) => Number(row.year) === year && row.scenario === 'observed')?.population),
    linear: toNumber(rows.find((row) => Number(row.year) === year && row.scenario === 'linear_trend_2000_base_year')?.population),
    cagr: toNumber(rows.find((row) => Number(row.year) === year && row.scenario === 'cagr_trend_2000_base_year')?.population),
    initiative: toNumber(rows.find((row) => Number(row.year) === year && row.scenario === 'initiative_linear')?.population),
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis domain={[3_000_000, 'dataMax + 250000']} tickFormatter={(value) => `${(Number(value) / 1_000_000).toFixed(1)}M`} />
        <Tooltip formatter={(value) => new Intl.NumberFormat('fr-CH').format(Number(value))} />
        <Legend />
        <Line type="monotone" dataKey="observed" name="Réel observé" stroke={colors.observed} strokeWidth={3} dot={false} connectNulls={false} />
        <Line type="monotone" dataKey="linear" name="Tendance linéaire" stroke={colors.linear} strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="cagr" name="Tendance CAGR" stroke={colors.cagr} strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="initiative" name="Initiative 10M" stroke={colors.initiative} strokeWidth={3} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
