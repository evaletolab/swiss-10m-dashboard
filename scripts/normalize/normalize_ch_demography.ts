import { z } from 'zod'
import { writeCsv } from '../lib/csv.ts'
import { readBfsBalanceRows } from '../lib/bfsBalance.ts'
import { mockChDemography } from '../lib/mockData.ts'
import { normalizeDataset } from './sourceMode.ts'

export const chDemographyColumns = ['year', 'population', 'total_growth', 'births', 'deaths', 'natural_balance', 'immigration', 'emigration', 'net_migration', 'fertility_rate', 'data_type', 'source_id', 'source_note']

const Row = z.object({
  year: z.coerce.number().int(),
  population: z.coerce.number().nullable(),
  total_growth: z.coerce.number().nullable(),
  births: z.coerce.number().nullable(),
  deaths: z.coerce.number().nullable(),
  natural_balance: z.coerce.number().nullable(),
  immigration: z.coerce.number().nullable(),
  emigration: z.coerce.number().nullable(),
  net_migration: z.coerce.number().nullable(),
  fertility_rate: z.coerce.number().nullable(),
  data_type: z.string().default('observed'),
})

export async function normalizeChDemography() {
  const dataMode = (process.env.DATA_MODE ?? 'auto').toLowerCase()
  if (dataMode !== 'mock') {
    const bfsRows = await readBfsBalanceRows({
      path: 'data/raw/bfs/manual/ch_demography.csv',
      territoryIncludes: ['Suisse'],
      sourceId: 'bfs_statpop_population_balance',
      sourceNote: 'OFS STATPOP / PX-Web, bilan démographique institutionnel.',
    })
    if (bfsRows.length > 0) {
      bfsRows.forEach((row) => Row.partial().parse(row))
      await writeCsv('data/normalized/ch_demography.csv', bfsRows, chDemographyColumns)
      return bfsRows
    }
  }

  const rows = await normalizeDataset({
    id: 'ch_demography',
    output: 'data/normalized/ch_demography.csv',
    manualPath: 'data/raw/bfs/manual/ch_demography.csv',
    officialPath: 'data/raw/bfs/ch_population_balance.csv',
    mockRows: mockChDemography,
    columns: chDemographyColumns,
    request: {
      missingFields: ['year', 'population', 'births', 'deaths', 'immigration', 'emigration', 'net_migration', 'fertility_rate'],
      reason: 'Comparer la trajectoire suisse observée, les tendances et le scénario 10 millions.',
      preferredSource: 'OFS STATPOP / STAT-TAB PX-Web',
      sourceUrl: 'https://opendata.swiss/fr/dataset/demografische-bilanz-nach-institutionellen-gliederungen2',
      acceptedFormats: ['CSV', 'JSON-stat2', 'XLSX'],
      destinationPath: 'data/raw/bfs/manual/ch_demography.csv',
      instructions: 'Exporter une ligne par année avec les colonnes normalisées attendues.',
    },
  })
  rows.forEach((row) => Row.partial().parse(row))
  await writeCsv('data/normalized/ch_demography.csv', rows, chDemographyColumns)
  return rows
}
