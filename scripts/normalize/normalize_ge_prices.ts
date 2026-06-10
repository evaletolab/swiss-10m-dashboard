import { writeCsv } from '../lib/csv.ts'
import { addDownloadRequest } from '../lib/downloadRequests.ts'
import { mockGePrices } from '../lib/mockData.ts'
import { readOcstatPricesRows } from '../lib/ocstatPrices.ts'
import { normalizeDataset } from './sourceMode.ts'

export const gePricesColumns = ['year', 'cpi_total', 'cpi_rent', 'cpi_food', 'cpi_health', 'cpi_transport', 'cpi_total_yoy', 'cpi_rent_yoy', 'cpi_food_yoy', 'cpi_health_yoy', 'cpi_transport_yoy', 'data_type', 'source_id', 'source_note']

export async function normalizeGePrices() {
  const dataMode = (process.env.DATA_MODE ?? 'auto').toLowerCase()
  if (dataMode !== 'mock') {
    const ocstatRows = readOcstatPricesRows()
    if (ocstatRows.length > 0) {
      if (!ocstatRows.some((row) => row.cpi_rent !== null || row.cpi_food !== null || row.cpi_health !== null || row.cpi_transport !== null || row.cpi_rent_yoy !== null || row.cpi_food_yoy !== null || row.cpi_health_yoy !== null || row.cpi_transport_yoy !== null)) {
        addDownloadRequest({
          id: 'ge_prices_groups_missing',
          dataset: 'ge_prices',
          missingFields: ['cpi_rent', 'cpi_food', 'cpi_health', 'cpi_transport'],
          reason: 'Comparer l’évolution des prix visibles par poste de dépense, pas seulement l’indice total.',
          preferredSource: 'OCSTAT indice genevois des prix à la consommation selon les groupes de dépenses',
          sourceUrl: 'https://statistique.ge.ch/graphiques/affichage.asp?dom=1&filtreGraph=05_02',
          acceptedFormats: ['XLS', 'XLSX', 'CSV'],
          destinationPath: 'data/raw/ocstat/manual/ge_prices_groups.xls',
          instructions: 'Déposer le fichier OCSTAT par groupes de dépenses avec logement/énergie, alimentation, santé et transports.',
        })
      }
      await writeCsv('data/normalized/ge_prices.csv', ocstatRows, gePricesColumns)
      return ocstatRows
    }
  }

  const rows = await normalizeDataset({
    id: 'ge_prices',
    output: 'data/normalized/ge_prices.csv',
    manualPath: 'data/raw/ocstat/manual/ge_prices.csv',
    officialPath: 'data/raw/ocstat/ge_prices.csv',
    mockRows: mockGePrices,
    columns: gePricesColumns,
    request: {
      missingFields: ['year', 'cpi_total', 'cpi_rent', 'cpi_food', 'cpi_health', 'cpi_transport'],
      reason: 'Afficher les coûts visibles sans prétendre à une causalité démographique automatique.',
      preferredSource: 'OCSTAT indice genevois des prix à la consommation',
      sourceUrl: 'https://statistique.ge.ch/',
      acceptedFormats: ['XLS', 'XLSX', 'CSV'],
      destinationPath: 'data/raw/ocstat/manual/ge_prices.xls',
      instructions: 'Déposer le fichier Excel OCSTAT des indices annuels, base cohérente pour total, loyers/logement, alimentation, santé et transports.',
    },
  })
  await writeCsv('data/normalized/ge_prices.csv', rows, gePricesColumns)
  return rows
}
