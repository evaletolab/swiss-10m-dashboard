import { existsSync } from 'node:fs'
import XLSX from 'xlsx'
import { numberOrNull, readCsv, writeCsv, type CsvRow } from '../lib/csv.ts'
import { addDownloadRequest } from '../lib/downloadRequests.ts'
import { fromRoot } from '../lib/paths.ts'

export const geEducationColumns = [
  'year',
  'students_public_subsidized',
  'students_private',
  'students_total',
  'school_classes',
  'teachers_fte',
  'students_per_class',
  'data_type',
  'source_id',
  'source_note',
]

type SheetRow = unknown[]

const manualCsvPath = 'data/raw/ocstat/manual/ge_education.csv'
const manualWorkbookPaths = [
  'data/raw/ocstat/manual/ge_education.xlsx',
  'data/raw/ocstat/manual/ge_education.xls',
]

function workbookPath() {
  return manualWorkbookPaths.find((path) => existsSync(fromRoot(path)))
}

function workbookRows(sheetName: string): SheetRow[] {
  const path = workbookPath()
  if (!path) return []
  const workbook = XLSX.readFile(fromRoot(path))
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1, defval: '' })
}

function readBfsClassSizeRows(): CsvRow[] {
  const rows = workbookRows('TD2')
  if (rows.length === 0) return []
  const yearRow = rows[3] ?? []
  const geMeanRow = rows.find((row) => row[0] === 'GE' && String(row[1]).toLowerCase().includes('moyenne'))
  if (!geMeanRow) return []

  const output: CsvRow[] = []
  for (let index = 2; index < geMeanRow.length; index += 3) {
    const year = numberOrNull(yearRow[index])
    if (year === null) continue
    const values = [numberOrNull(geMeanRow[index]), numberOrNull(geMeanRow[index + 1]), numberOrNull(geMeanRow[index + 2])]
      .filter((value): value is number => value !== null)
    if (values.length === 0) continue
    output.push({
      year,
      students_public_subsidized: null,
      students_private: null,
      students_total: null,
      school_classes: null,
      teachers_fte: null,
      students_per_class: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
      data_type: 'official',
      source_id: 'bfs_class_size',
      source_note: 'OFS asset 36520014, taille moyenne des classes dans les institutions publiques, canton de Genève; moyenne simple des degrés primaire 1-2, primaire 3-8 et secondaire I.',
    })
  }
  return output
}

function readSredSummaryRows(): CsvRow[] {
  const sourceNote = 'Annuaire statistique de l’enseignement public et privé à Genève 2025, page imprimable SRED/OCSTAT; 2021-2024 public reconstruit par somme des degrés publiés.'
  const rows: CsvRow[] = [
    {
      year: 2010,
      students_public_subsidized: 90444,
      students_private: 12215,
      students_total: 102659,
      school_classes: null,
      teachers_fte: 5406.5,
    },
    {
      year: 2015,
      students_public_subsidized: 95888,
      students_private: 12872,
      students_total: 108760,
      school_classes: null,
      teachers_fte: 5786.3,
    },
    {
      year: 2020,
      students_public_subsidized: null,
      students_private: null,
      students_total: null,
      school_classes: null,
      teachers_fte: 6165.1,
    },
    {
      year: 2021,
      students_public_subsidized: 103951,
      students_private: 13599,
      students_total: 117550,
      school_classes: null,
      teachers_fte: null,
    },
    {
      year: 2022,
      students_public_subsidized: 104724,
      students_private: 14164,
      students_total: 118888,
      school_classes: null,
      teachers_fte: null,
    },
    {
      year: 2023,
      students_public_subsidized: 105418,
      students_private: 14469,
      students_total: 119887,
      school_classes: null,
      teachers_fte: null,
    },
    {
      year: 2024,
      students_public_subsidized: 107205,
      students_private: 14614,
      students_total: 121819,
      school_classes: null,
      teachers_fte: 9549.5,
    },
    {
      year: 2025,
      students_public_subsidized: 108500,
      students_private: 14271,
      students_total: 122771,
      school_classes: null,
      teachers_fte: 9699.6,
    },
  ]

  return rows.map((row) => ({
    ...row,
    data_type: 'official',
    source_id: 'ge_education_annuary',
    source_note: sourceNote,
  }))
}

function mergeRowsByYear(...rowGroups: CsvRow[][]): CsvRow[] {
  const rows = new Map<number, CsvRow>()
  for (const group of rowGroups) {
    for (const row of group) {
      const year = numberOrNull(row.year)
      if (year === null) continue
      const existing = rows.get(year) ?? { year }
      rows.set(year, {
        ...existing,
        ...Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null && value !== '')),
        source_id: [existing.source_id, row.source_id].filter(Boolean).join(';') || row.source_id,
        source_note: [existing.source_note, row.source_note].filter(Boolean).join(' '),
      })
    }
  }
  return [...rows.values()].sort((a, b) => Number(a.year) - Number(b.year))
}

function addEstimatedSchoolClasses(rows: CsvRow[]): CsvRow[] {
  return rows.map((row) => {
    if (numberOrNull(row.school_classes) !== null) return row
    const students = numberOrNull(row.students_public_subsidized)
    const studentsPerClass = numberOrNull(row.students_per_class)
    if (students === null || studentsPerClass === null || studentsPerClass <= 0) return row
    return {
      ...row,
      school_classes: Math.round(students / studentsPerClass),
      source_id: [row.source_id, 'bfs_class_size_estimated_classes'].filter(Boolean).join(';'),
      source_note: [
        row.source_note,
        'Classes équivalentes estimées: élèves publics/subventionnés divisés par la taille moyenne OFS des classes publiques obligatoires; ne remplace pas un comptage officiel des classes.',
      ].filter(Boolean).join(' '),
    }
  })
}

function requestMissingEducationFields(missingFields: string[]) {
  const onlySchoolClassesMissing = missingFields.length === 1 && missingFields[0] === 'school_classes'
  addDownloadRequest({
    id: 'ge_education_manual_source_missing',
    dataset: 'ge_education',
    missingFields,
    reason: 'Comparer la croissance démographique avec la pression scolaire et les classes scolaires.',
    preferredSource: 'Annuaire statistique de l’enseignement public et privé à Genève / SRED / OCSTAT',
    sourceUrl: 'https://www.ge.ch/annuaire-statistique-enseignement-public-prive-geneve',
    acceptedFormats: ['CSV', 'XLS', 'XLSX', 'PDF'],
    destinationPath: `${manualCsvPath} ou data/raw/ocstat/manual/ge_education.xlsx`,
    instructions: onlySchoolClassesMissing
      ? 'Déposer si disponible une série annuelle avec le nombre officiel de classes scolaires à Genève. Le fichier OFS actuel donne la taille moyenne des classes et permet seulement des classes équivalentes estimées.'
      : 'Déposer une série annuelle avec élèves publics/subventionnés, élèves privés, total élèves, classes scolaires et enseignants ETP si disponibles. Le fichier OFS taille des classes peut compléter students_per_class mais ne suffit pas pour les effectifs.',
  })
}

export async function normalizeGeEducation() {
  const classSizeRows = readBfsClassSizeRows()
  const sredSummaryRows = readSredSummaryRows()

  if (!existsSync(fromRoot(manualCsvPath))) {
    const rows = addEstimatedSchoolClasses(mergeRowsByYear(sredSummaryRows, classSizeRows))
    requestMissingEducationFields(['school_classes'])
    if (rows.length > 0) {
      await writeCsv('data/normalized/ge_education.csv', rows, geEducationColumns)
      return rows
    }
    const fallbackMissingFields = classSizeRows.length > 0
      ? ['students_public_subsidized', 'students_total', 'school_classes', 'teachers_fte']
      : ['year', 'students_public_subsidized', 'students_total', 'school_classes', 'teachers_fte', 'students_per_class']
    requestMissingEducationFields(fallbackMissingFields)
    await writeCsv('data/normalized/ge_education.csv', [], geEducationColumns)
    return []
  }

  const rows = (await readCsv(manualCsvPath)).map((row): CsvRow => ({
    ...row,
    data_type: row.data_type || 'official',
    source_id: row.source_id || 'ge_education_annuary',
    source_note: row.source_note || 'Annuaire statistique de l’enseignement public et privé à Genève, fichier manuel.',
  }))
  await writeCsv('data/normalized/ge_education.csv', rows, geEducationColumns)
  return rows
}

