import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface LayoutProps {
  children?: ReactNode
  className?: string
}

interface PageHeaderProps extends LayoutProps {
  title: string
  description?: string
  actions?: ReactNode
}

interface ResponsiveGridProps extends LayoutProps {
  minColumnWidth?: string
}

export function PageContainer({ children, className }: LayoutProps) {
  return (
    <div className={cn('flex flex-1 min-h-0 flex-col bg-background-canvas p-4 md:p-6', className)}>
      {children}
    </div>
  )
}

export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-heading-sm font-bold text-brand-primary">
            {title}
          </h1>
          {description && (
            <p className="text-label text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-end gap-3">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

export function PageSection({ children, className }: LayoutProps) {
  return (
    <section className={cn('mb-6', className)}>
      {children}
    </section>
  )
}

export function ResponsiveGrid({ children, className, minColumnWidth = '160px' }: ResponsiveGridProps) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}, 1fr))` }}
    >
      {children}
    </div>
  )
}
