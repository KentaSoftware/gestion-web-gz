"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, Pencil, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import apiClient from "@/utils/client"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useAsyncSelect } from "@/hooks/useAsyncSelect"

interface Item {
  _id: string
  descripcion: string
}

interface AsyncComboboxProps {
  value: string
  onChange: (id: string, item: any) => void
  name: string
  path: string
}

export function AsyncCombobox({ value, onChange, name, path }: AsyncComboboxProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  const selectedItem = data.find(item => item._id === value)

  const getData = useCallback(() => {
    setLoading(true)
    apiClient
      .get(path)
      .then(response => {
        setData(response.data)
        setLoading(false)
      })
      .catch(e => {
        console.log(e)
        setLoading(false)
      })
  }, [path])

  useEffect(() => {
    getData()
  }, [getData])

  const handleSelect = useCallback(
    (item: Item) => {
      onChange(item._id, item)
      setOpen(false)
    },
    [onChange],
  )

  const handleClear = useCallback(() => {
    onChange("", "")
  }, [onChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between pr-9"
          >
            <span className="truncate">
              {value && selectedItem ? selectedItem.descripcion : name}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              handleClear()
            }}
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full items-center px-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Quitar</span>
          </button>
        )}
      </div>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={!loading}>
          <CommandInput placeholder={`Buscar ${name.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>Lista Vacía</CommandEmpty>
            {loading ? (
              <div className="space-y-1.5 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <CommandGroup>
                {data.map(item => (
                  <CommandItem
                    key={item._id}
                    value={item.descripcion}
                    onSelect={() => handleSelect(item)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item._id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {item.descripcion}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── AsyncComboboxWithActions ────────────────────────────────────────────
// Extends AsyncCombobox with Agregar/Modificar/Quitar actions.
// Uses useAsyncSelect hook internally for CRUD + Socket.io.

interface AsyncComboboxWithActionsProps {
  value: string
  onChange: (id: string, item?: any) => void
  name: string
  path: string
  enableRealtime?: boolean
  placeholder?: string
}

export function AsyncComboboxWithActions({
  value,
  onChange,
  name,
  path,
  enableRealtime = false,
  placeholder,
}: AsyncComboboxWithActionsProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { items, loading, saving, create, update } = useAsyncSelect({
    path,
    enableRealtime,
  })

  const selectedItem = useMemo(
    () => items.find(item => item._id === value),
    [items, value],
  )

  const filteredItems = useMemo(
    () =>
      search
        ? items.filter(item =>
            item.descripcion.toLowerCase().includes(search.toLowerCase()),
          )
        : items,
    [items, search],
  )

  const exactMatch = useMemo(
    () =>
      search
        ? items.some(
            item =>
              item.descripcion.toLowerCase() === search.toLowerCase(),
          )
        : true,
    [items, search],
  )

  const handleSelect = (item: Item) => {
    onChange(item._id, item)
    setOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    onChange('')
    setOpen(false)
    setSearch('')
  }

  const handleModify = async () => {
    if (!selectedItem) return
    const newDesc = window.prompt('Nueva descripción:', selectedItem.descripcion)
    if (newDesc && newDesc !== selectedItem.descripcion) {
      try {
        await update(selectedItem._id, newDesc)
      } catch {
        // error handled by hook
      }
    }
  }

  const handleCreate = async () => {
    if (!search) return
    try {
      const newItem = await create(search)
      onChange(newItem._id, newItem)
      setOpen(false)
      setSearch('')
    } catch {
      // error handled by hook
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between pr-9"
          >
            <span className="truncate">
              {value && selectedItem
                ? selectedItem.descripcion
                : placeholder || name}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              handleClear()
            }}
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full items-center px-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Quitar</span>
          </button>
        )}
      </div>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Buscar ${name.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="space-y-1.5 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                {/* Action: Quitar */}
                {value && (
                  <>
                    <CommandItem
                      onSelect={handleClear}
                      className="text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Quitar
                    </CommandItem>
                    {/* Action: Modificar */}
                    <CommandItem onSelect={handleModify}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Modificar &lsquo;{selectedItem?.descripcion}&rsquo;
                    </CommandItem>
                    <CommandSeparator />
                  </>
                )}

                {/* Items list */}
                <CommandGroup>
                  {filteredItems.length === 0 && !exactMatch ? (
                    <CommandEmpty>Lista Vacía</CommandEmpty>
                  ) : (
                    filteredItems.map(item => (
                      <CommandItem
                        key={item._id}
                        value={item.descripcion}
                        onSelect={() => handleSelect(item)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === item._id
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        {item.descripcion}
                      </CommandItem>
                    ))
                  )}
                </CommandGroup>

                {/* Action: Agregar nuevo */}
                {search && !exactMatch && (
                  <>
                    <CommandSeparator />
                    <CommandItem onSelect={handleCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar &lsquo;{search}&rsquo;
                    </CommandItem>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
