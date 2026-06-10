import { existsSync } from 'node:fs'
import XLSX from 'xlsx'
import { numberOrNull, readCsv, type CsvRow } from './csv.ts'
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

function rowByLabels(rows: SheetRow[], labels: string[]) {
  return rows.find((row) => {
    const label = normalizeLabel(row[0])
    return labels.some((candidate) => label.includes(candidate))
  })
}

function valuesFromRow(row: SheetRow | undefined, years: Array<{ year: number; index: number }>, multiplier = 1) {
  const values = new Map<number, number>()
  if (!row) return values
  for (const { year, index } of years) {
    const value = numberOrNull(row[index])
    if (value !== null) values.set(year, value * multiplier)
  }
  return values
}

function firstFilledValues(rows: SheetRow[], years: Array<{ year: number; index: number }>, sectionLabels: string[], directLabels: string[]) {
  const directRow = rowByLabels(rows, directLabels)
  const directValues = valuesFromRow(directRow, years)
  if (directValues.size > 0) return directValues

  const sectionIndex = rows.findIndex((row) => {
    const label = normalizeLabel(row[0])
    return sectionLabels.some((candidate) => label.includes(candidate))
  })
  if (sectionIndex === -1) return new Map<number, number>()

  const totalRow = rows.slice(sectionIndex + 1, sectionIndex + 8).find((row) => normalizeLabel(row[0]) === 'total')
  return valuesFromRow(totalRow, years)
}

function readTpgRows() {
  const passengers = new Map<number, number>()
  const capacityRaw = new Map<number, number>()

  for (const { rows } of workbookSheets('data/raw/ocstat/manual/ge_transport_tpg.xlsx')) {
    const years = yearColumns(rows)
    const passengerRow = rowByLabels(rows, ['nombre de personnes embarquees', 'nombre total de voyages'])
    const capacityValues = firstFilledValues(
      rows,
      years,
      ['places-voyageurs dans les vehicules', 'places offertes'],
      ['places-voyageurs dans les vehicules'],
    )

    for (const [year, value] of valuesFromRow(passengerRow, years, 1000)) passengers.set(year, Math.round(value))
    for (const [year, value] of capacityValues) capacityRaw.set(year, value)
  }

  return { passengers, capacityRaw }
}

function readFrontaliersRows() {
  const sheet = workbookSheets('data/raw/ocstat/manual/ge_transport_frontaliers.xlsx')[0]
  const values = new Map<number, number>()
  if (!sheet) return values

  for (const row of sheet.rows) {
    const year = numberOrNull(row[0])
    const geneva = numberOrNull(row[2])
    if (year !== null && geneva !== null) values.set(year, Math.round(geneva))
  }

  return values
}

function readVehicleRows() {
  const values = new Map<number, number>()
  for (const { rows } of workbookSheets('data/raw/ocstat/manual/ge_transport_vehicles.xlsx')) {
    for (const row of rows) {
      const year = numberOrNull(row[0])
      const total = numberOrNull(row[21])
      if (year !== null && total !== null) values.set(year, total)
    }
  }
  return values
}

function readJobsRows() {
  const sheet = workbookSheets('data/raw/ocstat/manual/ge_transport_jobs.xlsx')
    .find((item) => item.sheetName.toLowerCase() === 'emplois')
  const values = new Map<number, number>()
  if (!sheet) return values

  const years = yearColumns(sheet.rows)
  const totalRow = sheet.rows.find((row) => normalizeLabel(row[0]) === 'total')
  for (const [year, value] of valuesFromRow(totalRow, years)) values.set(year, Math.round(value))
  return values
}

function indexValues(values: Map<number, number>) {
  const years = [...values.keys()].sort((a, b) => a - b)
  const base = years.map((year) => values.get(year)).find((value): value is number => value !== undefined && value > 0)
  const indexed = new Map<number, number>()
  if (!base) return indexed
  for (const year of years) {
    const value = values.get(year)
    if (value !== undefined) indexed.set(year, Number((value / base * 100).toFixed(1)))
  }
  return indexed
}

export async function readOcstatTransportRows(): Promise<CsvRow[]> {
  const { passengers, capacityRaw } = readTpgRows()
  const frontaliers = readFrontaliersRows()
  const vehicles = readVehicleRows()
  const jobs = readJobsRows()
  const capacityIndex = indexValues(capacityRaw)
  const roadIndex = indexValues(vehicles)
  const demography = await readCsv('data/normalized/ge_demography.csv')

  const years = Array.from(new Set([
    ...passengers.keys(),
    ...frontaliers.keys(),
    ...vehicles.keys(),
    ...jobs.keys(),
  ])).filter((year) => year >= 2000).sort((a, b) => a - b)

  return years.map((year) => {
    const population = numberOrNull(demography.find((row) => Number(row.year) === year)?.population)
    const tpgPassengers = passengers.get(year) ?? null
    const crossBorderWorkers = frontaliers.get(year) ?? null
    return {
      year,
      population,
      jobs: jobs.get(year) ?? null,
      cross_border_workers: crossBorderWorkers,
      tpg_passengers: tpgPassengers,
      public_transport_capacity_index: capacityIndex.get(year) ?? null,
      road_traffic_index: roadIndex.get(year) ?? null,
      passengers_per_resident: population !== null && tpgPassengers !== null ? Number((tpgPassengers / population).toFixed(1)) : null,
      cross_border_workers_per_1000_residents: population !== null && crossBorderWorkers !== null ? Number((crossBorderWorkers / population * 1000).toFixed(1)) : null,
      data_type: 'official',
      source_id: 'ocstat_geneva_transport;ocstat_geneva_frontaliers',
      source_note: 'OCSTAT TPG T 11.04.1.01, frontaliers T 03.05.2.04 et véhicules T 11.02.01; indices base première année disponible.',
    }
  })
}
