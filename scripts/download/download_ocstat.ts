import { writeFile } from 'node:fs/promises'
import { ensureDir, fromRoot } from '../lib/paths.ts'

export type SourceFile = {
  id: string
  label: string
  url: string | undefined
  output: string
  format: 'csv' | 'xlsx' | 'pdf' | 'json'
  required: boolean
}

async function downloadFile(source: SourceFile) {
  if (!source.url) {
    console.warn(`[download:ocstat] ${source.id} skipped: missing URL`)
    return
  }
  const response = await fetch(source.url)
  if (!response.ok) throw new Error(`Download failed for ${source.id}: ${response.status}`)
  const data = Buffer.from(await response.arrayBuffer())
  await writeFile(fromRoot(source.output), data)
}

export async function downloadOcstat() {
  await ensureDir('data/raw/ocstat/manual')
  const sources: SourceFile[] = [
    { id: 'ge_demography', label: 'Bilan annuel de population Genève', url: process.env.OCSTAT_GE_DEMOGRAPHY_URL, output: 'data/raw/ocstat/ge_demography.csv', format: 'csv', required: false },
    { id: 'ge_housing', label: 'Logements et vacance Genève', url: process.env.OCSTAT_GE_HOUSING_URL, output: 'data/raw/ocstat/ge_housing.csv', format: 'csv', required: false },
    { id: 'ge_prices', label: 'Indice genevois des prix', url: process.env.OCSTAT_GE_PRICES_URL, output: 'data/raw/ocstat/ge_prices.csv', format: 'csv', required: false },
    { id: 'ge_transport', label: 'Mobilité et frontaliers Genève', url: process.env.OCSTAT_GE_TRANSPORT_URL, output: 'data/raw/ocstat/ge_transport.csv', format: 'csv', required: false },
  ]
  for (const source of sources) await downloadFile(source)
}
