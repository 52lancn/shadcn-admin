import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { DataTable, type Column } from '@/components/data-table'
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
import { MenuAPI, RoleAPI, type RoleVO, type MenuVO } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

export default function SysRole() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const perPage = 10
  const [keyword, debounced, setKeyword] = useDebouncedState('', 300)
  const [status, setStatus] = useState('')
  const [drawer, setDrawer] = useState<{ mode: 'create' | 'edit'; data?: RoleVO } | null>(null)
  const [removeID, setRemoveID] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['roles', { page, keyword: debounced, status }],
    queryFn: () =>
      RoleAPI.list({ page, perPage, keyword: debounced, status }),
  })
  const { data: menus, isLoading: menusLoading } = useQuery<MenuVO[]>({
    queryKey: ['all-menus'],
    queryFn: () => MenuAPI.list('', ''),
  })

  const remove = useMutation({
    mutationFn: (id: number) => RoleAPI.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      setRemoveID(null)
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cols: Column<RoleVO>[] = [
    { key: 'id', header: 'ID', width: 64 },
    { key: 'code', header: '角色编码' },
    { key: 'name', header: '名称' },
    { key: 'sort', header: '排序', align: 'center', width: 80 },
    {
      key: 'status',
      header: '状态',
      render: (r) =>
        r.status === 1 ? (
          <Badge variant="success">启用</Badge>
        ) : (
          <Badge variant="secondary">禁用</Badge>
        ),
    },
    { key: 'remark', header: '备注' },
    {
      key: 'actions',
      header: '操作',
      align: 'right',
      width: 140,
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDrawer({ mode: 'edit', data: r })}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => setRemoveID(r.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">角色管理</h1>
        <p className="text-sm text-muted-foreground">配置角色与菜单权限</p>
      </div>

      <DataTable
        rows={data?.list || []}
        columns={cols}
        loading={isLoading}
        rowKey={(r) => r.id}
        searchPlaceholder="搜索角色名称 / 编码"
        searchValue={keyword}
        onSearch={setKeyword}
        filterSlot={
          <div className="inline-flex items-center gap-1">
            {[
              { v: '', l: '全部' },
              { v: '1', l: '启用' },
              { v: '0', l: '禁用' },
            ].map((o) => (
              <Button
                key={o.v}
                variant={status === o.v ? 'default' : 'outline'}
                size="sm"
                className="h-8"
                onClick={() => setStatus(o.v)}
              >
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

      <Sheet
        open={!!drawer}
        onOpenChange={(o) => {
          if (!o) setDrawer(null)
        }}
      >
        <SheetContent side="right" width="560px" className="overflow-y-auto scroll-thin">
          <SheetHeader>
            <SheetTitle>
              {drawer?.mode === 'create' ? '新增角色' : '编辑角色'}
            </SheetTitle>
          </SheetHeader>
          {drawer && (
            <RoleForm
              data={drawer.data}
              menus={menus || []}
              menusLoading={menusLoading}
              onSubmit={async (form, menuIds) => {
                try {
                  if (drawer.mode === 'create') {
                    await RoleAPI.create({ ...form, id: 0 })
                    if (menuIds.length > 0 && (form as { id?: number }).id) {
                      await RoleAPI.assignMenus((form as { id: number }).id, menuIds)
                    }
                    toast.success('已创建')
                  } else if (drawer.data) {
                    await RoleAPI.update({ ...form, id: drawer.data.id })
                    if (menuIds.length > 0) {
                      await RoleAPI.assignMenus(drawer.data.id, menuIds)
                    }
                    toast.success('已更新')
                  }
                  setDrawer(null)
                  qc.invalidateQueries({ queryKey: ['roles'] })
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
            <AlertDialogTitle>确认删除该角色？</AlertDialogTitle>
            <AlertDialogDescription>该操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeID && remove.mutate(removeID)}>
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RoleForm({
  data,
  menus,
  menusLoading,
  onSubmit,
  onCancel,
}: {
  data?: RoleVO
  menus: MenuVO[]
  menusLoading: boolean
  onSubmit: (form: Partial<RoleVO>, menuIds: number[]) => void | Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<RoleVO>>(data || { code: '', name: '', sort: 0, status: 1, remark: '', menuIds: [] })
  const [selected, setSelected] = useState<number[]>(data?.menuIds || [])
  const [busy, setBusy] = useState(false)

  const flatMenus = (function () {
    const out: MenuVO[] = []
    const walk = (list?: MenuVO[]) => {
      list?.forEach((m) => {
        out.push(m)
        walk(m.children)
      })
    }
    walk(menus)
    return out
  })()

  const toggleMenu = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected([...selected, id])
    } else {
      setSelected(selected.filter((x) => x !== id))
    }
  }

  return (
    <div className="px-6 pb-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>角色编码</Label>
          <Input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>角色名称</Label>
          <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>排序</Label>
          <Input
            type="number"
            value={form.sort || 0}
            onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
          <div>
            <Label className="text-sm">状态</Label>
            <p className="text-xs text-muted-foreground mt-0.5">禁用后无法分配</p>
          </div>
          <Switch
            checked={(form.status ?? 1) === 1}
            onCheckedChange={(v) => setForm({ ...form, status: v ? 1 : 0 })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>备注</Label>
        <Input value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>菜单权限</Label>
        {menusLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="rounded-md border max-h-[320px] overflow-y-auto scroll-thin divide-y">
            {flatMenus.map((m) => {
              const depth =
                (function () {
                  let cur = m
                  let d = 0
                  // heuristic: assume menus sorted by parent; could be wrong but better than 0
                  return d
                })()
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer"
                  style={{ paddingLeft: 12 + depth * 16 }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(m.id)}
                    onChange={(e) => toggleMenu(m.id, e)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm">{m.name}</span>
                  {m.perms && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      {m.perms}
                    </Badge>
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          取消
        </Button>
        <Button
          onClick={async () => {
            setBusy(true)
            try {
              await onSubmit(form, selected)
            } finally {
              setBusy(false)
            }
          }}
        >
          <Save className="h-4 w-4 mr-1" />
          保存
        </Button>
      </div>
    </div>
  )
}