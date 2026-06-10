import { formatNumber, toNumber } from './format'
import type { NullableNumber } from './types'

export const START_YEAR = 2010
export const TARGET_YEAR = 2050

type YearRow = { year: NullableNumber }

export function yearOf(row: YearRow): number {
  return Number(row.year)
}

export function fromStartYear<T extends YearRow>(rows: T[], startYear = START_YEAR): T[] {
  return rows.filter((row) => yearOf(row) >= startYear)
}

export function latestYearWithValue<T extends YearRow>(rows: T[], valueKey: keyof T): number | null {
  const years = rows
    .filter((row) => toNumber(row[valueKey] as NullableNumber) !== null)
    .map(yearOf)
    .filter(Number.isFinite)
  const latest = Math.max(...years)
  return Number.isFinite(latest) ? latest : null
}

export function rowForYear<T extends YearRow>(rows: T[], year: number): T | undefined {
  return rows.find((row) => yearOf(row) === year)
}

export function compactNumber(value: NullableNumber): string {
  const parsed = toNumber(value)
  if (parsed === null) return 'donnée manquante'
  if (Math.abs(parsed) >= 1_000_000) return `${formatNumber(parsed / 1_000_000, 1)} M`
  if (Math.abs(parsed) >= 10_000) return `${formatNumber(parsed / 1_000, 0)} k`
  return formatNumber(parsed)
}

export function formatGridValue(value: NullableNumber, unit?: string): string {
  if (unit === '%') {
    const parsed = toNumber(value)
    return parsed === null ? 'donnée manquante' : `${formatNumber(parsed, 1)} %`
  }
  const formatted = compactNumber(value)
  return formatted === 'donnée manquante' || !unit ? formatted : `${formatted} ${unit}`
}

