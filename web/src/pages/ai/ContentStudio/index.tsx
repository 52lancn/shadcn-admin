import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Copy,
  FileText,
  Mail,
  Megaphone,
  Package,
  PenLine,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { CopyButton, GeneratingHint, MockedNotice, ModelWiringBadge } from '../AiCommon'
import { AiAPI, AI_SCENE_LABELS, type AiGenerateResp } from '@/lib/aiApi'
import { cn } from '@/lib/utils'

const TASKS = [
  { value: 'generate', label: '一键生成', hint: '按主题直接产出成品', icon: Sparkles },
  { value: 'polish', label: '润色', hint: '保留原意，去冗余', icon: Wand2 },
  { value: 'expand', label: '扩写', hint: '补充细节与场景', icon: PenLine },
  { value: 'continue', label: '续写', hint: '承接原文继续写', icon: FileText },
] as const

const SCENES = [
  { value: 'product', label: '商品文案', icon: Package },
  { value: 'email', label: '营销邮件', icon: Mail },
  { value: 'news', label: '新闻公告', icon: Megaphone },
  { value: 'general', label: '通用写作', icon: FileText },
] as const

const TONES = [
  { value: 'professional', label: '专业严谨' },
  { value: 'friendly', label: '亲切自然' },
  { value: 'energetic', label: '有感染力' },
  { value: 'concise', label: '极简克制' },
  { value: 'formal', label: '正式书面' },
]

const LENGTHS = [
  { value: 'short', label: '短 (100字内)' },
  { value: 'medium', label: '中 (200-300字)' },
  { value: 'long', label: '长 (500字+)' },
]

const PLACEHOLDERS: Record<string, string> = {
  generate: '例如：为一款售价 299 元的静音机械键盘写商品详情页文案，主打「办公室友好」与「免工具换轴」',
  polish: '粘贴需要润色的原文…',
  expand: '粘贴需要扩写的原文…',
  continue: '粘贴需要续写的原文…',
}

export default function ContentStudioPage() {
  const [task, setTask] = useState<string>('generate')
  const [scene, setScene] = useState<string>('product')
  const [tone, setTone] = useState<string>('professional')
  const [length, setLength] = useState<string>('medium')
  const [audience, setAudience] = useState<string>('')
  const [prompt, setPrompt] = useState<string>('')
  const [result, setResult] = useState<AiGenerateResp | null>(null)
  const [presetId, setPresetId] = useState<number | undefined>(undefined)

  // Templates are scoped to the selected scene so the suggestions stay relevant.
  const { data: presets } = useQuery({
    queryKey: ['ai-presets', scene],
    queryFn: () => AiAPI.presets(scene),
  })

  const generate = useMutation({
    mutationFn: AiAPI.generate,
    onSuccess: (r) => {
      setResult(r)
      toast.success(`生成完成 · ${r.totalTokens} tokens · ${r.elapsed}ms`)
    },
    onError: (e: Error) => toast.error(e.message || '生成失败'),
  })

  const activeSceneMeta = useMemo(() => SCENES.find((s) => s.value === scene), [scene])
  const needsSource = task === 'polish' || task === 'expand' || task === 'continue'

  function handleGenerate() {
    if (!prompt.trim()) {
      toast.error('请先填写内容要求')
      return
    }
    generate.mutate({
      task: task as 'generate' | 'polish' | 'expand' | 'continue',
      scene: scene as 'general' | 'product' | 'email' | 'news',
      prompt,
      presetId,
      tone,
      audience: audience.trim() || undefined,
      length,
    })
  }

  function applyPreset(id: number) {
    const p = presets?.find((x) => x.id === id)
    if (!p) return
    setPresetId(id)
    // Fill the {{product}}/{{content}} placeholders so the operator can run it immediately.
    let t = p.template
      .replace(/\{\{\s*product\s*\}\}/g, '（商品/主题名称）')
      .replace(/\{\{\s*benefit\s*\}\}/g, '（核心利益点）')
      .replace(/\{\{\s*content\s*\}\}/g, prompt.trim() || '（粘贴原文）')
    setPrompt(t)
    if (p.scene !== 'general') setScene(p.scene)
    // Templates for polish/expand/continue imply the matching task.
    if (['polish', 'expand', 'continue'].includes(p.name.replace('通用', ''))) {
      // no-op: task stays as-is, the user can still override
    }
    toast.success(`已套用模板「${p.name}」`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI 内容生成</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AIGC 一键生成商品文案 / 营销邮件 / 新闻公告，并支持润色、扩写、续写
          </p>
        </div>
        <ModelWiringBadge />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ---------------- 左：输入区 ---------------- */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="h-4 w-4 text-muted-foreground" />
              输入
            </CardTitle>
            <CardDescription>选择能力与场景，然后描述你的需求</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 能力 */}
            <div className="space-y-1.5">
              <Label>生成能力</Label>
              <div className="grid grid-cols-4 gap-2">
                {TASKS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTask(t.value)}
                    title={t.hint}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors',
                      task === t.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 场景 */}
            <div className="space-y-1.5">
              <Label>内容场景</Label>
              <div className="grid grid-cols-4 gap-2">
                {SCENES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setScene(s.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors',
                      scene === s.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <s.icon className="h-4 w-4" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 模板 */}
            {!!presets?.length && (
              <div className="space-y-1.5">
                <Label>场景模板</Label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p.id)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs transition-colors',
                        presetId === p.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 提示词 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{needsSource ? '原文内容' : '生成要求'}</Label>
                <span className="text-[11px] text-muted-foreground">{prompt.length} 字</span>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={PLACEHOLDERS[task]}
                rows={7}
                className="resize-y font-normal leading-relaxed"
              />
            </div>

            {/* 参数 */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>语气</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>篇幅</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTHS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>目标受众</Label>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="选填，如：年轻职场人"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button onClick={handleGenerate} disabled={generate.isPending} className="flex-1">
                {generate.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {generate.isPending ? '生成中…' : `生成${AI_SCENE_LABELS[scene] ?? ''}`}
              </Button>
              {result && (
                <Button variant="outline" size="icon" title="清空结果" onClick={() => setResult(null)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ---------------- 右：输出区 ---------------- */}
        <Card className="flex flex-col border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                生成结果
              </span>
              {result && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[11px]">
                    {result.totalTokens} tokens · {result.elapsed}ms
                  </Badge>
                  <CopyButton text={result.content} />
                </div>
              )}
            </CardTitle>
            {result && (
              <CardDescription>
                {result.model} · {result.vendor}
                {result.mocked && ' · 本地兜底引擎'}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {generate.isPending ? (
              <GeneratingHint />
            ) : result ? (
              <div className="space-y-3">
                <MockedNotice mocked={result.mocked} />
                <div className="whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed">
                  {result.content}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <Copy className="h-8 w-8 opacity-30" />
                左侧填写需求后点击「生成」，结果会显示在这里
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/** Local label component (the project has one, but keep this page self-contained). */
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn('text-xs font-medium text-foreground', className)}>{children}</label>
}
