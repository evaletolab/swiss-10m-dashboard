import { existsSync } from 'node:fs'
import XLSX from 'xlsx'
import { numberOrNull, type CsvRow } from './csv.ts'
import { fromRoot } from './paths.ts'

type SheetRow = unknown[]

function workbookSheets(relativePath: string) {
  const absolutePath = fromRoot(relativePath)
  if (!existsSync(absolutePath)) return []
  const workbook = XLSX.readFile(absolutePath)
  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    rows: XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName], { header: 1, defval: '' }),
  }))
}

function normalizeLabel(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function yearColumns(rows: SheetRow[]) {
  const row = rows.find((item) => item.filter((value) => {
    const year = numberOrNull(value)
    return year !== null && year >= 1900 && year <= 2100
  }).length >= 2)
  if (!row) return []
  return row
    .map((value, index) => ({ year: numberOrNull(value), index }))
    .filter((item): item is { year: number; index: number } => item.year !== null && item.year >= 1900 && item.year <= 2100)
}

function totalRow(rows: SheetRow[]) {
  return rows.find((row) => normalizeLabel(row[0]) === 'total')
}

function readHospitalBeds() {
  const values = new Map<number, number>()
  for (const { rows } of workbookSheets('data/raw/ocstat/manual/ge_health_hospitals.xlsx')) {
    const years = yearColumns(rows)
    const row = totalRow(rows)
    if (!row) continue
    for (const { year, index } of years) {
      const value = numberOrNull(row[index])
      if (value !== null) values.set(year, Math.round(value))
    }
  }
  return values
}

function readPhysicians() {
  const values = new Map<number, number>()
  for (const { sheetName, rows } of workbookSheets('data/raw/ocstat/manual/ge_health_physicians.xlsx')) {
    const year = numberOrNull(sheetName) ?? numberOrNull(String(rows[3]?.[0] ?? '').match(/(20\d{2})/)?.[1])
    const row = totalRow(rows)
    const total = numberOrNull(row?.[3])
    if (year !== null && total !== null) values.set(year, total)
  }
  return values
}

function readShare65Plus() {
  const values = new Map<number, number>()
  for (const { rows } of workbookSheets('data/raw/ocstat/manual/ge_health_age_groups.xlsx')) {
    const years = yearColumns(rows)
    const share65To79Row = rows.find((row) => normalizeLabel(row[0]) === '65 - 79')
    const share80PlusRow = rows.find((row) => normalizeLabel(row[0]) === '80 ou plus')
    if (!share65To79Row || !share80PlusRow) continue

    for (const { year, index } of years) {
      const share65To79 = numberOrNull(share65To79Row[index])
      const share80Plus = numberOrNull(share80PlusRow[index])
      if (share65To79 !== null && share80Plus !== null) {
        values.set(year, Number(((share65To79 + share80Plus) / 100).toFixed(4)))
      }
    }
  }
  return values
}

export function readOcstatHealthComplementRows(): CsvRow[] {
  const beds = readHospitalBeds()
  const physicians = readPhysicians()
  const share65Plus = readShare65Plus()
  const years = Array.from(new Set([...beds.keys(), ...physicians.keys(), ...share65Plus.keys()])).sort((a, b) => a - b)

  return years.map((year) => ({
    year,
    physicians: physicians.get(year) ?? null,
    total_hospital_beds: beds.get(year) ?? null,
    share_65_plus: share65Plus.get(year) ?? null,
    data_type: 'official',
    source_id: 'ocstat_geneva_health_system',
    source_note: 'OCSTAT système de santé et population: lits hospitaliers T 14.02.1.03, médecins T 14.02.5.10 et population par groupes d’âge T 01.01.1.03A.',
  }))
}
