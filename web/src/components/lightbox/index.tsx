import * as React from 'react'
import { ChevronLeft, ChevronRight, Heart, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface LightboxItem {
  url: string
  title?: string
  description?: string
  likes?: number
  meta?: React.ReactNode
}

interface LightboxProps {
  items: LightboxItem[]
  index: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onIndexChange?: (index: number) => void
}

export function Lightbox({ items, index, open, onOpenChange, onIndexChange }: LightboxProps) {
  const [zoom, setZoom] = React.useState(1)

  React.useEffect(() => {
    setZoom(1)
  }, [index, open])

  const go = React.useCallback(
    (delta: number) => {
      if (items.length === 0) return
      const next = (index + delta + items.length) % items.length
      onIndexChange?.(next)
    },
    [index, items.length, onIndexChange]
  )

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(3, z + 0.25))
      if (e.key === '-') setZoom((z) => Math.max(1, z - 0.25))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, go, onOpenChange])

  if (!open || items.length === 0) return null

  const item = items[index]

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-3 text-white/90">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="truncate text-xs text-white/50">
            {index + 1} / {items.length}
            {item.description ? ` · ${item.description}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {item.likes !== undefined && (
            <span className="mr-2 inline-flex items-center gap-1 text-xs text-white/60">
              <Heart className="h-3.5 w-3.5 fill-rose-500/80 text-rose-500/80" />
              {item.likes.toLocaleString()}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          >
            <span className="text-sm">−</span>
          </Button>
          <span className="w-12 text-center text-xs tabular-nums text-white/60">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          >
            <span className="text-sm">+</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 z-10 h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={() => go(-1)}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="flex max-h-full w-full items-center justify-center overflow-auto">
          <img
            src={item.url}
            alt={item.title || ''}
            style={{ transform: `scale(${zoom})` }}
            className="max-h-[72vh] max-w-full object-contain shadow-2xl transition-transform duration-200"
            draggable={false}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 z-10 h-11 w-11 rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={() => go(1)}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* thumbnail strip */}
      <div className="shrink-0 px-4 pb-4">
        <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto pb-1">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => onIndexChange?.(i)}
              className={cn(
                'h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-all',
                i === index
                  ? 'border-white opacity-100'
                  : 'border-transparent opacity-45 hover:opacity-80'
              )}
            >
              <img src={it.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-white/35">
          ← → 切换 · ESC 关闭 · +/− 缩放
        </p>
      </div>
    </div>
  )
}
