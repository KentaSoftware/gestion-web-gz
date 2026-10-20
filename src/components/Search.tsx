import React, { ChangeEvent } from 'react'
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input as InputUi } from '@/components/ui/input'

interface SearchProps {
  type: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  name: string
  placeHolder: string
  onClickFilter?: () => void
}

export default function Search({
  type,
  value,
  onChange,
  name,
  placeHolder,
  onClickFilter = undefined,
}: SearchProps) {
  return (
    <div className="relative flex flex-col text-center my-4 w-full px-4 sm:my-2.5">
      <InputUi
        className={cn(onClickFilter ? 'pr-24' : 'pr-16')}
        aria-label={placeHolder}
        placeholder={placeHolder}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
      />

      {/* Search icon */}
      <div className="absolute right-12 top-2.5 flex items-center text-2xl text-text-muted border-r border-border-subtle pr-1.5 pointer-events-none" aria-hidden="true">
        <SearchIcon />
      </div>

      {/* Filter icon */}
      {onClickFilter && (
        <button
          type="button"
          onClick={onClickFilter}
          aria-label="Filtrar"
          className={cn(
            'absolute right-5 top-2.5 flex items-center text-2xl',
            'text-text-muted cursor-pointer transition-colors duration-[120ms]',
            'hover:text-brand-primary hover:bg-background-subtle',
            'hover:p-1.5 rounded-tr-md rounded-br-md'
          )}
        >
          <SlidersHorizontal aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
