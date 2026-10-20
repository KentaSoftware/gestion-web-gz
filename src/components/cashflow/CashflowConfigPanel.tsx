'use client'
import { useState, useEffect } from 'react'
import { cashflowService } from '@/services/cashflow.service'
import type { CashflowConfig } from '@/interfaces/cashflow.interface'
import { usePermission } from '@/hooks/usePermission'
import { Permission } from '@/interfaces/auth.interface'
import Button from '@/components/Button'
import Input from '@/components/Input'

interface CashflowConfigPanelProps {
  /** Called after a successful config update so the parent can refresh summary */
  onConfigUpdated?: () => void
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

export function CashflowConfigPanel({ onConfigUpdated }: CashflowConfigPanelProps) {
  const { hasPermission } = usePermission()
  const canConfigure = hasPermission(Permission.CONFIGURE_CASHFLOW)

  const [config, setConfig] = useState<CashflowConfig | null>(null)
  const [inputValue, setInputValue] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  useEffect(() => {
    if (!canConfigure) return

    const fetchConfig = async () => {
      try {
        setLoading(true)
        const data = await cashflowService.getConfig()
        setConfig(data)
        setInputValue(data.openingBalance.toString())
      } catch {
        setError('Error al cargar la configuración')
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [canConfigure])

  if (!canConfigure) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    const parsed = parseFloat(inputValue)
    if (isNaN(parsed) || parsed < 0) {
      setError('El saldo inicial debe ser un número mayor o igual a 0')
      return
    }

    try {
      setSaving(true)
      const updated = await cashflowService.updateConfig({ openingBalance: parsed })
      setConfig(updated)
      setInputValue(updated.openingBalance.toString())
      setSuccessMessage('Configuración actualizada correctamente')
      onConfigUpdated?.()
    } catch {
      setError('Error al actualizar la configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg bg-surface-base p-6 shadow-md mb-6 border-l-4 border-brand-primary">
      <h2 className="text-xl font-semibold text-brand-primary mb-5">Configuración</h2>
      {loading ? (
        <p className="text-sm text-text-muted">Cargando configuración...</p>
      ) : (
        <>
          {config && (
            <p className="text-sm text-text-secondary mb-4">
              Saldo inicial actual: <strong>{formatAmount(config.openingBalance)}</strong>
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
            <Input
              type="number"
              label="Nuevo saldo inicial (ARS)"
              name="opening-balance"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setError('')
                setSuccessMessage('')
              }}
              disabled={saving}
            />
            {error && (
              <div className="text-sm font-medium text-state-error">{error}</div>
            )}
            {successMessage && (
              <div className="text-sm font-medium text-state-success">{successMessage}</div>
            )}
            <Button
              type="submit"
              text={saving ? 'Guardando...' : 'Guardar'}
              onClick={() => {}}
              disabled={saving}
              className="self-start"
            />
          </form>
        </>
      )}
    </div>
  )
}
