import { existsSync } from 'node:fs'
import XLSX from 'xlsx'
import { numberOrNull, readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'
import { addDownloadRequest } from '../lib/downloadRequests.ts'
import { fromRoot } from '../lib/paths.ts'

export const geSocialSpendingColumns = [
  'year',
  'social_assistance_million_chf',
  'health_premium_subsidy_cantonal_million_chf',
  'health_premium_subsidy_total_million_chf',
  'data_type',
  'source_id',
  'source_note',
]

const manualPath = 'data/raw/ocstat/manual/ge_social_spending.csv'
const manualWorkbookPaths = [
  'data/raw/ocstat/manual/ge_social_spending.xlsx',
  'data/raw/ocstat/manual/ge_social_spending.xls',
]

function socialAssistanceRequest() {
  addDownloadRequest({
    id: 'ge_social_assistance_spending_missing',
    dataset: 'ge_social_spending',
    missingFields: ['year', 'social_assistance_million_chf'],
    reason: 'Comparer la croissance des dépenses nettes d’aide sociale avec la démographie et le PIB.',
    preferredSource: 'OCSTAT domaine 13 Sécurité sociale, prestations sociales sous condition de ressources / aide sociale, ou Comptes de l’État de Genève Tome 2 Cohésion sociale',
    sourceUrl: 'https://statistique.ge.ch/domaines/13/13_03/',
    acceptedFormats: ['CSV', 'XLS', 'XLSX', 'PDF'],
    destinationPath: manualPath,
    instructions: 'Déposer une série annuelle avec les dépenses nettes d’aide sociale économique / Hospice général en millions CHF. Ne pas inclure les subsides LAMal afin d’éviter un double comptage.',
  })
}

async function readManualRows() {
  if (!existsSync(fromRoot(manualPath))) return []
  return (await readCsv(manualPath)).map((row): CsvRow => ({
    year: row.year,
    social_assistance_million_chf: row.social_assistance_million_chf,
    health_premium_subsidy_cantonal_million_chf: row.health_premium_subsidy_cantonal_million_chf,
    health_premium_subsidy_total_million_chf: row.health_premium_subsidy_total_million_chf,
    data_type: row.data_type || 'official',
    source_id: row.source_id || 'ocstat_geneva_social_assistance',
    source_note: row.source_note || 'Aide sociale Genève, fichier manuel.',
  }))
}

function normalizeLabel(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function workbookPath() {
  return manualWorkbookPaths.find((path) => existsSync(fromRoot(path)))
}

function readWorkbookRows(): CsvRow[] {
  const path = workbookPath()
  if (!path) return []
  const workbook = XLSX.readFile(fromRoot(path))
  const rows = workbook.SheetNames.flatMap((sheetName) => XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' }))
  const text = rows.flat().map(normalizeLabel).join(' ')

  const customHeaderIndex = rows.findIndex((row) => row.some((cell) => normalizeLabel(cell) === 'year') && row.some((cell) => normalizeLabel(cell) === 'social_assistance_million_chf'))
  if (customHeaderIndex !== -1) {
    const headers = rows[customHeaderIndex].map(normalizeLabel)
    const yearIndex = headers.findIndex((label) => label === 'year')
    const socialAssistanceIndex = headers.findIndex((label) => label === 'social_assistance_million_chf')
    return rows.slice(customHeaderIndex + 1).map((row): CsvRow => ({
      year: numberOrNull(row[yearIndex]),
      social_assistance_million_chf: numberOrNull(row[socialAssistanceIndex]),
      health_premium_subsidy_cantonal_million_chf: null,
      health_premium_subsidy_total_million_chf: null,
      data_type: 'official',
      source_id: 'ocstat_geneva_social_assistance',
      source_note: 'Aide sociale Genève, fichier manuel Excel.',
    })).filter((row) => numberOrNull(row.year) !== null && numberOrNull(row.social_assistance_million_chf) !== null)
  }

  const headerIndex = rows.findIndex((row) => row.some((cell) => normalizeLabel(cell) === 'annee') && row.some((cell) => normalizeLabel(cell) === 'aide sociale'))
  if (headerIndex === -1) return []
  const headers = rows[headerIndex].map(normalizeLabel)
  const yearIndex = headers.findIndex((label) => label === 'annee')
  const socialAssistanceIndex = headers.findIndex((label) => label === 'aide sociale')
  if (yearIndex === -1 || socialAssistanceIndex === -1) return []
  const isGenevaWorkbook = text.includes('geneve')
  const sourceId = isGenevaWorkbook ? 'bfs_fibs_social_assistance_ge' : 'bfs_fibs_social_assistance_ch'
  const sourceNote = isGenevaWorkbook
    ? 'OFS FIBS, dépenses nettes d’aide sociale économique pour Genève, en millions CHF à prix courants.'
    : 'OFS FIBS tableau T 13.05.02.02, dépenses nettes d’aide sociale économique pour la Suisse, en millions CHF à prix courants; proxy de croissance en attente de l’export cantonal Genève.'
  const output: CsvRow[] = []
  for (const row of rows.slice(headerIndex + 1)) {
    const year = numberOrNull(row[yearIndex])
    if (year === null) {
      if (output.length > 0) break
      continue
    }
    const value = numberOrNull(row[socialAssistanceIndex])
    if (value === null) continue
    output.push({
      year,
      social_assistance_million_chf: value,
      health_premium_subsidy_cantonal_million_chf: null,
      health_premium_subsidy_total_million_chf: null,
      data_type: isGenevaWorkbook ? 'official' : 'official_proxy',
      source_id: sourceId,
      source_note: sourceNote,
    })
  }
  return output
}

async function readHealthSubsidyRows() {
  const rows = existsSync(fromRoot('data/normalized/ge_health_subsidies.csv'))
    ? await readCsv('data/normalized/ge_health_subsidies.csv')
    : []
  return rows.map((row): CsvRow => {
    const total = numberOrNull(row.subsidy_amount_million_chf)
    const cantonalShare = numberOrNull(row.cantonal_share)
    return {
      year: row.year,
      social_assistance_million_chf: null,
      health_premium_subsidy_cantonal_million_chf: total === null || cantonalShare === null ? null : Number((total * cantonalShare).toFixed(2)),
      health_premium_subsidy_total_million_chf: total,
      data_type: row.data_type || 'official',
      source_id: 'ofsp_health_premium_subsidies',
      source_note: 'OFSP Dashboard assurance-maladie: réduction des primes AOS Genève; part cantonale calculée depuis le total et la part cantonale.',
    }
  })
}

function mergeRows(...groups: CsvRow[][]) {
  const rows = new Map<number, CsvRow>()
  for (const group of groups) {
    for (const row of group) {
      const year = numberOrNull(row.year)
      if (year === null) continue
      const existing = rows.get(year) ?? { year }
      rows.set(year, {
        ...existing,
        ...Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null && value !== '')),
        source_id: [existing.source_id, row.source_id].filter(Boolean).join(';') || row.source_id,
        source_note: [existing.source_note, row.source_note].filter(Boolean).join(' '),
      })
    }
  }
  return [...rows.values()].sort((a, b) => Number(a.year) - Number(b.year))
}

export async function normalizeGeSocialSpending() {
  const rows = mergeRows(await readHealthSubsidyRows(), readWorkbookRows(), await readManualRows())
  const hasGenevaSocialAssistance = rows.some((row) =>
    numberOrNull(row.social_assistance_million_chf) !== null
    && !String(row.source_id ?? '').includes('bfs_fibs_social_assistance_ch')
  )
  if (!hasGenevaSocialAssistance) {
    socialAssistanceRequest()
  }
  await writeCsv('data/normalized/ge_social_spending.csv', rows, geSocialSpendingColumns)
  return rows
}
