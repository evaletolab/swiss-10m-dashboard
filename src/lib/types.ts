export type NullableNumber = number | string | null | undefined

export type ScenarioName =
  | 'observed'
  | 'linear_trend_2000_base_year'
  | 'cagr_trend_2000_base_year'
  | 'recent_trend_2015_base_year'
  | 'initiative_linear'
  | 'initiative_cagr'
  | 'bfs_reference'

export type ScenarioRow = {
  year: string | number
  scenario: ScenarioName
  population: NullableNumber
  annual_growth?: NullableNumber
  total_growth_since_base_year?: NullableNumber
  notes?: string
}

export type DemographyRow = {
  year: string | number
  population: NullableNumber
  total_growth?: NullableNumber
  fertility_rate?: NullableNumber
  net_migration?: NullableNumber
  natural_balance?: NullableNumber
  source_note?: string
}

export type InfrastructureNeedRow = {
  year: string | number
  scenario: ScenarioName
  population: NullableNumber
  additional_population_since_start: NullableNumber
  required_housing_units: NullableNumber
  required_classes: NullableNumber
  required_doctors: NullableNumber
  required_hospital_beds: NullableNumber
  required_daily_transit_trips: NullableNumber
  required_water_m3_day: NullableNumber
  required_waste_tons_year: NullableNumber
  required_electricity_gwh_year: NullableNumber
}

export type GrowthComparisonRow = {
  scenario: ScenarioName
  scenario_label: string
  domain: string
  metric: string
  label: string
  unit: string
  year_2010: NullableNumber
  base_year: NullableNumber
  target_year: NullableNumber
  value_2010: NullableNumber
  value_base: NullableNumber
  value_2050: NullableNumber
  growth_2010_to_base_pct: NullableNumber
  growth_2010_to_2050_pct: NullableNumber
  growth_base_to_2050_pct: NullableNumber
  data_type_2010: string
  data_type_base: string
  data_type_2050: string
  source_id: string
  note: string
}

export type Source = {
  id: string
  title: string
  publisher: string
  url: string | null
  accessedAt: string
  type: string
  license: string
  notes: string
}
