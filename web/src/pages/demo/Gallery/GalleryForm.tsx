import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GalleryAPI, type GalleryVO } from '@/lib/api'

interface Props {
  mode: 'create' | 'edit'
  data?: GalleryVO
  categories: string[]
  onCancel: () => void
  onSaved: () => void
}

const PRESETS = [
  '/gallery/nature-1.svg',
  '/gallery/nature-2.svg',
  '/gallery/city-1.svg',
  '/gallery/city-2.svg',
  '/gallery/tech-1.svg',
  '/gallery/tech-2.svg',
  '/gallery/abstract-1.svg',
  '/gallery/abstract-2.svg',
]

const blank = {
  title: '',
  category: '',
  url: '',
  thumb: '',
  width: 1200,
  height: 800,
  likes: 0,
  description: '',
  status: 1,
}

export function GalleryForm({ mode, data, categories, onCancel, onSaved }: Props) {
  const [form, setForm] = useState({ ...blank })

  useEffect(() => {
    if (mode === 'edit' && data) {
      setForm({
        title: data.title,
        category: data.category,
        url: data.url,
        thumb: data.thumb,
        width: data.width,
        height: data.height,
        likes: data.likes,
        description: data.description,
        status: data.status,
      })
    } else {
      setForm({ ...blank, category: categories[0] ?? '' })
    }
  }, [mode, data, categories])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        thumb: form.thumb || form.url,
        category: form.category || '未分类',
      }
      if (mode === 'create') return GalleryAPI.create(payload)
      return GalleryAPI.update({ ...payload, id: data!.id })
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? '已创建' : '已更新')
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }))

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <div className="space-y-2">
        <Label>标题 *</Label>
        <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>分类</Label>
        <Select value={form.category} onValueChange={(v) => set('category', v)}>
          <SelectTrigger>
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>图片地址 *</Label>
        <Input
          value={form.url}
          onChange={(e) => set('url', e.target.value)}
          placeholder="/gallery/nature-1.svg"
        />
        <div className="grid grid-cols-4 gap-2 pt-1">
          {PRESETS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                set('url', u)
                set('thumb', u)
              }}
              className={`overflow-hidden rounded-lg ring-2 transition-all ${
                form.url === u ? 'ring-primary' : 'ring-border hover:ring-primary/50'
              }`}
            >
              <img src={u} alt="" className="aspect-[4/3] w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>宽度</Label>
          <Input
            type="number"
            value={form.width}
            onChange={(e) => set('width', Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>高度</Label>
          <Input
            type="number"
            value={form.height}
            onChange={(e) => set('height', Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>点赞</Label>
          <Input
            type="number"
            value={form.likes}
            onChange={(e) => set('likes', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>描述</Label>
        <Input
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="一句话描述这张图"
        />
      </div>

      {form.url && (
        <div className="overflow-hidden rounded-lg border">
          <img src={form.url} alt="" className="max-h-48 w-full object-cover" />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          保存
        </Button>
      </div>
    </form>
  )
}
