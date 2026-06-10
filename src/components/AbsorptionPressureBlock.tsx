import { toNumber } from '../lib/format'
import type { GrowthComparisonRow, ScenarioName } from '../lib/types'
import { ScenarioSelector } from './ScenarioSelector'

type Props = {
  rows: GrowthComparisonRow[]
  scenario: ScenarioName
  onScenarioChange: (scenario: ScenarioName) => void
}

function formatPressure(value: GrowthComparisonRow['growth_2010_to_base_pct']) {
  const number = toNumber(value)
  if (number === null) return 'donnée manquante'
  return `${number.toFixed(1)} pts`
}

function formatDelta(value: number | null) {
  if (value === null) return 'écart indisponible'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} pts`
}

function formatMultiplier(value: number | null) {
  if (value === null) return 'x?'
  return `x${(1 + value / 100).toFixed(2)}`
}

function formatCostExample(value: number | null) {
  if (value === null) return 'exemple indisponible'
  return `100 CHF -> ${(100 * (1 + value / 100)).toFixed(0)} CHF`
}

function formatAnnualizedPressure(value: number | null) {
  if (value === null) return 'donnée manquante'
  const annualized = (Math.pow(1 + value / 100, 1 / 40) - 1) * 100
  return `${annualized.toFixed(1)} % par an`
}

function formatUpliftPct(value: number | null) {
  if (value === null) return 'donnée manquante'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} pts`
}

export function AbsorptionPressureBlock({ rows, scenario, onScenarioChange }: Props) {
  const pressure = rows.find((row) => row.scenario === scenario && row.metric === 'absorption_pressure')
  const scenarioLabel = pressure?.scenario_label ?? 'scénario sélectionné'
  const pressureRows = rows.filter((row) => row.metric === 'absorption_pressure')
  const baselinePressure = pressureRows.find((row) => row.scenario === 'linear_trend_2000_base_year')
  const selected2050 = toNumber(pressure?.growth_2010_to_2050_pct)
  const baseline2050 = toNumber(baselinePressure?.growth_2010_to_2050_pct)
  const costUpliftPct = toNumber(pressure?.growth_base_to_2050_pct)
  const deltaVsBaseline = selected2050 === null || baseline2050 === null ? null : selected2050 - baseline2050

  return (
    <section className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-5 text-orange-950 shadow-sm md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">Hypothèse V1</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Tension d’absorption 2050, ce que ça implique potentiellement</h2>
            </div>
            <ScenarioSelector value={scenario} onChange={onScenarioChange} />
          </div>
          <p className="mt-3 text-sm leading-6">
            Cette tension n’est pas une inflation. Elle estime l’effort d’infrastructure nécessaire pour absorber la trajectoire démographique:
            logements, écoles, santé et transports. Plus l’indice monte, plus les capacités doivent croître pour éviter la rareté locale.
          </p>
          <p className="mt-3 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-6">
            Indice = 35 % logement + 20 % écoles + 20 % santé + 25 % transports. Coûts 2050 = tendance coût x (1 + tension additionnelle / 100).
          </p>
          <p className="mt-3 text-sm leading-6 text-orange-900">
            Calcul: {formatPressure(pressure?.growth_2010_to_2050_pct)} en 2050 - {formatPressure(pressure?.growth_2010_to_base_pct)} en 2024 =
            {' '}{formatUpliftPct(costUpliftPct)}. Appliqué aux charges: {formatCostExample(costUpliftPct)}.
          </p>
          <div className="mt-3 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-6 text-orange-900">
            <p className="font-semibold">Note méthodologique</p>
            <p className="mt-1">
              Le <strong>{formatAnnualizedPressure(selected2050)}</strong> n’est pas une prévision d’augmentation naturelle des coûts. C’est une manière de résumer,
              sous forme annualisée, l’évolution d’un score composite de tension entre 2010 et 2050. Cette tension s’ajoute à la croissance naturelle des coûts.
              Suivre ce <a className="font-semibold underline" href="https://github.com/evaletolab/swiss-10m-dashboard/blob/master/METHODOLOGIE.md" target="_blank" rel="noreferrer">lien</a> pour consulter la méthodologie.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-700">2010 → 2024</p>
            <p className="mt-1 text-3xl font-semibold">{formatPressure(pressure?.growth_2010_to_base_pct)}</p>
            <p className="mt-1 text-xs leading-5 text-orange-800">Effort historique estimé depuis 2010.</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-700">2010 → 2050 · {scenarioLabel}</p>
            <p className="mt-1 text-3xl font-semibold">{formatPressure(pressure?.growth_2010_to_2050_pct)}</p>
            <p className="mt-1 text-xs leading-5 text-orange-800">Effort cumulé estimé avec le scénario choisi.</p>
          </div>
          <div className="rounded-2xl bg-white p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Impact coûts V1</p>
            <p className="mt-1 text-3xl font-semibold">{formatMultiplier(costUpliftPct)}</p>
            <p className="mt-1 text-sm font-semibold text-orange-900">{formatCostExample(costUpliftPct)}</p>
            <p className="mt-1 text-xs leading-5 text-orange-800">Coefficient appliqué aux charges projetées 2050.</p>
          </div>
          <div className="rounded-2xl bg-white p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Écart vs tendance actuelle</p>
            <p className="mt-1 text-3xl font-semibold">{formatDelta(deltaVsBaseline)}</p>
            <p className="mt-1 text-xs leading-5 text-orange-800">Différence du score 2050 par rapport à la tendance linéaire 2000-2024.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
