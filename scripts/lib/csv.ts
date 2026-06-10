import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import Papa from 'papaparse'
import { fromRoot } from './paths.ts'

export type CsvValue = string | number | boolean | null | undefined
export type CsvRow = Record<string, CsvValue>

export function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const normalized = String(value).replaceAll("'", '').replaceAll(' ', '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function intOrNull(value: unknown): number | null {
  const parsed = numberOrNull(value)
  return parsed === null ? null : Math.round(parsed)
}

export async function readCsv(relativePath: string): Promise<Record<string, string>[]> {
  const absolutePath = fromRoot(relativePath)
  if (!existsSync(absolutePath)) return []
  const buffer = await readFile(absolutePath)
  const utf8 = buffer.toString('utf8')
  const replacementCount = (utf8.match(/\uFFFD/g) ?? []).length
  const content = replacementCount > 0 ? buffer.toString('latin1') : utf8
  return parse(content, { columns: true, skip_empty_lines: true, trim: true })
}

export async function writeCsv(relativePath: string, rows: CsvRow[], columns?: string[]) {
  const fields = columns ?? Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const csv = Papa.unparse(rows, { columns: fields, quotes: false, skipEmptyLines: false })
  await writeFile(fromRoot(relativePath), `${csv}\n`, 'utf8')
}

export async function writeJson(relativePath: string, data: unknown) {
  await writeFile(fromRoot(relativePath), `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}
