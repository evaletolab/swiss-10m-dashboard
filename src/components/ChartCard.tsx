import type { ReactNode } from 'react'
import { SourceNote } from './SourceNote'

type ChartCardProps = {
  title: string
  description?: string
  sourceIds?: string[]
  children: ReactNode
}

export function ChartCard({ title, description, sourceIds = [], children }: ChartCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      <div className="h-[360px]">{children}</div>
      {sourceIds.length > 0 ? <SourceNote sourceIds={sourceIds} /> : null}
    </section>
  )
}
