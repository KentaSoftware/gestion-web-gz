'use client'
import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { cashflowService } from '@/services/cashflow.service'
import type { CashflowConfig } from '@/interfaces/cashflow.interface'
import { usePermission } from '@/hooks/usePermission'
import { Permission } from '@/interfaces/auth.interface'

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
    <Container>
      <SectionTitle>Configuración</SectionTitle>
      {loading ? (
        <LoadingText>Cargando configuración...</LoadingText>
      ) : (
        <>
          {config && (
            <CurrentValue>
              Saldo inicial actual: <strong>{formatAmount(config.openingBalance)}</strong>
            </CurrentValue>
          )}
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="opening-balance">Nuevo saldo inicial (ARS)</Label>
              <Input
                id="opening-balance"
                type="number"
                min="0"
                step="0.01"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setError('')
                  setSuccessMessage('')
                }}
                disabled={saving}
              />
            </FormGroup>
            {error && <ErrorText>{error}</ErrorText>}
            {successMessage && <SuccessText>{successMessage}</SuccessText>}
            <SaveButton type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </SaveButton>
          </Form>
        </>
      )}
    </Container>
  )
}

const Container = styled.div`
  background: white;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  border-left: 4px solid #8294C4;
`

const SectionTitle = styled.h2`
  color: #3764A0;
  font-size: 20px;
  margin: 0 0 20px 0;
`

const LoadingText = styled.p`
  color: #999;
  font-size: 14px;
`

const CurrentValue = styled.p`
  font-size: 14px;
  color: #555;
  margin-bottom: 16px;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 360px;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #444;
`

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #B4B4B8;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #8294C4;
  }

  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`

const ErrorText = styled.div`
  color: #d32f2f;
  font-size: 13px;
  font-weight: 500;
`

const SuccessText = styled.div`
  color: #2E7D32;
  font-size: 13px;
  font-weight: 500;
`

const SaveButton = styled.button`
  align-self: flex-start;
  padding: 10px 24px;
  background: #8294C4;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #637195;
  }

  &:disabled {
    background: #c0c0c0;
    cursor: not-allowed;
  }
`
