import { conclusionText } from '../content/conclusion'

export function ConclusionBlock() {
  return (
    <section className="rounded-3xl bg-slate-950 p-6 text-white md:p-8">
      <h2 className="text-2xl font-semibold tracking-tight">Conclusion</h2>
      <div className="mt-5 space-y-4 whitespace-pre-line text-base leading-7 text-slate-200">{conclusionText}</div>
      <p className="mt-5 text-base leading-7 text-slate-200">
        Analyse publiée gratuitement.
        <br />
        Pour soutenir ce travail: découvrez{' '}
        <a className="font-semibold text-white underline" href="https://karibou.ch" target="_blank" rel="noreferrer">
          karibou.ch
        </a>
        , les artisans du marché directement chez vous.
      </p>
    </section>
  )
}
