'use client'

import { useState } from 'react'
import Button from '@/components/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { expenseService } from '@/services/expense.service'
import { cn } from '@/lib/cn'

const CATEGORY_SUGGESTIONS = [
  'Combustible',
  'Sueldos',
  'Mantenimiento',
  'Alquiler',
  'Servicios',
  'Insumos',
  'Impuestos',
  'Transporte',
  'Mercadería',
  'Compras',
  'Otros',
]

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

/**
 * CUR-5 — Modal Registrar Egreso Operativo (fiel al mock; no usa type/paymentMethod).
 */
export function RegisterExpenseModal({ open, onClose, onCreated }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [comprobante, setComprobante] = useState('')
  const [description, setDescription] = useState('')
  const [incomplete, setIncomplete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const inputClass = cn(
    'px-3 py-2 text-label text-text-primary w-full',
    'bg-surface-base border border-border-strong rounded-sm',
    'focus:outline-none focus:border-border-interactive'
  )

  const reset = () => {
    setCategory('')
    setAmount('')
    setDate(today)
    setComprobante('')
    setDescription('')
    setIncomplete(false)
    setError('')
    setSuccess('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = async () => {
    const amountNum = parseFloat(amount.replace(',', '.'))
    const missing =
      category.trim() === '' ||
      !amount ||
      isNaN(amountNum) ||
      amountNum <= 0 ||
      !date ||
      comprobante.trim() === ''

    if (missing) {
      setIncomplete(true)
      setError('')
      setSuccess('')
      return
    }

    try {
      setSaving(true)
      setIncomplete(false)
      setError('')
      await expenseService.create({
        category: category.trim(),
        amount: amountNum,
        date,
        comprobante: comprobante.trim(),
        description: description.trim() || undefined,
      })
      setSuccess('Egreso registrado correctamente')
      onCreated()
      setTimeout(() => {
        handleClose()
      }, 700)
    } catch {
      setError('No se pudo guardar el egreso. Revisá los datos e intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Egreso Operativo</DialogTitle>
          <DialogDescription>
            Completa la información del egreso para registrarlo en el sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">Categoría del Gasto</span>
            <input
              list="finance-expense-categories"
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Selecciona una categoría"
            />
            <datalist id="finance-expense-categories">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">Monto</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">Fecha</span>
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">N° de Comprobante</span>
            <input
              className={inputClass}
              value={comprobante}
              onChange={(e) => setComprobante(e.target.value)}
              maxLength={120}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">
              Descripción ({description.length}/500)
            </span>
            <textarea
              className={cn(inputClass, 'min-h-[88px] resize-y')}
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {incomplete && (
            <p className="text-caption font-medium text-state-error" role="alert">
              ! Campos incompletos
            </p>
          )}
          {error && <p className="text-caption font-medium text-state-error">{error}</p>}
          {success && <p className="text-caption font-medium text-state-success">{success}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button text="Cancelar" variant="secondary" onClick={handleClose} size="sm" />
          <Button
            text={saving ? 'Guardando…' : 'Guardar Egreso'}
            variant="primary"
            onClick={() => { void handleSave() }}
            size="sm"
            disabled={saving}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
