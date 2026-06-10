import { writeCsv } from '../lib/csv.ts'
import { mockGeHousing } from '../lib/mockData.ts'
import { readOcstatHousingRows } from '../lib/ocstatHousing.ts'
import { normalizeDataset } from './sourceMode.ts'

export const geHousingColumns = ['year', 'housing_stock', 'new_housing_units', 'vacancy_rate', 'avg_household_size', 'new_residents_per_new_housing_unit', 'housing_absorption_ratio', 'data_type', 'source_id', 'source_note']

export async function normalizeGeHousing() {
  const dataMode = (process.env.DATA_MODE ?? 'auto').toLowerCase()
  if (dataMode !== 'mock') {
    const ocstatRows = await readOcstatHousingRows()
    if (ocstatRows.length > 0) {
      await writeCsv('data/normalized/ge_housing.csv', ocstatRows, geHousingColumns)
      return ocstatRows
    }
  }

  const rows = await normalizeDataset({
    id: 'ge_housing',
    output: 'data/normalized/ge_housing.csv',
    manualPath: 'data/raw/ocstat/manual/ge_housing.csv',
    officialPath: 'data/raw/ocstat/ge_housing.csv',
    mockRows: mockGeHousing,
    columns: geHousingColumns,
    request: {
      missingFields: ['year', 'housing_stock', 'new_housing_units', 'vacancy_rate', 'avg_household_size'],
      reason: 'Comparer nouveaux habitants, nouveaux logements et taux de vacance.',
      preferredSource: 'OCSTAT construction/logement et OFS/OFL logements vacants',
      sourceUrl: 'https://statistique.ge.ch/domaines/09/09_02/',
      acceptedFormats: ['CSV', 'XLSX', 'PDF'],
      destinationPath: 'data/raw/ocstat/manual/ge_housing.csv',
      instructions: 'Déposer les séries annuelles du parc, logements construits/gain total et taux de vacance.',
    },
  })
  await writeCsv('data/normalized/ge_housing.csv', rows, geHousingColumns)
  return rows
}
