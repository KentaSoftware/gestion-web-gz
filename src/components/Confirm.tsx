import { X } from 'lucide-react'
import Button from './Button'
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from './ui/alert-dialog'

/**
 * Confirm dialog — DS-aligned, AlertDialog-backed.
 * ESC closes (onEscapeKeyDown), Tab trap and focus management handled by Radix.
 * Outside-click suppressed by AlertDialog built-in default (D6).
 * Consumer API: { open, message, handleClose, handleConfirm } — UNCHANGED.
 */
export default function Confirm({
  open,
  message,
  handleClose,
  handleConfirm,
}: {
  open: boolean
  message: string
  handleClose: () => void
  handleConfirm: () => void
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogPortal>
        <AlertDialogOverlay>
          {/* onEscapeKeyDown: preventDefault suppresses Radix's scroll-lock side-effect
              while still routing ESC → handleClose (D1). No onOpenChange — fully
              externally controlled to avoid invoking handleClose after a confirm (D1). */}
          <AlertDialogContent
            aria-labelledby="confirm-title"
            onEscapeKeyDown={(e) => { e.preventDefault(); handleClose() }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle rounded-t-lg">
              <div className="flex items-center px-2">
                <AlertDialogTitle id="confirm-title">
                  ¿Quiere confirmar?
                </AlertDialogTitle>
              </div>
              {/* AlertDialogCancel provides Radix focus-return semantics on close (D3) */}
              <AlertDialogCancel onClick={handleClose} aria-label="Cerrar">
                <X aria-hidden="true" />
              </AlertDialogCancel>
            </div>

            {/* Content */}
            <AlertDialogDescription className="flex flex-col flex-1 px-6 py-5 overflow-y-auto text-center">
              {message || 'Esto es una alerta'}
            </AlertDialogDescription>

            {/* Actions */}
            <div className="flex justify-between px-4 pb-4">
              {/* Plain Button — symmetric with Aceptar, no asChild nesting needed (D3) */}
              <Button text="Cancelar" onClick={handleClose} variant="secondary" size="sm" />
              {/* Plain Button — NOT AlertDialogAction; type="button" prevents form
                  submission; no onOpenChange side-effect that would invoke handleClose (D2) */}
              <Button text="Aceptar" onClick={handleConfirm} variant="primary" size="sm" type="button" />
            </div>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialogPortal>
    </AlertDialog>
  )
}
