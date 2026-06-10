import { getSources } from '../lib/sources'

type SourceNoteProps = {
  sourceIds: string[]
}

export function SourceNote({ sourceIds }: SourceNoteProps) {
  const sources = getSources(sourceIds)
  if (sources.length === 0) return null
  return (
    <div className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
      Sources: {sources.map((source, index) => (
        <span key={source.id}>
          {source.url ? <a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.publisher}</a> : source.publisher}
          {index < sources.length - 1 ? ', ' : ''}
        </span>
      ))}
    </div>
  )
}
