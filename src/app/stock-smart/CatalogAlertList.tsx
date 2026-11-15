'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface CatalogAlertListProps {
  children: ReactNode
  label: string
  scrollable: boolean
}

export function CatalogAlertList({ children, label, scrollable }: CatalogAlertListProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const [maxHeight, setMaxHeight] = useState<number>()

  useLayoutEffect(() => {
    const list = listRef.current
    if (!scrollable || !list) return

    const measure = () => {
      const first = list.children[0]
      const fourth = list.children[3]
      if (!first || !fourth) return
      const height = fourth.getBoundingClientRect().bottom - first.getBoundingClientRect().top
      if (height > 0) setMaxHeight(height)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(list)
    Array.from(list.children).slice(0, 4).forEach((row) => observer?.observe(row))
    const fallback = observer ? undefined : window.setInterval(measure, 500)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      if (fallback !== undefined) window.clearInterval(fallback)
      window.removeEventListener('resize', measure)
    }
  }, [scrollable, children])

  return (
    <div
      role={scrollable ? 'region' : undefined}
      aria-label={scrollable ? `Lista desplazable de alertas ${label}` : undefined}
      tabIndex={scrollable ? 0 : undefined}
      className={scrollable ? 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-state-focus' : undefined}
      style={scrollable ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <ul ref={listRef} className="grid gap-2">{children}</ul>
    </div>
  )
}
