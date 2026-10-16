import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Coins, Receipt, ShoppingCart, CalendarDays } from 'lucide-react'
import type { EChartsOption } from 'echarts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EChart } from '@/components/charts/EChart'
import { ChartAPI } from '@/lib/api'
import { cn } from '@/lib/utils'

const DAY_RANGES = [7, 30, 45]
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function fmtMoney(v: number) {
  if (v >= 100_000_000) return `¥${(v / 100_000_000).toFixed(2)} 亿`
  if (v >= 10_000) return `¥${(v / 10_000).toFixed(1)} 万`
  return `¥${v.toFixed(0)}`
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ElementType
  label: string
  value: string
  hint?: string
  tone: string
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br',
              tone
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
            {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ChartsPage() {
  const [days, setDays] = useState(30)

  const { data, isLoading } = useQuery({
    queryKey: ['demo-charts', days],
    queryFn: () => ChartAPI.overview(days),
    refetchInterval: false,
  })

  // ---- trend: amount (area) + orders (bar) on dual axes ----
  const trendOption = useMemo<EChartsOption>(() => {
    const t = data?.trend ?? []
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['销售额', '订单量'], top: 0, right: 0 },
      grid: { left: 8, right: 8, bottom: 8, top: 40, containLabel: true },
      xAxis: { type: 'category', data: t.map((p) => p.date), boundaryGap: false },
      yAxis: [
        { type: 'value', name: '销售额', axisLabel: { formatter: (v: number) => fmtMoney(v) } },
        { type: 'value', name: '订单量', splitLine: { show: false } },
      ],
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', height: 16, bottom: 4, borderColor: 'transparent' },
      ],
      series: [
        {
          name: '销售额',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: t.map((p) => p.amount),
          areaStyle: {
            opacity: 0.22,
          },
          lineStyle: { width: 2.4 },
        },
        {
          name: '订单量',
          type: 'bar',
          yAxisIndex: 1,
          barWidth: '38%',
          data: t.map((p) => p.orders),
          itemStyle: { borderRadius: [3, 3, 0, 0], opacity: 0.55 },
        },
      ],
    }
  }, [data])

  // ---- category: doughnut ----
  const categoryOption = useMemo<EChartsOption>(() => {
    const c = data?.category ?? []
    return {
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      legend: { type: 'scroll', orient: 'vertical', right: 0, top: 'middle', itemWidth: 10 },
      series: [
        {
          type: 'pie',
          radius: ['46%', '72%'],
          center: ['38%', '52%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: 'rgba(0,0,0,0)', borderWidth: 2, borderRadius: 6 },
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 600, formatter: '{b}\n{d}%' },
          },
          data: c.map((x) => ({ name: x.name, value: x.value })),
        },
      ],
    }
  }, [data])

  // ---- region: horizontal bar ----
  const regionOption = useMemo<EChartsOption>(() => {
    const r = [...(data?.region ?? [])].sort((a, b) => a.value - b.value)
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: ¥{c}' },
      grid: { left: 8, right: 24, top: 12, bottom: 8, containLabel: true },
      xAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtMoney(v) } },
      yAxis: { type: 'category', data: r.map((x) => x.name) },
      series: [
        {
          type: 'bar',
          data: r.map((x) => x.value),
          barWidth: '52%',
          itemStyle: { borderRadius: [0, 6, 6, 0] },
          showBackground: true,
          backgroundStyle: { opacity: 0.08 },
        },
      ],
    }
  }, [data])

  // ---- channel: nightingale rose ----
  const channelOption = useMemo<EChartsOption>(() => {
    const c = data?.channel ?? []
    return {
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      legend: { bottom: 0, itemWidth: 10 },
      series: [
        {
          type: 'pie',
          roseType: 'area',
          radius: ['22%', '70%'],
          center: ['50%', '46%'],
          itemStyle: { borderRadius: 5, borderWidth: 2, borderColor: 'rgba(0,0,0,0)' },
          label: { fontSize: 11 },
          data: c.map((x) => ({ name: x.name, value: x.value })),
        },
      ],
    }
  }, [data])

  // ---- funnel ----
  const funnelOption = useMemo<EChartsOption>(() => {
    const f = data?.funnel ?? []
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [
        {
          type: 'funnel',
          left: '8%',
          right: '8%',
          top: 16,
          bottom: 16,
          minSize: '26%',
          gap: 3,
          label: { position: 'inside', fontSize: 12, fontWeight: 500 },
          itemStyle: { borderRadius: 4 },
          data: f.map((x) => ({ name: x.name, value: x.value })),
        },
      ],
    }
  }, [data])

  // ---- radar ----
  const radarOption = useMemo<EChartsOption>(() => {
    const rd = data?.radar
    if (!rd) return {}
    return {
      tooltip: { trigger: 'item' },
      radar: {
        indicator: rd.indicators.map((n) => ({ name: n, max: 100 })),
        radius: '66%',
        center: ['50%', '54%'],
        splitArea: { areaStyle: { opacity: 0.06 } },
        axisName: { fontSize: 11 },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: rd.series.map((s) => s.value),
              name: '品类热度',
              areaStyle: { opacity: 0.25 },
              lineStyle: { width: 2 },
            },
          ],
        },
      ],
    }
  }, [data])

  // ---- heatmap: weekday x hour ----
  const heatOption = useMemo<EChartsOption>(() => {
    const hm = data?.heatmap ?? []
    const cells = hm.map((p) => [p.hour, WEEKDAYS.indexOf(p.day), p.value] as [number, number, number])
    const values = hm.map((p) => p.value)
    const max = values.length ? Math.max(...values) : 0
    return {
      tooltip: {
        position: 'top',
        formatter: (p: unknown) => {
          const q = p as { data: [number, number, number] }
          return `${WEEKDAYS[q.data[1]]} ${String(q.data[0]).padStart(2, '0')}:00<br/>${fmtMoney(q.data[2])}`
        },
      },
      grid: { left: 8, right: 16, top: 8, bottom: 60, containLabel: true },
      xAxis: {
        type: 'category',
        data: Array.from({ length: 24 }, (_, i) => `${i}`),
        splitArea: { show: true },
      },
      yAxis: { type: 'category', data: WEEKDAYS, splitArea: { show: true } },
      visualMap: {
        min: 0,
        max: max || 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        itemHeight: 90,
        textStyle: { fontSize: 11 },
      },
      series: [
        {
          type: 'heatmap',
          data: cells,
          progressive: 0,
          emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
        },
      ],
    }
  }, [data])

  const summary = data?.summary ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">图表报表</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            基于订单事实表聚合：趋势、构成、对比、漏斗、雷达、热力图
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {DAY_RANGES.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                days === d
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              近 {d} 天
            </button>
          ))}
        </div>
      </div>

      {/* summary cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={Coins}
            label={summary[0]?.name ?? '累计销售额'}
            value={fmtMoney(summary[0]?.value ?? 0)}
            hint={`近 ${days} 天区间`}
            tone="from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400"
          />
          <SummaryCard
            icon={ShoppingCart}
            label={summary[1]?.name ?? '累计订单量'}
            value={(summary[1]?.value ?? 0).toLocaleString()}
            hint="按件数统计"
            tone="from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400"
          />
          <SummaryCard
            icon={Receipt}
            label={summary[2]?.name ?? '客单价'}
            value={fmtMoney(summary[2]?.value ?? 0)}
            hint="销售额 / 订单量"
            tone="from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400"
          />
          <SummaryCard
            icon={CalendarDays}
            label={summary[3]?.name ?? '覆盖天数'}
            value={String(summary[3]?.value ?? 0)}
            hint="有效交易日"
            tone="from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              销售趋势
            </CardTitle>
            <CardDescription>销售额（面积图）与订单量（柱状图）双轴对比，支持缩放</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? <Skeleton className="h-[340px]" /> : <EChart option={trendOption} height={340} />}
          </CardContent>
        </Card>

        <ChartCard title="品类销售构成" desc="环形图展示各品类销售额占比">
          {isLoading ? <Skeleton className="h-[300px]" /> : <EChart option={categoryOption} height={300} />}
        </ChartCard>

        <ChartCard title="区域销售对比" desc="横向条形图，从低到高排序">
          {isLoading ? <Skeleton className="h-[300px]" /> : <EChart option={regionOption} height={300} />}
        </ChartCard>

        <ChartCard title="渠道分布" desc="南丁格尔玫瑰图">
          {isLoading ? <Skeleton className="h-[300px]" /> : <EChart option={channelOption} height={300} />}
        </ChartCard>

        <ChartCard title="转化漏斗" desc="曝光 → 点击 → 加购 → 下单 → 支付">
          {isLoading ? <Skeleton className="h-[300px]" /> : <EChart option={funnelOption} height={300} />}
        </ChartCard>

        <ChartCard title="品类热度雷达" desc="以最高品类为 100 归一化">
          {isLoading ? <Skeleton className="h-[300px]" /> : <EChart option={radarOption} height={300} />}
        </ChartCard>

        <ChartCard title="订单热力分布" desc="星期 × 小时 的成交金额密度" className="lg:col-span-2">
          {isLoading ? <Skeleton className="h-[340px]" /> : <EChart option={heatOption} height={340} />}
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  desc,
  children,
  className,
}: {
  title: string
  desc?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('border-border/60 shadow-sm', className)}>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">{title}</CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-3">{children}</CardContent>
    </Card>
  )
}
