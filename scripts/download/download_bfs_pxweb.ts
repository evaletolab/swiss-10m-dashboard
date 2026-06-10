import { writeFile } from 'node:fs/promises'
import { ensureDir, fromRoot } from '../lib/paths.ts'

export type PxwebDataset = {
  id: string
  label: string
  url: string | undefined
  query: unknown
  output: string
}

export async function fetchPxweb(url: string, query: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(query),
  })
  if (!response.ok) throw new Error(`PX-Web request failed ${response.status} ${response.statusText}`)
  return response.text()
}

export async function downloadBfsPxweb() {
  await ensureDir('data/raw/bfs')
  const datasets: PxwebDataset[] = [
    {
      id: 'ch_population_balance',
      label: 'Switzerland demographic balance by year',
      url: process.env.BFS_POPULATION_BALANCE_PXWEB_URL,
      query: { query: [], response: { format: 'CSV' } },
      output: 'data/raw/bfs/ch_population_balance.csv',
    },
  ]

  for (const dataset of datasets) {
    if (!dataset.url) {
      console.warn(`[download:bfs] ${dataset.id} skipped: missing env URL`)
      continue
    }
    const body = await fetchPxweb(dataset.url, dataset.query)
    await writeFile(fromRoot(dataset.output), body, 'utf8')
    await writeFile(fromRoot(dataset.output.replace(/\.[^.]+$/, '.metadata.json')), JSON.stringify(dataset, null, 2), 'utf8')
  }
}
