import { existsSync } from 'node:fs'
import { numberOrNull, readCsv, type CsvRow } from './csv.ts'
import { fromRoot } from './paths.ts'

type BfsBalanceOptions = {
  path: string
  territoryIncludes: string[]
  sourceId: string
  sourceNote: string
}

function firstNumber(row: Record<string, string>, names: string[]) {
  for (const name of names) {
    const value = numberOrNull(row[name])
    if (value !== null) return value
  }
  return null
}

function hasNormalizedColumns(row: Record<string, string>) {
  return 'year' in row && 'population' in row
}

function territoryMatches(row: Record<string, string>, fragments: string[]) {
  const territory = String(row['Canton (-) / District (>>) / Commune (......)'] ?? row.canton ?? '').toLowerCase()
  return fragments.some((fragment) => territory.includes(fragment.toLowerCase()))
}

export async function readBfsBalanceRows(options: BfsBalanceOptions): Promise<CsvRow[]> {
  if (!existsSync(fromRoot(options.path))) return []
  const rawRows = await readCsv(options.path)
  if (rawRows.length === 0) return []

  if (hasNormalizedColumns(rawRows[0] ?? {})) {
    return rawRows as CsvRow[]
  }

  const rows = rawRows
    .filter((row) => territoryMatches(row, options.territoryIncludes))
    .map((row) => {
      const births = firstNumber(row, ['Naissance vivante', 'births'])
      const deaths = firstNumber(row, ['Décès', 'Deces', 'deaths'])
      const naturalBalance = firstNumber(row, ['Accroissement naturel', 'natural_balance']) ?? (births !== null && deaths !== null ? births - deaths : null)
      const immigration = firstNumber(row, ['Immigration, y compris les changements de type de population', 'Immigration', 'immigration'])
      const emigrationOfficial = firstNumber(row, ['Émigration', 'Emigration', 'emigration'])
      const netMigrationOfficial = firstNumber(row, ['Solde migratoire, y compris les changements de type de population', 'Solde migratoire', 'net_migration'])
      return {
        year: firstNumber(row, ['Année', 'year']),
        population: firstNumber(row, ['Effectif au 31 décembre', 'Effectif au 1er janvier', 'population']),
        total_growth: firstNumber(row, ['Variation', 'total_growth']),
        births,
        deaths,
        natural_balance: naturalBalance,
        immigration,
        emigration: emigrationOfficial,
        net_migration: netMigrationOfficial,
        fertility_rate: firstNumber(row, ['fertility_rate', 'Indicateur conjoncturel de fécondité']),
        data_type: 'observed',
        source_id: options.sourceId,
        source_note: options.sourceNote,
      }
    })
    .filter((row) => row.year !== null && row.population !== null)
    .sort((a, b) => Number(a.year) - Number(b.year))

  return rows.map((row, index) => {
    const previous = index > 0 ? rows[index - 1] : null
    const derivedGrowth = previous !== null && previous.population !== null && row.population !== null ? Number(row.population) - Number(previous.population) : null
    const totalGrowth = row.total_growth ?? derivedGrowth
    const netMigration = row.net_migration ?? (totalGrowth !== null && row.natural_balance !== null ? totalGrowth - Number(row.natural_balance) : null)
    const emigration = row.emigration ?? (row.immigration !== null && netMigration !== null ? Number(row.immigration) - netMigration : null)
    return {
      ...row,
      total_growth: index === 0 ? null : totalGrowth,
      net_migration: index === 0 ? null : netMigration,
      emigration: index === 0 ? row.emigration : emigration,
      source_note: `${row.source_note} Population issue de l'effectif disponible dans l'export OFS; variation et migration nette dérivées si absentes.`,
    }
  })
}
