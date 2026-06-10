import { readCsv, writeCsv, numberOrNull, type CsvRow } from '../lib/csv.ts'

function assumption(rows: Record<string, string>[], key: string, fallback: number) {
  const value = numberOrNull(rows.find((row) => row.key === key)?.value)
  return value ?? fallback
}

function latestObservedYear(rows: Record<string, string>[]) {
  const years = rows
    .filter((row) => row.scenario === 'observed' && numberOrNull(row.population) !== null)
    .map((row) => Number(row.year))
  const latest = Math.max(...years)
  if (!Number.isFinite(latest) || latest < 2023) throw new Error('Missing recent Geneva observed population year')
  return latest
}

export async function buildInfrastructureNeeds() {
  const scenarios = await readCsv('data/generated/scenarios_ge.csv')
  const assumptions = await readCsv('data/normalized/assumptions.csv')
  const baseYear = latestObservedYear(scenarios)
  const basePopulation = numberOrNull(scenarios.find((row) => Number(row.year) === baseYear && row.scenario === 'observed')?.population)
  if (!basePopulation) throw new Error('Missing Geneva base population')

  const avgHouseholdSize = assumption(assumptions, 'avg_household_size', 2.1)
  const studentsShare = assumption(assumptions, 'students_share_population', 0.12)
  const studentsPerClass = assumption(assumptions, 'students_per_class', 21)
  const doctorsPer1000 = assumption(assumptions, 'doctors_per_1000_target', 4.5)
  const bedsPer1000 = assumption(assumptions, 'hospital_beds_per_1000_target', 3)
  const dailyTrips = assumption(assumptions, 'daily_trips_per_person', 3)
  const water = assumption(assumptions, 'water_liters_per_person_day', 150)
  const waste = assumption(assumptions, 'waste_kg_per_person_year', 350)
  const electricity = assumption(assumptions, 'electricity_kwh_per_person_year', 6500)

  const rows: CsvRow[] = scenarios
    .filter((row) => Number(row.year) >= baseYear && row.scenario !== 'observed')
    .map((row) => {
      const population = numberOrNull(row.population)
      const additional = population === null ? null : population - basePopulation
      return {
        year: Number(row.year),
        scenario: row.scenario,
        population,
        additional_population_since_start: additional,
        required_housing_units: additional === null ? null : Math.ceil(additional / avgHouseholdSize),
        required_classes: additional === null ? null : Math.ceil((additional * studentsShare) / studentsPerClass),
        required_doctors: additional === null ? null : Math.ceil(additional * doctorsPer1000 / 1000),
        required_hospital_beds: additional === null ? null : Math.ceil(additional * bedsPer1000 / 1000),
        required_daily_transit_trips: additional === null ? null : Math.ceil(additional * dailyTrips),
        required_water_m3_day: additional === null ? null : Math.ceil(additional * water / 1000),
        required_waste_tons_year: additional === null ? null : Math.ceil(additional * waste / 1000),
        required_electricity_gwh_year: additional === null ? null : Number((additional * electricity / 1_000_000).toFixed(1)),
      }
    })

  await writeCsv('data/generated/infrastructure_needs_ge.csv', rows)
  return rows
}
