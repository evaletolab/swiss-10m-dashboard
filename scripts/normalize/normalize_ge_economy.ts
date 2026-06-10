import { existsSync } from 'node:fs'
import XLSX from 'xlsx'
import { numberOrNull, readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'
import { addDownloadRequest } from '../lib/downloadRequests.ts'
import { fromRoot } from '../lib/paths.ts'

export const geEconomyColumns = [
  'year',
  'gdp_million_chf',
  'gdp_per_capita_chf',
  'jobs',
  'data_type',
  'source_id',
  'source_note',
]

type SheetRow = unknown[]

const manualCsvPath = 'data/raw/ocstat/manual/ge_economy.csv'
const manualWorkbookPaths = [
  'data/raw/ocstat/manual/ge_economy.xlsx',
  'data/raw/ocstat/manual/ge_economy.xls',
]

function normalizeLabel(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function workbookPath() {
  return manualWorkbookPaths.find((path) => existsSync(fromRoot(path)))
}

function workbookRows(relativePath: string): SheetRow[] {
  const workbook = XLSX.readFile(fromRoot(relativePath))
  return workbook.SheetNames.flatMap((sheetName) => XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName], { header: 1, defval: '' }))
}

function yearColumns(row: SheetRow) {
  return row
    .map((value, index) => ({ year: numberOrNull(value), index }))
    .filter((item): item is { year: number; index: number } => item.year !== null && item.year >= 2000 && item.year <= 2050)
}

function readHorizontalGenevaRows(rows: SheetRow[]): CsvRow[] {
  const header = rows.find((row) => yearColumns(row).length >= 5)
  if (!header) return []
  const years = yearColumns(header)
  const genevaRows = rows.filter((row) => row.some((cell) => normalizeLabel(cell).includes('geneve') || normalizeLabel(cell).includes('geneva')))
  if (genevaRows.length === 0) return []

  const gdpRow = genevaRows.find((row) => !row.some((cell) => normalizeLabel(cell).includes('habitant'))) ?? genevaRows[0]
  const perCapitaRow = genevaRows.find((row) => row.some((cell) => normalizeLabel(cell).includes('habitant') || normalizeLabel(cell).includes('capita')))

  return years.map(({ year, index }) => ({
    year,
    gdp_million_chf: numberOrNull(gdpRow?.[index]),
    gdp_per_capita_chf: numberOrNull(perCapitaRow?.[index]),
    jobs: null,
    data_type: 'official',
    source_id: 'bfs_ocstat_geneva_gdp',
    source_note: 'PIB cantonal Genève, fichier manuel Excel.',
  })).filter((row) => row.gdp_million_chf !== null || row.gdp_per_capita_chf !== null)
}

function readVerticalRows(rows: SheetRow[]): CsvRow[] {
  const headerIndex = rows.findIndex((row) => row.some((cell) => normalizeLabel(cell).includes('annee') || normalizeLabel(cell).includes('year')) && row.some((cell) => normalizeLabel(cell).includes('pib') || normalizeLabel(cell).includes('gdp')))
  if (headerIndex === -1) return []
  const headers = rows[headerIndex].map(normalizeLabel)
  const yearIndex = headers.findIndex((label) => label.includes('annee') || label.includes('year'))
  const gdpIndex = headers.findIndex((label) => (label.includes('pib') || label.includes('gdp')) && !label.includes('habitant') && !label.includes('capita'))
  const perCapitaIndex = headers.findIndex((label) => label.includes('habitant') || label.includes('capita'))
  const jobsIndex = headers.findIndex((label) => label.includes('emploi') || label.includes('jobs'))
  if (yearIndex === -1) return []

  return rows.slice(headerIndex + 1).map((row): CsvRow => ({
    year: numberOrNull(row[yearIndex]),
    gdp_million_chf: gdpIndex === -1 ? null : numberOrNull(row[gdpIndex]),
    gdp_per_capita_chf: perCapitaIndex === -1 ? null : numberOrNull(row[perCapitaIndex]),
    jobs: jobsIndex === -1 ? null : numberOrNull(row[jobsIndex]),
    data_type: 'official',
    source_id: 'bfs_ocstat_geneva_gdp',
    source_note: 'PIB cantonal Genève, fichier manuel Excel.',
  })).filter((row) => numberOrNull(row.year) !== null && numberOrNull(row.year) >= 2000)
}

function readEconomyWorkbookRows(): CsvRow[] {
  const path = workbookPath()
  if (!path) return []
  const rows = workbookRows(path)
  return readVerticalRows(rows).length > 0 ? readVerticalRows(rows) : readHorizontalGenevaRows(rows)
}

const ocstatMementoRows: CsvRow[] = [
  {
    year: 2023,
    gdp_million_chf: 62216,
    gdp_per_capita_chf: 119817,
    jobs: null,
    data_type: 'official',
    source_id: 'bfs_ocstat_geneva_gdp',
    source_note: 'OCSTAT Mémento statistique du canton de Genève 2025, PIB 2023 provisoire.',
  },
  {
    year: 2024,
    gdp_million_chf: 62877,
    gdp_per_capita_chf: 119152,
    jobs: null,
    data_type: 'official',
    source_id: 'bfs_ocstat_geneva_gdp',
    source_note: 'OCSTAT Mémento statistique du canton de Genève 2025, PIB 2024 provisoire.',
  },
]

function mergeSupplementalRows(rows: CsvRow[]) {
  const byYear = new Map(rows.map((row) => [Number(row.year), row]))
  for (const row of ocstatMementoRows) {
    const year = Number(row.year)
    const existing = byYear.get(year)
    byYear.set(year, {
      ...existing,
      ...Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null && value !== '')),
      source_note: existing?.source_note
        ? `${existing.source_note} ${row.source_note}`
        : row.source_note,
    })
  }
  return [...byYear.values()].sort((a, b) => Number(a.year) - Number(b.year))
}

export async function normalizeGeEconomy() {
  const workbookRows = readEconomyWorkbookRows()
  if (workbookRows.length > 0) {
    const rows = mergeSupplementalRows(workbookRows)
    await writeCsv('data/normalized/ge_economy.csv', rows, geEconomyColumns)
    return rows
  }

  if (!existsSync(fromRoot(manualCsvPath))) {
    addDownloadRequest({
      id: 'ge_economy_manual_source_missing',
      dataset: 'ge_economy',
      missingFields: ['year', 'gdp_million_chf', 'gdp_per_capita_chf', 'jobs'],
      reason: 'Comparer la croissance démographique avec la croissance économique cantonale.',
      preferredSource: 'OFS PIB cantonal / VAB cantonale, OCSTAT PIB Genève',
      sourceUrl: 'https://www.bfs.admin.ch/bfs/fr/home/statistiques/economie-nationale/comptes-nationaux/produit-interieur-brut-canton.html',
      acceptedFormats: ['CSV', 'XLS', 'XLSX'],
      destinationPath: `${manualCsvPath} ou data/raw/ocstat/manual/ge_economy.xlsx`,
      instructions: 'Déposer une série annuelle Genève avec PIB cantonal total en millions CHF, PIB par habitant si disponible, et emplois si disponible. Le fichier Excel OFS/OCSTAT peut être nommé ge_economy.xlsx.',
    })
    await writeCsv('data/normalized/ge_economy.csv', [], geEconomyColumns)
    return []
  }

  const rows = mergeSupplementalRows((await readCsv(manualCsvPath)).map((row): CsvRow => ({
    ...row,
    data_type: row.data_type || 'official',
    source_id: row.source_id || 'bfs_ocstat_geneva_gdp',
    source_note: row.source_note || 'PIB cantonal Genève, fichier manuel.',
  })))
  await writeCsv('data/normalized/ge_economy.csv', rows, geEconomyColumns)
  return rows
}

