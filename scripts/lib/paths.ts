import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
export const projectRoot = path.resolve(path.dirname(currentFile), '../..')

export function fromRoot(...parts: string[]) {
  return path.join(projectRoot, ...parts)
}

export async function ensureDir(relativePath: string) {
  await mkdir(fromRoot(relativePath), { recursive: true })
}

export async function ensureDataDirs() {
  const dirs = [
    'data/raw/bfs/manual',
    'data/raw/ocstat/manual',
    'data/raw/ofsp/manual',
    'data/raw/ofl/manual',
    'data/raw/tpg/manual',
    'data/normalized',
    'data/generated',
    'src/data',
  ]
  await Promise.all(dirs.map(ensureDir))
}
