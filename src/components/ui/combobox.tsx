'use client';

/**
 * Combobox — generic searchable dropdown built on shadcn Command + Popover.
 * Replaces the custom combobox removed in the shadcn migration.
 */
import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { cn } from '@/lib/cn';
import { Check } from 'lucide-react';

export interface ComboboxProps<T> {
  options: T[];
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
  onChange: (value: T | null) => void;
  value?: T | null;
  placeholder?: string;
  noOptionsText?: string;
  loading?: boolean;
  onSearch?: (query: string) => Promise<void>;
  renderOption?: (option: T) => React.ReactNode;
  className?: string;
}

export default function Combobox<T>({
  options,
  getOptionLabel,
  getOptionValue,
  onChange,
  value,
  placeholder = 'Seleccionar...',
  noOptionsText = 'Sin resultados',
  loading = false,
  onSearch,
  renderOption,
  className,
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const listId = useId();

  const handleSearch = useCallback(
    (query: string) => {
      setSearch(query);
      if (onSearch) {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => onSearch(query), 300);
      }
    },
    [onSearch],
  );

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const selectedLabel = value ? getOptionLabel(value) : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            'inline-flex h-10 w-full items-center justify-between rounded-md border border-border-subtle bg-surface-base px-3 py-2 text-sm text-text-primary hover:bg-background-subtle transition-colors',
            !value && 'text-text-muted',
            className,
          )}
        >
          {value ? selectedLabel : placeholder}
          <span className="ml-2 shrink-0 opacity-50">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={!onSearch}>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={handleSearch}
            className="h-9"
          />
          <CommandList id={listId}>
            <CommandEmpty>{loading ? 'Buscando...' : noOptionsText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const optionValue = getOptionValue(option);
                const isSelected = value ? getOptionValue(value) === optionValue : false;
                return (
                  <CommandItem
                    key={optionValue}
                    value={optionValue}
                    onSelect={() => {
                      // cmdk sets the value as the selected value, find the matching option
                      const selected = isSelected ? null : option;
                      onChange(selected);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden="true"
                    />
                    {renderOption ? renderOption(option) : getOptionLabel(option)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
