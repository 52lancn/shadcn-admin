import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { MenuAPI, type MenuVO } from '@/lib/api'

export default function SysMenu() {
  const qc = useQueryClient()
  const [drawer, setDrawer] = useState<{ mode: 'create' | 'edit'; data?: MenuVO; parentID?: number } | null>(null)
  const [removeID, setRemoveID] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: () => MenuAPI.list('', ''),
  })

  const remove = useMutation({
    mutationFn: (id: number) => MenuAPI.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      setRemoveID(null)
      qc.invalidateQueries({ queryKey: ['menus'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">菜单管理</h1>
          <p className="text-sm text-muted-foreground">目录 / 菜单 / 按钮三层结构</p>
        </div>
        <Button size="sm" onClick={() => setDrawer({ mode: 'create', parentID: 0 })}>
          <Plus className="h-4 w-4" />
          新增顶级
        </Button>
      </div>
      <div className="rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">名称</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">路径</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">类型</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">权限标识</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">排序</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">状态</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((m) => (
                <MenuRow key={m.id} m={m} depth={0} onEdit={(d) => setDrawer({ mode: 'edit', data: d })} onAddChild={(pid) => setDrawer({ mode: 'create', parentID: pid })} onRemove={(id) => setRemoveID(id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Sheet
        open={!!drawer}
        onOpenChange={(o) => {
          if (!o) setDrawer(null)
        }}
      >
        <SheetContent side="right" width="500px" className="overflow-y-auto scroll-thin">
          <SheetHeader>
            <SheetTitle>{drawer?.mode === 'create' ? '新增菜单' : '编辑菜单'}</SheetTitle>
          </SheetHeader>
          {drawer && (
            <MenuForm
              data={drawer.data}
              parentID={drawer.parentID}
              onSubmit={async (form) => {
                try {
                  if (drawer.mode === 'create') {
                    await MenuAPI.create({ ...form, id: 0 })
                    toast.success('已创建')
                  } else if (drawer.data) {
                    await MenuAPI.update({ ...form, id: drawer.data.id })
                    toast.success('已更新')
                  }
                  setDrawer(null)
                  qc.invalidateQueries({ queryKey: ['menus'] })
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
            <AlertDialogTitle>确认删除该菜单？</AlertDialogTitle>
            <AlertDialogDescription>
              如果有子菜单也会一并删除。
            </AlertDialogDescription>
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

function MenuRow({
  m,
  depth,
  onEdit,
  onAddChild,
  onRemove,
}: {
  m: MenuVO
  depth: number
  onEdit: (m: MenuVO) => void
  onAddChild: (pid: number) => void
  onRemove: (id: number) => void
}) {
  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/40">
        <td className="px-3 py-2.5">
          <span style={{ display: 'inline-block', width: depth * 18 }} />
          <span className="text-sm font-medium">{m.name}</span>
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">{m.path}</td>
        <td className="px-3 py-2.5">
          <Badge variant={m.type === 1 ? 'default' : m.type === 2 ? 'secondary' : 'outline'}>
            {m.type === 1 ? '目录' : m.type === 2 ? '菜单' : '按钮'}
          </Badge>
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">{m.perms || '-'}</td>
        <td className="px-3 py-2.5 text-muted-foreground text-center">{m.sort}</td>
        <td className="px-3 py-2.5">
          {m.status === 1 ? (
            <Badge variant="success">启用</Badge>
          ) : (
            <Badge variant="secondary">禁用</Badge>
          )}
        </td>
        <td className="px-3 py-2.5 text-right">
          <div className="flex justify-end gap-1">
            {m.type !== 3 && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAddChild(m.id)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(m)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              onClick={() => onRemove(m.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
      {(m.children || []).map((c) => (
        <MenuRow key={c.id} m={c} depth={depth + 1} onEdit={onEdit} onAddChild={onAddChild} onRemove={onRemove} />
      ))}
    </>
  )
}

function MenuForm({
  data,
  parentID,
  onSubmit,
  onCancel,
}: {
  data?: MenuVO
  parentID?: number
  onSubmit: (form: Partial<MenuVO>) => void | Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<MenuVO>>(
    data || {
      parentId: parentID || 0,
      type: 2,
      sort: 0,
      visible: 1,
      status: 1,
      name: '',
      path: '',
      component: '',
      redirect: '',
      icon: '',
      perms: '',
    }
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
        <Label>菜单类型</Label>
        <Select value={String(form.type || 2)} onValueChange={(v) => setForm({ ...form, type: Number(v) })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">目录</SelectItem>
            <SelectItem value="2">菜单</SelectItem>
            <SelectItem value="3">按钮</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>菜单名称</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      {form.type !== 3 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>路由路径</Label>
              <Input value={form.path || ''} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="/system/user" />
            </div>
            <div className="space-y-1.5">
              <Label>组件路径</Label>
              <Input value={form.component || ''} onChange={(e) => setForm({ ...form, component: e.target.value })} placeholder="system/user/index" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>图标 (lucide)</Label>
              <Input value={form.icon || ''} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Users" />
            </div>
            <div className="space-y-1.5">
              <Label>重定向</Label>
              <Input value={form.redirect || ''} onChange={(e) => setForm({ ...form, redirect: e.target.value })} />
            </div>
          </div>
        </>
      )}
      {form.type === 3 && (
        <div className="space-y-1.5">
          <Label>权限标识</Label>
          <Input value={form.perms || ''} onChange={(e) => setForm({ ...form, perms: e.target.value })} placeholder="sys:user:add" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>排序</Label>
          <Input type="number" value={form.sort || 0} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>是否显示</Label>
          <Select value={String(form.visible || 1)} onValueChange={(v) => setForm({ ...form, visible: Number(v) })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">显示</SelectItem>
              <SelectItem value="0">隐藏</SelectItem>
            </SelectContent>
          </Select>
        </div>
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