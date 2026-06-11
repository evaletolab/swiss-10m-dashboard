import { existsSync } from 'node:fs'
import { numberOrNull, readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'
import { defaultAssumptions } from '../lib/mockData.ts'
import { fromRoot } from '../lib/paths.ts'

const columns = ['key', 'value', 'unit', 'source', 'confidence', 'comment']

function latestRowWith(rows: Record<string, string>[], field: string) {
  return rows
    .filter((row) => Number.isFinite(Number(row.year)) && numberOrNull(row[field]) !== null)
    .sort((a, b) => Number(b.year) - Number(a.year))[0]
}

function rowForYearWith(rows: Record<string, string>[], year: number | null, field: string) {
  if (year === null) return undefined
  return rows.find((row) => Number(row.year) === year && numberOrNull(row[field]) !== null)
}

function rounded(value: number, digits = 2) {
  return Number(value.toFixed(digits))
}

function upsert(rows: CsvRow[], key: string, patch: Partial<CsvRow>) {
  const existing = rows.find((row) => row.key === key)
  if (existing) {
    Object.assign(existing, patch)
    return
  }
  rows.push({ key, ...patch })
}

export async function normalizeAssumptions() {
  const manual = 'data/raw/ocstat/manual/assumptions.csv'
  const rows: CsvRow[] = existsSync(fromRoot(manual)) ? await readCsv(manual) : defaultAssumptions()
  const geDemography = await readCsv('data/normalized/ge_demography.csv')
  const chDemography = await readCsv('data/normalized/ch_demography.csv')
  const housing = await readCsv('data/normalized/ge_housing.csv')
  const education = await readCsv('data/normalized/ge_education.csv')
  const health = await readCsv('data/normalized/ge_health.csv')
  const transport = await readCsv('data/normalized/ge_transport.csv')

  const gePopulationRow = latestRowWith(geDemography, 'population')
  const chPopulationRow = latestRowWith(chDemography, 'population')
  const gePopulation = numberOrNull(gePopulationRow?.population)
  const chPopulation = numberOrNull(chPopulationRow?.population)
  const baseYear = gePopulationRow ? Number(gePopulationRow.year) : null
  const housingRow = rowForYearWith(housing, baseYear, 'avg_household_size') ?? latestRowWith(housing, 'avg_household_size')
  const educationRow = rowForYearWith(education, baseYear, 'students_public_subsidized') ?? latestRowWith(education, 'students_public_subsidized')
  const classSizeRow = rowForYearWith(education, baseYear, 'students_per_class') ?? latestRowWith(education, 'students_per_class')
  const bedsRow = latestRowWith(health, 'beds_per_1000')
  const physiciansRow = latestRowWith(health, 'physicians')
  const transportRow = latestRowWith(transport, 'tpg_passengers')

  const avgHouseholdSize = numberOrNull(housingRow?.avg_household_size)
  if (avgHouseholdSize !== null) {
    upsert(rows, 'avg_household_size', {
      value: rounded(avgHouseholdSize, 2),
      source: 'OCSTAT Genève',
      confidence: 'official',
      comment: `Dernière valeur disponible (${housingRow?.year}).`,
    })
  }

  const studentsPublicSubsidized = numberOrNull(educationRow?.students_public_subsidized)
  if (studentsPublicSubsidized !== null && gePopulation !== null) {
    upsert(rows, 'students_share_population', {
      value: rounded(studentsPublicSubsidized / gePopulation, 4),
      source: 'SRED/OCSTAT + OFS STATPOP',
      confidence: 'official_proxy',
      comment: `Élèves publics/subventionnés ${educationRow?.year} rapportés à la population ${gePopulationRow?.year}.`,
    })
  }

  const studentsPerClass = numberOrNull(classSizeRow?.students_per_class)
  if (studentsPerClass !== null) {
    upsert(rows, 'students_per_class', {
      value: rounded(studentsPerClass, 2),
      source: 'OFS / SRED-OCSTAT',
      confidence: 'official_proxy',
      comment: `Taille moyenne OFS des classes publiques (${classSizeRow?.year}), utilisée pour les classes équivalentes.`,
    })
  }

  const physicians = numberOrNull(physiciansRow?.physicians)
  if (physicians !== null && gePopulation !== null) {
    upsert(rows, 'doctors_per_1000_target', {
      value: rounded(physicians / gePopulation * 1000, 2),
      source: 'OCSTAT santé + OFS STATPOP',
      confidence: 'medium',
      comment: `Ratio indicatif: médecins ${physiciansRow?.year} rapportés à la population officielle ${gePopulationRow?.year}.`,
    })
  }

  const bedsPer1000 = numberOrNull(bedsRow?.beds_per_1000)
  if (bedsPer1000 !== null) {
    upsert(rows, 'hospital_beds_per_1000_target', {
      value: rounded(bedsPer1000, 2),
      source: 'OCSTAT santé',
      confidence: 'official',
      comment: `Dernier ratio lits/population disponible (${bedsRow?.year}).`,
    })
  }

  const tpgPassengers = numberOrNull(transportRow?.tpg_passengers)
  if (tpgPassengers !== null && gePopulation !== null) {
    upsert(rows, 'daily_trips_per_person', {
      value: rounded(tpgPassengers / 365 / gePopulation, 2),
      source: 'OCSTAT / TPG + OFS STATPOP',
      confidence: 'official_proxy',
      comment: `Trajets TPG annuels ${transportRow?.year} / 365 / population ${gePopulationRow?.year}.`,
    })
  }

  if (gePopulation !== null && chPopulation !== null) {
    upsert(rows, 'geneva_growth_share', {
      value: rounded(gePopulation / chPopulation, 4),
      source: 'OFS STATPOP',
      confidence: 'official',
      comment: `Part de Genève dans la population suisse (${gePopulationRow?.year}).`,
    })
  }

  await writeCsv('data/normalized/assumptions.csv', rows, columns)
  return rows
}
