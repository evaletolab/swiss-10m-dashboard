import type { NullableNumber } from './types'

export function toNumber(value: NullableNumber): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatNumber(value: NullableNumber, maximumFractionDigits = 0): string {
  const parsed = toNumber(value)
  if (parsed === null) return 'donnée manquante'
  return new Intl.NumberFormat('fr-CH', { maximumFractionDigits }).format(parsed)
}

export function formatPercent(value: NullableNumber, digits = 1): string {
  const parsed = toNumber(value)
  if (parsed === null) return 'donnée manquante'
  return `${new Intl.NumberFormat('fr-CH', { maximumFractionDigits: digits }).format(parsed * 100)} %`
}
