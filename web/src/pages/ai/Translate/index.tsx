import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeftRight, Languages, RefreshCw, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GeneratingHint, MockedNotice, ModelWiringBadge } from '../AiCommon'
import { AiAPI, AI_SCENE_LABELS, type AiTranslateResp } from '@/lib/aiApi'
import { cn } from '@/lib/utils'

const TARGETS = [
  { value: 'English', label: 'English 英语' },
  { value: 'Japanese', label: 'Japanese 日语' },
  { value: 'Korean', label: 'Korean 韩语' },
  { value: 'Traditional Chinese', label: '繁體中文 繁体' },
  { value: 'Spanish', label: 'Español 西班牙语' },
  { value: 'French', label: 'Français 法语' },
  { value: 'German', label: 'Deutsch 德语' },
  { value: 'Russian', label: 'Русский 俄语' },
  { value: 'Portuguese', label: 'Português 葡萄牙语' },
  { value: 'Arabic', label: 'العربية 阿拉伯语' },
  { value: 'Thai', label: 'ไทย 泰语' },
  { value: 'Vietnamese', label: 'Tiếng Việt 越南语' },
]

const SCENES = [
  { value: 'general', label: '通用' },
  { value: 'product', label: '商品文案' },
  { value: 'email', label: '邮件' },
  { value: 'news', label: '公告新闻' },
]

/** One-click translation presets that show the module doing real work immediately. */
const SAMPLES = [
  {
    name: '商品文案',
    text: '【新品上市】静音机械键盘，客制化手感，全键热插拔。现在下单立减 100 元，限量 500 份。',
  },
  {
    name: '营销邮件',
    text: '主题：你的购物车还差一步\n\nHi 小明，\n\n上次加购的降噪耳机还没结算哦。今天下单可享 8 折，仅剩最后 3 小时。\n\n点击查看订单',
  },
  {
    name: '服务公告',
    text: '尊敬的用户：\n\n我们将于本周日 02:00-04:00 进行系统升级，期间部分功能可能短暂不可用。给您带来的不便敬请谅解。',
  },
]

export default function TranslatePage() {
  const [text, setText] = useState('')
  const [target, setTarget] = useState('English')
  const [scene, setScene] = useState('general')
  const [terminology, setTerminology] = useState('')
  const [result, setResult] = useState<AiTranslateResp | null>(null)

  const translate = useMutation({
    mutationFn: AiAPI.translate,
    onSuccess: (r) => {
      setResult(r)
      toast.success(`翻译完成 · ${r.chars} 字符 · ${r.totalTokens} tokens`)
    },
    onError: (e: Error) => toast.error(e.message || '翻译失败'),
  })

  function handleTranslate() {
    if (!text.trim()) {
      toast.error('请输入待翻译内容')
      return
    }
    translate.mutate({
      text,
      target,
      source: 'Auto',
      scene,
      terminology: terminology.trim() || undefined,
    })
  }

  function swap() {
    if (result?.translation) {
      setText(result.translation)
      setResult(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">智能翻译</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            多语言一键翻译，自动适配国际化业务；支持场景化语气与术语表强制对照
          </p>
        </div>
        <ModelWiringBadge />
      </div>

      {/* 示例 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">快速示例：</span>
        {SAMPLES.map((s) => (
          <button
            key={s.name}
            onClick={() => {
              setText(s.text)
              setResult(null)
            }}
            className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 源文本 */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                原文
              </span>
              <span className="text-[11px] text-muted-foreground">{text.length} 字符</span>
            </CardTitle>
            <CardDescription>自动识别源语言，支持多段落长文本</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="粘贴或输入待翻译的内容…"
              rows={14}
              className="resize-y leading-relaxed"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">目标语言</label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGETS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">内容场景</label>
                <Select value={scene} onValueChange={setScene}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">术语表（选填）</label>
              <input
                value={terminology}
                onChange={(e) => setTerminology(e.target.value)}
                placeholder="源词=目标词，用逗号分隔，例如：售后=after-sales"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                强制模型使用指定译法，适合品牌名、产品线、专业术语。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 译文 */}
        <Card className="flex flex-col border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                译文
                {result && (
                  <Badge variant="outline" className="ml-1 text-[11px]">
                    {result.target}
                  </Badge>
                )}
              </span>
              {result && (
                <span className="text-[11px] text-muted-foreground">
                  {result.totalTokens} tokens · {result.elapsed}ms
                </span>
              )}
            </CardTitle>
            {result && (
              <CardDescription>
                {result.model} · {result.vendor}
                {result.mocked && ' · 本地兜底引擎'}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {translate.isPending ? (
              <GeneratingHint text="翻译中，长文本会自动分段处理…" />
            ) : result ? (
              <>
                <MockedNotice mocked={result.mocked} />
                <div
                  className={cn(
                    'max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-4',
                    'text-sm leading-relaxed'
                  )}
                >
                  {result.translation}
                </div>
              </>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <ArrowLeftRight className="h-8 w-8 opacity-30" />
                译文会显示在这里
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleTranslate} disabled={translate.isPending}>
          {translate.isPending ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {translate.isPending ? '翻译中…' : `翻译成 ${target.split(' ')[0]}`}
        </Button>
        <Button variant="outline" onClick={swap} disabled={!result}>
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          把译文作为新原文
        </Button>
        <span className="text-xs text-muted-foreground">
          当前场景：{AI_SCENE_LABELS[scene]} · 长文本自动分段，段落间保持上下文衔接
        </span>
      </div>
    </div>
  )
}
