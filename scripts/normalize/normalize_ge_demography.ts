import { numberOrNull, writeCsv } from '../lib/csv.ts'
import { readBfsBalanceRows } from '../lib/bfsBalance.ts'
import { mockGeDemography } from '../lib/mockData.ts'
import { normalizeDataset } from './sourceMode.ts'

export const geDemographyColumns = ['year', 'population', 'total_growth', 'births', 'deaths', 'natural_balance', 'immigration', 'emigration', 'net_migration', 'net_migration_share_of_growth', 'data_type', 'source_id', 'source_note']

export async function normalizeGeDemography() {
  const dataMode = (process.env.DATA_MODE ?? 'auto').toLowerCase()
  if (dataMode !== 'mock') {
    const bfsRows = await readBfsBalanceRows({
      path: 'data/raw/bfs/manual/ge_demography.csv',
      territoryIncludes: ['Genève', 'Geneve'],
      sourceId: 'bfs_statpop_population_balance',
      sourceNote: 'OFS STATPOP / PX-Web, bilan démographique institutionnel filtré sur Genève.',
    })
    if (bfsRows.length > 0) {
      const rows = bfsRows.map((row) => {
        const growth = numberOrNull(row.total_growth)
        const migration = numberOrNull(row.net_migration)
        return {
          ...row,
          net_migration_share_of_growth: growth !== null && growth !== 0 && migration !== null ? Number((migration / growth).toFixed(4)) : null,
        }
      })
      await writeCsv('data/normalized/ge_demography.csv', rows, geDemographyColumns)
      return rows
    }
  }

  const rows = await normalizeDataset({
    id: 'ge_demography',
    output: 'data/normalized/ge_demography.csv',
    manualPath: 'data/raw/ocstat/manual/ge_demography.csv',
    officialPath: 'data/raw/ocstat/ge_demography.csv',
    mockRows: mockGeDemography,
    columns: geDemographyColumns,
    request: {
      missingFields: ['year', 'population', 'births', 'deaths', 'natural_balance', 'net_migration'],
      reason: 'Calculer la tendance Genève 2000-2025, le solde migratoire et la part de croissance migratoire.',
      preferredSource: 'OCSTAT population résidante et bilan annuel',
      sourceUrl: 'https://statistique.ge.ch/graphiques/affichage.asp?filtreGraph=01_01',
      acceptedFormats: ['CSV', 'XLSX', 'PDF'],
      destinationPath: 'data/raw/ocstat/manual/ge_demography.csv',
      instructions: 'Déposer un CSV annuel Genève avec population, naissances, décès et si possible solde migratoire officiel.',
    },
  })

  for (const row of rows) {
    const growth = numberOrNull(row.total_growth)
    const natural = numberOrNull(row.natural_balance)
    const migration = numberOrNull(row.net_migration)
    if (growth !== null && natural !== null && migration !== null && Math.abs(natural + migration - growth) > 50) {
      console.warn(`[normalize:ge_demography] warning ${row.year}: natural + migration differs from growth`)
    }
  }
  await writeCsv('data/normalized/ge_demography.csv', rows, geDemographyColumns)
  return rows
}
