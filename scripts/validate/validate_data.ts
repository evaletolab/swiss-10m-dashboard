import { existsSync } from 'node:fs'
import { readCsv, numberOrNull } from '../lib/csv.ts'
import { fromRoot } from '../lib/paths.ts'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

async function validateYears(file: string) {
  const rows = await readCsv(file)
  const years = new Set(rows.map((row) => Number(row.year)))
  const latest = Math.max(...[...years].filter(Number.isFinite))
  assert(latest >= 2023, `${file} must include observations through at least 2023`)
  for (let year = 2000; year <= latest; year += 1) assert(years.has(year), `${file} missing year ${year}`)
  for (const row of rows) {
    const population = numberOrNull(row.population)
    if (row.population !== undefined && population !== null) assert(population > 0, `${file} invalid population ${row.year}`)
    for (const [key, value] of Object.entries(row)) assert(String(value) !== 'NaN', `${file} contains NaN in ${key}`)
  }
}

async function validateDemography(file: string) {
  const rows = await readCsv(file)
  for (const row of rows) {
    const births = numberOrNull(row.births)
    const deaths = numberOrNull(row.deaths)
    const natural = numberOrNull(row.natural_balance)
    const migration = numberOrNull(row.net_migration)
    const growth = numberOrNull(row.total_growth)
    if (births !== null && deaths !== null && natural !== null) assert(Math.abs((births - deaths) - natural) <= 1, `${file} natural balance mismatch ${row.year}`)
    if (natural !== null && migration !== null && growth !== null) assert(Math.abs(natural + migration - growth) <= 50, `${file} growth mismatch ${row.year}`)
  }
}

async function main() {
  await validateYears('data/normalized/ch_demography.csv')
  await validateYears('data/normalized/ge_demography.csv')
  await validateDemography('data/normalized/ch_demography.csv')
  await validateDemography('data/normalized/ge_demography.csv')

  const chScenarios = await readCsv('data/generated/scenarios_ch.csv')
  const initiative2050 = numberOrNull(chScenarios.find((row) => Number(row.year) === 2050 && row.scenario === 'initiative_linear')?.population)
  assert(initiative2050 === 10_000_000, 'Swiss initiative scenario must reach 10,000,000 in 2050')

  const webFiles = ['scenarios_ch.json', 'scenarios_ge.json', 'infrastructure_needs_ge.json', 'growth_comparison_ge.json', 'summary.json', 'sources.json', 'download_requests.json']
  for (const file of webFiles) assert(existsSync(fromRoot(`src/data/${file}`)), `Missing web data ${file}`)

  const requestsPath = fromRoot('data/generated/download_requests.json')
  if (existsSync(requestsPath)) {
    const requests = JSON.parse(await (await import('node:fs/promises')).readFile(requestsPath, 'utf8')) as unknown[]
    console.log(`Open download requests: ${requests.length}`)
  }
  console.log('Data validation passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
