import type { ScenarioName } from '../lib/types'

type ScenarioSelectorProps = {
  value: ScenarioName
  onChange: (value: ScenarioName) => void
}

const options: Array<{ value: ScenarioName; label: string }> = [
  { value: 'linear_trend_2000_base_year', label: 'Tendance actuelle' },
  { value: 'cagr_trend_2000_base_year', label: 'Tendance CAGR' },
  { value: 'recent_trend_2015_base_year', label: 'Tendance récente' },
  { value: 'initiative_linear', label: 'Scénario initiative' },
]

export function ScenarioSelector({ value, onChange }: ScenarioSelectorProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:flex-row md:items-center">
      Scénario
      <select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={value} onChange={(event) => onChange(event.target.value as ScenarioName)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
