import type { CSSProperties, ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Inbox, MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/cn'

/**
 * DataTable<T> — generic semantic table component.
 *
 * DS token classes only. No hook-in-map: all formatters/renderers must be
 * plain functions declared outside the calling component.
 *
 * Handles three exclusive states:
 *   loading=true   → skeleton rows (thead always visible)
 *   data=[]        → full-colspan empty-state block
 *   data.length>0  → data rows with optional actions column
 */

interface DataColumn<T> {
  key: keyof T & string
  header: string
  width?: string
  align?: CSSProperties['textAlign']
  render?: (value: T[keyof T], row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: DataColumn<T>[]
  data: T[]
  loading?: boolean
  skeletonRows?: number
  emptyMessage?: string
  /** @deprecated Usar emptyMessage. Si se pasa un string, se renderiza como texto */
  emptyIcon?: string
  actions?: (row: T) => ReactNode
  keyExtractor?: (row: T, index: number) => string
}

export type { DataColumn, DataTableProps }

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  skeletonRows = 4,
  emptyMessage,
  emptyIcon,
  actions,
  keyExtractor,
}: DataTableProps<T>) {
  const colSpan = columns.length + (actions ? 1 : 0)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                style={{ width: col.width, textAlign: col.align }}
                className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-text-secondary"
              >
                {col.header}
              </TableHead>
            ))}
            {actions ? (
              <TableHead className="sr-only">
                Acciones
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <TableRow key={rowIdx}>
                {columns.map((col) => (
                  <TableCell key={col.key} className="border-b border-border-subtle">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
                {actions ? (
                  <TableCell className="border-b border-border-subtle">
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  {emptyIcon ? (
                    <span className="text-5xl" aria-hidden="true">{emptyIcon}</span>
                  ) : (
                    <Inbox className="h-12 w-12 text-text-muted" aria-hidden="true" />
                  )}
                  <h3 className="text-base font-semibold text-text-secondary">Sin resultados</h3>
                  <p className="text-sm text-text-muted">
                    {emptyMessage ?? 'No hay elementos para mostrar'}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={keyExtractor ? keyExtractor(row, i) : i}
                className="border-b border-border-subtle last:border-b-0"
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    style={{ textAlign: col.align }}
                    className="text-sm text-text-primary"
                  >
                    {col.render
                      ? col.render(row[col.key as keyof T], row)
                      : String(row[col.key as keyof T] ?? '')}
                  </TableCell>
                ))}
                {actions ? (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Acciones">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions(row)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
