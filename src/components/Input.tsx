import React, { forwardRef, useEffect, useState } from 'react'
import { Input as InputUi } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type TypeInput = 'text' | 'number' | 'email' | 'date' | 'password'

/**
 * Input component — migrated to Tailwind 4 semantic tokens.
 *
 * DECISION: `process.env.TEXT_COLOR` replaced by `text-text-primary` token.
 * Floating label pattern preserved; focus border uses `border-border-interactive`.
 * TICKET-03: height unified to h-10 (--control-height-md: 40px); disabled state added.
 */
interface InputProps {
  type: TypeInput
  label: string
  value?: string | number
  onChange?: (e: any) => void
  onBlur?: (e: any) => void
  name: string
  required?: boolean
  readOnly?: boolean
  disabled?: boolean
  prefix?: string
  width?: string
  placeholder?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  type,
  label,
  value,
  onChange,
  onBlur,
  name,
  required,
  readOnly,
  disabled,
  prefix,
  width = '',
  placeholder,
}, ref) => {
  const [isActive, setIsActive] = useState<boolean>(type === 'date')

  const handleInputFocus = () => {
    setIsActive(true)
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const hasValue = value !== undefined ? value !== '' : e.target.value !== ''
    setIsActive(hasValue)
  }

  useEffect(() => {
    if (type === 'date') return
    if (value !== undefined) {
      setIsActive(value !== '')
    }
  }, [value, type])

  return (
    <div
      className="relative my-4 flex flex-col text-center"
      style={width ? { width } : { width: '-webkit-fill-available' }}
    >
      {prefix && (
        <div className="absolute top-2 left-2.5 flex items-center text-base text-text-muted">
          {prefix}
        </div>
      )}

      <label
        htmlFor={name}
        className={cn(
          'absolute left-4 top-2.5 pointer-events-none text-label text-text-secondary',
          'transition-transform duration-[120ms] origin-top-left',
          isActive && '-translate-y-6 scale-[0.8]'
        )}
      >
        {label}
        {required && ' - Campo requerido'}
      </label>

      <InputUi
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={handleInputFocus}
        onBlur={(e) => {
          handleInputBlur(e)
          onBlur?.(e)
        }}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(prefix && 'pl-8')}
        ref={ref}
      />
    </div>
  )
})

Input.displayName = 'Input'

export default Input
