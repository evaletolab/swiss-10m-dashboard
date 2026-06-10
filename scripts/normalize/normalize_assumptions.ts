import { existsSync } from 'node:fs'
import { readCsv, writeCsv } from '../lib/csv.ts'
import { defaultAssumptions } from '../lib/mockData.ts'
import { fromRoot } from '../lib/paths.ts'

const columns = ['key', 'value', 'unit', 'source', 'confidence', 'comment']

export async function normalizeAssumptions() {
  const manual = 'data/raw/ocstat/manual/assumptions.csv'
  const rows = existsSync(fromRoot(manual)) ? await readCsv(manual) : defaultAssumptions()
  await writeCsv('data/normalized/assumptions.csv', rows, columns)
  return rows
}
