'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/Button'
import { financeService } from '@/services/finance.service'
import type { FinanceRulesConfig } from '@/interfaces/finance.interface'
import { cn } from '@/lib/cn'

interface Props {
  onUpdated?: () => void
}

/**
 * CU-012 — Actualizar reglas financieras (umbrales).
 * Sin distinción fina de permisos en esta iteración.
 */
export function FinanceRulesPanel({ onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [rulesVersion, setRulesVersion] = useState('')
  const [form, setForm] = useState<FinanceRulesConfig>({
    openingBalance: 0,
    reserveMonthsMultiplier: 1,
    deficitAlertEnabled: true,
    idleCapitalRecommendMin: 0,
  })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const data = await financeService.getRules()
        if (cancelled) return
        setRulesVersion(data.rulesVersion)
        setForm(data.config)
      } catch {
        if (!cancelled) setError('No se pudieron cargar las reglas financieras.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setOk('')
      const data = await financeService.updateRules({
        openingBalance: Number(form.openingBalance),
        reserveMonthsMultiplier: Number(form.reserveMonthsMultiplier),
        deficitAlertEnabled: Boolean(form.deficitAlertEnabled),
        idleCapitalRecommendMin: Number(form.idleCapitalRecommendMin),
      })
      setForm(data.config)
      setRulesVersion(data.rulesVersion)
      setOk('Reglas actualizadas. Se aplicarán al recalcular el tablero.')
      onUpdated?.()
    } catch {
      setError('No se pudieron guardar las reglas. Revisá los valores numéricos.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = cn(
    'px-3 py-2 text-label text-text-primary w-full',
    'bg-surface-base border border-border-strong rounded-sm',
    'focus:outline-none focus:border-border-interactive'
  )

  return (
    <section className="mb-6 bg-surface-base rounded-lg p-5 shadow-sm border border-border-subtle">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-label font-semibold text-text-primary">
            Oportunidades / Reglas financieras
          </h2>
          <p className="text-caption text-text-secondary mt-1">
            Ajustá reserva, alertas y saldo inicial (CU-012). Fórmula base: {rulesVersion || 'finance-rules-v1'}
          </p>
        </div>
        <Button
          text={open ? 'Ocultar' : 'Actualizar reglas'}
          onClick={() => setOpen((v) => !v)}
          size="md"
        />
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {loading && <p className="text-caption text-text-secondary">Cargando…</p>}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-caption text-text-secondary">Saldo inicial (ARS)</span>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={form.openingBalance}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, openingBalance: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-caption text-text-secondary">
                  Multiplicador reserva mínima (meses de egreso promedio)
                </span>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  className={inputClass}
                  value={form.reserveMonthsMultiplier}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reserveMonthsMultiplier: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-caption text-text-secondary">
                  Umbral mínimo capital ocioso para recomendar (ARS)
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={inputClass}
                  value={form.idleCapitalRecommendMin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, idleCapitalRecommendMin: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={form.deficitAlertEnabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deficitAlertEnabled: e.target.checked }))
                  }
                />
                <span className="text-caption text-text-primary">
                  Alertar períodos con necesidad financiera
                </span>
              </label>
            </div>
          )}

          {error && <p className="text-caption text-state-error font-medium">{error}</p>}
          {ok && <p className="text-caption text-state-success font-medium">{ok}</p>}

          <div className="flex gap-2">
            <Button text={saving ? 'Guardando…' : 'Guardar'} onClick={handleSave} size="md" />
            <Button text="Cancelar" onClick={() => setOpen(false)} size="md" />
          </div>
        </div>
      )}
    </section>
  )
}
