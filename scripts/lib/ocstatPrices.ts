import { existsSync } from 'node:fs'
import XLSX from 'xlsx'
import { numberOrNull, type CsvRow } from './csv.ts'
import { fromRoot } from './paths.ts'

type SheetRow = unknown[]

const manualPaths = [
  'data/raw/ocstat/manual/ge_prices.xls',
  'data/raw/ocstat/manual/ge_prices.xlsx',
]

const groupPaths = [
  'data/raw/ocstat/manual/ge_prices_groups.xls',
  'data/raw/ocstat/manual/ge_prices_groups.xlsx',
]

function filePath() {
  return manualPaths.find((path) => existsSync(fromRoot(path)))
}

function groupFilePath() {
  return groupPaths.find((path) => existsSync(fromRoot(path)))
}

function rowsFromWorkbook(): SheetRow[] {
  const path = filePath()
  if (!path) return []
  const workbook = XLSX.readFile(fromRoot(path))
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? '']
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1, defval: '' })
}

function workbookRowsBySheet(relativePath: string) {
  const workbook = XLSX.readFile(fromRoot(relativePath))
  return Object.fromEntries(workbook.SheetNames.map((sheetName) => [
    sheetName,
    XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName], { header: 1, defval: '' }),
  ]))
}

function normalizeLabel(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function yearColumns(rows: SheetRow[]) {
  const yearRow = rows.find((row) => row.filter((value) => {
    const year = numberOrNull(value)
    return year !== null && year >= 1960 && year <= 2100
  }).length >= 5)
  if (!yearRow) return []
  return yearRow
    .map((value, index) => ({ year: numberOrNull(value), index }))
    .filter((item): item is { year: number; index: number } => item.year !== null && item.year >= 1960 && item.year <= 2100)
}

function readVerticalGenevaIndex(rows: SheetRow[]) {
  const headerIndex = rows.findIndex((row) => normalizeLabel(row[1]) === 'geneve')
  if (headerIndex === -1) return []
  return rows.slice(headerIndex + 1)
    .map((row) => ({
      year: numberOrNull(row[0]),
      value: numberOrNull(row[1]),
    }))
    .filter((row): row is { year: number; value: number } => row.year !== null && row.value !== null && row.year >= 2000)
}

function rowByLabels(rows: SheetRow[], labels: string[]) {
  return rows.find((row) => {
    const label = normalizeLabel(row[0])
    return labels.some((candidate) => label.includes(candidate))
  })
}

function valuesByYear(row: SheetRow | undefined, years: Array<{ year: number; index: number }>) {
  const values = new Map<number, number | null>()
  if (!row) return values
  for (const { year, index } of years) values.set(year, numberOrNull(row[index]))
  return values
}

function yoy(value: number | null | undefined, previous: number | null | undefined) {
  if (value === null || value === undefined || previous === null || previous === undefined || previous === 0) return null
  return Number(((value / previous - 1)).toFixed(4))
}

function percentage(value: unknown) {
  const parsed = numberOrNull(value)
  return parsed === null ? null : Number((parsed / 100).toFixed(4))
}

function annualGroupVariations() {
  const path = groupFilePath()
  const byYear = new Map<number, Partial<CsvRow>>()
  if (!path) return byYear

  const sheets = workbookRowsBySheet(path)
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const match = sheetName.match(/^12(\d{2})$/)
    if (!match) continue
    const year = 2000 + Number(match[1])
    const rentRow = rowByLabels(rows, ['loyer du logement'])
    const foodRow = rowByLabels(rows, ['alimentation'])
    const healthRow = rowByLabels(rows, ['sante'])
    const transportRow = rowByLabels(rows, ['transports'])
    byYear.set(year, {
      cpi_rent_yoy: percentage(rentRow?.[3]),
      cpi_food_yoy: percentage(foodRow?.[3]),
      cpi_health_yoy: percentage(healthRow?.[3]),
      cpi_transport_yoy: percentage(transportRow?.[3]),
    })
  }

  return byYear
}

export function readOcstatPricesRows(): CsvRow[] {
  const rows = rowsFromWorkbook()
  const verticalIndex = readVerticalGenevaIndex(rows)
  const groupVariations = annualGroupVariations()
  if (verticalIndex.length > 0) {
    return verticalIndex.map((item, index) => {
      const previous = verticalIndex[index - 1]
      const groups = groupVariations.get(item.year) ?? {}
      return {
        year: item.year,
        cpi_total: item.value,
        cpi_rent: null,
        cpi_food: null,
        cpi_health: null,
        cpi_transport: null,
        cpi_total_yoy: yoy(item.value, previous?.value),
        cpi_rent_yoy: groups.cpi_rent_yoy ?? null,
        cpi_food_yoy: groups.cpi_food_yoy ?? null,
        cpi_health_yoy: groups.cpi_health_yoy ?? null,
        cpi_transport_yoy: groups.cpi_transport_yoy ?? null,
        data_type: 'official',
        source_id: 'ocstat_geneva_prices',
        source_note: groupVariations.size > 0 ? 'OCSTAT indice genevois des prix à la consommation: moyennes annuelles et variations annuelles par groupes de dépenses.' : 'OCSTAT indice genevois des prix à la consommation, moyennes annuelles, septembre 1966=100.',
      }
    })
  }

  const years = yearColumns(rows)
  if (years.length === 0) return []

  const total = valuesByYear(rowByLabels(rows, ['indice general', 'ensemble']), years)
  const rent = valuesByYear(rowByLabels(rows, ['loyer', 'logement et energie', 'logement']), years)
  const food = valuesByYear(rowByLabels(rows, ['alimentation']), years)
  const health = valuesByYear(rowByLabels(rows, ['sante']), years)
  const transport = valuesByYear(rowByLabels(rows, ['transport']), years)

  return years.map(({ year }, index) => {
    const previousYear = years[index - 1]?.year
    const groups = groupVariations.get(year) ?? {}
    const row = {
      year,
      cpi_total: total.get(year) ?? null,
      cpi_rent: rent.get(year) ?? null,
      cpi_food: food.get(year) ?? null,
      cpi_health: health.get(year) ?? null,
      cpi_transport: transport.get(year) ?? null,
      data_type: 'official',
      source_id: 'ocstat_geneva_prices',
      source_note: 'OCSTAT indice genevois des prix à la consommation, fichier Excel manuel.',
    }
    return {
      ...row,
      cpi_total_yoy: previousYear === undefined ? null : yoy(row.cpi_total, total.get(previousYear)),
      cpi_rent_yoy: previousYear === undefined ? groups.cpi_rent_yoy ?? null : yoy(row.cpi_rent, rent.get(previousYear)) ?? groups.cpi_rent_yoy ?? null,
      cpi_food_yoy: previousYear === undefined ? groups.cpi_food_yoy ?? null : yoy(row.cpi_food, food.get(previousYear)) ?? groups.cpi_food_yoy ?? null,
      cpi_health_yoy: previousYear === undefined ? groups.cpi_health_yoy ?? null : yoy(row.cpi_health, health.get(previousYear)) ?? groups.cpi_health_yoy ?? null,
      cpi_transport_yoy: previousYear === undefined ? groups.cpi_transport_yoy ?? null : yoy(row.cpi_transport, transport.get(previousYear)) ?? groups.cpi_transport_yoy ?? null,
    }
  }).filter((row) => row.year >= 2000)
}
