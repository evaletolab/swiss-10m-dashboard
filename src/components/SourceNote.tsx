import { getSources } from '../lib/sources'

type SourceNoteProps = {
  sourceIds: string[]
}

export function SourceNote({ sourceIds }: SourceNoteProps) {
  const sources = getSources(sourceIds)
  if (sources.length === 0) return null
  return (
    <div className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
      <p className="font-semibold text-slate-600">Sources détaillées</p>
      <ul className="mt-1 space-y-1">
        {sources.map((source) => (
          <li key={source.id}>
            {source.url ? <a className="font-medium text-slate-600 underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : <span className="font-medium text-slate-600">{source.title}</span>}
            <span> - {source.publisher}. {source.notes}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
