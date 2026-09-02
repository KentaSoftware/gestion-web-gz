'use client'
import { type CSSProperties, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'

/**
 * Modal — EP3-01 Dialog Primitive Parity.
 *
 * Internals replaced with @radix-ui/react-dialog composition:
 *  - ESC, Tab-trap, and focus-entry/return delegated to Radix (R2–R4)
 *  - Outside-click via onInteractOutside; suppressed when outside=false (R5–R6)
 *  - DialogTitle auto-links aria-labelledby on the content panel (R7)
 *  - Animations driven by data-[state] variants; no prop-toggled className (R9)
 *
 * Public prop contract (R1): unchanged. All 9 props retained, including the
 * dead ones (modalButton, onButton1, onButton2, borderRadius) for zero
 * consumer-rewrite guarantee.
 */
const Modal = ({
  children,
  open = false,
  eClose,
  title,
  width = '30%',
  height = '35%',
  outside = true,
}: {
  children?: ReactNode
  open: boolean
  eClose: () => void
  title: string
  modalButton?: boolean
  onButton1?: void
  onButton2?: void
  borderRadius?: boolean
  width?: string
  height?: string
  outside?: boolean
}) => (
  <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) eClose() }}>
    <DialogPortal>
      <DialogOverlay forceMount>
        <DialogContent
          forceMount
          onInteractOutside={outside === false ? (e) => e.preventDefault() : undefined}
          style={{ '--modal-width': width, '--modal-height': height } as CSSProperties}
        >
          <div
            className={cn(
              'items-center justify-between rounded-tl-lg rounded-tr-lg p-[10px] max-[1023px]:p-[5px]',
              title ? 'flex' : 'hidden',
            )}
          >
            <div className="flex h-10 w-full items-center px-[10px] max-[1023px]:h-5">
              <DialogTitle className="modal-title mx-[10px] flex items-center">
                {title}
              </DialogTitle>
            </div>
            <DialogClose type="button" aria-label="Cerrar">
              <X aria-hidden="true" />
            </DialogClose>
          </div>
          <div className="modal-scrollbar flex flex-1 flex-col overflow-y-scroll px-[20px] max-[768px]:px-[5px]">
            {children}
          </div>
        </DialogContent>
      </DialogOverlay>
    </DialogPortal>
  </Dialog>
)

export default Modal
