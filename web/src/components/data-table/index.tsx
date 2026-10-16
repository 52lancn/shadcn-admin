import * as React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  rowKey: (row: T, idx: number) => string | number
  selectable?: boolean
  selectedKeys?: (string | number)[]
  onSelectionChange?: (keys: (string | number)[]) => void
  sortField?: string
  sortDir?: 'asc' | 'desc'
  onSortChange?: (field: string, dir: 'asc' | 'desc') => void
  searchPlaceholder?: string
  searchValue?: string
  onSearch?: (v: string) => void
  filterSlot?: React.ReactNode
  total?: number
  page?: number
  perPage?: number
  onPageChange?: (page: number) => void
  rightSlot?: React.ReactNode
  emptySlot?: React.ReactNode
}

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    columns,
    rows,
    loading,
    rowKey,
    selectable,
    selectedKeys = [],
    onSelectionChange,
    sortField,
    sortDir,
    onSortChange,
    searchPlaceholder,
    searchValue,
    onSearch,
    filterSlot,
    total = 0,
    page = 1,
    perPage = 10,
    onPageChange,
    rightSlot,
    emptySlot,
  } = props

  const allChecked = rows.length > 0 && rows.every((r) => selectedKeys.includes(rowKey(r, 0)))
  const toggleAll = () => {
    if (allChecked) {
      const next = selectedKeys.filter((k) => !rows.some((r) => rowKey(r, 0) === k))
      onSelectionChange?.(next)
    } else {
      const more = rows.map((r) => rowKey(r, 0)).filter((k) => !selectedKeys.includes(k))
      onSelectionChange?.(Array.from(new Set([...selectedKeys, ...more])))
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, perPage)))

  const renderHeader = (c: Column<T>) => {
    const handleSort = () => {
      if (!c.sortable || !onSortChange) return
      const field = String(c.key)
      const next = sortField === field && sortDir === 'asc' ? 'desc' : 'asc'
      onSortChange(field, next)
    }
    return (
      <th
        key={String(c.key)}
        className={cn(
          'px-3 py-2.5 text-left align-middle font-medium text-muted-foreground',
          c.sortable && 'cursor-pointer select-none hover:text-foreground',
          c.align === 'right' && 'text-right',
          c.align === 'center' && 'text-center'
        )}
        style={{ width: c.width }}
        onClick={handleSort}
      >
        <span className="inline-flex items-center gap-1.5">
          {c.header}
          {c.sortable && (
            <ArrowUpDown
              className={cn(
                'h-3 w-3',
                sortField === c.key && sortDir === 'asc' && 'rotate-180 text-foreground',
                sortField === c.key && sortDir === 'desc' && 'text-foreground'
              )}
            />
          )}
        </span>
      </th>
    )
  }

  const renderCell = (c: Column<T>, row: T) => {
    if (c.render) return c.render(row)
    const v = (row as Record<string, unknown>)[c.key as string]
    return v === null || v === undefined ? '' : String(v)
  }

  return (
    <div className="space-y-3">
      {(searchPlaceholder || filterSlot || rightSlot) && (
        <div className="flex flex-wrap items-center gap-3">
          {searchPlaceholder && (
            <div className="relative w-64 max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-9"
                value={searchValue || ''}
                onChange={(e) => onSearch?.(e.target.value)}
              />
            </div>
          )}
          {filterSlot}
          <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
        </div>
      )}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-2.5">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                </th>
              )}
              {columns.map((c) => renderHeader(c))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 text-center text-muted-foreground"
                >
                  加载中...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-16 text-center text-muted-foreground"
                >
                  {emptySlot || '暂无数据'}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row, idx) => {
                const k = rowKey(row, idx)
                const checked = selectedKeys.includes(k)
                return (
                  <tr
                    key={k}
                    className={cn(
                      'border-b last:border-0 transition-colors hover:bg-muted/50',
                      checked && 'bg-primary/5'
                    )}
                  >
                    {selectable && (
                      <td className="w-10 px-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => {
                            if (checked) {
                              onSelectionChange?.(selectedKeys.filter((x) => x !== k))
                            } else {
                              onSelectionChange?.([...selectedKeys, k])
                            }
                          }}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={String(c.key)}
                        className={cn(
                          'px-3 py-2.5 align-middle',
                          c.align === 'right' && 'text-right',
                          c.align === 'center' && 'text-center'
                        )}
                      >
                        {renderCell(c, row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
          </tbody>
        </table>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t text-sm">
          <span className="text-muted-foreground">
            共 {total} 条，每页 {perPage} 条
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}