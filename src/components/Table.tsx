import { useDate } from '@/hooks/useDate'
import React from 'react'
import { cn } from '@/lib/cn'
import type { CSSProperties } from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Column {
  label: string
  field: string
  width: string
  align?: CSSProperties['textAlign']
  price?: boolean
  date?: boolean
}

export default function CustomTable({
  data = [],
  columns,
  onClick,
  maxHeight = true,
  title,
  print = false,
}: {
  data: any[]
  columns: Column[]
  onClick: (item: any) => void
  date?: boolean
  maxHeight: boolean
  title?: string
  print?: boolean
}) {
  return (
    <div>
      {title && (
        <h5
          className={cn(
            'px-4 my-1 text-text-primary',
            print ? 'text-xl font-normal uppercase' : 'text-lg font-semibold'
          )}
        >
          {title}
        </h5>
      )}

      <div
        className="overflow-y-scroll"
        style={{ maxHeight: !maxHeight ? 'none' : '800px' }}
      >
        <Table>
          <TableHeader>
            <TableRow
              className={cn(
                'bg-background-subtle text-text-primary',
                'uppercase tracking-wide',
                print ? 'text-xl font-normal' : 'text-lg font-semibold'
              )}
            >
              {columns.map((column: Column, index: number) => (
                <TableHead
                  key={index}
                  style={{ width: column.width, textAlign: column.align }}
                  className={cn(
                    'text-text-primary',
                    print ? 'text-xl font-normal' : 'text-lg font-semibold'
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-text-primary text-lg font-semibold"
                >
                  NO HAY ELEMENTOS
                </TableCell>
              </TableRow>
            ) : (
              data.map((item: any, index: number) => (
                <TableRow
                  key={index}
                  onClick={() => onClick(item)}
                  className={cn(
                    'bg-surface-base text-text-primary',
                    print ? 'text-xl font-normal uppercase' : 'text-lg font-semibold',
                    !!onClick && 'cursor-pointer hover:bg-background-subtle'
                  )}
                >
                  {columns.map((column: Column, columnIndex: number) => {
                    // eslint-disable-next-line
                    const fecha = useDate(item[column.field]).date
                    return (
                      <TableCell
                        key={columnIndex}
                        style={{
                          width: column.width,
                          textAlign: column.align,
                          wordWrap: 'break-word',
                          whiteSpace: 'normal',
                        }}
                        data-label={column.label}
                      >
                        {column.date
                          ? fecha
                          : column.price
                          ? `$ ${item[column.field]?.toString()}`
                          : item[column.field]?.toString()}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
