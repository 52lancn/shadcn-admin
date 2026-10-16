import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { useDebouncedState } from '@/hooks/useDebouncedState'
import { DictAPI, DictItemAPI, type DictVO, type DictItemVO } from '@/lib/api'

export default function SysDict() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const perPage = 10
  const [keyword, debounced, setKeyword] = useDebouncedState('', 300)
  const [drawer, setDrawer] = useState<{ mode: 'create' | 'edit'; data?: DictVO } | null>(null)
  const [removeID, setRemoveID] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['dicts', { page, keyword: debounced }],
    queryFn: () => DictAPI.list({ page, perPage, keyword: debounced }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => DictAPI.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      setRemoveID(null)
      qc.invalidateQueries({ queryKey: ['dicts'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">字典管理</h1>
        <p className="text-sm text-muted-foreground">枚举值集中维护</p>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 border-b">
          <div className="relative w-64 max-w-full">
            <Input
              placeholder="搜索字典名称 / 编码"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <Button size="sm" className="ml-auto" onClick={() => setDrawer({ mode: 'create' })}>
            <Plus className="h-4 w-4" />
            新增字典
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="w-10 px-3 py-2.5" />
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">字典名称</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">编码</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">状态</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">备注</th>
              <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            ) : (data?.list || []).length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  暂无数据
                </td>
              </tr>
            ) : (
              (data?.list || []).map((d) => (
                <DictRow
                  key={d.id}
                  d={d}
                  expanded={expanded === d.id}
                  onToggle={() => setExpanded(expanded === d.id ? null : d.id)}
                  onEdit={() => setDrawer({ mode: 'edit', data: d })}
                  onRemove={() => setRemoveID(d.id)}
                />
              ))
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t text-sm">
          <span className="text-muted-foreground">
            共 {data?.total || 0} 条，每页 {perPage} 条
          </span>
        </div>
      </div>

      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent side="right" width="460px" className="overflow-y-auto scroll-thin">
          <SheetHeader>
            <SheetTitle>{drawer?.mode === 'create' ? '新增字典' : '编辑字典'}</SheetTitle>
          </SheetHeader>
          {drawer && (
            <DictForm
              data={drawer.data}
              onSubmit={async (form) => {
                try {
                  if (drawer.mode === 'create') {
                    await DictAPI.create({ ...form, id: 0 })
                    toast.success('已创建')
                  } else if (drawer.data) {
                    await DictAPI.update({ ...form, id: drawer.data.id })
                    toast.success('已更新')
                  }
                  setDrawer(null)
                  qc.invalidateQueries({ queryKey: ['dicts'] })
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : '提交失败')
                }
              }}
              onCancel={() => setDrawer(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={removeID !== null} onOpenChange={(o) => !o && setRemoveID(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该字典？</AlertDialogTitle>
            <AlertDialogDescription>字典项也会一并删除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeID && remove.mutate(removeID)}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DictRow({
  d,
  expanded,
  onToggle,
  onEdit,
  onRemove,
}: {
  d: DictVO
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/40">
        <td className="px-3 py-2.5 text-center">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
            <ChevronRight className={'h-3.5 w-3.5 transition-transform ' + (expanded ? 'rotate-90' : '')} />
          </Button>
        </td>
        <td className="px-3 py-2.5 font-medium">{d.name}</td>
        <td className="px-3 py-2.5">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{d.code}</code>
        </td>
        <td className="px-3 py-2.5">
          {d.status === 1 ? <Badge variant="success">启用</Badge> : <Badge variant="secondary">禁用</Badge>}
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">{d.remark || '-'}</td>
        <td className="px-3 py-2.5 text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/10">
          <td colSpan={6} className="p-3">
            <DictItems dictID={d.id} />
          </td>
        </tr>
      )}
    </>
  )
}

function DictItems({ dictID }: { dictID: number }) {
  const qc = useQueryClient()
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; data?: DictItemVO } | null>(null)
  const [removeID, setRemoveID] = useState<number | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['dict-items', dictID],
    queryFn: () => DictItemAPI.list(dictID),
  })
  const remove = useMutation({
    mutationFn: (id: number) => DictItemAPI.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      setRemoveID(null)
      qc.invalidateQueries({ queryKey: ['dict-items', dictID] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">字典项</span>
        <Button size="sm" className="h-7" onClick={() => setDialog({ mode: 'create' })}>
          <Plus className="h-3.5 w-3.5" />
          新增项
        </Button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">标签</th>
            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">值</th>
            <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">排序</th>
            <th className="text-center px-3 py-1.5 font-medium text-muted-foreground">状态</th>
            <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">操作</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-muted-foreground">加载中...</td>
            </tr>
          ) : (data || []).length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-muted-foreground">暂无项</td>
            </tr>
          ) : (
            (data || []).map((it) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="px-3 py-1.5">{it.label}</td>
                <td className="px-3 py-1.5">
                  <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{it.value}</code>
                </td>
                <td className="px-3 py-1.5 text-center">{it.sort}</td>
                <td className="px-3 py-1.5 text-center">
                  {it.status === 1 ? (
                    <Badge variant="success" className="text-[10px]">启用</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">禁用</Badge>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDialog({ mode: 'edit', data: it })}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setRemoveID(it.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {dialog && (
        <Sheet open onOpenChange={() => setDialog(null)}>
          <SheetContent side="right" width="400px">
            <SheetHeader>
              <SheetTitle>{dialog.mode === 'create' ? '新增字典项' : '编辑字典项'}</SheetTitle>
            </SheetHeader>
            <DictItemForm
              data={dialog.data}
              dictID={dictID}
              onSubmit={async (form) => {
                try {
                  await DictItemAPI.save({ ...form, dictId: dictID })
                  toast.success('已保存')
                  setDialog(null)
                  qc.invalidateQueries({ queryKey: ['dict-items', dictID] })
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : '提交失败')
                }
              }}
              onCancel={() => setDialog(null)}
            />
          </SheetContent>
        </Sheet>
      )}

      <AlertDialog open={removeID !== null} onOpenChange={(o) => !o && setRemoveID(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除该字典项？</AlertDialogTitle>
            <AlertDialogDescription>该操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeID && remove.mutate(removeID)}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DictForm({
  data,
  onSubmit,
  onCancel,
}: {
  data?: DictVO
  onSubmit: (form: Partial<DictVO>) => void | Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<DictVO>>(data || { name: '', code: '', status: 1, remark: '' })
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="px-6 pb-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await onSubmit(form)
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="space-y-1.5">
        <Label>字典名称</Label>
        <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label>字典编码</Label>
        <Input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label>备注</Label>
        <Input value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          取消
        </Button>
        <Button type="submit" disabled={busy}>
          保存
        </Button>
      </div>
    </form>
  )
}

function DictItemForm({
  data,
  dictID,
  onSubmit,
  onCancel,
}: {
  data?: DictItemVO
  dictID: number
  onSubmit: (form: Partial<DictItemVO>) => void | Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<DictItemVO>>(
    data || { label: '', value: '', sort: 0, status: 1, dictId: dictID }
  )
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="px-6 pb-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await onSubmit(form)
        } finally {
          setBusy(false)
        }
      }}
    >
      <div className="space-y-1.5">
        <Label>标签</Label>
        <Input value={form.label || ''} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label>值</Label>
        <Input value={form.value || ''} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label>排序</Label>
        <Input type="number" value={form.sort || 0} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          取消
        </Button>
        <Button type="submit" disabled={busy}>
          保存
        </Button>
      </div>
    </form>
  )
}