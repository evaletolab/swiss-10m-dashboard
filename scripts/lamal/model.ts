export type SeriesStatus = 'retropolated' | 'observed' | 'provisional' | 'estimated'

export type LevelRow = {
  id: string
  label: string
  unit: string
  y2000: number | null
  y2010: number | null
  y2024: number | null
  cagr2010to2024: number | null
  y2050: number | null
  status2000: SeriesStatus | null
  status2024: SeriesStatus | null
}

export type ShareGroup = {
  id: string
  label: string
  millionChf: number
  share: number
}

export type YearValue = {
  year: number
  value: number
}

export type PremiumRow = {
  canton: 'CH' | 'GE' | 'VD' | 'ZH' | 'BE' | 'FR'
  label: string
  universityHospital: string | null
  y2000: number
  y2010: number
  y2024: number
  cagr2010to2024: number
  y2050: number
  annual: YearValue[]
  projected: YearValue[]
}

export type SubsidyRow = {
  canton: PremiumRow['canton']
  label: string
  y2010: number | null
  y2020: number | null
  y2024: number | null
  total2024: number | null
  cantonalShare2024: number | null
  beneficiaryRate2024: number | null
  cagr2010to2024: number | null
  projectionRate: number | null
  projectionWindow: string | null
  y2050: number | null
  annual: YearValue[]
  projected: YearValue[]
}

export type FinancingLevel = {
  id: 'households' | 'premiums' | 'public' | 'other'
  label: string
  y2010: number
  y2024: number
  cagr2010to2024: number
  y2050: number
  share2024: number
  share2050: number
}

export type FinancingPoint = {
  year: number
  status: SeriesStatus
  households: number
  premiums: number
  public: number
  other: number
}

export type IndexPoint = {
  year: number
  status: SeriesStatus
  costs: number
  gdp: number
  population: number
}

export type LamalPageModel = {
  generatedAt: string
  national: LevelRow[]
  index2010: IndexPoint[]
  costPerInhabitantMonth2024: number | null
  posts2024: ShareGroup[]
  postsTotalMillion: number
  services2024: ShareGroup[]
  servicesTotalMillion: number
  financing2024: ShareGroup[]
  financingLevels: FinancingLevel[]
  financingAnnual: FinancingPoint[]
  financingTotalMillion: number
  financingLinesSumMillion: number
  premiums: PremiumRow[]
  subsidies: SubsidyRow[]
  notes: string[]
}
