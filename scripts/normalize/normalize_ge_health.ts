import { existsSync } from 'node:fs'
import { numberOrNull, readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'
import { addDownloadRequest } from '../lib/downloadRequests.ts'
import { mockGeHealth } from '../lib/mockData.ts'
import { readOfspDashboardGenevaHealthRows } from '../lib/ofspDashboard.ts'
import { readOfspGenevaPremiums, readOfspManualGenevaPremiums } from '../lib/ofspPremiums.ts'
import { readOcstatHealthComplementRows } from '../lib/ocstatHealth.ts'
import { fromRoot } from '../lib/paths.ts'
import { normalizeDataset } from './sourceMode.ts'

export const geHealthColumns = ['year', 'population', 'lamal_average_premium', 'health_cost_per_insured', 'physicians', 'total_hospital_beds', 'share_65_plus', 'physicians_per_1000', 'beds_per_1000', 'premium_index', 'data_type', 'source_id', 'source_note']

function mergeHealthRows(rows: CsvRow[]) {
  const byYear = new Map<number, CsvRow>()
  for (const row of rows) {
    const year = numberOrNull(row.year)
    if (year === null) continue
    const previous = byYear.get(year) ?? {}
    byYear.set(year, {
      ...previous,
      ...row,
      source_id: [previous.source_id, row.source_id].filter(Boolean).join(';'),
      source_note: [previous.source_note, row.source_note].filter(Boolean).join(' '),
    })
  }
  return [...byYear.values()].sort((a, b) => Number(a.year) - Number(b.year))
}

export async function normalizeGeHealth() {
  const dataMode = (process.env.DATA_MODE ?? 'auto').toLowerCase()
  const manualExists = existsSync(fromRoot('data/raw/ocstat/manual/ge_health.csv'))
  const healthRows = dataMode !== 'mock' && !manualExists
    ? mergeHealthRows([...(await readOfspGenevaPremiums()), ...(await readOfspManualGenevaPremiums()), ...readOfspDashboardGenevaHealthRows(), ...readOcstatHealthComplementRows()])
    : []

  if (healthRows.length > 0) {
    const hasCost = healthRows.some((row) => numberOrNull(row.health_cost_per_insured) !== null)
    const hasBeds = healthRows.some((row) => numberOrNull(row.total_hospital_beds) !== null)
    const hasPhysicians = healthRows.some((row) => numberOrNull(row.physicians) !== null)
    const hasShare65Plus = healthRows.some((row) => numberOrNull(row.share_65_plus) !== null)
    const missingFields = [
      ...(hasCost ? [] : ['health_cost_per_insured']),
      ...(hasPhysicians ? [] : ['physicians']),
      ...(hasBeds ? [] : ['total_hospital_beds']),
      ...(hasShare65Plus ? [] : ['share_65_plus']),
    ]
    if (missingFields.length > 0) {
      addDownloadRequest({
        id: 'ge_health_complements_missing',
        dataset: 'ge_health',
        missingFields,
        reason: hasCost ? 'Compléter les séries santé avec la capacité médicale et la structure par âge.' : 'Compléter les primes LAMal avec les coûts par assuré et la capacité santé.',
        preferredSource: hasCost ? 'OFS santé, OCSTAT population par âge, OCSTAT établissements hospitaliers' : 'OFSP Dashboard assurance-maladie, OFS santé, OCSTAT population par âge',
        sourceUrl: hasCost ? 'https://statistique.ge.ch/domaines/14/14_02/tableaux.asp' : 'https://opendata.swiss/fr/dataset/dashboard-krankenversicherung-okp',
        acceptedFormats: ['CSV', 'XLSX', 'ZIP'],
        destinationPath: hasCost ? 'data/raw/ocstat/manual/ge_health.csv' : 'data/raw/ofsp/manual/dashboardassurancemaladie-donnees.zip ou data/raw/ocstat/manual/ge_health.csv',
        instructions: hasCost ? 'Déposer une série annuelle Genève avec les champs encore manquants.' : 'Déposer le ZIP données du dashboard OFSP ou un CSV Genève déjà agrégé avec coûts par assuré, médecins, lits et part 65+.',
      })
    }
    const geDemography = await readCsv('data/normalized/ge_demography.csv')
    const firstPremium = healthRows.find((row) => numberOrNull(row.lamal_average_premium) !== null)?.lamal_average_premium ?? null
    const rows: CsvRow[] = healthRows.map((row) => {
      const population = numberOrNull(geDemography.find((item) => Number(item.year) === row.year)?.population)
      return {
        year: row.year,
        population,
        lamal_average_premium: row.lamal_average_premium,
        health_cost_per_insured: row.health_cost_per_insured ?? null,
        physicians: row.physicians ?? null,
        total_hospital_beds: row.total_hospital_beds ?? null,
        share_65_plus: row.share_65_plus ?? null,
        physicians_per_1000: population !== null && numberOrNull(row.physicians) !== null ? Number((Number(row.physicians) / population * 1000).toFixed(2)) : null,
        beds_per_1000: population !== null && numberOrNull(row.total_hospital_beds) !== null ? Number((Number(row.total_hospital_beds) / population * 1000).toFixed(2)) : null,
        premium_index: firstPremium === null || numberOrNull(row.lamal_average_premium) === null ? null : Number((Number(row.lamal_average_premium) / Number(firstPremium) * 100).toFixed(1)),
        data_type: 'official',
        source_id: row.source_id,
        source_note: row.source_note,
      }
    })
    await writeCsv('data/normalized/ge_health.csv', rows, geHealthColumns)
    return rows
  }

  const rows = await normalizeDataset({
    id: 'ge_health',
    output: 'data/normalized/ge_health.csv',
    manualPath: 'data/raw/ocstat/manual/ge_health.csv',
    officialPath: 'data/raw/ofsp/lamal_premiums.csv',
    mockRows: mockGeHealth,
    columns: geHealthColumns,
    request: {
      missingFields: ['year', 'lamal_average_premium', 'physicians', 'total_hospital_beds', 'share_65_plus'],
      reason: 'Relier croissance de population et besoins de santé sans mélanger primes LAMal et IPC.',
      preferredSource: 'OFSP primes LAMal, OFS santé, OCSTAT population par âge',
      sourceUrl: 'https://opendata.swiss/fr/dataset/health-insurance-premiums',
      acceptedFormats: ['CSV', 'XLSX', 'ZIP'],
      destinationPath: 'data/raw/ofsp/archives/Archiv_Praemien_YYYY.zip ou data/raw/ocstat/manual/ge_health.csv',
      instructions: 'Déposer les ZIP OFSP dans data/raw/ofsp/archives ou une série annuelle Genève déjà agrégée avec primes moyennes, médecins, lits et part 65+.',
    },
  })
  await writeCsv('data/normalized/ge_health.csv', rows, geHealthColumns)
  return rows
}
