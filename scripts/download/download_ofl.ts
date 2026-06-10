import { writeFile } from 'node:fs/promises'
import { ensureDir, fromRoot } from '../lib/paths.ts'

export async function downloadOfl() {
  await ensureDir('data/raw/ofl/manual')
  const url = process.env.OFL_VACANCY_RATE_URL
  if (!url) {
    console.warn('[download:ofl] vacancy skipped: missing OFL_VACANCY_RATE_URL')
    return
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error(`OFL download failed: ${response.status}`)
  await writeFile(fromRoot('data/raw/ofl/vacancy_rate.csv'), Buffer.from(await response.arrayBuffer()))
}
