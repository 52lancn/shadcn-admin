import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductAPI, type ProductVO } from '@/lib/api'

interface Props {
  mode: 'create' | 'edit'
  data?: ProductVO
  categories: string[]
  onCancel: () => void
  onSaved: () => void
}

const blank = {
  name: '',
  sku: '',
  category: '',
  brand: '',
  price: 99,
  stock: 100,
  sales: 0,
  rating: 4.5,
  status: 1,
  cover: '',
  tags: '',
}

export function ProductForm({ mode, data, categories, onCancel, onSaved }: Props) {
  const [form, setForm] = useState({ ...blank })
  const [coverPreview, setCoverPreview] = useState('')

  useEffect(() => {
    if (mode === 'edit' && data) {
      setForm({
        name: data.name,
        sku: data.sku,
        category: data.category,
        brand: data.brand,
        price: data.price,
        stock: data.stock,
        sales: data.sales,
        rating: data.rating,
        status: data.status,
        cover: data.cover,
        tags: data.tags,
      })
      setCoverPreview(data.cover)
    } else {
      setForm({ ...blank })
      setCoverPreview('')
    }
  }, [mode, data])

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, category: form.category || categories[0] || '未分类' }
      if (mode === 'create') return ProductAPI.create(payload)
      return ProductAPI.update({ ...payload, id: data!.id })
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? '已创建' : '已更新')
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }))

  const pickCover = (url: string) => {
    set('cover', url)
    setCoverPreview(url)
  }

  const presetCovers = [
    '/gallery/tech-1.svg',
    '/gallery/abstract-1.svg',
    '/gallery/nature-1.svg',
    '/gallery/city-1.svg',
  ]

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <div className="space-y-2">
        <Label>商品名称 *</Label>
        <Input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="例如：云枢 降噪耳机"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>货号 *</Label>
          <Input
            value={form.sku}
            onChange={(e) => set('sku', e.target.value)}
            placeholder="SKU-XXXX-0001"
          />
        </div>
        <div className="space-y-2">
          <Label>品牌</Label>
          <Input value={form.brand} onChange={(e) => set('brand', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>品类</Label>
        <Select value={form.category} onValueChange={(v) => set('category', v)}>
          <SelectTrigger>
            <SelectValue placeholder="选择品类" />
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>价格（¥）</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) => set('price', Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>库存</Label>
          <Input
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) => set('stock', Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>销量</Label>
          <Input
            type="number"
            min={0}
            value={form.sales}
            onChange={(e) => set('sales', Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>评分（0-5）</Label>
          <Input
            type="number"
            min={0}
            max={5}
            step="0.1"
            value={form.rating}
            onChange={(e) => set('rating', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>标签（用、分隔）</Label>
        <Input
          value={form.tags}
          onChange={(e) => set('tags', e.target.value)}
          placeholder="热销、包邮"
        />
      </div>

      <div className="space-y-2">
        <Label>封面图</Label>
        <Input
          value={form.cover}
          onChange={(e) => pickCover(e.target.value)}
          placeholder="/gallery/tech-1.svg"
        />
        <div className="flex items-center gap-2 pt-1">
          {presetCovers.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => pickCover(u)}
              className={`h-12 w-12 overflow-hidden rounded-lg ring-2 transition-all ${
                form.cover === u ? 'ring-primary' : 'ring-border hover:ring-primary/50'
              }`}
            >
              <img src={u} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          {coverPreview && (
            <div className="ml-auto h-12 w-12 overflow-hidden rounded-lg ring-1 ring-border">
              <img src={coverPreview} alt="" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">上架状态</p>
          <p className="text-xs text-muted-foreground">关闭后商品在列表中标记为下架</p>
        </div>
        <Switch
          checked={form.status === 1}
          onCheckedChange={(v) => set('status', v ? 1 : 0)}
        />
      </div>

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
