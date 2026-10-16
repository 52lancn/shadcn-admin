import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Expand,
  Gauge,
  Info,
  Radio,
  Server,
  Users,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'

import { Button } from '@/components/ui/button'
import { EChart } from '@/components/charts/EChart'
import { CountUp } from '@/components/count-up'
import { MonitorAPI, type MonitorSnapshot } from '@/lib/api'
import { cn } from '@/lib/utils'

const LEVEL_COLOR: Record<string, string> = {
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  danger: 'text-rose-400',
}

const METRIC_ICON: Record<string, React.ElementType> = {
  cpu: Cpu,
  mem: Server,
  disk: Gauge,
  net: Activity,
  gpu: Zap,
  conn: Radio,
}

function Panel({
  title,
  icon: Icon,
  children,
  className,
  right,
}: {
  title: string
  icon?: React.ElementType
  children: React.ReactNode
  className?: string
  right?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'relative rounded-xl border border-cyan-400/15 bg-slate-900/50 p-4 backdrop-blur-sm',
        'shadow-[0_0_0_1px_rgba(56,189,248,0.04),0_8px_30px_-12px_rgba(0,0,0,0.8)]',
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[13px] font-medium tracking-wide text-cyan-100/90">
          {Icon && <Icon className="h-4 w-4 text-cyan-400/80" />}
          {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  )
}

function MetricRow({ snap }: { snap: MonitorSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {snap.metrics.map((m) => {
        const Icon = METRIC_ICON[m.key] ?? Activity
        const pct = Math.min(100, (m.value / m.max) * 100)
        const color =
          m.level === 'danger'
            ? 'from-rose-500 to-rose-400'
            : m.level === 'warn'
              ? 'from-amber-500 to-amber-400'
              : 'from-cyan-500 to-emerald-400'
        return (
          <div
            key={m.key}
            className="rounded-lg border border-white/5 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </span>
              <span
                className={cn(
                  'text-[10px] tabular-nums',
                  m.trend >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'
                )}
              >
                {m.trend >= 0 ? '▲' : '▼'} {Math.abs(m.trend).toFixed(1)}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <CountUp
                value={m.value}
                decimals={m.value >= 100 ? 0 : 1}
                className="text-xl font-semibold tabular-nums text-white"
              />
              <span className="text-[11px] text-slate-400">{m.unit}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', color)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  tone,
}: {
  icon: React.ElementType
  label: string
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  tone: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br p-4',
        tone
      )}
    >
      <div className="flex items-center gap-2 text-[11px] text-white/70">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight text-white">
        <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>
    </div>
  )
}

export default function ScreenPage() {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => new Date())

  const { data: snap } = useQuery({
    queryKey: ['monitor-snapshot'],
    queryFn: () => MonitorAPI.snapshot(),
    refetchInterval: 3000,
    staleTime: 2500,
  })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const enterFullscreen = () => {
    const el = rootRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.()
  }

  const qpsOption = useMemo<EChartsOption>(() => {
    const s = snap?.qps ?? []
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: s.map((p) => p.time), axisLabel: { interval: 5 } },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: s.map((p) => p.value),
          lineStyle: { width: 2.2, color: '#22d3ee' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(34,211,238,0.45)' },
                { offset: 1, color: 'rgba(34,211,238,0)' },
              ],
            },
          },
        },
      ],
    }
  }, [snap])

  const trafficOption = useMemo<EChartsOption>(() => {
    const s = snap?.traffic ?? []
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 8, right: 12, top: 16, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: s.map((p) => p.time), axisLabel: { interval: 5 } },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          data: s.map((p) => p.value),
          barWidth: '55%',
          itemStyle: {
            borderRadius: [3, 3, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#a78bfa' },
                { offset: 1, color: 'rgba(167,139,250,0.25)' },
              ],
            },
          },
        },
      ],
    }
  }, [snap])

  const regionOption = useMemo<EChartsOption>(() => {
    const r = [...(snap?.regions ?? [])].sort((a, b) => a.value - b.value)
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 20, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: r.map((x) => x.name) },
      series: [
        {
          type: 'bar',
          data: r.map((x) => x.value),
          barWidth: '48%',
          itemStyle: {
            borderRadius: [0, 5, 5, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#0ea5e9' },
                { offset: 1, color: '#34d399' },
              ],
            },
          },
        },
      ],
    }
  }, [snap])

  const alerts = snap?.alerts ?? []
  const services = snap?.services ?? []

  return (
    <div
      ref={rootRef}
      className="min-h-screen w-full bg-[#060b18] bg-[radial-gradient(ellipse_at_top,rgba(14,116,144,0.22),transparent_60%)] p-5 text-slate-100"
    >
      {/* header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-white">
              实时运营监控大屏
            </h1>
            <p className="text-[11px] text-cyan-300/60">
              每 3 秒刷新一次 · 数据源 demo_order / demo_product
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-xl tabular-nums text-white">
              {now.toLocaleTimeString('zh-CN', { hour12: false })}
            </p>
            <p className="text-[11px] text-slate-400">
              {now.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'long',
              })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={enterFullscreen}
            className="h-9 w-9 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <Expand className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="实时在线用户"
          value={snap?.onlineUsers ?? 0}
          tone="from-cyan-500/25 to-cyan-500/5"
        />
        <KpiCard
          icon={Wallet}
          label="今日成交额"
          value={snap?.todayAmount ?? 0}
          decimals={2}
          prefix="¥"
          tone="from-emerald-500/25 to-emerald-500/5"
        />
        <KpiCard
          icon={Activity}
          label="今日订单量"
          value={snap?.todayOrders ?? 0}
          tone="from-violet-500/25 to-violet-500/5"
        />
        <KpiCard
          icon={Zap}
          label="转化率"
          value={snap?.conversion ?? 0}
          decimals={2}
          suffix="%"
          tone="from-amber-500/25 to-amber-500/5"
        />
      </div>

      {/* main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel
            title="QPS 实时趋势"
            icon={Activity}
            right={
              <span className="text-[11px] tabular-nums text-cyan-300/80">
                {(snap?.qps?.at(-1)?.value ?? 0).toFixed(0)} req/s
              </span>
            }
          >
            <EChart option={qpsOption} height={210} />
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="网络吞吐 (MB/s)" icon={Radio}>
              <EChart option={trafficOption} height={180} />
            </Panel>
            <Panel title="区域成交额分布" icon={Server}>
              <EChart option={regionOption} height={180} />
            </Panel>
          </div>

          <Panel title="资源水位" icon={Cpu}>
            {snap ? (
              <MetricRow snap={snap} />
            ) : (
              <div className="h-32 animate-pulse rounded-lg bg-white/5" />
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title="服务健康度"
            icon={CheckCircle2}
            right={
              <span className="text-[11px] text-slate-400">{services.length} 个节点</span>
            }
          >
            <div className="space-y-2">
              {services.length === 0 && (
                <div className="h-32 animate-pulse rounded-lg bg-white/5" />
              )}
              {services.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {s.status === 'healthy' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : s.status === 'degraded' ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-400" />
                    )}
                    <span className="text-[13px]">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] tabular-nums">
                    <span className="text-slate-400">{s.latency.toFixed(0)} ms</span>
                    <span className="text-emerald-400/90">{s.uptime.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="实时告警"
            icon={AlertTriangle}
            right={<span className="text-[11px] text-slate-400">{alerts.length} 条</span>}
          >
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 scroll-thin">
              {alerts.length === 0 && (
                <div className="h-32 animate-pulse rounded-lg bg-white/5" />
              )}
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    'rounded-lg border-l-2 bg-white/[0.04] px-3 py-2',
                    a.level === 'danger'
                      ? 'border-rose-500'
                      : a.level === 'warn'
                        ? 'border-amber-500'
                        : 'border-sky-500'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {a.level === 'info' ? (
                      <Info className={cn('h-3 w-3', LEVEL_COLOR.ok)} />
                    ) : (
                      <AlertTriangle className={cn('h-3 w-3', LEVEL_COLOR[a.level])} />
                    )}
                    <span className="text-[13px] leading-snug text-slate-100">{a.title}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{a.source}</span>
                    <span className="tabular-nums">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 text-center text-[11px] text-slate-500">
        数据每 3 秒自动刷新 · 基础设施指标为演示用模拟数据
      </div>
    </div>
  )
}
