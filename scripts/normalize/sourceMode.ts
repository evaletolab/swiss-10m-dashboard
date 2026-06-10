import { existsSync } from 'node:fs'
import { readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'
import { fromRoot } from '../lib/paths.ts'
import { addDownloadRequest } from '../lib/downloadRequests.ts'

export type DatasetConfig = {
  id: string
  output: string
  manualPath: string
  officialPath?: string
  mockRows: () => CsvRow[]
  columns: string[]
  request: {
    missingFields: string[]
    reason: string
    preferredSource: string
    sourceUrl: string | null
    acceptedFormats: string[]
    destinationPath: string
    instructions: string
  }
}

function mode() {
  return (process.env.DATA_MODE ?? 'auto').toLowerCase()
}

export async function normalizeDataset(config: DatasetConfig) {
  const dataMode = mode()
  const officialAvailable = config.officialPath ? existsSync(fromRoot(config.officialPath)) : false
  const manualAvailable = existsSync(fromRoot(config.manualPath))

  if (!officialAvailable && !manualAvailable) {
    addDownloadRequest({
      id: `${config.id}_manual_source_missing`,
      dataset: config.id,
      ...config.request,
    })
  }

  if ((dataMode === 'official' || dataMode === 'auto') && officialAvailable && config.officialPath) {
    const rows = await readCsv(config.officialPath)
    await writeCsv(config.output, rows, config.columns)
    return rows
  }

  if ((dataMode === 'manual' || dataMode === 'official' || dataMode === 'auto') && manualAvailable) {
    const rows = await readCsv(config.manualPath)
    await writeCsv(config.output, rows, config.columns)
    return rows
  }

  if (dataMode === 'manual' || dataMode === 'official') {
    const emptyRows = config.mockRows().map((row) => Object.fromEntries(config.columns.map((column) => [column, column === 'year' ? row.year : null])))
    await writeCsv(config.output, emptyRows, config.columns)
    return emptyRows
  }

  const rows = config.mockRows()
  await writeCsv(config.output, rows, config.columns)
  return rows
}
