import { writeCsv } from '../lib/csv.ts'
import { readOcstatSubsidizedHousingRows } from '../lib/ocstatHousing.ts'

export const geHousingSubsidizedColumns = [
  'year',
  'hbm_total',
  'hbm_lup',
  'hlm_total',
  'hlm_lup',
  'hcm_total',
  'hcm_lup',
  'hm_total',
  'hm_lup',
  'subsidized_total',
  'subsidized_lup_total',
  'data_type',
  'source_id',
  'source_note',
]

export async function normalizeGeHousingSubsidized() {
  const rows = readOcstatSubsidizedHousingRows()
  await writeCsv('data/normalized/ge_housing_subsidized.csv', rows, geHousingSubsidizedColumns)
  return rows
}
