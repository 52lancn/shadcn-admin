import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/data-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { useState } from 'react'
import { useDebouncedState } from '@/hooks/useDebouncedState'
import { UserAPI, type UserVO } from '@/lib/api'
import { UserForm } from './UserForm'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export default function SysUser() {
  return <UserList />
}

function UserList() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const perPage = 10
  const [keyword, debouncedKeyword, setKeyword] = useDebouncedState('', 300)
  const [status, setStatus] = useState<string>('')
  const [selected, setSelected] = useState<Array<string | number>>([])
  const [drawer, setDrawer] = useState<{ mode: 'create' | 'edit'; data?: UserVO } | null>(null)
  const [confirmedID, setConfirmedID] = useState<number | null>(null)
  const [confirmBatch, setConfirmBatch] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, keyword: debouncedKeyword, status }],
    queryFn: () => UserAPI.list({ page, perPage, keyword: debouncedKeyword, status }),
  })

  const removeSingle = useMutation({
    mutationFn: (id: number) => UserAPI.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      setConfirmedID(null)
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const batchRemove = useMutation({
    mutationFn: (ids: Array<string | number>) => UserAPI.batchDelete(ids.map((id) => Number(id))),
    onSuccess: () => {
      toast.success('已批量删除')
      setSelected([])
      setConfirmBatch(false)
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cols: Column<UserVO>[] = [
    { key: 'id', header: 'ID', width: 64, sortable: true },
    { key: 'username', header: '账号', sortable: true },
    { key: 'nickname', header: '昵称' },
    {
      key: 'gender',
      header: '性别',
      render: (r) => (r.gender === 1 ? '男' : r.gender === 2 ? '女' : '未知'),
    },
    { key: 'email', header: '邮箱' },
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
    { key: 'createdAt', header: '创建时间' },
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
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setConfirmedID(r.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">用户管理</h1>
          <p className="text-sm text-muted-foreground">管理系统用户、角色与状态</p>
        </div>
      </div>

      <DataTable
        rows={data?.list || []}
        columns={cols}
        loading={isLoading}
        rowKey={(r) => r.id}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        searchPlaceholder="搜索账号 / 昵称 / 邮箱"
        searchValue={keyword}
        onSearch={setKeyword}
        filterSlot={
          <StatusInlineFilter value={status} onChange={setStatus} />
        }
        total={data?.total || 0}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        rightSlot={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmBatch(true)}
              disabled={selected.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              批量删除
            </Button>
            <Button
              size="sm"
              onClick={() => setDrawer({ mode: 'create' })}
            >
              <Plus className="h-4 w-4" />
              新增
            </Button>
          </>
        }
      />

      <Sheet
        open={!!drawer}
        onOpenChange={(o) => {
          if (!o) setDrawer(null)
        }}
      >
        <SheetContent
          side="right"
          width="500px"
          className="overflow-y-auto scroll-thin"
        >
          <SheetHeader>
            <SheetTitle>
              {drawer?.mode === 'create' ? '新增用户' : '编辑用户'}
            </SheetTitle>
          </SheetHeader>
          <UserForm
            data={drawer?.data}
            onSubmit={async (form) => {
              try {
                if (drawer?.mode === 'create') {
                  await UserAPI.create({ ...form, id: 0 })
                  toast.success('已创建')
                } else if (drawer?.data) {
                  await UserAPI.update({ ...form, id: drawer.data.id })
                  toast.success('已更新')
                }
                setDrawer(null)
                qc.invalidateQueries({ queryKey: ['users'] })
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : '提交失败')
              }
            }}
            onCancel={() => setDrawer(null)}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirmedID !== null || confirmBatch}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmedID(null)
            setConfirmBatch(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              该操作不可恢复。删除后用户将无法登录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmedID) {
                  removeSingle.mutate(confirmedID)
                  setConfirmedID(null)
                } else if (confirmBatch) {
                  batchRemove.mutate(selected)
                }
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatusInlineFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const options = [
    { value: '', label: '全部' },
    { value: '1', label: '启用' },
    { value: '0', label: '禁用' },
  ]
  return (
    <div className="inline-flex items-center gap-1">
      {options.map((o) => (
        <Button
          key={o.value}
          variant={value === o.value ? 'default' : 'outline'}
          size="sm"
          className="h-8"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}