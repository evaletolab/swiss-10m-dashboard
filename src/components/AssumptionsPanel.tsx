import { formatNumber, formatPercent, toNumber } from '../lib/format'

type AssumptionRow = {
  key?: string | number | null
  value?: string | number | null
  unit?: string | number | null
  source?: string | number | null
  confidence?: string | number | null
  comment?: string | number | null
}

type Props = { rows: AssumptionRow[] }

const labels: Record<string, { label: string; impact: string; format?: 'percent' | 'number' }> = {
  avg_household_size: { label: 'Taille moyenne des ménages', impact: 'Convertit la croissance en logements.' },
  students_share_population: { label: 'Part élèves publics/subventionnés', impact: 'Dimensionne les classes à ouvrir.', format: 'percent' },
  students_per_class: { label: 'Élèves par classe', impact: 'Transforme les élèves estimés en classes.' },
  doctors_per_1000_target: { label: 'Médecins cible pour 1 000 habitants', impact: 'Dimensionne le besoin médical additionnel.' },
  hospital_beds_per_1000_target: { label: 'Lits hospitaliers cible pour 1 000 habitants', impact: 'Dimensionne les lits hospitaliers additionnels.' },
  daily_trips_per_person: { label: 'Trajets TPG par habitant et par jour', impact: 'Estime la pression sur les transports publics.' },
  water_liters_per_person_day: { label: 'Eau par habitant et par jour', impact: 'Estime le besoin journalier en eau.' },
  waste_kg_per_person_year: { label: 'Déchets par habitant et par an', impact: 'Estime le volume annuel de déchets.' },
  electricity_kwh_per_person_year: { label: 'Électricité par habitant et par an', impact: 'Estime la consommation électrique annuelle.' },
  geneva_growth_share: { label: 'Part de croissance nationale attribuée à Genève', impact: 'Traduit le scénario Suisse vers Genève.', format: 'percent' },
}

const unitLabels: Record<string, string> = {
  persons_per_household: 'pers./ménage',
  ratio: 'ratio',
  students_per_class: 'élèves/classe',
  doctors_per_1000: 'médecins/1 000 hab.',
  beds_per_1000: 'lits/1 000 hab.',
  trips_per_day: 'trajets/jour',
  liter_per_day: 'litres/jour',
  kg_per_year: 'kg/an',
  kwh_per_year: 'kWh/an',
}

function formatValue(row: AssumptionRow) {
  const key = String(row.key ?? '')
  const value = toNumber(row.value)
  if (labels[key]?.format === 'percent') return formatPercent(value)
  return formatNumber(value, 2)
}

export function AssumptionsPanel({ rows }: Props) {
  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Hypothèses de calcul</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ces paramètres ne sont pas des observations: ils transforment la croissance démographique en besoins de logements, classes, santé, mobilité et ressources.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => {
          const key = String(row.key ?? '')
          const meta = labels[key] ?? { label: key, impact: String(row.comment ?? '') }
          const confidence = String(row.confidence ?? 'unknown')
          return (
            <article key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-950">{meta.label}</h3>
                  <p className="mt-1 text-sm text-slate-600">{meta.impact}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{confidence}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-2xl font-semibold text-slate-950">{formatValue(row)}</span>
                <span className="pb-1 text-sm text-slate-500">{unitLabels[String(row.unit ?? '')] ?? String(row.unit ?? '')}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">Source: {String(row.source ?? 'donnée manquante')}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

