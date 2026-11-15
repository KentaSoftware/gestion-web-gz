'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/Button'
import { financeService } from '@/services/finance.service'
import type { FinanceRiskProfile, FinanceRulesConfig } from '@/interfaces/finance.interface'
import { cn } from '@/lib/cn'

interface Props {
  onUpdated?: () => void
  readOnly?: boolean
}

const DEFAULTS: FinanceRulesConfig = {
  reserveMinimumAmount: 500000,
  deficitAlertThresholdPercent: 20,
  minExpectedRoiPercent: 18,
  historyEvaluationDays: 90,
  riskProfile: 'moderado',
}

/**
 * CU-012 / CUR-6 — Configuración de reglas financieras (mock).
 * openingBalance se configura solo en /cashflow.
 */
export function FinanceRulesPanel({ onUpdated, readOnly = false }: Props) {
  const [loading, setLoading] = useState(!readOnly)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [rulesVersion, setRulesVersion] = useState('')
  const [form, setForm] = useState<FinanceRulesConfig>(DEFAULTS)

  useEffect(() => {
    if (readOnly) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const data = await financeService.getRules()
        if (cancelled) return
        setRulesVersion(data.rulesVersion)
        setForm({ ...DEFAULTS, ...data.config })
      } catch {
        if (!cancelled) setError('No se pudieron cargar las reglas financieras.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [readOnly])

  const handleSave = async () => {
    if (readOnly) return
    try {
      setSaving(true)
      setError('')
      setOk('')
      const data = await financeService.updateRules({
        reserveMinimumAmount: Number(form.reserveMinimumAmount),
        deficitAlertThresholdPercent: Number(form.deficitAlertThresholdPercent),
        minExpectedRoiPercent: Number(form.minExpectedRoiPercent),
        historyEvaluationDays: Number(form.historyEvaluationDays),
        riskProfile: form.riskProfile,
      })
      setForm({ ...DEFAULTS, ...data.config })
      setRulesVersion(data.rulesVersion)
      setOk('Reglas actualizadas. Se recalculará el tablero.')
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
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="text-label font-semibold text-text-primary">
            Configuración de reglas financieras
          </h2>
          <p className="text-caption text-text-secondary mt-1">
            CUR-6 / CU-012 · {rulesVersion || 'finance-rules-v2'}
          </p>
        </div>
        {!readOnly && <Button text={saving ? 'Actualizando…' : 'Actualizar'} onClick={handleSave} size="md" />}
      </div>

      {loading && <p className="text-caption text-text-secondary">Cargando…</p>}

      {!loading && (
        <fieldset disabled={readOnly} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">Reserva mínima de seguridad ($)</span>
            <input
              type="number"
              step="0.01"
              min={0}
              className={inputClass}
              value={form.reserveMinimumAmount}
              onChange={(e) =>
                setForm((f) => ({ ...f, reserveMinimumAmount: Number(e.target.value) }))
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">Umbral de alerta por déficit (%)</span>
            <input
              type="number"
              step="1"
              min={0}
              className={inputClass}
              value={form.deficitAlertThresholdPercent}
              onChange={(e) =>
                setForm((f) => ({ ...f, deficitAlertThresholdPercent: Number(e.target.value) }))
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">ROI mínimo esperado (%)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              className={inputClass}
              value={form.minExpectedRoiPercent}
              onChange={(e) =>
                setForm((f) => ({ ...f, minExpectedRoiPercent: Number(e.target.value) }))
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">
              Plazos de evaluación histórica (días)
            </span>
            <input
              type="number"
              step="1"
              min={1}
              className={inputClass}
              value={form.historyEvaluationDays}
              onChange={(e) =>
                setForm((f) => ({ ...f, historyEvaluationDays: Number(e.target.value) }))
              }
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">Perfil de riesgo</span>
            <select
              className={inputClass}
              value={form.riskProfile}
              onChange={(e) =>
                setForm((f) => ({ ...f, riskProfile: e.target.value as FinanceRiskProfile }))
              }
            >
              <option value="conservador">Conservador</option>
              <option value="moderado">Moderado</option>
              <option value="agresivo">Agresivo</option>
            </select>
          </label>
        </fieldset>
      )}

      {error && <p className="text-caption text-state-error font-medium mt-3">{error}</p>}
      {ok && <p className="text-caption text-state-success font-medium mt-3">{ok}</p>}
    </section>
  )
}
