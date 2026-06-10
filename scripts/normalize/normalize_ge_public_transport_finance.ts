import { existsSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import XLSX from 'xlsx'
import { readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'
import { addDownloadRequest } from '../lib/downloadRequests.ts'
import { fromRoot } from '../lib/paths.ts'

export const gePublicTransportFinanceColumns = [
  'year',
  'transport_revenue_million_chf',
  'subscriptions_revenue_million_chf',
  'operating_subsidy_million_chf',
  'operating_expenses_million_chf',
  'adult_annual_subscription_chf',
  'data_type',
  'source_id',
  'source_note',
]

const manualCsvPath = 'data/raw/tpg/manual/ge_public_transport_finance.csv'
const manualWorkbookPaths = [
  'data/raw/tpg/manual/ge_public_transport_finance.xlsx',
  'data/raw/tpg/manual/ge_public_transport_finance.xls',
]
const pdfDir = 'data/raw/tpg/manual'

function workbookPath() {
  return manualWorkbookPaths.find((path) => existsSync(fromRoot(path)))
}

function readWorkbookRows(): CsvRow[] {
  const path = workbookPath()
  if (!path) return []
  const workbook = XLSX.readFile(fromRoot(path))
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  return XLSX.utils.sheet_to_json<CsvRow>(workbook.Sheets[sheetName], { defval: '' }).map((row): CsvRow => ({
    ...row,
    data_type: row.data_type || 'official',
    source_id: row.source_id || 'tpg_annual_reports_finance',
    source_note: row.source_note || 'TPG rapports annuels, états financiers et tarifs unireso, fichier manuel Excel.',
  }))
}

function pdfText(relativePath: string) {
  try {
    return execFileSync('pdftotext', ['-layout', fromRoot(relativePath), '-'], {
      encoding: 'utf8',
      maxBuffer: 40 * 1024 * 1024,
    })
  } catch {
    return ''
  }
}

function parseNumber(value: string | undefined) {
  if (!value) return null
  const normalized = value.replaceAll("'", '').replaceAll('’', '').replaceAll(' ', '').replaceAll('\u00a0', '').replace('–', '-')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function trailingValues(line: string) {
  const tokens = line.match(/(?:-|–)?\d{1,3}(?:[ '’\u00a0]\d{3})+|(?:-|–)?\d+(?:['’]\d{3})*/g) ?? []
  if (tokens.length === 0) return []
  return tokens.slice(-2).map(parseNumber)
}

function lineValues(text: string, pattern: RegExp) {
  const line = text.split('\n').find((item) => pattern.test(item))
  return line ? trailingValues(line) : []
}

function reportYears(text: string, fallbackYear: number) {
  const header = text.match(/En CHF\s+Notes\s+(\d{4})\s+(\d{4})/)
    ?? text.match(/En milliers de CHF[\s\S]{0,120}?(\d{4})\s+(\d{4})/)
    ?? text.match(/Finances[\s\S]{0,120}?(\d{4})\s+(\d{4})/)
  if (!header) return [fallbackYear, fallbackYear - 1]
  return [Number(header[1]), Number(header[2])]
}

function toMillionChf(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  const chf = Math.abs(value) < 1_000_000 ? value * 1000 : value
  return Number((chf / 1_000_000).toFixed(2))
}

function mergeRow(target: Map<number, CsvRow>, year: number, patch: Partial<CsvRow>, sourceNote: string) {
  const existing = target.get(year) ?? {
    year,
    transport_revenue_million_chf: null,
    subscriptions_revenue_million_chf: null,
    operating_subsidy_million_chf: null,
    operating_expenses_million_chf: null,
    adult_annual_subscription_chf: null,
    data_type: 'official',
    source_id: 'tpg_annual_reports_finance',
    source_note: sourceNote,
  }
  target.set(year, { ...existing, ...patch, source_note: sourceNote })
}

function readPdfRows(): CsvRow[] {
  if (!existsSync(fromRoot(pdfDir))) return []
  const files = readdirSync(fromRoot(pdfDir))
    .filter((file) => file.endsWith('.pdf') && /tpg_(finances|rapport)_\d{4}\.pdf/i.test(file))
    .sort((a, b) => a.localeCompare(b))
  const rows = new Map<number, CsvRow>()

  for (const file of files) {
    const fallbackYear = Number(file.match(/(\d{4})/)?.[1])
    if (!Number.isFinite(fallbackYear)) continue
    const text = pdfText(`${pdfDir}/${file}`)
    if (!text) continue
    const years = reportYears(text, fallbackYear)
    const transportRevenue = lineValues(text, /REVENUS DES TRANSPORTS|Total produits du transport/i)
    const subscriptionsRevenue = lineValues(text, /(?:REVENUS|PRODUITS|RECETTES).*ABONNEMENTS|ABONNEMENTS.*(?:REVENUS|PRODUITS|RECETTES)/i)
    const stateContribution = lineValues(text, /CONTRIBUTION DE L['’][EÉ]TAT DE GEN[EÈ]VE/i)
    const operatingExpenses = lineValues(text, /TOTAL DES CHARGES D['’]EXPLOITATION|Charges totales/i)

    years.forEach((year, index) => {
      mergeRow(rows, year, {
        transport_revenue_million_chf: toMillionChf(transportRevenue[index]),
        subscriptions_revenue_million_chf: toMillionChf(subscriptionsRevenue[index]),
        operating_subsidy_million_chf: toMillionChf(stateContribution[index]),
        operating_expenses_million_chf: toMillionChf(operatingExpenses[index]),
      }, `TPG PDF ${file}, extraction automatique des lignes financières.`)
    })
  }

  return [...rows.values()]
    .filter((row) => row.transport_revenue_million_chf !== null || row.operating_subsidy_million_chf !== null || row.operating_expenses_million_chf !== null)
    .sort((a, b) => Number(a.year) - Number(b.year))
}

export async function normalizeGePublicTransportFinance() {
  const workbookRows = readWorkbookRows()
  if (workbookRows.length > 0) {
    await writeCsv('data/normalized/ge_public_transport_finance.csv', workbookRows, gePublicTransportFinanceColumns)
    return workbookRows
  }

  const pdfRows = readPdfRows()
  if (pdfRows.length > 0) {
    if (!pdfRows.some((row) => row.adult_annual_subscription_chf !== null && row.adult_annual_subscription_chf !== undefined && row.adult_annual_subscription_chf !== '')) {
      addDownloadRequest({
        id: 'ge_public_transport_fare_missing',
        dataset: 'ge_public_transport_finance',
        missingFields: ['adult_annual_subscription_chf'],
        reason: 'Comparer le prix usager des transports publics avec les subventions et la croissance démographique.',
        preferredSource: 'Tarifs unireso / TPG, lois tarifaires et archives Grand Conseil',
        sourceUrl: 'https://www.tpg.ch/fr/tarifs-titres-de-transport',
        acceptedFormats: ['CSV', 'XLS', 'XLSX', 'PDF'],
        destinationPath: `${manualCsvPath} ou data/raw/tpg/manual/ge_public_transport_finance.xlsx`,
        instructions: 'Compléter la série avec le prix de l’abonnement annuel adulte Tout Genève/zone 10 par année.',
      })
    }
    await writeCsv('data/normalized/ge_public_transport_finance.csv', pdfRows, gePublicTransportFinanceColumns)
    return pdfRows
  }

  if (!existsSync(fromRoot(manualCsvPath))) {
    addDownloadRequest({
      id: 'ge_public_transport_finance_manual_source_missing',
      dataset: 'ge_public_transport_finance',
      missingFields: ['year', 'transport_revenue_million_chf', 'operating_subsidy_million_chf', 'operating_expenses_million_chf', 'adult_annual_subscription_chf'],
      reason: 'Comparer la croissance démographique et économique avec les finances, subventions et tarifs des transports publics.',
      preferredSource: 'Rapports annuels TPG, états financiers TPG, contrats de prestations et tarifs unireso',
      sourceUrl: 'https://www.tpg.ch/fr/nous-connaitre/publications/rapports-annuels',
      acceptedFormats: ['CSV', 'XLS', 'XLSX', 'PDF'],
      destinationPath: `${manualCsvPath} ou data/raw/tpg/manual/ge_public_transport_finance.xlsx`,
      instructions: 'Déposer une série annuelle TPG avec revenus de transport, revenus abonnements, indemnités/subventions d’exploitation, charges d’exploitation et prix de l’abonnement annuel adulte Tout Genève.',
    })
    await writeCsv('data/normalized/ge_public_transport_finance.csv', [], gePublicTransportFinanceColumns)
    return []
  }

  const rows = (await readCsv(manualCsvPath)).map((row): CsvRow => ({
    ...row,
    data_type: row.data_type || 'official',
    source_id: row.source_id || 'tpg_annual_reports_finance',
    source_note: row.source_note || 'TPG rapports annuels, états financiers et tarifs unireso, fichier manuel.',
  }))
  await writeCsv('data/normalized/ge_public_transport_finance.csv', rows, gePublicTransportFinanceColumns)
  return rows
}

