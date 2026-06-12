import { ensureDataDirs } from '../lib/paths.ts'
import { writeDownloadRequests } from '../lib/downloadRequests.ts'
import { writeSources } from '../lib/sources.ts'
import { normalizeAssumptions } from './normalize_assumptions.ts'
import { normalizeChDemography } from './normalize_ch_demography.ts'
import { normalizeGeDemography } from './normalize_ge_demography.ts'
import { normalizeGeEconomy } from './normalize_ge_economy.ts'
import { normalizeGeEducation } from './normalize_ge_education.ts'
import { normalizeGeHealth } from './normalize_ge_health.ts'
import { normalizeGeHealthSubsidies } from './normalize_ge_health_subsidies.ts'
import { normalizeGeHousing } from './normalize_ge_housing.ts'
import { normalizeGeHousingSubsidized } from './normalize_ge_housing_subsidized.ts'
import { normalizeGePrices } from './normalize_ge_prices.ts'
import { normalizeGePublicTransportFinance } from './normalize_ge_public_transport_finance.ts'
import { normalizeGeSocialSpending } from './normalize_ge_social_spending.ts'
import { normalizeGeStateBudgetPosts } from './normalize_ge_state_budget_posts.ts'
import { normalizeGeTransport } from './normalize_ge_transport.ts'

async function main() {
  await ensureDataDirs()
  await normalizeChDemography()
  await normalizeGeDemography()
  await normalizeGeHousing()
  await normalizeGeHousingSubsidized()
  await normalizeGePrices()
  await normalizeGeEconomy()
  await normalizeGeEducation()
  await normalizeGeHealth()
  await normalizeGeHealthSubsidies()
  await normalizeGeSocialSpending()
  await normalizeGeTransport()
  await normalizeGePublicTransportFinance()
  await normalizeGeStateBudgetPosts()
  await normalizeAssumptions()
  await writeSources()
  await writeDownloadRequests()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
