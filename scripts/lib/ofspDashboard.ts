import { existsSync } from 'node:fs'
import XLSX from 'xlsx'
import { numberOrNull, type CsvRow } from './csv.ts'
import { fromRoot } from './paths.ts'

type RawRow = Record<string, unknown>

const dashboardDir = 'data/raw/ofsp/manual/dashboardassurancemaladie-donnees/Daten'

function workbookRows(relativePath: string) {
  const absolutePath = fromRoot(relativePath)
  if (!existsSync(absolutePath)) return []
  const workbook = XLSX.readFile(absolutePath)
  const sheet = workbook.Sheets.Data ?? workbook.Sheets[workbook.SheetNames[0] ?? '']
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' })
}

function isGeneva(row: RawRow) {
  return row.Canton_ISO2 === 'GE' || row['Canton_ISO3166-2'] === 'CH-GE' || row.Canton === 'Genève'
}

function isTotalGroup(row: RawRow) {
  return String(row.Groupe_d_age ?? '').toLowerCase() === 'total'
}

export function readOfspDashboardGenevaHealthRows(): CsvRow[] {
  const premiums = workbookRows(`${dashboardDir}/04_Primes_prime-moyenne-mensuelle.xlsx`)
    .filter((row) => isGeneva(row) && isTotalGroup(row))

  const costs = workbookRows(`${dashboardDir}/03_Couts_Stat-LAMal.xlsx`)
    .filter((row) => isGeneva(row) && isTotalGroup(row))

  const years = Array.from(new Set([
    ...premiums.map((row) => numberOrNull(row.Annee)),
    ...costs.map((row) => numberOrNull(row.Annee)),
  ].filter((year): year is number => year !== null))).sort((a, b) => a - b)

  return years.map((year) => {
    const premium = premiums.find((row) => numberOrNull(row.Annee) === year)
    const cost = costs.find((row) => numberOrNull(row.Annee) === year)
    return {
      year,
      lamal_average_premium: numberOrNull(premium?.Prime_mensuelle_par_assure),
      health_cost_per_insured: numberOrNull(cost?.Prestations_brutes_par_assure),
      data_type: 'official',
      source_id: 'ofsp_dashboard_health_insurance',
      source_note: 'OFSP Dashboard assurance-maladie: prime moyenne mensuelle Genève et prestations brutes annuelles par assuré Genève.',
    }
  })
}

export function readOfspDashboardGenevaSubsidiesRows(): CsvRow[] {
  return workbookRows(`${dashboardDir}/04_Primes_reduction-des-primes.xlsx`)
    .filter(isGeneva)
    .map((row) => ({
      year: numberOrNull(row.Annee),
      beneficiaries: numberOrNull(row.Nombre_de_beneficiaires),
      beneficiary_rate: numberOrNull(row.Taux_de_beneficiaires),
      subsidy_amount_million_chf: numberOrNull(row['Contribution_totale_mio-francs']),
      federal_share: numberOrNull(row.Part_federale),
      cantonal_share: numberOrNull(row.Part_cantonale),
      average_subsidy_per_beneficiary: numberOrNull(row.Contribution_par_beneficiaire_francs),
      data_type: 'official',
      source_id: 'ofsp_health_premium_subsidies',
      source_note: 'OFSP Dashboard assurance-maladie: réduction des primes AOS Genève.',
    }))
    .filter((row) => row.year !== null)
    .sort((a, b) => Number(a.year) - Number(b.year))
}
