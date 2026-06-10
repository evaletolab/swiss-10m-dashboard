import type { Source } from '../lib/types'

type Props = {
  sources: Source[]
}

export function StudySourcesBlock({ sources }: Props) {
  const realSources = sources.filter((source) => source.type !== 'mock')

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Sources de l’étude</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sources officielles, manuelles ou proxy utilisées pour construire les trajectoires, références PIB/population et indicateurs sectoriels.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {realSources.map((source) => (
          <article key={source.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {source.url ? (
                <a className="font-semibold text-slate-900 underline" href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              ) : (
                <h3 className="font-semibold text-slate-900">{source.title}</h3>
              )}
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {source.type}
              </span>
            </div>
            <p className="mt-2 text-slate-600">{source.publisher}</p>
            <p className="mt-1 leading-6 text-slate-500">{source.notes}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
