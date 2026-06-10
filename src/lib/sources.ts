import sources from '../data/sources.json'
import type { Source } from './types'

export function getSources(ids: string[]): Source[] {
  const all = sources as Source[]
  return ids.map((id) => all.find((source) => source.id === id)).filter((source): source is Source => Boolean(source))
}
