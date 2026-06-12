import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { readCsv, writeJson } from './lib/csv.ts'
import { ensureDataDirs, fromRoot } from './lib/paths.ts'

async function copyJson(source: string, target: string) {
  if (!existsSync(fromRoot(source))) {
    await writeJson(target, [])
    return
  }
  const content = await readFile(fromRoot(source), 'utf8')
  await writeJson(target, JSON.parse(content))
}

async function main() {
  await ensureDataDirs()
  const csvFiles = [
    ['data/generated/scenarios_ch.csv', 'src/data/scenarios_ch.json'],
    ['data/generated/scenarios_ge.csv', 'src/data/scenarios_ge.json'],
    ['data/generated/infrastructure_needs_ge.csv', 'src/data/infrastructure_needs_ge.json'],
    ['data/generated/growth_comparison_ge.csv', 'src/data/growth_comparison_ge.json'],
    ['data/generated/state_budget_projection_ge.csv', 'src/data/state_budget_projection_ge.json'],
    ['data/normalized/ch_demography.csv', 'src/data/ch_demography.json'],
    ['data/normalized/ge_demography.csv', 'src/data/ge_demography.json'],
    ['data/normalized/ge_housing.csv', 'src/data/ge_housing.json'],
    ['data/normalized/ge_housing_subsidized.csv', 'src/data/ge_housing_subsidized.json'],
    ['data/normalized/ge_economy.csv', 'src/data/ge_economy.json'],
    ['data/normalized/ge_education.csv', 'src/data/ge_education.json'],
    ['data/normalized/ge_prices.csv', 'src/data/ge_prices.json'],
    ['data/normalized/ge_health.csv', 'src/data/ge_health.json'],
    ['data/normalized/ge_health_subsidies.csv', 'src/data/ge_health_subsidies.json'],
    ['data/normalized/ge_social_spending.csv', 'src/data/ge_social_spending.json'],
    ['data/normalized/ge_transport.csv', 'src/data/ge_transport.json'],
    ['data/normalized/ge_public_transport_finance.csv', 'src/data/ge_public_transport_finance.json'],
    ['data/normalized/ge_state_budget_posts.csv', 'src/data/ge_state_budget_posts.json'],
    ['data/normalized/assumptions.csv', 'src/data/assumptions.json'],
  ] as const
  for (const [source, target] of csvFiles) await writeJson(target, await readCsv(source))
  await copyJson('data/generated/summary.json', 'src/data/summary.json')
  await copyJson('data/generated/sources.json', 'src/data/sources.json')
  await copyJson('data/generated/download_requests.json', 'src/data/download_requests.json')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
