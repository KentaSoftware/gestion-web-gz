import Link from 'next/link'
import React from 'react'
import { cn } from '@/lib/cn'
import { Button as ButtonUi } from '@/components/ui/button'

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  /** Visible label. Can be omitted when `icon` is provided — supply `aria-label` in that case. */
  text?: string
  /** Optional leading icon rendered before text. */
  icon?: React.ReactNode
  /** Accessible label — required when rendering icon-only (no text). */
  'aria-label'?: string
  onClick: () => void
  width?: string
  to?: string
  type?: 'button' | 'submit' | 'reset'
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  className?: string
}

const VARIANT_MAP = {
  primary:     'default',
  secondary:   'secondary',
  destructive: 'destructive',
  ghost:       'ghost',
} as const

const SIZE_OVERRIDES: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

const SIZE_MAP = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
} as const

const VARIANT_OVERRIDES: Record<ButtonVariant, string> = {
  primary:     '',
  secondary:   'border border-border-interactive bg-surface-base text-brand-primary hover:bg-brand-primary hover:text-text-inverse',
  destructive: '',
  ghost:       'text-text-secondary hover:bg-background-subtle hover:text-text-primary',
}

const BASE_OVERRIDES = 'font-semibold disabled:cursor-not-allowed'

export default function Button({
  text,
  icon,
  'aria-label': ariaLabel,
  onClick,
  width,
  to,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
}: ButtonProps) {
  const overrideClasses = cn(BASE_OVERRIDES, SIZE_OVERRIDES[size], VARIANT_OVERRIDES[variant], className)

  const btn = (
    <ButtonUi
      variant={VARIANT_MAP[variant]}
      size={SIZE_MAP[size]}
      onClick={onClick}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      style={width ? { width } : undefined}
      className={overrideClasses}
    >
      {icon}
      {text}
    </ButtonUi>
  )

  if (to) {
    return <Link href={to}>{btn}</Link>
  }

  return btn
}
