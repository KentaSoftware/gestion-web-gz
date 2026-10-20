import React, { useCallback, useEffect, useRef, useState } from "react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';

const DIALOG_TITLE_ID = 'custom-dataset-title'

interface CustomDataSetProps {
  open: boolean
  handleClose: () => void
  handleSubmit: (startDate: Date, endDate: Date) => void
}

type PresetKey = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth'

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'thisWeek', label: 'Esta semana' },
  { key: 'thisMonth', label: 'Este mes' },
]

function getPresetRange(key: PresetKey): { startDate: Date; endDate: Date } {
  const now = new Date()
  switch (key) {
    case 'today':
      return { startDate: now, endDate: now }
    case 'yesterday': {
      const yesterday = subDays(now, 1)
      return { startDate: yesterday, endDate: yesterday }
    }
    case 'thisWeek':
      return { startDate: startOfWeek(now, { weekStartsOn: 1 }), endDate: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'thisMonth':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) }
  }
}

/** Query selector string to find all focusable elements inside the dialog. */
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function CustomDataSet({ open, handleClose, handleSubmit }: CustomDataSetProps) {
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // ── Focus management: save + restore, initial focus ──────────────
  useEffect(() => {
    if (!open) return

    // Save the element that had focus before the modal opened
    previousFocusRef.current = document.activeElement as HTMLElement

    // Move focus into the dialog
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    // Small delay so the calendar popover animations don't fight for focus
    requestAnimationFrame(() => firstFocusable?.focus())

    return () => {
      // Restore focus on unmount (cleanup runs after the component returns null)
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [open])

  // ── Wrapped close that restores focus before parent state update ─
  const handleCloseWithRestore = useCallback(() => {
    previousFocusRef.current?.focus()
    previousFocusRef.current = null
    handleClose()
  }, [handleClose])

  const applyPreset = useCallback((key: PresetKey) => {
    const range = getPresetRange(key)
    handleSubmit(range.startDate, range.endDate)
    handleCloseWithRestore()
  }, [handleSubmit, handleCloseWithRestore])

  const handleApply = useCallback(() => {
    handleSubmit(startDate, endDate)
    handleCloseWithRestore()
  }, [startDate, endDate, handleSubmit, handleCloseWithRestore])

  // ── Keyboard: Escape to close, Tab focus trap ────────────────────
  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      handleCloseWithRestore()
      return
    }

    if (e.key !== 'Tab') return

    const focusableEls = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    if (!focusableEls || focusableEls.length === 0) return

    const first = focusableEls[0]
    const last = focusableEls[focusableEls.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [handleCloseWithRestore])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-overlay-scrim"
      onClick={handleCloseWithRestore}
    >
      <div
        ref={dialogRef}
        className="flex flex-col gap-6 rounded-lg bg-surface-base p-6 shadow-lg outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={DIALOG_TITLE_ID}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <h2 id={DIALOG_TITLE_ID} className="text-lg font-semibold text-text-primary">Selecciona un rango de fechas</h2>

        {/* Preset quick filters */}
        <div className="flex gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.key}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.key)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-around gap-4">
          {/* Start date */}
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('justify-start gap-2 font-normal')}
              >
                <CalendarDays className="h-4 w-4" />
                {format(startDate, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(newValue) => {
                  if (newValue) {
                    setStartDate(newValue)
                    setStartOpen(false)
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          <span className="text-lg font-medium text-text-primary">a</span>

          {/* End date */}
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('justify-start gap-2 font-normal')}
              >
                <CalendarDays className="h-4 w-4" />
                {format(endDate, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(newValue) => {
                  if (newValue) {
                    setEndDate(newValue)
                    setEndOpen(false)
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={handleCloseWithRestore}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  )
}
