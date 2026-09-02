'use client'

import { useState, useRef, useEffect } from 'react'

export function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value)
  const prevValueRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const startValue = prevValueRef.current
    const delta = value - startValue
    const duration = 800
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const t = Math.min(elapsed / duration, 1)
      // Cubic ease-out: 1 - (1 - t)³
      const eased = 1 - Math.pow(1 - t, 3)
      const current = startValue + delta * eased
      setDisplayValue(current)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        prevValueRef.current = value
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [value])

  return <span>{Math.round(displayValue).toLocaleString()}</span>
}
