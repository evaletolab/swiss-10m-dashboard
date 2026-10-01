export const GROWTH_START_YEAR = 2010
export const GROWTH_END_YEAR = 2024
export const HORIZON_YEAR = 2050
export const GROWTH_YEARS = GROWTH_END_YEAR - GROWTH_START_YEAR
export const HORIZON_YEARS = HORIZON_YEAR - GROWTH_END_YEAR

export function compoundAnnualGrowth(start: number, end: number, years: number): number {
  if (!(start > 0) || !(end > 0) || !(years > 0)) {
    throw new Error('La croissance composée demande deux valeurs positives et un nombre d\'années positif.')
  }
  return (end / start) ** (1 / years) - 1
}

export function projectForward(value: number, annualRate: number, years: number): number {
  if (!(value > 0) || !(years > 0)) {
    throw new Error('La projection demande une valeur positive et un nombre d\'années positif.')
  }
  return value * (1 + annualRate) ** years
}

// Le chemin composé année par année. Sans lui, un graphique relie deux points et affiche une droite.
export function projectionPath(value: number, annualRate: number, startYear: number, endYear: number): { year: number; value: number }[] {
  if (!(endYear > startYear)) {
    throw new Error('La projection annuelle demande un horizon postérieur à l\'année de départ.')
  }
  return Array.from({ length: endYear - startYear + 1 }, (_, offset) => ({
    year: startYear + offset,
    value: offset === 0 ? value : projectForward(value, annualRate, offset),
  }))
}

export function projectFromWindow(start: number, end: number, observedYears: number, horizonYears: number): number {
  return projectForward(end, compoundAnnualGrowth(start, end, observedYears), horizonYears)
}

export function gdpShareAtHorizon(share: number, costRate: number, gdpRate: number, years: number): number {
  if (!(share > 0) || !(years > 0)) {
    throw new Error('La part du PIB demande une part positive et un nombre d\'années positif.')
  }
  return share * ((1 + costRate) / (1 + gdpRate)) ** years
}

export function cantonalSubsidyMillion(publishedCantonalMillion: number | null, totalMillion: number, cantonalShare: number): number {
  if (!(cantonalShare >= 0 && cantonalShare <= 1)) {
    throw new Error('La part cantonale doit être un ratio entre 0 et 1.')
  }
  if (publishedCantonalMillion !== null) return publishedCantonalMillion
  return Math.round(totalMillion * cantonalShare * 10) / 10
}

export function officialAveragePremium(dashboardAnnual: number, unweightedTariffMean: number): number {
  if (!Number.isFinite(unweightedTariffMean)) {
    throw new Error('La moyenne des tarifs doit être un nombre, même si elle ne sert pas.')
  }
  return dashboardAnnual
}
