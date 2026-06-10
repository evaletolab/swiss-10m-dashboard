import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../lib/colors'
import { formatPercent, toNumber } from '../lib/format'
import { fromStartYear } from '../lib/series'
import type { DemographyRow } from '../lib/types'

type FertilitySummary = {
  latestRate?: string | number | null
  replacementRate?: string | number | null
  generationReplacementRatio?: string | number | null
  twoGenerationBase?: string | number | null
}

type Props = { rows: DemographyRow[]; summary?: FertilitySummary }

export function FertilityReplacementChart({ rows, summary }: Props) {
  const data = fromStartYear(rows).map((row) => {
    const fertility = toNumber(row.fertility_rate)
    return {
      year: Number(row.year),
      fertility,
      twoGenerationBase: fertility === null ? null : Math.pow(fertility / 2.1, 2),
    }
  })
  const hasSeries = data.some((row) => row.fertility !== null)
  const latestRate = toNumber(summary?.latestRate)
  const replacementRate = toNumber(summary?.replacementRate) ?? 2.1
  const generationRatio = toNumber(summary?.generationReplacementRatio)
  const twoGenerationBase = toNumber(summary?.twoGenerationBase)

  if (!hasSeries) {
    return (
      <div className="flex h-full flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Série annuelle manquante</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-sm text-slate-500">Fécondité récente</div>
            <div className="mt-1 text-3xl font-semibold text-slate-950">{latestRate ?? 'donnée manquante'}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Seuil de remplacement</div>
            <div className="mt-1 text-3xl font-semibold text-slate-950">{replacementRate}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Base après 2 générations</div>
            <div className="mt-1 text-3xl font-semibold text-slate-950">{formatPercent(twoGenerationBase)}</div>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600">
          Dernier indicateur disponible: {latestRate ?? 'donnée manquante'} enfant par femme, soit {formatPercent(generationRatio)} du seuil de remplacement de {replacementRate}.
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis yAxisId="left" domain={[0, 2.4]} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
        <Tooltip />
        <ReferenceLine yAxisId="left" y={2.1} label="Seuil 2,1" stroke={colors.initiative} strokeDasharray="4 4" />
        <Line yAxisId="left" type="monotone" dataKey="fertility" name="Fécondité" stroke={colors.observed} strokeWidth={3} dot={false} connectNulls />
        <Line yAxisId="right" type="monotone" dataKey="twoGenerationBase" name="Base après 2 générations" stroke={colors.cagr} strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
