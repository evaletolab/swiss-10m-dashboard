import { existsSync } from 'node:fs'
import { numberOrNull, readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'
import { addDownloadRequest } from '../lib/downloadRequests.ts'
import { fromRoot } from '../lib/paths.ts'

export const geStateBudgetPostColumns = [
  'year',
  'total_charges_million_chf',
  'cohesion_sociale_million_chf',
  'formation_million_chf',
  'sante_million_chf',
  'mobilite_million_chf',
  'securite_population_million_chf',
  'justice_million_chf',
  'amenagement_logement_million_chf',
  'environnement_energie_million_chf',
  'etats_majors_transversal_million_chf',
  'impots_finances_million_chf',
  'culture_sport_loisirs_million_chf',
  'economie_emploi_million_chf',
  'data_type',
  'source_id',
  'source_note',
]

const manualPath = 'data/raw/etat_ge/manual/ge_state_budget_posts.csv'

const officialTotalRows: CsvRow[] = [
  {
    year: 2010,
    total_charges_million_chf: 7869,
    data_type: 'official_account',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Compte 2010, total des charges de fonctionnement, tableau par nature repris dans PL 10866.',
  },
  {
    year: 2011,
    total_charges_million_chf: 7791.77,
    data_type: 'official_budget',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Budget 2011, charges de fonctionnement hors imputations internes et subventions redistribuées, PL 10739.',
  },
  {
    year: 2012,
    total_charges_million_chf: 8028.59,
    data_type: 'official_budget',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Budget 2012, charges de fonctionnement hors imputations internes et subventions redistribuées, PL 10866.',
  },
  {
    year: 2015,
    total_charges_million_chf: 7819.4,
    data_type: 'official_budget',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Budget 2015, charges de fonctionnement, référence reprise dans PL 11968.',
  },
  {
    year: 2016,
    total_charges_million_chf: 7911.8,
    data_type: 'official_budget',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Budget 2016, charges de fonctionnement recalculées depuis PL 11968: PB 2017 8 145,1 M CHF, +233,3 M CHF vs budget 2016.',
  },
  {
    year: 2017,
    total_charges_million_chf: 8145.1,
    data_type: 'official_account',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Compte 2017, charges de fonctionnement hors imputations internes et subventions à redistribuer, repris dans PL 12394.',
  },
  {
    year: 2018,
    total_charges_million_chf: 8341.04,
    data_type: 'official_budget',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Budget 2018, charges de fonctionnement hors imputations internes et subventions à redistribuer, repris dans PL 12394.',
  },
  {
    year: 2019,
    total_charges_million_chf: 8710.19,
    data_type: 'official_account',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Compte 2019, charges de fonctionnement hors imputations internes et subventions à redistribuer, repris dans PL 12779.',
  },
  {
    year: 2020,
    total_charges_million_chf: 9129.99,
    data_type: 'official_budget',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Budget 2020, charges de fonctionnement hors imputations internes et subventions à redistribuer, repris dans PL 12779.',
  },
  {
    year: 2021,
    total_charges_million_chf: 10030.6,
    data_type: 'official_account',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Compte 2021, charges de fonctionnement hors imputations internes et subventions à redistribuer, repris dans PL 13178.',
  },
  {
    year: 2022,
    total_charges_million_chf: 10459.6,
    data_type: 'official_account',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Compte 2022, charges de fonctionnement hors imputations internes et subventions à redistribuer, repris dans PL 13360.',
  },
  {
    year: 2023,
    total_charges_million_chf: 11480.9,
    data_type: 'official_account',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Compte 2023, charges de fonctionnement hors imputations internes et subventions à redistribuer, repris dans PL 13535-A.',
  },
  {
    year: 2024,
    total_charges_million_chf: 10999.6,
    data_type: 'official_account',
    source_id: 'geneva_state_budget_functioning_totals',
    source_note: 'Compte 2024, charges de fonctionnement hors imputations internes et subventions à redistribuer, repris dans PL 13693-A.',
  },
  {
    year: 2025,
    total_charges_million_chf: 10891.8,
    data_type: 'official_budget',
    source_id: 'geneva_budget_2025_state_budget',
    source_note: 'Budget 2025, charges de fonctionnement hors imputations internes et subventions à redistribuer, PL 13535-A.',
  },
]

function budgetPostsRequest() {
  addDownloadRequest({
    id: 'ge_state_budget_posts_history_missing',
    dataset: 'ge_state_budget_posts',
    missingFields: geStateBudgetPostColumns.filter((column) => !['data_type', 'source_id', 'source_note'].includes(column)),
    reason: 'Afficher une série stackée 2010-2024 des charges de fonctionnement de l’État par politique publique, puis une projection 2050.',
    preferredSource: 'Budgets et comptes de l’État de Genève, Tome 1, détail par politique publique et programme',
    sourceUrl: 'https://www.ge.ch/finances-publiques/budget-comptes-etat',
    acceptedFormats: ['CSV', 'XLS', 'XLSX'],
    destinationPath: manualPath,
    instructions: 'Déposer une série annuelle 2010-2024 en millions CHF nominaux. Les colonnes par politique publique doivent totaliser les charges de fonctionnement hors imputations internes et subventions à redistribuer.',
  })
}

async function readManualRows() {
  if (!existsSync(fromRoot(manualPath))) return []
  return (await readCsv(manualPath)).map((row): CsvRow => ({
    year: row.year,
    total_charges_million_chf: row.total_charges_million_chf,
    cohesion_sociale_million_chf: row.cohesion_sociale_million_chf,
    formation_million_chf: row.formation_million_chf,
    sante_million_chf: row.sante_million_chf,
    mobilite_million_chf: row.mobilite_million_chf,
    securite_population_million_chf: row.securite_population_million_chf,
    justice_million_chf: row.justice_million_chf,
    amenagement_logement_million_chf: row.amenagement_logement_million_chf,
    environnement_energie_million_chf: row.environnement_energie_million_chf,
    etats_majors_transversal_million_chf: row.etats_majors_transversal_million_chf,
    impots_finances_million_chf: row.impots_finances_million_chf,
    culture_sport_loisirs_million_chf: row.culture_sport_loisirs_million_chf,
    economie_emploi_million_chf: row.economie_emploi_million_chf,
    data_type: row.data_type || 'official',
    source_id: row.source_id || 'geneva_state_budget_policy_posts',
    source_note: row.source_note || 'Budget / comptes de l’État de Genève, fichier manuel par politique publique.',
  }))
}

function mergeRows(baseRows: CsvRow[], manualRows: CsvRow[]) {
  const rows = new Map<number, CsvRow>()
  for (const row of [...baseRows, ...manualRows]) {
    const year = numberOrNull(row.year)
    if (year === null) continue
    rows.set(year, { ...(rows.get(year) ?? { year }), ...row })
  }
  return [...rows.values()].sort((a, b) => Number(a.year) - Number(b.year))
}

export async function normalizeGeStateBudgetPosts() {
  const rows = mergeRows(officialTotalRows, await readManualRows())
  const hasFullHistory = rows.filter((row) => Number(row.year) >= 2010 && Number(row.year) <= 2024)
    .every((row) =>
      numberOrNull(row.total_charges_million_chf) !== null
      && numberOrNull(row.cohesion_sociale_million_chf) !== null
      && numberOrNull(row.formation_million_chf) !== null
      && numberOrNull(row.sante_million_chf) !== null)
  if (!hasFullHistory) budgetPostsRequest()
  await writeCsv('data/normalized/ge_state_budget_posts.csv', rows, geStateBudgetPostColumns)
  return rows
}
