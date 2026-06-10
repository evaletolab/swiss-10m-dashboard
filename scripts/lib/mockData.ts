import type { CsvRow } from './csv.ts'

const years = Array.from({ length: 26 }, (_, index) => 2000 + index)

export function mockChDemography(): CsvRow[] {
  let population = 7_200_000
  return years.map((year, index) => {
    const growth = index === 0 ? null : Math.round(56_000 + index * 2_200)
    if (growth) population += growth
    const fertility = Number((1.5 - index * 0.008).toFixed(2))
    const births = Math.round(78_000 + index * 350)
    const deaths = Math.round(62_000 + index * 520)
    const natural = births - deaths
    const netMigration = growth === null ? null : growth - natural
    return {
      year,
      population,
      total_growth: growth,
      births,
      deaths,
      natural_balance: natural,
      immigration: netMigration === null ? null : Math.round(120_000 + index * 1_500),
      emigration: netMigration === null ? null : Math.round(120_000 + index * 1_500 - netMigration),
      net_migration: netMigration,
      fertility_rate: fertility,
      data_type: 'mock',
      source_id: 'mock_v1_sample',
      source_note: 'donnée mock synthétique, à remplacer par OFS',
    }
  })
}

export function mockGeDemography(): CsvRow[] {
  let population = 415_000
  return years.map((year, index) => {
    const growth = index === 0 ? null : Math.round(3_500 + index * 110 + (index % 5) * 250)
    if (growth) population += growth
    const births = Math.round(4_300 + index * 15)
    const deaths = Math.round(3_050 + index * 28)
    const natural = births - deaths
    const netMigration = growth === null ? null : growth - natural
    return {
      year,
      population,
      total_growth: growth,
      births,
      deaths,
      natural_balance: natural,
      immigration: netMigration === null ? null : Math.round(22_000 + index * 350),
      emigration: netMigration === null ? null : Math.round(22_000 + index * 350 - netMigration),
      net_migration: netMigration,
      net_migration_share_of_growth: growth ? Number(((netMigration ?? 0) / growth).toFixed(4)) : null,
      data_type: 'mock',
      source_id: 'mock_v1_sample',
      source_note: 'donnée mock synthétique, à remplacer par OCSTAT/OFS',
    }
  })
}

export function mockGeHousing(): CsvRow[] {
  let housingStock = 205_000
  const demography = mockGeDemography()
  return years.map((year, index) => {
    const newUnits = index === 0 ? null : Math.round(1_350 + (index % 6) * 170 + index * 25)
    if (newUnits) housingStock += newUnits
    const growth = Number(demography[index]?.total_growth ?? 0)
    return {
      year,
      housing_stock: housingStock,
      new_housing_units: newUnits,
      vacancy_rate: Number((0.012 - index * 0.00025 + (index % 4) * 0.0004).toFixed(4)),
      avg_household_size: 2.1,
      new_residents_per_new_housing_unit: newUnits ? Number((growth / newUnits).toFixed(2)) : null,
      housing_absorption_ratio: newUnits && growth ? Number((newUnits / growth).toFixed(4)) : null,
      data_type: 'mock',
      source_id: 'mock_v1_sample',
      source_note: 'donnée mock synthétique, à remplacer par OCSTAT/OFL',
    }
  })
}

export function mockGePrices(): CsvRow[] {
  return years.map((year, index) => {
    const total = 100 + index * 1.05
    const rent = 100 + index * 1.65
    const food = 100 + index * 1.2
    const health = 100 + index * 1.9
    const transport = 100 + index * 1.1
    return {
      year,
      cpi_total: Number(total.toFixed(1)),
      cpi_rent: Number(rent.toFixed(1)),
      cpi_food: Number(food.toFixed(1)),
      cpi_health: Number(health.toFixed(1)),
      cpi_transport: Number(transport.toFixed(1)),
      cpi_total_yoy: index === 0 ? null : Number((total - (100 + (index - 1) * 1.05)).toFixed(2)),
      cpi_rent_yoy: index === 0 ? null : Number((rent - (100 + (index - 1) * 1.65)).toFixed(2)),
      cpi_food_yoy: index === 0 ? null : Number((food - (100 + (index - 1) * 1.2)).toFixed(2)),
      cpi_health_yoy: index === 0 ? null : Number((health - (100 + (index - 1) * 1.9)).toFixed(2)),
      cpi_transport_yoy: index === 0 ? null : Number((transport - (100 + (index - 1) * 1.1)).toFixed(2)),
      data_type: 'mock',
      source_id: 'mock_v1_sample',
      source_note: 'donnée mock synthétique, à remplacer par OCSTAT/OFSP',
    }
  })
}

export function mockGeHealth(): CsvRow[] {
  const demography = mockGeDemography()
  return years.map((year, index) => {
    const population = Number(demography[index]?.population ?? null)
    const physicians = Math.round(population * (4 + index * 0.015) / 1000)
    const beds = Math.round(population * (3.2 - index * 0.018) / 1000)
    const premium = 260 + index * 8.8
    return {
      year,
      population,
      lamal_average_premium: Number(premium.toFixed(2)),
      health_cost_per_insured: null,
      physicians,
      total_hospital_beds: beds,
      share_65_plus: Number((0.14 + index * 0.0025).toFixed(4)),
      physicians_per_1000: Number((physicians / population * 1000).toFixed(2)),
      beds_per_1000: Number((beds / population * 1000).toFixed(2)),
      premium_index: Number((premium / 260 * 100).toFixed(1)),
      data_type: 'mock',
      source_id: 'mock_v1_sample',
      source_note: 'donnée mock synthétique, à remplacer par OFSP/OFS/OCSTAT',
    }
  })
}

export function mockGeTransport(): CsvRow[] {
  const demography = mockGeDemography()
  return years.map((year, index) => {
    const population = Number(demography[index]?.population ?? null)
    const tpg = Math.round(115_000_000 + index * 3_200_000)
    const crossBorder = Math.round(55_000 + index * 2_300)
    return {
      year,
      population,
      jobs: Math.round(300_000 + index * 4_200),
      cross_border_workers: crossBorder,
      tpg_passengers: tpg,
      public_transport_capacity_index: Number((100 + index * 1.4).toFixed(1)),
      road_traffic_index: Number((100 + index * 0.8).toFixed(1)),
      passengers_per_resident: Number((tpg / population).toFixed(1)),
      cross_border_workers_per_1000_residents: Number((crossBorder / population * 1000).toFixed(1)),
      data_type: 'mock',
      source_id: 'mock_v1_sample',
      source_note: 'donnée mock synthétique, à remplacer par TPG/OCSTAT/OFS',
    }
  })
}

export function defaultAssumptions(): CsvRow[] {
  return [
    ['avg_household_size', 2.1, 'persons_per_household', 'OCSTAT/OFS', 'medium', 'A remplacer par valeur Genève exacte'],
    ['students_share_population', 0.12, 'ratio', 'OCSTAT/OFS', 'low', 'Part approximative à remplacer par population par âge'],
    ['students_per_class', 21, 'students_per_class', 'policy_assumption', 'medium', 'Hypothèse pédagogique'],
    ['doctors_per_1000_target', 4.5, 'doctors_per_1000', 'policy_assumption', 'low', 'A calibrer avec données Genève'],
    ['hospital_beds_per_1000_target', 3.0, 'beds_per_1000', 'policy_assumption', 'low', 'A calibrer'],
    ['daily_trips_per_person', 3.0, 'trips_per_day', 'transport_assumption', 'low', 'A calibrer avec enquête mobilité'],
    ['water_liters_per_person_day', 150, 'liter_per_day', 'environment_assumption', 'low', 'A sourcer'],
    ['waste_kg_per_person_year', 350, 'kg_per_year', 'environment_assumption', 'low', 'A sourcer'],
    ['electricity_kwh_per_person_year', 6500, 'kwh_per_year', 'energy_assumption', 'low', 'A sourcer'],
    ['geneva_growth_share', 0.058, 'ratio', 'model_assumption', 'medium', 'Part de Genève dans la population suisse utilisée pour traduire le scénario national'],
  ].map(([key, value, unit, source, confidence, comment]) => ({ key, value, unit, source, confidence, comment }))
}
