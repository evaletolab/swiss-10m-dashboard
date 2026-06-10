import { conclusionText } from '../content/conclusion'

export function ConclusionBlock() {
  return (
    <section className="rounded-3xl bg-slate-950 p-6 text-white md:p-8">
      <h2 className="text-2xl font-semibold tracking-tight">Conclusion</h2>
      <div className="mt-5 space-y-4 whitespace-pre-line text-base leading-7 text-slate-200">{conclusionText}</div>
    </section>
  )
}
