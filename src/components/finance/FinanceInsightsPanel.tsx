'use client'

import type { FinanceInsight } from '@/interfaces/finance.interface'

interface Props {
  insights: FinanceInsight[]
  loading: boolean
}

const severityClass: Record<string, string> = {
  info: 'border-state-info/40 bg-state-info/10',
  warning: 'border-state-warning/40 bg-state-warning/10',
  critical: 'border-state-error/40 bg-state-error/10',
}

export function FinanceInsightsPanel({ insights, loading }: Props) {
  return (
    <section className="mb-6">
      <h2 className="text-label font-semibold text-text-primary mb-3">
        Alertas y recomendaciones
      </h2>

      {loading && <div className="h-20 bg-background-subtle rounded-sm animate-pulse" />}

      {!loading && insights.length === 0 && (
        <p className="text-caption text-text-secondary">
          Sin alertas ni recomendaciones para este período.
        </p>
      )}

      {!loading && insights.length > 0 && (
        <ul className="space-y-3">
          {insights.map((insight) => (
            <li
              key={`${insight.code}-${insight.title}`}
              className={`rounded-md border p-4 ${severityClass[insight.severity] ?? severityClass.info}`}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-caption uppercase tracking-wide text-text-secondary">
                  {insight.type}
                </span>
                <p className="text-label font-semibold text-text-primary">{insight.title}</p>
              </div>
              <p className="text-caption text-text-primary">{insight.explanation}</p>
              {insight.disclaimer && (
                <p className="text-caption text-text-secondary mt-2 italic">{insight.disclaimer}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
