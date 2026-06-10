import { existsSync } from 'node:fs'
import XLSX from 'xlsx'
import { numberOrNull, readCsv, type CsvRow } from './csv.ts'
import { fromRoot } from './paths.ts'

type SheetRow = unknown[]

function readWorkbookRows(relativePath: string, sheetIndex = 0): SheetRow[] {
  const absolutePath = fromRoot(relativePath)
  if (!existsSync(absolutePath)) return []
  const workbook = XLSX.readFile(absolutePath)
  const sheetName = workbook.SheetNames[sheetIndex]
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1, defval: '' })
}

function numericCell(row: SheetRow, index: number) {
  return numberOrNull(row[index])
}

export function readOcstatHousingStock() {
  const rows = readWorkbookRows('data/raw/ocstat/manual/ge_housing_stock.xlsx')
  const yearly = new Map<number, number>()
  let currentYear: number | null = null

  for (const row of rows) {
    const first = row[0]
    const year = numberOrNull(first)
    if (year !== null && year >= 1900) {
      currentYear = year
      continue
    }
    if (currentYear !== null && String(first).toLowerCase().includes('4e trimestre')) {
      const total = numericCell(row, 17)
      if (total !== null) yearly.set(currentYear, total)
    }
  }

  return yearly
}

export function readOcstatVacancyRates() {
  const rows = readWorkbookRows('data/raw/ocstat/manual/ge_housing_vacancy.xlsx')
  const rates = new Map<number, number>()
  const yearRow = rows.find((row) => row.some((value) => numberOrNull(value) === 1975))
  if (!yearRow) return rates

  const markerIndex = rows.findIndex((row) => String(row[0]).toLowerCase().startsWith('taux de vacance'))
  const ensembleRow = rows.slice(markerIndex + 1).find((row) => String(row[0]).toLowerCase().includes('ensemble'))
  if (!ensembleRow) return rates

  yearRow.forEach((value, index) => {
    const year = numberOrNull(value)
    const percent = numericCell(ensembleRow, index)
    if (year !== null && percent !== null) rates.set(year, Number((percent / 100).toFixed(5)))
  })

  return rates
}

export async function readOcstatHousingRows(): Promise<CsvRow[]> {
  const stock = readOcstatHousingStock()
  const vacancy = readOcstatVacancyRates()
  if (stock.size === 0 && vacancy.size === 0) return []

  const demography = await readCsv('data/normalized/ge_demography.csv')
  const years = Array.from(new Set([...stock.keys(), ...vacancy.keys()])).filter((year) => year >= 2000).sort((a, b) => a - b)

  return years.map((year, index) => {
    const housingStock = stock.get(year) ?? null
    const previousStock = index > 0 ? stock.get(years[index - 1] ?? 0) ?? null : null
    const newHousingUnits = housingStock !== null && previousStock !== null ? housingStock - previousStock : null
    const growth = numberOrNull(demography.find((row) => Number(row.year) === year)?.total_growth)
    return {
      year,
      housing_stock: housingStock,
      new_housing_units: newHousingUnits,
      vacancy_rate: vacancy.get(year) ?? null,
      avg_household_size: 2.1,
      new_residents_per_new_housing_unit: newHousingUnits !== null && newHousingUnits !== 0 && growth !== null ? Number((growth / newHousingUnits).toFixed(2)) : null,
      housing_absorption_ratio: newHousingUnits !== null && growth !== null && growth !== 0 ? Number((newHousingUnits / growth).toFixed(4)) : null,
      data_type: 'official',
      source_id: 'ocstat_geneva_housing',
      source_note: 'OCSTAT tableaux T 09.02.1.1.03 T et T 09.02.2.2.01; gain annuel dérivé du stock de logements si le tableau de gain total est absent.',
    }
  })
}

export function readOcstatSubsidizedHousingRows(): CsvRow[] {
  const rows = readWorkbookRows('data/raw/ocstat/manual/ge_housing_subsidized.xlsx')
  return rows
    .map((row) => ({
      year: numericCell(row, 0),
      hbm_total: numericCell(row, 1),
      hbm_lup: numericCell(row, 2),
      hlm_total: numericCell(row, 4),
      hlm_lup: numericCell(row, 5),
      hcm_total: numericCell(row, 7),
      hcm_lup: numericCell(row, 8),
      hm_total: numericCell(row, 10),
      hm_lup: numericCell(row, 11),
      subsidized_total: numericCell(row, 13),
      subsidized_lup_total: numericCell(row, 14),
      data_type: 'official',
      source_id: 'ocstat_geneva_housing_subsidized',
      source_note: 'OCSTAT tableau T 09.02.1.2.05, logements subventionnés selon le type.',
    }))
    .filter((row) => row.year !== null && row.year >= 1977)
    .sort((a, b) => Number(a.year) - Number(b.year))
}
