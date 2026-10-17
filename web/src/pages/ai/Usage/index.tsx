import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Activity, Cpu, Gauge, Trash2, Zap } from 'lucide-react'
import type { EChartsOption } from 'echarts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EChart } from '@/components/charts/EChart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyHint, ModelWiringBadge, StatCard } from '../AiCommon'
import { AiAPI, AI_TASK_LABELS } from '@/lib/aiApi'
import { cn } from '@/lib/utils'

const DAY_RANGES = [7, 30, 90]

export default function UsagePage() {
  const qc = useQueryClient()
  const [days, setDays] = useState(30)
  const [page, setPage] = useState(1)
  const [perPage] = useState(10)
  const [task, setTask] = useState('all')
  const [clearOpen, setClearOpen] = useState(false)

  const { data: status } = useQuery({ queryKey: ['ai-status'], queryFn: AiAPI.status })
  const usageQuery = useQuery({
    queryKey: ['ai-usage', days],
    queryFn: () => AiAPI.usage(days),
  })
  const recordsQuery = useQuery({
    queryKey: ['ai-records', page, perPage, task],
    queryFn: () => AiAPI.records({ page, perPage, task }),
  })

  const clearRecords = useMutation({
    mutationFn: AiAPI.recordsClear,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-records'] })
      qc.invalidateQueries({ queryKey: ['ai-usage'] })
      setClearOpen(false)
      toast.success('已清空生成记录')
    },
    onError: (e: Error) => toast.error(e.message || '清空失败'),
  })

  const removeRecord = useMutation({
    mutationFn: (id: number) => AiAPI.recordRemove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-records'] })
      qc.invalidateQueries({ queryKey: ['ai-usage'] })
    },
    onError: (e: Error) => toast.error(e.message || '删除失败'),
  })

  const usage = usageQuery.data

  const trendOption: EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['调用次数', 'Token 消耗'], top: 0, right: 0 },
    grid: { left: 8, right: 8, bottom: 8, top: 36, containLabel: true },
    xAxis: { type: 'category', data: (usage?.daily ?? []).map((d) => d.date) },
    yAxis: [
      { type: 'value', name: '次数' },
      { type: 'value', name: 'Tokens', splitLine: { show: false } },
    ],
    series: [
      {
        name: '调用次数',
        type: 'line',
        smooth: true,
        showSymbol: false,
        areaStyle: { opacity: 0.2 },
        lineStyle: { width: 2.2 },
        data: (usage?.daily ?? []).map((d) => d.cnt),
      },
      {
        name: 'Token 消耗',
        type: 'bar',
        yAxisIndex: 1,
        barWidth: '38%',
        itemStyle: { borderRadius: [3, 3, 0, 0], opacity: 0.5 },
        data: (usage?.daily ?? []).map((d) => d.totalTokens),
      },
    ],
  }

  const taskOption: EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 次 ({d}%)' },
    legend: { bottom: 0, itemWidth: 10 },
    series: [
      {
        type: 'pie',
        radius: ['44%', '68%'],
        center: ['50%', '44%'],
        itemStyle: { borderColor: 'rgba(0,0,0,0)', borderWidth: 2, borderRadius: 5 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 600, formatter: '{b}\n{d}%' } },
        data: (usage?.task ?? []).map((t) => ({
          name: AI_TASK_LABELS[t.task] ?? t.task,
          value: t.cnt,
        })),
      },
    ],
  }

  const totalPages = Math.max(1, Math.ceil((recordsQuery.data?.total ?? 0) / perPage))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI 用量与模型状态</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            模型接入状态、Token 消耗统计与全量生成记录
          </p>
        </div>
        <ModelWiringBadge />
      </div>

      {/* 模型接入状态 */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            模型接入
          </CardTitle>
          <CardDescription>
            所有厂商均通过 OpenAI 兼容协议接入，切换只需改 admin-api.yaml 的 AI 段
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <InfoCell label="接入状态" value={status.enabled ? '已接入真实模型' : '本地兜底引擎'} tone={status.enabled ? 'emerald' : 'amber'} />
                <InfoCell label="服务厂商" value={status.vendor} />
                <InfoCell label="模型" value={status.model} />
                <InfoCell label="参数" value={`T=${status.temperature} · max=${status.maxTokens}`} />
              </div>
              {!status.enabled && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  {status.hint}
                </div>
              )}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                <p className="mb-1.5 font-medium text-foreground">可复用的 BaseURL 示例</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {[
                    ['DeepSeek', 'https://api.deepseek.com/v1', 'deepseek-chat'],
                    ['通义千问', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'qwen-plus'],
                    ['月之暗面 Kimi', 'https://api.moonshot.cn/v1', 'moonshot-v1-8k'],
                    ['智谱 GLM', 'https://open.bigmodel.cn/api/paas/v4', 'glm-4-flash'],
                    ['SiliconFlow', 'https://api.siliconflow.cn/v1', 'Qwen/Qwen2.5-7B-Instruct'],
                    ['本地 Ollama', 'http://127.0.0.1:11434/v1', 'qwen2.5:7b'],
                  ].map(([name, url, model]) => (
                    <div key={name} className="flex flex-col">
                      <span className="font-medium text-foreground">{name}</span>
                      <code className="break-all">{url}</code>
                      <code className="text-[11px] text-muted-foreground/80">model: {model}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Skeleton className="h-[120px]" />
          )}
        </CardContent>
      </Card>

      {/* 统计 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Activity} label="累计调用" value={usage?.totalCalls ?? 0} hint={`今日 ${usage?.todayCalls ?? 0} 次`} />
        <StatCard icon={Zap} label="Token 消耗" value={(usage?.totalTokens ?? 0).toLocaleString()} hint="输入 + 输出累计" tone="violet" />
        <StatCard icon={Gauge} label="平均耗时" value={`${Math.round(usage?.avgElapsed ?? 0)}ms`} hint="单次调用墙钟时间" tone="emerald" />
        <StatCard
          icon={Cpu}
          label="本地兜底占比"
          value={usage?.totalCalls ? `${Math.round(((usage.mockedCalls ?? 0) / usage.totalCalls) * 100)}%` : '0%'}
          hint={`${usage?.mockedCalls ?? 0} / ${usage?.totalCalls ?? 0} 次`}
          tone="amber"
        />
      </div>

      {/* 图表 */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">调用趋势</CardTitle>
              <div className="flex items-center gap-1.5">
                {DAY_RANGES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
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
            <CardDescription>每日调用次数与 Token 消耗</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {usageQuery.isLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (usage?.daily ?? []).length ? (
              <EChart option={trendOption} height={280} />
            ) : (
              <EmptyHint text="还没有调用记录，去「内容生成」试试" />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">能力分布</CardTitle>
            <CardDescription>各能力的调用占比</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {usageQuery.isLoading ? (
              <Skeleton className="h-[280px]" />
            ) : (usage?.task ?? []).length ? (
              <EChart option={taskOption} height={280} />
            ) : (
              <EmptyHint text="暂无数据" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 生成记录 */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">生成记录</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={task}
                onValueChange={(v) => {
                  setTask(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部能力</SelectItem>
                  {Object.entries(AI_TASK_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                清空
              </Button>
            </div>
          </div>
          <CardDescription>每次生成/翻译/分析的输入输出与 Token 消耗</CardDescription>
        </CardHeader>
        <CardContent>
          {recordsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[64px] rounded-lg" />
              ))}
            </div>
          ) : !recordsQuery.data?.list.length ? (
            <EmptyHint text="还没有调用记录" />
          ) : (
            <div className="space-y-2">
              {recordsQuery.data.list.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[11px]">
                        {r.taskLabel || AI_TASK_LABELS[r.task] || r.task}
                      </Badge>
                      <span>{r.model}</span>
                      {r.mocked === 1 && (
                        <Badge variant="warning" className="text-[11px]">
                          本地兜底
                        </Badge>
                      )}
                      <span>· {r.totalTokens} tokens · {r.elapsed}ms · {r.createdAt}</span>
                    </div>
                    <p className="line-clamp-2 text-sm">{r.output || r.input}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeRecord.mutate(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!!recordsQuery.data?.total && recordsQuery.data.total > perPage && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            共 {recordsQuery.data.total} 条 · 第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              下一页
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空全部生成记录？</AlertDialogTitle>
            <AlertDialogDescription>
              这会删除所有历史调用记录（含 Token 统计），操作不可撤销。舆情语料与提示词模板不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearRecords.mutate()}>确认清空</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InfoCell({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'emerald' | 'amber'
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 truncate text-sm font-medium',
          tone === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'amber' && 'text-amber-600 dark:text-amber-400'
        )}
      >
        {value}
      </p>
    </div>
  )
}
