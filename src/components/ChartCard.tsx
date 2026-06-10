import type { ReactNode } from 'react'
import { SourceNote } from './SourceNote'

type ChartCardProps = {
  title: string
  description?: string
  sourceIds?: string[]
  contentClassName?: string
  children: ReactNode
}

export function ChartCard({ title, description, sourceIds = [], contentClassName = 'h-[360px]', children }: ChartCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      <div className={contentClassName}>{children}</div>
      {sourceIds.length > 0 ? (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <SourceNote sourceIds={sourceIds} />
        </div>
      ) : null}
    </section>
  )
}
