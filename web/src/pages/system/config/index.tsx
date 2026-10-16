import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/data-table'
import { Switch } from '@/components/ui/switch'
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
import { ConfigAPI, type ConfigVO } from '@/lib/api'

export default function SysConfig() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const perPage = 10
  const [keyword, debounced, setKeyword] = useDebouncedState('', 300)
  const [status, setStatus] = useState('')
  const [drawer, setDrawer] = useState<{ mode: 'create' | 'edit'; data?: ConfigVO } | null>(null)
  const [removeID, setRemoveID] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['configs', { page, keyword: debounced, status }],
    queryFn: () => ConfigAPI.list({ page, perPage, keyword: debounced, status }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => ConfigAPI.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      setRemoveID(null)
      qc.invalidateQueries({ queryKey: ['configs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cols: Column<ConfigVO>[] = [
    { key: 'id', header: 'ID', width: 64 },
    { key: 'name', header: '参数名' },
    { key: 'key', header: '参数键', render: (r) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.key}</code> },
    { key: 'value', header: '参数值', render: (r) => <span className="truncate max-w-[280px] inline-block align-middle">{r.value}</span> },
    { key: 'remark', header: '备注', render: (r) => <span className="text-muted-foreground">{r.remark || '-'}</span> },
    {
      key: 'status',
      header: '状态',
      render: (r) => (r.status === 1 ? <Badge variant="success">启用</Badge> : <Badge variant="secondary">禁用</Badge>),
    },
    {
      key: 'actions',
      header: '操作',
      align: 'right',
      width: 140,
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDrawer({ mode: 'edit', data: r })}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setRemoveID(r.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">参数配置</h1>
        <p className="text-sm text-muted-foreground">系统级键值参数</p>
      </div>
      <DataTable
        rows={data?.list || []}
        columns={cols}
        loading={isLoading}
        rowKey={(r) => r.id}
        searchPlaceholder="搜索参数名 / 键"
        searchValue={keyword}
        onSearch={setKeyword}
        filterSlot={
          <div className="inline-flex items-center gap-1">
            {[
              { v: '', l: '全部' },
              { v: '1', l: '启用' },
              { v: '0', l: '禁用' },
            ].map((o) => (
              <Button key={o.v} variant={status === o.v ? 'default' : 'outline'} size="sm" className="h-8" onClick={() => setStatus(o.v)}>
                {o.l}
              </Button>
            ))}
          </div>
        }
        total={data?.total || 0}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        rightSlot={
          <Button size="sm" onClick={() => setDrawer({ mode: 'create' })}>
            <Plus className="h-4 w-4" />
            新增
          </Button>
        }
      />
      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent side="right" width="500px" className="overflow-y-auto scroll-thin">
          <SheetHeader>
            <SheetTitle>{drawer?.mode === 'create' ? '新增参数' : '编辑参数'}</SheetTitle>
          </SheetHeader>
          {drawer && (
            <ConfigForm
              data={drawer.data}
              onSubmit={async (form) => {
                try {
                  if (drawer.mode === 'create') {
                    await ConfigAPI.create({ ...form, id: 0 })
                    toast.success('已创建')
                  } else if (drawer.data) {
                    await ConfigAPI.update({ ...form, id: drawer.data.id })
                    toast.success('已更新')
                  }
                  setDrawer(null)
                  qc.invalidateQueries({ queryKey: ['configs'] })
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
            <AlertDialogTitle>确认删除该参数？</AlertDialogTitle>
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

function ConfigForm({
  data,
  onSubmit,
  onCancel,
}: {
  data?: ConfigVO
  onSubmit: (form: Partial<ConfigVO>) => void | Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<ConfigVO>>(data || { name: '', key: '', value: '', remark: '', status: 1 })
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
        <Label>参数名</Label>
        <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label>参数键</Label>
        <Input value={form.key || ''} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="sys.title" required />
      </div>
      <div className="space-y-1.5">
        <Label>参数值</Label>
        <Input value={form.value || ''} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label>备注</Label>
        <Input value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
      </div>
      <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
        <div>
          <Label className="text-sm">状态</Label>
          <p className="text-xs text-muted-foreground mt-0.5">禁用后业务侧应回退默认值</p>
        </div>
        <Switch checked={(form.status ?? 1) === 1} onCheckedChange={(v) => setForm({ ...form, status: v ? 1 : 0 })} />
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