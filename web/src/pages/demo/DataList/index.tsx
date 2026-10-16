import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Boxes, Layers, Package, Pencil, Plus, Star, Trash2, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useDebouncedState } from '@/hooks/useDebouncedState'
import { ProductAPI, useAuthStore, type ProductVO } from '@/lib/api'
import { ProductForm } from './ProductForm'

type DrawerState = { mode: 'create' | 'edit'; data?: ProductVO } | null

const ALL = '__all__'

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'primary',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  hint?: string
  tone?: 'primary' | 'violet' | 'amber' | 'emerald'
}) {
  const tones: Record<string, string> = {
    primary: 'from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400',
    violet: 'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400',
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
  }
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
            {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DataListPage() {
  const qc = useQueryClient()
  const hasPerm = useAuthStore((s) => s.hasPerm)
  const canAdd = hasPerm('demo:product:add')
  const canEdit = hasPerm('demo:product:edit')
  const canDel = hasPerm('demo:product:del')

  const [keyword, debouncedKeyword, setKeyword] = useDebouncedState('', 300)
  const [page, setPage] = useState(1)
  const [perPage] = useState(10)
  const [category, setCategory] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [sortBy, setSortBy] = useState<string>('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<(string | number)[]>([])
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [confirmID, setConfirmID] = useState<number | null>(null)
  const [confirmBatch, setConfirmBatch] = useState(false)

  const query = {
    page,
    perPage,
    keyword: debouncedKeyword,
    category: category === ALL ? undefined : category,
    status: status === ALL ? undefined : status,
    sortBy,
    order: sortDir,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['demo-products', query],
    queryFn: () => ProductAPI.list(query),
  })
  const { data: stats } = useQuery({
    queryKey: ['demo-product-stats'],
    queryFn: () => ProductAPI.stats(),
  })

  const rows = data?.list ?? []

  const removeOne = useMutation({
    mutationFn: (id: number) => ProductAPI.remove(id),
    onSuccess: () => {
      toast.success('已删除')
      setConfirmID(null)
      qc.invalidateQueries({ queryKey: ['demo-products'] })
      qc.invalidateQueries({ queryKey: ['demo-product-stats'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const removeMany = useMutation({
    mutationFn: (ids: number[]) => ProductAPI.batchDelete(ids),
    onSuccess: () => {
      toast.success(`已批量删除 ${selected.length} 条`)
      setSelected([])
      setConfirmBatch(false)
      qc.invalidateQueries({ queryKey: ['demo-products'] })
      qc.invalidateQueries({ queryKey: ['demo-product-stats'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const columns: Column<ProductVO>[] = [
    {
      key: 'name',
      header: '商品',
      width: '28%',
      render: (r) => (
        <div className="flex items-center gap-3">
          {r.cover ? (
            <img
              src={r.cover}
              alt={r.name}
              className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border"
              loading="lazy"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium leading-tight">{r.name}</p>
            <p className="truncate text-xs text-muted-foreground">{r.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: '品类',
      render: (r) => <Badge variant="secondary">{r.category}</Badge>,
    },
    { key: 'brand', header: '品牌', render: (r) => <span className="text-muted-foreground">{r.brand}</span> },
    {
      key: 'price',
      header: '价格',
      sortable: true,
      align: 'right',
      render: (r) => <span className="tabular-nums font-medium">¥{r.price.toLocaleString()}</span>,
    },
    {
      key: 'stock',
      header: '库存',
      sortable: true,
      align: 'right',
      render: (r) => (
        <span
          className={
            r.stock === 0
              ? 'tabular-nums text-destructive'
              : r.stock < 100
                ? 'tabular-nums text-amber-600 dark:text-amber-400'
                : 'tabular-nums'
          }
        >
          {r.stock}
        </span>
      ),
    },
    {
      key: 'sales',
      header: '销量',
      sortable: true,
      align: 'right',
      render: (r) => <span className="tabular-nums">{r.sales.toLocaleString()}</span>,
    },
    {
      key: 'rating',
      header: '评分',
      sortable: true,
      align: 'right',
      render: (r) => (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {r.rating.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      align: 'center',
      render: (r) =>
        r.status === 1 ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
            在售
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            下架
          </Badge>
        ),
    },
    {
      key: 'actions',
      header: '操作',
      align: 'right',
      width: 110,
      render: (r) => (
        <div className="flex justify-end gap-1">
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDrawer({ mode: 'edit', data: r })}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setConfirmID(r.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  const categories = stats?.categories ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">数据列表</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            列排序、多条件筛选、关键词搜索、批量删除 — 全部走后端分页与排序
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="商品总数"
          value={stats?.total ?? 0}
          hint="demo_product 表"
          tone="primary"
        />
        <StatCard
          icon={Boxes}
          label="库存总量"
          value={(stats?.totalStock ?? 0).toLocaleString()}
          hint="各品类库存合计"
          tone="violet"
        />
        <StatCard
          icon={TrendingUp}
          label="累计销量"
          value={(stats?.totalSales ?? 0).toLocaleString()}
          hint="各品类销量合计"
          tone="emerald"
        />
        <StatCard
          icon={Layers}
          label="覆盖品类"
          value={categories.length}
          hint={categories.slice(0, 3).join(' / ')}
          tone="amber"
        />
      </div>

      <DataTable<ProductVO>
        columns={columns}
        rows={rows}
        loading={isLoading}
        rowKey={(r) => r.id}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        sortField={sortBy}
        sortDir={sortDir}
        onSortChange={(f, d) => {
          setSortBy(f)
          setSortDir(d)
          setPage(1)
        }}
        searchPlaceholder="搜索名称 / 货号 / 品牌"
        searchValue={keyword}
        onSearch={(v) => {
          setKeyword(v)
          setPage(1)
        }}
        filterSlot={
          <div className="flex items-center gap-2">
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部品类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部品类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>全部状态</SelectItem>
                <SelectItem value="1">在售</SelectItem>
                <SelectItem value="0">下架</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        rightSlot={
          <>
            {canDel && selected.length > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setConfirmBatch(true)}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                批量删除 {selected.length}
              </Button>
            )}
            {canAdd && (
              <Button size="sm" onClick={() => setDrawer({ mode: 'create' })}>
                <Plus className="mr-1.5 h-4 w-4" />
                新增商品
              </Button>
            )}
          </>
        }
        total={data?.total ?? 0}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
      />

      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{drawer?.mode === 'edit' ? '编辑商品' : '新增商品'}</SheetTitle>
          </SheetHeader>
          {drawer && (
            <ProductForm
              mode={drawer.mode}
              data={drawer.data}
              categories={categories}
              onCancel={() => setDrawer(null)}
              onSaved={() => {
                setDrawer(null)
                qc.invalidateQueries({ queryKey: ['demo-products'] })
                qc.invalidateQueries({ queryKey: ['demo-product-stats'] })
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
                ? `将删除选中的 ${selected.length} 条商品记录，操作不可撤销。`
                : '该商品记录将被永久删除，操作不可撤销。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmID) removeOne.mutate(confirmID)
                else if (confirmBatch) removeMany.mutate(selected.map(Number))
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
