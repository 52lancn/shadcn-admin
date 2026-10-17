import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Bell,
  Check,
  Flame,
  MessagesSquare,
  Plus,
  Radar,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebouncedState } from '@/hooks/useDebouncedState'
import {
  EmptyHint,
  ModelWiringBadge,
  RiskBadge,
  SentimentBadge,
  StatCard,
} from '../AiCommon'
import { AiAPI, type AiFeedbackVO, type AiSentimentResp } from '@/lib/aiApi'
import { cn } from '@/lib/utils'

const ALL = '__all__'

const SOURCES = ['商城评论', '客服工单', '售后反馈', '社交媒体', '社群讨论']

export default function SentimentPage() {
  const qc = useQueryClient()

  const [keyword, debouncedKeyword, setKeyword] = useDebouncedState('', 300)
  const [page, setPage] = useState(1)
  const [perPage] = useState(8)
  const [sentiment, setSentiment] = useState<string>(ALL)
  const [riskLevel, setRiskLevel] = useState<string>(ALL)
  const [source, setSource] = useState<string>(ALL)
  const [handled, setHandled] = useState<string>(ALL)

  // 实时预警面板
  const [alertOpen, setAlertOpen] = useState(false)
  // 快速分析（粘贴文本）
  const [quickOpen, setQuickOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: ['ai-feedback', page, perPage, debouncedKeyword, sentiment, riskLevel, source, handled],
    queryFn: () =>
      AiAPI.feedbackList({
        page,
        perPage,
        keyword: debouncedKeyword || undefined,
        sentiment: sentiment === ALL ? undefined : sentiment,
        riskLevel: riskLevel === ALL ? undefined : riskLevel,
        source: source === ALL ? undefined : source,
        handled: handled === ALL ? undefined : handled,
      }),
  })

  const usageQuery = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => AiAPI.usage(30),
  })

  const alertsQuery = useQuery({
    queryKey: ['ai-alerts'],
    queryFn: () => AiAPI.alerts(20),
    refetchInterval: 60_000,
  })

  const bulkAnalyze = useMutation({
    mutationFn: () => AiAPI.bulkAnalyze(50),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['ai-feedback'] })
      qc.invalidateQueries({ queryKey: ['ai-usage'] })
      qc.invalidateQueries({ queryKey: ['ai-alerts'] })
      toast.success(`分析完成：成功 ${r.succeed} 条，高危预警 ${r.alerts} 条`)
    },
    onError: (e: Error) => toast.error(e.message || '批量分析失败'),
  })

  const toggleHandled = useMutation({
    mutationFn: ({ id, next }: { id: number; next: 0 | 1 }) => AiAPI.feedbackSetHandled(id, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-feedback'] })
      qc.invalidateQueries({ queryKey: ['ai-alerts'] })
    },
    onError: (e: Error) => toast.error(e.message || '操作失败'),
  })

  const removeOne = useMutation({
    mutationFn: (id: number) => AiAPI.feedbackRemove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-feedback'] })
      toast.success('已删除')
    },
    onError: (e: Error) => toast.error(e.message || '删除失败'),
  })

  const usage = usageQuery.data
  const feedbackTotal = usage?.feedbackTotal ?? 0
  const sentimentPos = usage?.sentiment.find((s) => s.sentiment === 'positive')?.cnt ?? 0
  const sentimentNeg = usage?.sentiment.find((s) => s.sentiment === 'negative')?.cnt ?? 0
  const highRisk = usage?.highRisk ?? 0
  const alertCount = alertsQuery.data?.length ?? 0

  // ---- 图表配置 ----
  const sentimentOption: EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
    legend: { bottom: 0, itemWidth: 10 },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '44%'],
        itemStyle: { borderColor: 'rgba(0,0,0,0)', borderWidth: 2, borderRadius: 5 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 600, formatter: '{b}\n{d}%' } },
        data: (usage?.sentiment ?? []).map((s) => ({
          name: s.sentiment === 'positive' ? '正向' : s.sentiment === 'negative' ? '负向' : '中性',
          value: s.cnt,
          itemStyle: {
            color:
              s.sentiment === 'positive'
                ? '#10b981'
                : s.sentiment === 'negative'
                  ? '#f43f5e'
                  : '#94a3b8',
          },
        })),
      },
    ],
  }

  const sourceOption: EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    legend: { top: 0, itemWidth: 10 },
    xAxis: { type: 'category', data: (usage?.source ?? []).map((s) => s.source) },
    yAxis: { type: 'value', name: '条数' },
    series: [
      {
        name: '总量',
        type: 'bar',
        data: (usage?.source ?? []).map((s) => s.cnt),
        barWidth: '38%',
        itemStyle: { borderRadius: [3, 3, 0, 0], color: '#64748b' },
      },
      {
        name: '负向',
        type: 'bar',
        data: (usage?.source ?? []).map((s) => s.negative),
        barWidth: '38%',
        itemStyle: { borderRadius: [3, 3, 0, 0], color: '#f43f5e' },
      },
    ],
  }

  const riskOption: EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
    legend: { bottom: 0, itemWidth: 10 },
    series: [
      {
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '44%'],
        itemStyle: { borderColor: 'rgba(0,0,0,0)', borderWidth: 2, borderRadius: 5 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 600, formatter: '{b}\n{d}%' } },
        data: (usage?.risk ?? []).map((r) => ({
          name: r.riskLevel === 'high' ? '高危' : r.riskLevel === 'medium' ? '中风险' : '低风险',
          value: r.cnt,
          itemStyle: {
            color: r.riskLevel === 'high' ? '#f43f5e' : r.riskLevel === 'medium' ? '#f59e0b' : '#10b981',
          },
        })),
      },
    ],
  }

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / perPage))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">舆情与情感分析</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            自动分析用户评论、反馈与社群言论，识别情绪倾向，对恶意投诉与差评实时预警
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModelWiringBadge />
          <Button
            variant="outline"
            onClick={() => bulkAnalyze.mutate()}
            disabled={bulkAnalyze.isPending}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', bulkAnalyze.isPending && 'animate-spin')} />
            {bulkAnalyze.isPending ? '分析中…' : '批量分析未处理'}
          </Button>
        </div>
      </div>

      {/* 预警条 */}
      <button
        onClick={() => setAlertOpen(true)}
        className={cn(
          'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
          alertCount > 0
            ? 'border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10'
            : 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
        )}
      >
        <span className="flex items-center gap-3">
          {alertCount > 0 ? (
            <ShieldAlert className="h-5 w-5 text-rose-500" />
          ) : (
            <Bell className="h-5 w-5 text-emerald-500" />
          )}
          <span>
            <span className="block text-sm font-medium">
              {alertCount > 0 ? `检测到 ${alertCount} 条高危舆情待处理` : '当前无待处理的高危舆情'}
            </span>
            <span className="block text-xs text-muted-foreground">
              点击查看实时预警列表 · 高危定义：含投诉 / 举报 / 起诉 / 曝光 / 维权等升级言论
            </span>
          </span>
        </span>
        <span className="text-xs text-muted-foreground">查看 →</span>
      </button>

      {/* 统计卡 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={MessagesSquare} label="舆情语料总数" value={feedbackTotal} hint="已采集的用户言论" />
        <StatCard icon={Flame} label="负向反馈" value={sentimentNeg} hint="需关注的产品/服务问题" tone="rose" />
        <StatCard icon={AlertTriangle} label="高危预警" value={highRisk} hint="恶意投诉或维权升级" tone="amber" />
        <StatCard
          icon={Check}
          label="待处理语料"
          value={usage?.feedbackPending ?? 0}
          hint="尚未做情感分析的记录"
          tone="emerald"
        />
      </div>

      {/* 图表 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="情绪倾向分布" desc="正向 / 中性 / 负向占比">
          {usageQuery.isLoading ? <Skeleton className="h-[240px]" /> : <EChart option={sentimentOption} height={240} />}
        </ChartCard>
        <ChartCard title="各渠道负向反馈" desc="按来源渠道对比负向占比">
          {usageQuery.isLoading ? <Skeleton className="h-[240px]" /> : <EChart option={sourceOption} height={240} />}
        </ChartCard>
        <ChartCard title="风险等级构成" desc="低 / 中 / 高危分布">
          {usageQuery.isLoading ? <Skeleton className="h-[240px]" /> : <EChart option={riskOption} height={240} />}
        </ChartCard>
      </div>

      {/* 筛选栏 */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Input
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
            placeholder="搜索评论内容 / 用户 / 商品"
            className="h-9 w-full max-w-[240px]"
          />
          <FilterSelect
            value={sentiment}
            onChange={(v) => {
              setSentiment(v)
              setPage(1)
            }}
            options={[
              { value: ALL, label: '全部情绪' },
              { value: 'positive', label: '正向' },
              { value: 'neutral', label: '中性' },
              { value: 'negative', label: '负向' },
              { value: '', label: '未分析' },
            ]}
          />
          <FilterSelect
            value={riskLevel}
            onChange={(v) => {
              setRiskLevel(v)
              setPage(1)
            }}
            options={[
              { value: ALL, label: '全部风险' },
              { value: 'high', label: '高危' },
              { value: 'medium', label: '中风险' },
              { value: 'low', label: '低风险' },
            ]}
          />
          <FilterSelect
            value={source}
            onChange={(v) => {
              setSource(v)
              setPage(1)
            }}
            options={[{ value: ALL, label: '全部来源' }, ...SOURCES.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            value={handled}
            onChange={(v) => {
              setHandled(v)
              setPage(1)
            }}
            options={[
              { value: ALL, label: '全部状态' },
              { value: '0', label: '待处理' },
              { value: '1', label: '已处理' },
            ]}
          />
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setQuickOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            快速分析
          </Button>
        </CardContent>
      </Card>

      {/* 舆情列表 */}
      {listQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : !listQuery.data?.list.length ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent>
            <EmptyHint text="没有符合条件的舆情记录" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {listQuery.data.list.map((f) => (
            <FeedbackCard
              key={f.id}
              item={f}
              onToggle={() =>
                toggleHandled.mutate({ id: f.id, next: f.handled === 1 ? 0 : 1 })
              }
              onDelete={() => removeOne.mutate(f.id)}
              onAnalyze={() => {
                qc.invalidateQueries({ queryKey: ['ai-feedback'] })
              }}
              analyzeId={f.id}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {!!listQuery.data?.total && listQuery.data.total > perPage && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            共 {listQuery.data.total} 条 · 第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 预警抽屉 */}
      <Sheet open={alertOpen} onOpenChange={setAlertOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              实时舆情预警
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
            {alertsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-lg" />)
            ) : !alertsQuery.data?.length ? (
              <EmptyHint text="当前没有待处理的高危舆情" />
            ) : (
              alertsQuery.data.map((f) => (
                <div
                  key={f.id}
                  className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium">{f.author || '匿名用户'}</span>
                    <span className="text-[11px] text-muted-foreground">{f.createdAt}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{f.content}</p>
                  {f.summary && <p className="mt-2 text-xs text-muted-foreground">分析：{f.summary}</p>}
                  {f.suggestion && (
                    <p className="mt-1 text-xs text-rose-500">建议：{f.suggestion}</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => toggleHandled.mutate({ id: f.id, next: 1 })}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    标记为已处理
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 快速分析抽屉 */}
      <QuickAnalyzeSheet open={quickOpen} onOpenChange={setQuickOpen} />
    </div>
  )
}

// ---------------------------------------------------------------- 卡片

function FeedbackCard({
  item,
  onToggle,
  onDelete,
  analyzeId,
}: {
  item: AiFeedbackVO
  onToggle: () => void
  onDelete: () => void
  onAnalyze: () => void
  analyzeId: number
}) {
  const analyze = useMutation({
    mutationFn: () => AiAPI.analyze({ feedbackId: item.id, persist: true }),
    onSuccess: (r: AiSentimentResp) => {
      toast.success(`分析完成：${r.sentiment === 'negative' ? '负向' : r.sentiment === 'positive' ? '正向' : '中性'}${r.alert ? ' · 已触发高危预警' : ''}`)
    },
    onError: (e: Error) => toast.error(e.message || '分析失败'),
  })

  const tags = item.tags ? item.tags.split(',').filter(Boolean) : []

  return (
    <Card className={cn('border-border/60 shadow-sm', item.riskLevel === 'high' && 'border-rose-500/40')}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{item.author || '匿名用户'}</span>
              <span>·</span>
              <span>{item.source}</span>
              {item.product && (
                <>
                  <span>·</span>
                  <span>{item.product}</span>
                </>
              )}
              <span>·</span>
              <span>{item.createdAt}</span>
              {item.rating > 0 && (
                <span className="text-amber-500">{'★'.repeat(Math.min(5, item.rating))}</span>
              )}
            </div>
            <p className="text-sm leading-relaxed">{item.content}</p>
            {!!tags.length && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[11px]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
            {item.summary && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium">分析：</span>
                {item.summary}
              </p>
            )}
            {item.suggestion && (
              <p
                className={cn(
                  'mt-1 text-xs',
                  item.riskLevel === 'high' ? 'text-rose-500' : 'text-muted-foreground'
                )}
              >
                <span className="font-medium">建议：</span>
                {item.suggestion}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              {item.sentiment ? (
                <>
                  <SentimentBadge sentiment={item.sentiment} />
                  <RiskBadge riskLevel={item.riskLevel} />
                </>
              ) : (
                <Badge variant="outline" className="text-[11px] text-muted-foreground">
                  未分析
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => analyze.mutate()}
                disabled={analyze.isPending}
              >
                <Radar className={cn('mr-1.5 h-3.5 w-3.5', analyze.isPending && 'animate-spin')} />
                {analyze.isPending ? '分析中' : analyzeId && !item.sentiment ? '立即分析' : '重新分析'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggle}
                className={item.handled === 1 ? 'text-emerald-500' : ''}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                {item.handled === 1 ? '已处理' : '标记处理'}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------- 快速分析

function QuickAnalyzeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [result, setResult] = useState<AiSentimentResp | null>(null)
  const [saveAndAnalyze, setSaveAndAnalyze] = useState(true)
  const [source, setSource] = useState('社交媒体')

  const analyze = useMutation({
    mutationFn: async () => {
      if (saveAndAnalyze) {
        // Persist first so the verdict lands on a real row in the console.
        const created = await AiAPI.feedbackCreate({
          content: text,
          source,
          autoAnalyze: false,
        })
        return AiAPI.analyze({ feedbackId: created.id, persist: true })
      }
      return AiAPI.analyze({ content: text })
    },
    onSuccess: (r) => {
      setResult(r)
      qc.invalidateQueries({ queryKey: ['ai-feedback'] })
      qc.invalidateQueries({ queryKey: ['ai-usage'] })
      qc.invalidateQueries({ queryKey: ['ai-alerts'] })
      if (r.alert) toast.warning('已触发高危预警，建议立即人工介入')
      else toast.success('分析完成')
    },
    onError: (e: Error) => toast.error(e.message || '分析失败'),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            快速情感分析
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">输入文本</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="粘贴一条用户评论 / 社群言论，例如：这种服务态度我要曝光，已经向消协举报了"
              rows={5}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch id="save" checked={saveAndAnalyze} onCheckedChange={setSaveAndAnalyze} />
              <label htmlFor="save" className="text-xs text-muted-foreground">
                同时存入舆情库
              </label>
            </div>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => analyze.mutate()}
            disabled={analyze.isPending || !text.trim()}
            className="w-full"
          >
            <Radar className={cn('mr-2 h-4 w-4', analyze.isPending && 'animate-spin')} />
            {analyze.isPending ? '分析中…' : '开始分析'}
          </Button>
          {result && (
            <div className="rounded-lg border border-border/60 p-4 text-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <SentimentBadge sentiment={result.sentiment} />
                <RiskBadge riskLevel={result.riskLevel} />
                {result.alert && (
                  <Badge className="border-0 bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    实时预警
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground">
                  置信度 {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mb-1 text-xs text-muted-foreground">情感得分：{result.score.toFixed(2)}</p>
              {!!result.tags.length && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {result.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[11px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">摘要：{result.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">建议：{result.suggestion}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ------------------------------------------------------------- 小组件

function ChartCard({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-base">{title}</CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-3">{children}</CardContent>
    </Card>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
