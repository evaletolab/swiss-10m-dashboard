import { existsSync } from 'node:fs'
import { readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'
import { addDownloadRequest } from '../lib/downloadRequests.ts'
import { readOfspDashboardGenevaSubsidiesRows } from '../lib/ofspDashboard.ts'
import { fromRoot } from '../lib/paths.ts'

export const geHealthSubsidiesColumns = [
  'year',
  'beneficiaries',
  'beneficiary_rate',
  'subsidy_amount_million_chf',
  'federal_share',
  'cantonal_share',
  'average_subsidy_per_beneficiary',
  'data_type',
  'source_id',
  'source_note',
]

export async function normalizeGeHealthSubsidies() {
  const manualPath = 'data/raw/ofsp/manual/ge_health_subsidies.csv'
  const dashboardRows = readOfspDashboardGenevaSubsidiesRows()
  if (dashboardRows.length > 0 && !existsSync(fromRoot(manualPath))) {
    await writeCsv('data/normalized/ge_health_subsidies.csv', dashboardRows, geHealthSubsidiesColumns)
    return dashboardRows
  }

  if (!existsSync(fromRoot(manualPath))) {
    addDownloadRequest({
      id: 'ge_health_subsidies_manual_source_missing',
      dataset: 'ge_health_subsidies',
      missingFields: ['year', 'beneficiaries', 'subsidy_amount_million_chf', 'average_subsidy_per_beneficiary'],
      reason: 'Suivre l’évolution des subsides publics de réduction des primes LAMal à Genève.',
      preferredSource: 'OFSP réduction des primes / Dashboard assurance-maladie, ou source cantonale Genève',
      sourceUrl: 'https://dashboardassurancemaladie.admin.ch/primes.html',
      acceptedFormats: ['CSV', 'XLSX', 'ZIP'],
      destinationPath: `${manualPath} ou data/raw/ofsp/manual/dashboardassurancemaladie-donnees.zip`,
      instructions: 'Déposer une série annuelle Genève sur les bénéficiaires, montants totaux et subside moyen de réduction des primes, ou le ZIP données du dashboard OFSP.',
    })
    await writeCsv('data/normalized/ge_health_subsidies.csv', [], geHealthSubsidiesColumns)
    return []
  }

  const rows = (await readCsv(manualPath)).map((row): CsvRow => ({
    ...row,
    data_type: row.data_type || 'official',
    source_id: row.source_id || 'ofsp_health_premium_subsidies',
    source_note: row.source_note || 'Subside assurance maladie, fichier manuel.',
  }))
  await writeCsv('data/normalized/ge_health_subsidies.csv', rows, geHealthSubsidiesColumns)
  return rows
}
