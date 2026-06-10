import { writeCsv } from '../lib/csv.ts'
import { addDownloadRequest } from '../lib/downloadRequests.ts'
import { mockGeTransport } from '../lib/mockData.ts'
import { readOcstatTransportRows } from '../lib/ocstatTransport.ts'
import { normalizeDataset } from './sourceMode.ts'

export const geTransportColumns = ['year', 'population', 'jobs', 'cross_border_workers', 'tpg_passengers', 'public_transport_capacity_index', 'road_traffic_index', 'passengers_per_resident', 'cross_border_workers_per_1000_residents', 'data_type', 'source_id', 'source_note']

export async function normalizeGeTransport() {
  const dataMode = (process.env.DATA_MODE ?? 'auto').toLowerCase()
  if (dataMode !== 'mock') {
    const ocstatRows = await readOcstatTransportRows()
    if (ocstatRows.length > 0) {
      if (!ocstatRows.some((row) => row.jobs !== null)) {
        addDownloadRequest({
          id: 'ge_transport_jobs_missing',
          dataset: 'ge_transport',
          missingFields: ['jobs'],
          reason: 'Comparer la pression transport/frontaliers avec le volume total d’emplois dans le canton.',
          preferredSource: 'OCSTAT emplois / entreprises et emploi, OFS STATENT ou STATEM',
          sourceUrl: 'https://statistique.ge.ch/domaines/03/03_03/tableaux.asp',
          acceptedFormats: ['XLS', 'XLSX', 'CSV'],
          destinationPath: 'data/raw/ocstat/manual/ge_transport_jobs.xls',
          instructions: 'Déposer une série annuelle du nombre d’emplois dans le canton de Genève.',
        })
      }
      await writeCsv('data/normalized/ge_transport.csv', ocstatRows, geTransportColumns)
      return ocstatRows
    }
  }

  const rows = await normalizeDataset({
    id: 'ge_transport',
    output: 'data/normalized/ge_transport.csv',
    manualPath: 'data/raw/ocstat/manual/ge_transport.csv',
    officialPath: 'data/raw/ocstat/ge_transport.csv',
    mockRows: mockGeTransport,
    columns: geTransportColumns,
    request: {
      missingFields: ['year', 'jobs', 'cross_border_workers', 'tpg_passengers', 'public_transport_capacity_index', 'road_traffic_index'],
      reason: 'Mesurer la saturation transports plutôt que seulement les prix.',
      preferredSource: 'TPG, Canton de Genève mobilité, OCSTAT frontaliers, OFS STAF',
      sourceUrl: 'https://statistique.ge.ch/domaines/03/03_05/tableaux.asp',
      acceptedFormats: ['CSV', 'XLSX', 'PDF'],
      destinationPath: 'data/raw/ocstat/manual/ge_transport.csv',
      instructions: 'Déposer fréquentation TPG, frontaliers, emplois et indices de saturation si disponibles.',
    },
  })
  await writeCsv('data/normalized/ge_transport.csv', rows, geTransportColumns)
  return rows
}
