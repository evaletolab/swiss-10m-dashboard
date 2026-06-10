import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { parse } from 'csv-parse/sync'
import { unzipSync } from 'fflate'
import XLSX from 'xlsx'
import { numberOrNull, type CsvRow } from './csv.ts'
import { fromRoot } from './paths.ts'

type RawRow = Record<string, unknown>

export type GenevaPremiumRow = CsvRow & {
  year: number
  lamal_average_premium: number
  source_note: string
}

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function decodeCsv(bytes: Uint8Array) {
  const utf8 = new TextDecoder('utf-8').decode(bytes)
  const replacementCount = (utf8.match(/\uFFFD/g) ?? []).length
  if (replacementCount < 5) return utf8
  return new TextDecoder('latin1').decode(bytes)
}

function delimiterFor(content: string) {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? ''
  return firstLine.split(';').length >= firstLine.split(',').length ? ';' : ','
}

function parseCsvRows(bytes: Uint8Array): RawRow[] {
  const content = decodeCsv(bytes)
  return parse(content, {
    bom: true,
    columns: true,
    delimiter: delimiterFor(content),
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawRow[]
}

function parseWorkbookRows(bytes: Uint8Array): RawRow[] {
  const workbook = XLSX.read(Buffer.from(bytes), { type: 'buffer' })
  return workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) return []
    return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' })
  })
}

function isPremiumEntry(name: string) {
  const normalized = normalizeKey(name)
  const isSpreadsheet = normalized.endsWith('.csv') || normalized.endsWith('.xlsx') || normalized.endsWith('.xls')
  const mentionsPremium = normalized.includes('pramien') || normalized.includes('praemien') || normalized.includes('premium')
  const mentionsSwitzerland = normalized.includes('_ch') || normalized.includes('/ch') || normalized.includes('schweiz')
  const excludesEuOnly = !normalized.includes('_eu') && !normalized.includes('cheu')
  return isSpreadsheet && mentionsPremium && mentionsSwitzerland && excludesEuOnly
}

function entryPriority(name: string) {
  const normalized = normalizeKey(name)
  if (normalized.includes('pramien_ch') || normalized.includes('praemien_ch')) return 0
  if (normalized.endsWith('.csv')) return 1
  return 2
}

function hasGenevaValue(value: unknown) {
  const normalized = normalizeKey(String(value ?? '').trim())
  return normalized === 'ge' || normalized.startsWith('ge ') || normalized.includes('geneve') || normalized.includes('genf') || normalized.includes('geneva')
}

function detectCantonColumns(row: RawRow) {
  return Object.keys(row).filter((key) => {
    const normalized = normalizeKey(key)
    return normalized.includes('kanton') || normalized.includes('canton') || normalized === 'kt' || normalized === 'cantoncode'
  })
}

function detectPremiumColumns(rows: RawRow[]) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  return keys.filter((key) => {
    const normalized = normalizeKey(key)
    const looksLikePremium = normalized.includes('praemie') || normalized.includes('pramie') || normalized.includes('premium') || normalized.includes('prime')
    if (!looksLikePremium) return false
    const sample = rows.slice(0, 200).map((row) => numberOrNull(row[key])).filter((value): value is number => value !== null)
    return sample.some((value) => value > 10 && value < 3000)
  })
}

function filterGenevaRows(rows: RawRow[]) {
  return rows.filter((row) => {
    const cantonColumns = detectCantonColumns(row)
    if (cantonColumns.length > 0) return cantonColumns.some((column) => hasGenevaValue(row[column]))
    return Object.values(row).some(hasGenevaValue)
  })
}

function averagePremium(rows: RawRow[]) {
  const baseRows = rows.filter(isBasePremiumRow)
  const selectedRows = baseRows.length > 0 ? baseRows : rows
  const premiumColumns = detectPremiumColumns(selectedRows)
  for (const column of premiumColumns) {
    const values = selectedRows
      .map((row) => numberOrNull(row[column]))
      .filter((value): value is number => value !== null && value > 10 && value < 3000)
    if (values.length > 0) {
      return {
        value: values.reduce((sum, value) => sum + value, 0) / values.length,
        count: values.length,
        column,
      }
    }
  }
  return null
}

function yearFromArchiveName(name: string) {
  return numberOrNull(name.match(/(20\d{2})/)?.[1])
}

function rowsFromEntry(name: string, bytes: Uint8Array) {
  const normalized = normalizeKey(name)
  if (normalized.endsWith('.csv')) return parseCsvRows(bytes)
  if (normalized.endsWith('.xlsx') || normalized.endsWith('.xls')) return parseWorkbookRows(bytes)
  return []
}

function premiumYear(row: RawRow) {
  return numberOrNull(row['Geschäftsjahr'] ?? row['Geschaeftsjahr'] ?? row['Année'] ?? row.year)
}

function isBasePremiumRow(row: RawRow) {
  return String(row.isBaseP ?? '') === '1' && String(row.isBaseF ?? '') === '1'
}

function averageManualPremium(rows: RawRow[]) {
  const values = rows
    .map((row) => numberOrNull(row['Prämie'] ?? row['Praemie'] ?? row['Prime'] ?? row.premium))
    .filter((value): value is number => value !== null && value > 10 && value < 3000)
  if (values.length === 0) return null
  return {
    value: values.reduce((sum, value) => sum + value, 0) / values.length,
    count: values.length,
  }
}

export async function readOfspManualGenevaPremiums(): Promise<GenevaPremiumRow[]> {
  const path = 'data/raw/ofsp/manual/praemien_ch.csv'
  if (!existsSync(fromRoot(path))) return []
  const rows = parseCsvRows(new Uint8Array(await readFile(fromRoot(path))))
  const genevaRows = filterGenevaRows(rows)
  const selectedRows = genevaRows.filter(isBasePremiumRow)
  const sourceRows = selectedRows.length > 0 ? selectedRows : genevaRows
  const byYear = new Map<number, RawRow[]>()

  for (const row of sourceRows) {
    const year = premiumYear(row)
    if (year === null) continue
    byYear.set(year, [...(byYear.get(year) ?? []), row])
  }

  return [...byYear.entries()].flatMap(([year, yearRows]) => {
    const premium = averageManualPremium(yearRows)
    if (!premium) return []
    return [{
      year,
      lamal_average_premium: Number(premium.value.toFixed(2)),
      source_id: 'ofsp_lamal_premiums',
      source_note: `OFSP Prämien_CH.csv; moyenne arithmétique non pondérée des primes mensuelles de base Genève sur ${premium.count} lignes.`,
    }]
  }).sort((a, b) => a.year - b.year)
}

export async function readOfspGenevaPremiums(): Promise<GenevaPremiumRow[]> {
  const archiveDir = fromRoot('data/raw/ofsp/archives')
  if (!existsSync(archiveDir)) return []
  const archiveNames = (await readdir(archiveDir)).filter((name) => name.toLowerCase().endsWith('.zip')).sort()
  const rows: GenevaPremiumRow[] = []

  for (const archiveName of archiveNames) {
    const year = yearFromArchiveName(archiveName)
    if (!year) continue
    let archive: Record<string, Uint8Array>
    try {
      archive = unzipSync(new Uint8Array(await readFile(fromRoot('data/raw/ofsp/archives', archiveName))))
    } catch (error) {
      console.warn(`[ofsp] archive ${archiveName} skipped: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    const candidates = Object.entries(archive)
      .filter(([name]) => isPremiumEntry(name))
      .sort(([a], [b]) => entryPriority(a) - entryPriority(b))

    for (const [entryName, bytes] of candidates) {
      try {
        const parsedRows = rowsFromEntry(entryName, bytes)
        const genevaRows = filterGenevaRows(parsedRows)
        const premium = averagePremium(genevaRows)
        if (!premium) continue
        rows.push({
          year,
          lamal_average_premium: Number(premium.value.toFixed(2)),
          source_id: 'ofsp_lamal_premiums',
          source_note: `OFSP archive ${archiveName}, ${entryName}; moyenne arithmétique non pondérée sur ${premium.count} lignes Genève (${premium.column}).`,
        })
        break
      } catch (error) {
        console.warn(`[ofsp] ${archiveName}/${entryName} skipped: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  return rows.sort((a, b) => a.year - b.year)
}
