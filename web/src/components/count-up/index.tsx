import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  separator?: boolean
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** Animates from the previous value to the next one whenever `value` changes. */
export function CountUp({
  value,
  duration = 800,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  separator = true,
}: Props) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return

    const start = performance.now()
    const tick = (now: number) => {
      // clamp guards against clock anomalies (e.g. virtual time in headless runs)
      const p = Math.max(0, Math.min(1, (now - start) / duration))
      const v = from + (to - from) * easeOutCubic(p)
      setDisplay(v)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
        setDisplay(to)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = to
    }
  }, [value, duration])

  const text = separator
    ? display.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : display.toFixed(decimals)

  return (
    <span className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  )
}
