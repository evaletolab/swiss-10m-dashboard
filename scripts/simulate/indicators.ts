import { readCsv, numberOrNull } from '../lib/csv.ts'

export async function latestFertilityIndicators() {
  const rows = await readCsv('data/normalized/ch_demography.csv')
  const latest = [...rows].reverse().find((row) => numberOrNull(row.fertility_rate) !== null)
  const rate = numberOrNull(latest?.fertility_rate) ?? 1.29
  const replacementRate = 2.1
  const generationReplacementRatio = rate / replacementRate
  return {
    latestRate: rate,
    replacementRate,
    generationReplacementRatio,
    twoGenerationBase: Math.pow(generationReplacementRatio, 2),
  }
}
