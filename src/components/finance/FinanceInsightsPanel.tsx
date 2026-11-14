'use client'

import type { FinanceInsight, FinanceOpportunityCard } from '@/interfaces/finance.interface'
import { cn } from '@/lib/cn'

interface Props {
  insights: FinanceInsight[]
  opportunity: FinanceOpportunityCard | null
  loading: boolean
}

const severityClass: Record<string, string> = {
  info: 'border-state-info/40 bg-state-info/10',
  warning: 'border-state-warning/40 bg-state-warning/10',
  critical: 'border-state-error/40 bg-state-error/10',
}

export function FinanceInsightsPanel({ insights, opportunity, loading }: Props) {
  const cards: Array<{
    key: string
    title: string
    body: string
    tone: string
    meta?: string
  }> = []

  if (opportunity) {
    cards.push({
      key: opportunity.code,
      title: opportunity.title,
      body: opportunity.explanation,
      tone: opportunity.roiEnabled
        ? 'border-brand-primary/30 bg-brand-primary/5'
        : 'border-border-subtle bg-background-subtle',
      meta:
        opportunity.roiEnabled && opportunity.referenceRoiPercent != null
          ? `ROI de referencia: ${opportunity.referenceRoiPercent}%`
          : undefined,
    })
  }

  for (const insight of insights) {
    // Avoid duplicating capital-ocioso copy already shown via opportunity card
    if (
      insight.code === 'FINANCE_REC_REVIEW_IDLE_CAPITAL' &&
      opportunity?.code === 'CAPITAL_OCIOSO_DETECTADO'
    ) {
      continue
    }
    cards.push({
      key: `${insight.code}-${insight.title}`,
      title: insight.title,
      body: insight.explanation,
      tone: severityClass[insight.severity] ?? severityClass.info,
    })
  }

  return (
    <section className="mb-6 space-y-3">
      <h2 className="text-label font-semibold text-text-primary">
        Oportunidades de Optimización
      </h2>

      {loading && <div className="h-24 bg-background-subtle rounded-sm animate-pulse" />}

      {!loading && cards.length === 0 && (
        <p className="text-caption text-text-secondary">
          Sin alertas ni oportunidades para el período / configuración actual.
        </p>
      )}

      {!loading && cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => (
            <article
              key={card.key}
              className={cn('rounded-md border p-4 min-w-0 flex flex-col', card.tone)}
            >
              <p className="text-label font-semibold text-text-primary">{card.title}</p>
              <p className="text-caption text-text-primary mt-2 flex-1">{card.body}</p>
              {card.meta && (
                <p className="text-caption text-text-secondary mt-3 font-medium">{card.meta}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
