import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { assertPostsClosed, buildLamalModel } from './build.ts'
import {
  cantonalSubsidyMillion,
  compoundAnnualGrowth,
  gdpShareAtHorizon,
  officialAveragePremium,
  projectForward,
  projectFromWindow,
} from './math.ts'

describe('croissance composée', () => {
  it('relie exactement 2010 à 2024, contrairement à la moyenne arithmétique des taux', () => {
    const start = 100
    const end = 200
    const years = 2
    const rate = compoundAnnualGrowth(start, end, years)
    assert.ok(Math.abs(projectForward(start, rate, years) - end) < 1e-9)
    const arithmetic = 0.5
    assert.ok(Math.abs(projectForward(start, arithmetic, years) - end) > 1)
  })

  it('prolonge 26 ans à partir de 2024', () => {
    const value = projectFromWindow(2834.5, 4278.15, 14, 26)
    const replay = projectForward(2834.5, compoundAnnualGrowth(2834.5, 4278.15, 14), 14)
    assert.ok(Math.abs(replay - 4278.15) < 1e-6)
    assert.ok(value > 4278.15)
  })

  it('calcule la part du PIB 2050 à partir des francs, pas en composant le pourcentage', () => {
    const share = 11.3824662404002
    const costs2010 = 62396.96
    const costs2024 = 97201.3655
    const gdp2010 = 636172.02
    const gdp2024 = 853956.98
    const costRate = compoundAnnualGrowth(costs2010, costs2024, 14)
    const gdpRate = compoundAnnualGrowth(gdp2010, gdp2024, 14)
    const projected = gdpShareAtHorizon(share, costRate, gdpRate, 26)
    const costs2050 = projectForward(costs2024, costRate, 26)
    const gdp2050 = projectForward(gdp2024, gdpRate, 26)
    assert.ok(Math.abs(projected - (costs2050 / gdp2050) * 100) < 1e-6)
    assert.ok(projected < share * (1 + costRate) ** 26)
  })
})

describe('hypothèses de normalisation', () => {
  it('garde la part cantonale publiée et refuse un pourcentage passé pour un ratio', () => {
    assert.equal(cantonalSubsidyMillion(158.2, 273.5, 0.578428), 158.2)
    assert.equal(cantonalSubsidyMillion(null, 273.5, 0.578428), 158.2)
    assert.throws(() => cantonalSubsidyMillion(null, 273.5, 57.8))
  })

  it('prend la prime du dashboard plutôt que la moyenne non pondérée des tarifs', () => {
    assert.equal(officialAveragePremium(150, (100 + 300) / 2), 150)
  })
})

describe('série LAMal lue dans les fichiers', () => {
  it('verrouille primes, coûts, postes et subsides', async () => {
    const model = await buildLamalModel('2026-09-30T00:00:00.000Z')
    assertPostsClosed(model)
    const geneva = model.premiums.find((row) => row.canton === 'GE')
    const swiss = model.premiums.find((row) => row.canton === 'CH')
    assert.ok(geneva)
    assert.ok(swiss)
    assert.ok(Math.abs(geneva.y2010 - 3621.9) < 0.2)
    assert.ok(Math.abs(geneva.y2024 - 5365.01) < 0.2)
    assert.ok(Math.abs(projectForward(geneva.y2010, geneva.cagr2010to2024, 14) - geneva.y2024) < 0.05)
    const others = model.premiums.filter((row) => row.canton !== 'CH' && row.canton !== 'BE')
    const unweighted = others.reduce((sum, row) => sum + row.y2024, 0) / others.length
    assert.ok(Math.abs(unweighted - swiss.y2024) > 50)

    const costs = model.national.find((row) => row.id === 'costs')
    assert.ok(costs)
    assert.equal(costs.status2000, 'retropolated')
    assert.equal(costs.status2024, 'provisional')
    assert.ok(Math.abs((costs.y2024 ?? 0) - 97201.37) < 0.1)
    assert.equal(model.index2010.some((point) => point.year === 2025), false)
    assert.equal(model.index2010.at(-1)?.year, 2050)
    assert.equal(model.index2010.find((point) => point.year === 2010)?.costs, 100)

    const subsidy = model.subsidies.find((row) => row.canton === 'GE')
    assert.ok(subsidy)
    assert.ok(subsidy.y2010 !== null && Math.abs(subsidy.y2010 - 158.2) < 0.15)
    assert.equal(subsidy.projectionWindow, '2020-2024')
    assert.ok(subsidy.y2020 !== null && subsidy.y2020 > subsidy.y2010)
    const vaud = model.subsidies.find((row) => row.canton === 'VD')
    assert.equal(vaud?.projectionWindow, '2010-2024')

    const admin = model.posts2024.find((row) => row.id === 'administration')
    assert.equal(admin?.millionChf, 6371)
    assert.ok(Math.abs(model.financingLinesSumMillion - model.financingTotalMillion) <= 1)
    assert.ok(Math.abs(model.financingTotalMillion - 98268.86) < 0.01)
    const households = model.financingLevels.find((row) => row.id === 'households')
    assert.ok(households)
    assert.ok(Math.abs(households.y2024 - 20907.21) < 0.05)
    assert.ok(Math.abs(projectForward(households.y2010, households.cagr2010to2024, 14) - households.y2024) < 0.05)
    const share2050 = model.financingLevels.reduce((sum, row) => sum + row.share2050, 0)
    assert.ok(Math.abs(share2050 - 1) < 1e-9)
    assert.equal(model.posts2024.reduce((sum, row) => sum + row.millionChf, 0), 97201)
    assert.equal(model.financingAnnual[0]?.year, 2010)
    assert.equal(model.financingAnnual.at(-1)?.year, 2050)
  })
})
