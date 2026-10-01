import XLSX from 'xlsx'
import { readFile } from 'node:fs/promises'
import { parse } from 'csv-parse/sync'
import { fromRoot } from '../lib/paths.ts'
import { numberOrNull } from '../lib/csv.ts'
import {
  GROWTH_END_YEAR,
  GROWTH_START_YEAR,
  GROWTH_YEARS,
  HORIZON_YEAR,
  HORIZON_YEARS,
  cantonalSubsidyMillion,
  compoundAnnualGrowth,
  gdpShareAtHorizon,
  projectForward,
  projectionPath,
} from './math.ts'
import type { FinancingLevel, FinancingPoint, IndexPoint, LamalPageModel, LevelRow, PremiumRow, SeriesStatus, ShareGroup, SubsidyRow, YearValue } from './model.ts'

const PREMIUMS_FILE = 'data/raw/ofsp/manual/dashboardassurancemaladie-donnees/Daten/04_Primes_prime-moyenne-mensuelle.xlsx'
const SUBSIDIES_FILE = 'data/raw/ofsp/manual/dashboardassurancemaladie-donnees/Daten/04_Primes_reduction-des-primes.xlsx'
const COSTS_FILE = 'data/raw/bfs/manual/cou_health_costs_since_1960.xlsx'
const BREAKDOWN_FILE = 'data/raw/bfs/manual/cou_2024_breakdown.csv'
const FINANCING_FILE = 'data/raw/bfs/manual/cou_financing_1995_2024.csv'

const CANTONS = [
  { canton: 'CH', label: 'Suisse', universityHospital: null },
  { canton: 'GE', label: 'Genève', universityHospital: 'Hôpitaux universitaires de Genève' },
  { canton: 'VD', label: 'Vaud', universityHospital: 'CHUV' },
  { canton: 'ZH', label: 'Zurich', universityHospital: 'Hôpital universitaire de Zurich' },
  { canton: 'BE', label: 'Berne', universityHospital: 'Inselspital' },
  { canton: 'FR', label: 'Fribourg', universityHospital: null },
] as const

type CostYear = {
  year: number
  status: SeriesStatus
  costsMillion: number
  gdpMillion: number
  gdpShare: number
  population: number
  costPerInhabitantMonth: number | null
}

type BreakdownRow = {
  kind: string
  label: string
  millionChf: number
}

function plain(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function sheetRows(relativePath: string, sheetName?: string): unknown[][] {
  const workbook = XLSX.readFile(fromRoot(relativePath))
  const name = sheetName ?? workbook.SheetNames[0]
  const sheet = workbook.Sheets[name]
  if (!sheet) throw new Error(`Feuille absente dans ${relativePath}: ${name ?? ''}`)
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as unknown[][]
}

function records(relativePath: string): Record<string, unknown>[] {
  const workbook = XLSX.readFile(fromRoot(relativePath))
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? '']
  if (!sheet) throw new Error(`Classeur vide: ${relativePath}`)
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true, defval: null })
}

function parseCostYear(cell: unknown): { year: number, status: SeriesStatus } | null {
  if (typeof cell === 'number' && Number.isInteger(cell) && cell >= 1960 && cell <= 2100) {
    return { year: cell, status: cell <= 2009 ? 'retropolated' : 'observed' }
  }
  const text = String(cell ?? '').trim()
  const match = /^(\d{4})(\d)?$/.exec(text)
  if (!match) return null
  const year = Number(match[1])
  const flag = match[2]
  if (flag === '2') return { year, status: 'provisional' }
  if (flag === '3') return { year, status: 'estimated' }
  return { year, status: year <= 2009 ? 'retropolated' : 'observed' }
}

function column(header: unknown[], predicate: (cell: string) => boolean, file: string): number {
  const index = header.findIndex((cell) => predicate(plain(String(cell ?? ''))))
  if (index < 0) throw new Error(`Colonne introuvable dans ${file}`)
  return index
}

function readCosts(): CostYear[] {
  const rows = sheetRows(COSTS_FILE, 'Coûts depuis 1960')
  const headerIndex = rows.findIndex((row) => row.some((cell) => plain(String(cell ?? '')) === 'annee'))
  if (headerIndex < 0) throw new Error('En-tête Année introuvable dans le classeur des coûts.')
  const header = rows[headerIndex] ?? []
  const yearIndex = column(header, (cell) => cell === 'annee', COSTS_FILE)
  const costIndex = column(header, (cell) => cell.startsWith('couts du systeme'), COSTS_FILE)
  const gdpIndex = column(header, (cell) => cell.startsWith('produit interieur brut'), COSTS_FILE)
  const shareIndex = column(header, (cell) => cell === 'value_gdp', COSTS_FILE)
  const populationIndex = column(header, (cell) => cell.includes('population'), COSTS_FILE)
  const monthIndex = column(header, (cell) => cell.includes('habitant'), COSTS_FILE)
  const parsed: CostYear[] = []
  for (const row of rows.slice(headerIndex + 1)) {
    const dated = parseCostYear(row[yearIndex])
    if (!dated || dated.status === 'estimated') continue
    const costsMillion = numberOrNull(row[costIndex])
    const gdpMillion = numberOrNull(row[gdpIndex])
    const gdpShare = numberOrNull(row[shareIndex])
    const populationThousands = numberOrNull(row[populationIndex])
    if (costsMillion === null || gdpMillion === null || gdpShare === null || populationThousands === null) continue
    parsed.push({
      year: dated.year,
      status: dated.status,
      costsMillion,
      gdpMillion,
      gdpShare,
      population: populationThousands * 1000,
      costPerInhabitantMonth: numberOrNull(row[monthIndex]),
    })
  }
  return parsed
}

function valueAt(rows: CostYear[], year: number): CostYear {
  const row = rows.find((item) => item.year === year)
  if (!row) throw new Error(`Année ${year} absente de la série des coûts.`)
  return row
}

function level(id: string, label: string, unit: string, y2000: number, y2010: number, y2024: number, y2050: number, status2000: SeriesStatus, status2024: SeriesStatus): LevelRow {
  return {
    id,
    label,
    unit,
    y2000,
    y2010,
    y2024,
    cagr2010to2024: compoundAnnualGrowth(y2010, y2024, GROWTH_YEARS),
    y2050,
    status2000,
    status2024,
  }
}

function readPremiums(): PremiumRow[] {
  const rows = records(PREMIUMS_FILE)
  return CANTONS.map((canton) => {
    const byYear = new Map<number, number>()
    for (const row of rows) {
      if (String(row.Canton_ISO2) !== canton.canton) continue
      if (String(row.Groupe_d_age) !== 'total') continue
      const year = numberOrNull(row.Annee)
      const annual = numberOrNull(row.Prime_annuelle_par_assure)
      if (year === null || annual === null) continue
      byYear.set(year, annual)
    }
    const y2000 = byYear.get(2000)
    const y2010 = byYear.get(2010)
    const y2024 = byYear.get(2024)
    if (y2000 === undefined || y2010 === undefined || y2024 === undefined) {
      throw new Error(`Prime annuelle manquante pour ${canton.canton}.`)
    }
    const rate = compoundAnnualGrowth(y2010, y2024, GROWTH_YEARS)
    return {
      canton: canton.canton,
      label: canton.label,
      universityHospital: canton.universityHospital,
      y2000,
      y2010,
      y2024,
      cagr2010to2024: rate,
      y2050: projectForward(y2024, rate, HORIZON_YEARS),
      annual: yearValues(byYear),
      projected: projectionPath(y2024, rate, GROWTH_END_YEAR, HORIZON_YEAR),
    }
  })
}

function yearValues(byYear: Map<number, number>): YearValue[] {
  return [...byYear.entries()]
    .filter(([year]) => year >= GROWTH_START_YEAR && year <= GROWTH_END_YEAR)
    .sort(([left], [right]) => left - right)
    .map(([year, value]) => ({ year, value }))
}

function subsidyNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key]
  if (typeof value === 'string' && value.trim().toLowerCase() === 'na') return null
  return numberOrNull(value)
}

function cantonalMillion(row: Record<string, unknown> | undefined): number | null {
  if (!row) return null
  const published = subsidyNumber(row, 'Part_cantonale_mio-francs')
  const total = subsidyNumber(row, 'Contribution_totale_mio-francs')
  const share = subsidyNumber(row, 'Part_cantonale')
  if (published !== null) return published
  if (total === null || share === null) return null
  return cantonalSubsidyMillion(null, total, share)
}

function readSubsidies(): SubsidyRow[] {
  const rows = records(SUBSIDIES_FILE).filter((row) => String(row.Groupe_d_age ?? 'total') === 'total' || row.Groupe_d_age == null)
  return CANTONS.filter((canton) => canton.canton !== 'CH').map((canton) => {
    const byYear = new Map<number, Record<string, unknown>>()
    for (const row of rows) {
      if (String(row.Canton_ISO2) !== canton.canton) continue
      const year = numberOrNull(row.Annee)
      if (year === null) continue
      byYear.set(year, row)
    }
    const pick = (year: number) => byYear.get(year)
    const row2010 = pick(2010)
    const row2020 = pick(2020)
    const row2024 = pick(2024)
    const y2010 = cantonalMillion(row2010)
    const y2020 = cantonalMillion(row2020)
    const y2024 = cantonalMillion(row2024)
    const total2024 = row2024 ? subsidyNumber(row2024, 'Contribution_totale_mio-francs') : null
    const share = row2024 ? subsidyNumber(row2024, 'Part_cantonale') : null
    if (y2024 !== null && total2024 !== null && share !== null) {
      cantonalSubsidyMillion(y2024, total2024, share)
    }
    const cagr2010to2024 = y2010 !== null && y2024 !== null ? compoundAnnualGrowth(y2010, y2024, GROWTH_YEARS) : null
    const genevaWindow = canton.canton === 'GE' && y2020 !== null && y2024 !== null
    const projectionRate = genevaWindow
      ? compoundAnnualGrowth(y2020, y2024, GROWTH_END_YEAR - 2020)
      : cagr2010to2024
    const projectionWindow = genevaWindow ? '2020-2024' : projectionRate === null ? null : '2010-2024'
    return {
      canton: canton.canton,
      label: canton.label,
      y2010,
      y2020,
      y2024,
      total2024,
      cantonalShare2024: share,
      beneficiaryRate2024: row2024 ? subsidyNumber(row2024, 'Taux_de_beneficiaires') : null,
      cagr2010to2024,
      projectionRate,
      projectionWindow,
      y2050: projectionRate !== null && y2024 !== null ? projectForward(y2024, projectionRate, HORIZON_YEARS) : null,
      annual: [...byYear.entries()]
        .map(([year, row]) => ({ year, value: cantonalMillion(row) }))
        .filter((point): point is YearValue => point.year >= GROWTH_START_YEAR && point.year <= GROWTH_END_YEAR && point.value !== null)
        .sort((left, right) => left.year - right.year),
      projected: projectionRate !== null && y2024 !== null ? projectionPath(y2024, projectionRate, GROWTH_END_YEAR, HORIZON_YEAR) : [],
    }
  })
}

async function readBreakdown(): Promise<BreakdownRow[]> {
  const content = await readFile(fromRoot(BREAKDOWN_FILE), 'utf8')
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
  return rows
    .filter((row) => !row.label.includes('total'))
    .map((row) => {
      const millionChf = numberOrNull(row.million_chf)
      if (millionChf === null) throw new Error(`Montant illisible: ${row.label}`)
      return { kind: row.kind, label: row.label, millionChf }
    })
}

function group(rows: BreakdownRow[], id: string, label: string, names: string[], total: number): ShareGroup {
  const millionChf = names.reduce((sum, name) => {
    const row = rows.find((item) => item.label === name)
    if (!row) throw new Error(`Ligne absente de la ventilation 2024: ${name}`)
    return sum + row.millionChf
  }, 0)
  return { id, label, millionChf, share: millionChf / total }
}

type FinancingCell = {
  year: number
  source: string
  scheme: string
  million: number
  status: SeriesStatus
}

function financingStatus(code: string): SeriesStatus {
  switch (code) {
    case 'A':
      return 'observed'
    case 'P':
      return 'provisional'
    default: {
      throw new Error(`Statut OFS inconnu dans le cube de financement: ${code}`)
    }
  }
}

async function readFinancingCells(): Promise<FinancingCell[]> {
  const content = await readFile(fromRoot(FINANCING_FILE), 'utf8')
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
  return rows
    .filter((row) => row.UNIT === 'CHF' && row.MULT === '6')
    .map((row) => {
      const year = numberOrNull(row.TIME_PERIOD)
      const million = numberOrNull(row.OBS_VALUE)
      if (year === null || million === null) throw new Error('Ligne de financement illisible.')
      return { year, source: row.Q ?? '', scheme: row.F ?? '', million, status: financingStatus(row.OBS_STATUS ?? '') }
    })
}

function financingCell(cells: FinancingCell[], year: number, source: string, scheme: string): FinancingCell {
  const found = cells.find((cell) => cell.year === year && cell.source === source && cell.scheme === scheme)
  if (!found) throw new Error(`Financement absent: ${year} ${source} ${scheme}`)
  return found
}

function financingParts(cells: FinancingCell[], year: number): Omit<FinancingPoint, 'year' | 'status'> & { status: SeriesStatus } {
  const direct = financingCell(cells, year, '_T', 'F_4')
  const premiums = financingCell(cells, year, 'Q_4', 'F_2_1').million
    + financingCell(cells, year, 'Q_4', 'F_3_1').million
    + financingCell(cells, year, 'Q_4', 'F_3_2').million
  const publicAuthorities = financingCell(cells, year, 'Q_1', '_T').million
    + financingCell(cells, year, 'Q_2', '_T').million
    + financingCell(cells, year, 'Q_3', '_T').million
  const other = financingCell(cells, year, 'Q_5', '_T').million + financingCell(cells, year, 'Q_6', '_T').million
  const pieces = [direct, financingCell(cells, year, 'Q_4', 'F_2_1'), financingCell(cells, year, 'Q_1', '_T')]
  const status = pieces.some((piece) => piece.status === 'provisional') ? 'provisional' : 'observed'
  return { households: direct.million, premiums, public: publicAuthorities, other, status }
}

function financingLevel(id: FinancingLevel['id'], label: string, y2010: number, y2024: number, total2024: number, total2050: number): FinancingLevel {
  const rate = compoundAnnualGrowth(y2010, y2024, GROWTH_YEARS)
  const y2050 = projectForward(y2024, rate, HORIZON_YEARS)
  return {
    id,
    label,
    y2010,
    y2024,
    cagr2010to2024: rate,
    y2050,
    share2024: y2024 / total2024,
    share2050: y2050 / total2050,
  }
}

function indexPoint(year: number, status: SeriesStatus, costs: number, gdp: number, population: number, base: CostYear): IndexPoint {
  return {
    year,
    status,
    costs: (costs / base.costsMillion) * 100,
    gdp: (gdp / base.gdpMillion) * 100,
    population: (population / base.population) * 100,
  }
}

export async function buildLamalModel(generatedAt = new Date().toISOString()): Promise<LamalPageModel> {
  const costs = readCosts()
  const y2000 = valueAt(costs, 2000)
  const y2010 = valueAt(costs, GROWTH_START_YEAR)
  const y2024 = valueAt(costs, GROWTH_END_YEAR)
  const costRate = compoundAnnualGrowth(y2010.costsMillion, y2024.costsMillion, GROWTH_YEARS)
  const gdpRate = compoundAnnualGrowth(y2010.gdpMillion, y2024.gdpMillion, GROWTH_YEARS)
  const populationRate = compoundAnnualGrowth(y2010.population, y2024.population, GROWTH_YEARS)
  const costs2050 = projectForward(y2024.costsMillion, costRate, HORIZON_YEARS)
  const gdp2050 = projectForward(y2024.gdpMillion, gdpRate, HORIZON_YEARS)
  const population2050 = projectForward(y2024.population, populationRate, HORIZON_YEARS)
  const share2050 = gdpShareAtHorizon(y2024.gdpShare, costRate, gdpRate, HORIZON_YEARS)
  const annual = costs.filter((row) => row.year >= 2000 && row.year <= GROWTH_END_YEAR)
  const costsPath = projectionPath(y2024.costsMillion, costRate, GROWTH_END_YEAR, HORIZON_YEAR)
  const gdpPath = projectionPath(y2024.gdpMillion, gdpRate, GROWTH_END_YEAR, HORIZON_YEAR)
  const populationPath = projectionPath(y2024.population, populationRate, GROWTH_END_YEAR, HORIZON_YEAR)
  const index2010 = [
    ...annual.map((row) => indexPoint(row.year, row.status, row.costsMillion, row.gdpMillion, row.population, y2010)),
    ...costsPath.slice(1).map((point, offset) => indexPoint(point.year, 'estimated', point.value, gdpPath[offset + 1].value, populationPath[offset + 1].value, y2010)),
  ]
  const breakdown = await readBreakdown()
  const providers = breakdown.filter((row) => row.kind === 'provider')
  const financingLines = breakdown.filter((row) => row.kind === 'financing_source')
  const postsTotalMillion = 97201
  const posts2024 = [
    group(providers, 'hospitals', 'Hôpitaux', ['Hôpitaux'], postsTotalMillion),
    group(providers, 'ems', 'EMS', ['Institutions médico-sociales'], postsTotalMillion),
    group(providers, 'ambulatory', 'Cabinets, soins à domicile et biens', [
      'Cabinets médicaux',
      'Cabinets et cliniques dentaires',
      'Autres prestataires de services ambulatoires et de soins à domicile',
      'Prestataires de services auxiliaires',
      'Commerce de détail',
    ], postsTotalMillion),
    group(providers, 'administration', 'Administration et autres prestataires', [
      'Assurances comme prestataires de services',
      'État comme prestataire de services',
      'Organisations à but non lucratif, ONG',
      'Reste du monde (importations)',
    ], postsTotalMillion),
  ]
  const financingCells = await readFinancingCells()
  const financing2010 = financingParts(financingCells, GROWTH_START_YEAR)
  const financingNow = financingParts(financingCells, GROWTH_END_YEAR)
  const financingTotalMillion = financingCell(financingCells, GROWTH_END_YEAR, '_T', '_T').million
  const financingDrafts = [
    financingLevel('households', 'Ménages, paiements directs', financing2010.households, financingNow.households, financingTotalMillion, 1),
    financingLevel('premiums', 'Primes', financing2010.premiums, financingNow.premiums, financingTotalMillion, 1),
    financingLevel('public', 'Collectivités publiques', financing2010.public, financingNow.public, financingTotalMillion, 1),
    financingLevel('other', 'Entreprises et sources inconnues', financing2010.other, financingNow.other, financingTotalMillion, 1),
  ]
  const financingTotal2050 = financingDrafts.reduce((sum, level) => sum + level.y2050, 0)
  const financingLevels = financingDrafts.map((level) => ({ ...level, share2050: level.y2050 / financingTotal2050 }))
  const financingSnapshot = [
    group(financingLines, 'households', 'Ménages, paiements directs', [
      'Ménages: participation aux frais (LAMal et LCA) et out of pocket',
    ], 98269),
    group(financingLines, 'premiums', 'Primes', [
      'Ménages: primes LAMal',
      'Ménages: primes LCA',
      'Ménages: autres financements',
    ], 98269),
    group(financingLines, 'public', 'Collectivités publiques', [
      'État: paiements pour des prestations',
      'État: subventions aux assurances sociales',
    ], 98269),
    group(financingLines, 'other', 'Entreprises et sources inconnues', [
      'Entreprises: cotisations aux assurances sociales',
      'Entreprises: financement privé',
      'Source de financement inconnue',
    ], 98269),
  ]
  for (const level of financingLevels) {
    const snapshot = financingSnapshot.find((row) => row.id === level.id)
    if (!snapshot || Math.abs(snapshot.millionChf - level.y2024) > 1) {
      throw new Error(`Le cube de financement ne retrouve pas la ligne 2024: ${level.id}`)
    }
  }
  const financing2024 = financingLevels.map((level) => ({ id: level.id, label: level.label, millionChf: level.y2024, share: level.share2024 }))
  const financingAnnual = [
    ...Array.from({ length: GROWTH_YEARS + 1 }, (_, offset) => {
      const year = GROWTH_START_YEAR + offset
      const part = financingParts(financingCells, year)
      return { year, status: part.status, households: part.households, premiums: part.premiums, public: part.public, other: part.other }
    }),
    ...Array.from({ length: HORIZON_YEARS }, (_, offset) => {
      const year = GROWTH_END_YEAR + offset + 1
      return {
        year,
        status: 'estimated' as const,
        households: financingAt('households', year),
        premiums: financingAt('premiums', year),
        public: financingAt('public', year),
        other: financingAt('other', year),
      }
    }),
  ]
  function financingAt(id: FinancingLevel['id'], year: number): number {
    const level = financingLevels.find((row) => row.id === id)
    if (!level) throw new Error(`Projection de financement absente: ${id}`)
    return projectForward(level.y2024, level.cagr2010to2024, year - GROWTH_END_YEAR)
  }
  const national: LevelRow[] = [
    level('costs', 'Coûts du système de santé', 'millions de francs', y2000.costsMillion, y2010.costsMillion, y2024.costsMillion, costs2050, y2000.status, y2024.status),
    level('gdp', 'PIB', 'millions de francs', y2000.gdpMillion, y2010.gdpMillion, y2024.gdpMillion, gdp2050, y2000.status, y2024.status),
    {
      id: 'gdp_share',
      label: 'Part des coûts dans le PIB',
      unit: 'pourcent',
      y2000: y2000.gdpShare,
      y2010: y2010.gdpShare,
      y2024: y2024.gdpShare,
      cagr2010to2024: null,
      y2050: share2050,
      status2000: y2000.status,
      status2024: y2024.status,
    },
    level('population', 'Population moyenne résidante', 'personnes', y2000.population, y2010.population, y2024.population, population2050, y2000.status, y2024.status),
  ]
  return {
    generatedAt,
    national,
    index2010,
    costPerInhabitantMonth2024: y2024.costPerInhabitantMonth,
    posts2024,
    postsTotalMillion,
    financing2024,
    financingLevels,
    financingAnnual,
    financingTotalMillion,
    financingLinesSumMillion: financing2024.reduce((sum, row) => sum + row.millionChf, 0),
    premiums: readPremiums(),
    subsidies: readSubsidies(),
    notes: [
      'La prime affichée est la prime annuelle moyenne par assuré, groupe d\'âge total, fichier OFSP.',
      'Le taux 2010-2024 est le taux composé qui relie exactement ces deux années. 2000 est un niveau. 2025, estimé, est hors du taux.',
      'La projection prolonge ce taux année par année, de 2025 à 2050, et les 26 points sont écrits dans le fichier. Ce n\'est pas un scénario de vieillissement.',
      '2000 à 2009 sont rétropolés dans le classeur des coûts. 2024 y est provisoire.',
      'Le financement 2010-2024 vient du cube OFS DF_COU_HEALTH_FINANCING, publication du 24 avril 2026. Les quatre groupes retrouvent le tableau 2024 de la page OFS. 2024 est provisoire. La projection prolonge chaque groupe en francs.',
      'Les frais d\'administration de l\'AOS, 1,7 milliard en 2024 selon l\'OFSP, ne sont pas ajoutés à la ligne assurances comme prestataires.',
    ],
  }
}

export function assertPostsClosed(model: LamalPageModel): void {
  const sum = model.posts2024.reduce((total, row) => total + row.millionChf, 0)
  if (sum !== model.postsTotalMillion) {
    throw new Error(`Les postes somment à ${sum}, pas à ${model.postsTotalMillion}.`)
  }
  const insurers = 3560
  const admin = model.posts2024.find((row) => row.id === 'administration')
  if (!admin || admin.millionChf < insurers) {
    throw new Error('La ligne administration ne contient pas les assurances comme prestataires.')
  }
  if (admin.millionChf === insurers + 1700) {
    throw new Error('Les frais d\'administration AOS ont été ajoutés aux assurances comme prestataires.')
  }
}
