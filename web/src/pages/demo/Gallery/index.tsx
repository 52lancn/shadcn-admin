import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Grid2x2, Heart, Maximize2, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Lightbox } from '@/components/lightbox'
import { useDebouncedState } from '@/hooks/useDebouncedState'
import { GalleryAPI, useAuthStore, type GalleryVO } from '@/lib/api'
import { cn } from '@/lib/utils'
import { GalleryForm } from './GalleryForm'

type DrawerState = { mode: 'create' | 'edit'; data?: GalleryVO } | null

const ALL = '__all__'

export default function GalleryPage() {
  const qc = useQueryClient()
  const hasPerm = useAuthStore((s) => s.hasPerm)
  const canAdd = hasPerm('demo:gallery:add')
  const canEdit = hasPerm('demo:gallery:edit')
  const canDel = hasPerm('demo:gallery:del')

  const [keyword, debouncedKeyword, setKeyword] = useDebouncedState('', 300)
  const [category, setCategory] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [perPage] = useState(12)
  const [selected, setSelected] = useState<number[]>([])
  const [viewer, setViewer] = useState<{ index: number } | null>(null)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [confirmID, setConfirmID] = useState<number | null>(null)
  const [confirmBatch, setConfirmBatch] = useState(false)

  const query = {
    page,
    perPage,
    keyword: debouncedKeyword,
    category: category === ALL ? undefined : category,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['demo-gallery', query],
    queryFn: () => GalleryAPI.list(query),
  })
  const { data: facets } = useQuery({
    queryKey: ['demo-gallery-categories'],
    queryFn: () => GalleryAPI.categories(),
  })

  const rows = data?.list ?? []
  const lightboxItems = useMemo(
    () =>
      rows.map((r) => ({
        url: r.url,
        title: r.title,
        description: r.description,
        likes: r.likes,
      })),
    [rows]
  )

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['demo-gallery'] })
    qc.invalidateQueries({ queryKey: ['demo-gallery-categories'] })
  }

  const removeOne = useMutation({
    mutationFn: (id: number) => GalleryAPI.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      setConfirmID(null)
      setSelected((s) => s.filter((x) => x !== confirmID))
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const removeMany = useMutation({
    mutationFn: (ids: number[]) => GalleryAPI.batchDelete(ids),
    onSuccess: () => {
      toast.success(`已批量删除 ${selected.length} 张`)
      setSelected([])
      setConfirmBatch(false)
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleSelect = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const tabs = [
    { key: ALL, label: '全部', count: facets?.reduce((a, b) => a + b.cnt, 0) },
    ...(facets ?? []).map((f) => ({ key: f.name, label: f.name, count: f.cnt })),
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">图片画廊</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            瀑布流布局，点击任意图片进入大图预览（支持键盘切换与缩放）
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canDel && selected.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmBatch(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              批量删除 {selected.length}
            </Button>
          )}
          {canAdd && (
            <Button size="sm" onClick={() => setDrawer({ mode: 'create' })}>
              <Plus className="mr-1.5 h-4 w-4" />
              新增图片
            </Button>
          )}
        </div>
      </div>

      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64 max-w-full">
          <Input
            placeholder="搜索标题 / 描述"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setCategory(t.key)
                setPage(1)
              }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                category === t.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn('ml-1.5 tabular-nums', category === t.key ? 'opacity-80' : 'opacity-60')}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* masonry */}
      {isLoading ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="mb-4 break-inside-avoid">
              <Skeleton className="h-52 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-muted-foreground">
          <Grid2x2 className="h-8 w-8 opacity-50" />
          <p className="text-sm">没有匹配的图片</p>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {rows.map((r, i) => {
            const checked = selected.includes(r.id)
            return (
              <div
                key={r.id}
                className={cn(
                  'group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-card transition-all',
                  checked ? 'ring-2 ring-primary' : 'hover:border-primary/40'
                )}
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => setViewer({ index: i })}
                >
                  <div className="relative overflow-hidden bg-muted">
                    <img
                      src={r.thumb || r.url}
                      alt={r.title}
                      loading="lazy"
                      className="w-full transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
                      <Maximize2 className="h-7 w-7 text-white drop-shadow" />
                    </div>
                  </div>
                </button>

                {/* overlay actions */}
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {canDel && (
                    <div className="pointer-events-auto rounded-md bg-background/85 p-1 backdrop-blur">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSelect(r.id)}
                        aria-label="选择"
                      />
                    </div>
                  )}
                  <div className="pointer-events-auto flex gap-1">
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 rounded-md bg-background/85 backdrop-blur"
                        onClick={() => setDrawer({ mode: 'edit', data: r })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDel && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 rounded-md bg-background/85 text-destructive backdrop-blur"
                        onClick={() => setConfirmID(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.category} · {r.width}×{r.height}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    <Heart className="h-3.5 w-3.5 fill-rose-500/70 text-rose-500/70" />
                    {r.likes.toLocaleString()}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* pagination */}
      {!!data?.total && (
        <div className="flex items-center justify-between border-t pt-4 text-sm">
          <span className="text-muted-foreground">
            共 {data.total} 张，第 {page} / {Math.max(1, Math.ceil(data.total / perPage))} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(data.total / perPage)}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      <Lightbox
        items={lightboxItems}
        index={viewer?.index ?? 0}
        open={!!viewer}
        onOpenChange={(o) => !o && setViewer(null)}
        onIndexChange={(i) => setViewer({ index: i })}
      />

      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{drawer?.mode === 'edit' ? '编辑图片' : '新增图片'}</SheetTitle>
          </SheetHeader>
          {drawer && (
            <GalleryForm
              mode={drawer.mode}
              data={drawer.data}
              categories={(facets ?? []).map((f) => f.name)}
              onCancel={() => setDrawer(null)}
              onSaved={() => {
                setDrawer(null)
                invalidate()
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!confirmID || confirmBatch}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmID(null)
            setConfirmBatch(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBatch
                ? `将删除选中的 ${selected.length} 张图片，操作不可撤销。`
                : '该图片记录将被永久删除，操作不可撤销。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmID) removeOne.mutate(confirmID)
                else if (confirmBatch) removeMany.mutate(selected)
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
