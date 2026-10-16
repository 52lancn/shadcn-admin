import * as React from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

import { useIsDark } from '@/hooks/useIsDark'

interface Props {
  option: EChartsOption
  height?: number | string
  className?: string
}

const PALETTE = [
  '#6366f1',
  '#06b6d4',
  '#f59e0b',
  '#10b981',
  '#f43f5e',
  '#8b5cf6',
  '#3b82f6',
  '#84cc16',
]

/** ECharts wrapper that adapts axis / tooltip / legend colours to the active theme. */
export function EChart({ option, height = 320, className }: Props) {
  const dark = useIsDark()

  const merged = React.useMemo(() => {
    const axisLine = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
    const label = dark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.55)'
    return {
      color: PALETTE,
      backgroundColor: 'transparent',
      textStyle: { color: label, fontFamily: 'inherit' },
      tooltip: {
        backgroundColor: dark ? 'rgba(24,24,27,0.96)' : 'rgba(255,255,255,0.98)',
        borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        textStyle: { color: dark ? '#f4f4f5' : '#18181b', fontSize: 12 },
        ...(option.tooltip as object),
      },
      legend: {
        textStyle: { color: label },
        ...(option.legend as object),
      },
      ...option,
      // axis defaults are applied per-axis so user overrides still win
      ...applyAxisDefaults(option, axisLine, label),
    } as EChartsOption
  }, [option, dark])

  return (
    <ReactECharts
      option={merged}
      className={className}
      style={{ height, width: '100%' }}
      notMerge
      lazyUpdate
      opts={{ renderer: 'canvas' }}
    />
  )
}

function applyAxisDefaults(option: EChartsOption, line: string, label: string) {
  const out: Record<string, unknown> = {}
  const axes: Array<'xAxis' | 'yAxis'> = ['xAxis', 'yAxis']
  for (const key of axes) {
    const ax = (option as Record<string, unknown>)[key]
    if (!ax) continue
    const base = {
      axisLine: { lineStyle: { color: line } },
      axisLabel: { color: label, fontSize: 11 },
      splitLine: { lineStyle: { color: line, type: 'dashed' as const } },
      nameTextStyle: { color: label },
    }
    if (Array.isArray(ax)) {
      out[key] = ax.map((a) => ({ ...base, ...(a as object) }))
    } else {
      out[key] = { ...base, ...(ax as object) }
    }
  }
  return out
}

export { PALETTE }
