import { AlertTriangle, Cpu, Loader2, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { AiAPI, AI_SENTIMENT_LABELS, type AiSentiment } from '@/lib/aiApi'

/** ModelWiringBadge shows whether a real vendor is wired up or the local fallback is active. */
export function ModelWiringBadge({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery({ queryKey: ['ai-status'], queryFn: AiAPI.status, staleTime: 60_000 })

  if (isLoading) return <Skeleton className="h-6 w-28" />

  if (!data) return null

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={data.enabled ? 'default' : 'outline'}
        className={cn(
          'gap-1.5',
          data.enabled
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'border-amber-500/40 text-amber-600 dark:text-amber-400'
        )}
        title={data.hint}
      >
        {data.enabled ? <Cpu className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        {data.enabled ? data.model : '本地兜底引擎'}
      </Badge>
      {!compact && data.enabled && (
        <span className="hidden text-xs text-muted-foreground sm:inline">{data.vendor}</span>
      )}
      {!compact && !data.enabled && (
        <span className="hidden text-xs text-muted-foreground sm:inline" title={data.hint}>
          未配置 API Key · 功能可用
        </span>
      )}
    </div>
  )
}

/** MockedNotice is the banner shown above generated content produced by the local engine. */
export function MockedNotice({ mocked }: { mocked: boolean }) {
  if (!mocked) return null
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        当前由<b>本地兜底引擎</b>生成（未配置 API Key）。在
        <code className="mx-1 rounded bg-amber-500/10 px-1">server/cmd/api/etc/admin-api.yaml</code>
        的 <code className="rounded bg-amber-500/10 px-1">AI</code> 段填入 BaseURL / APIKey / Model
        即可切换到 DeepSeek、通义千问、Kimi、GLM、Ollama 等任意 OpenAI 兼容模型。
      </span>
    </div>
  )
}

/** GeneratingHint is the inline loader shown while waiting on the model. */
export function GeneratingHint({ text = '模型生成中，通常 3-15 秒…' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  )
}

const SENTIMENT_STYLE: Record<AiSentiment, string> = {
  positive: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  negative: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  neutral: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
}

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const key = (sentiment || 'neutral') as AiSentiment
  return (
    <Badge className={cn('border-0', SENTIMENT_STYLE[key] ?? SENTIMENT_STYLE.neutral)}>
      {AI_SENTIMENT_LABELS[key] ?? sentiment ?? '未分析'}
    </Badge>
  )
}

const RISK_STYLE: Record<string, string> = {
  low: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
  medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  high: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
}

export function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const style = RISK_STYLE[riskLevel] ?? RISK_STYLE.low
  return (
    <Badge className={cn('border-0', style)}>
      {riskLevel === 'high' && <AlertTriangle className="mr-1 h-3 w-3" />}
      {riskLevel === 'high' ? '高危' : riskLevel === 'medium' ? '中风险' : '低风险'}
    </Badge>
  )
}

/** StatCard is the small KPI tile used across the AI pages. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'primary',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  hint?: string
  tone?: 'primary' | 'violet' | 'amber' | 'emerald' | 'rose'
}) {
  const tones: Record<string, string> = {
    primary: 'from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400',
    violet: 'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    rose: 'from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400',
  }
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]}`}>
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

/** CopyButton copies text to the clipboard with transient feedback. */
export function CopyButton({ text, label = '复制' }: { text: string; label?: string }) {
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text)
      }}
      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {label}
    </button>
  )
}

/** EmptyHint is a friendly placeholder for panels with no data yet. */
export function EmptyHint({ text = '暂无数据' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Sparkles className="h-6 w-6 opacity-40" />
      {text}
    </div>
  )
}
