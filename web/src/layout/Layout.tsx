import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Loader2,
  LogOut,
  Moon,
  PanelLeft,
  Palette,
  Settings,
  Sun,
  User as UserIcon,
} from 'lucide-react'
import * as Icons from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuthStore, SettingsAPI, type RouteMenu } from '@/lib/api'
import { storage } from '@/lib/http'
import { DEFAULT_ROUTE } from '@/lib/routes'
import {
  ColorToken,
  setSidebar,
  setColor,
  setTheme,
  sidebarTones,
  themeColors,
  useThemeBootstrap,
  type SidebarTone,
} from '@/lib/theme'

const collapsedKey = 'admin.sidebar.collapsed'

interface UIState {
  collapsed: boolean
  toggleCollapsed: () => void
  setCollapsed: (v: boolean) => void
}

const useUIStore = create<UIState>((set) => ({
  collapsed: localStorage.getItem(collapsedKey) === '1',
  toggleCollapsed: () =>
    set((s) => {
      const v = !s.collapsed
      localStorage.setItem(collapsedKey, v ? '1' : '0')
      return { collapsed: v }
    }),
  setCollapsed: (v) => {
    localStorage.setItem(collapsedKey, v ? '1' : '0')
    set({ collapsed: v })
  },
}))

function LucideIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name]
  if (!Comp) return null
  return <Comp className={className} />
}

/** 路径是否命中：支持 /demo 这类父级前缀匹配 */
function pathHit(current: string, target?: string) {
  if (!target) return false
  return current === target || current.startsWith(`${target}/`)
}

function SideItem({
  menu,
  collapsed,
  depth = 0,
}: {
  menu: RouteMenu
  collapsed: boolean
  /** 0 = 一级菜单，1 = 二级菜单 */
  depth?: number
}) {
  const location = useLocation()
  const visibleChildren = (menu.children || []).filter((c) => c.type !== 3)

  // 一级（父级）菜单：任一子项命中即视为选中 → 绿底白字
  if ((menu.type === 1 || visibleChildren.length > 0) && menu.type !== 3) {
    const childActive = visibleChildren.some((c) => pathHit(location.pathname, c.path))
    const selfActive = pathHit(location.pathname, menu.path)
    const active = childActive || selfActive
    return (
      <li>
        <details className="group" open>
          <summary
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium cursor-pointer select-none transition-colors',
              collapsed && 'justify-center px-0',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'
            )}
          >
            <LucideIcon name={menu.icon} className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{menu.name}</span>}
            {!collapsed && (
              <ChevronLeft
                className={cn(
                  'h-3.5 w-3.5 ml-auto rotate-90 transition-transform group-open:rotate-0',
                  active
                    ? 'text-primary-foreground/80'
                    : 'text-[hsl(var(--sidebar-muted))]'
                )}
              />
            )}
          </summary>
          {!collapsed && (
            <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-[hsl(var(--sidebar-border))] pl-2">
              {visibleChildren.map((c) => (
                <SideItem key={c.id} menu={c} collapsed={collapsed} depth={depth + 1} />
              ))}
            </ul>
          )}
        </details>
      </li>
    )
  }

  // 叶子菜单：一级选中绿底白字；二级选中绿色文字
  const active = pathHit(location.pathname, menu.path)
  return (
    <li>
      <NavLink
        to={menu.path}
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
          collapsed && 'justify-center px-0',
          depth > 0 ? 'py-1.5' : 'font-medium',
          active
            ? depth > 0
              ? 'text-primary font-medium'
              : 'bg-primary text-primary-foreground shadow-sm'
            : 'text-[hsl(var(--sidebar-muted))] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'
        )}
        title={collapsed ? menu.name : undefined}
      >
        <LucideIcon name={menu.icon} className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{menu.name}</span>}
      </NavLink>
    </li>
  )
}

function Sidebar() {
  const collapsed = useUIStore((s) => s.collapsed)
  const toggle = useUIStore((s) => s.toggleCollapsed)
  const menus = useAuthStore((s) => s.menus)
  return (
    <aside
      className={cn(
        'flex flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="h-14 flex items-center gap-2 px-3 border-b border-[hsl(var(--sidebar-border))]">
        <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <svg viewBox="0 0 32 32" className="w-5 h-5">
            <path d="M9 9 L16 23 L23 9 L20 9 L16 17 L12 9 Z" fill="currentColor" />
          </svg>
        </div>
        {!collapsed && <span className="font-semibold tracking-tight">Admin Console</span>}
      </div>
      <nav className="flex-1 overflow-y-auto scroll-thin p-2">
        <ul className="space-y-0.5">
          {menus.map((m) => (
            <SideItem key={m.id} menu={m} collapsed={collapsed} />
          ))}
        </ul>
      </nav>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="m-2 self-end hidden lg:inline-flex text-[hsl(var(--sidebar-muted))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
      >
        <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
      </Button>
    </aside>
  )
}

function Breadcrumb({ path }: { path: string }) {
  const menus = useAuthStore((s) => s.menus)
  let title = ''
  for (const m of menus) {
    if (path.startsWith(m.path) && m.type !== 3) {
      title = m.name
      for (const c of m.children || []) {
        if (c.path === path) {
          title = `${m.name} / ${c.name}`
          break
        }
      }
    }
  }
  if (path === '/dashboard') title = '工作台'
  if (path.startsWith('/demo')) title = '业务示例'
  return <div className="text-sm text-muted-foreground">{title}</div>
}

function ThemeToggle() {
  const [mode, setMode] = useState<'light' | 'dark'>(
    (localStorage.getItem('admin.theme') as 'light' | 'dark') || 'light'
  )
  const [color, setColorState] = useState<ColorToken>(storage.getColor() as ColorToken)
  const [sidebar, setSidebarTone] = useState<SidebarTone>(storage.getSidebar())
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {mode === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" /> 外观 & 主题
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setMode('light')
            setTheme('light')
          }}
        >
          <Sun className="h-4 w-4" /> 浅色
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setMode('dark')
            setTheme('dark')
          }}
        >
          <Moon className="h-4 w-4" /> 深色
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">主色</DropdownMenuLabel>
        <div className="grid grid-cols-7 gap-1.5 px-2 py-1.5">
          {themeColors.map((c) => (
            <button
              key={c.id}
              title={c.label}
              onClick={() => {
                setColorState(c.id)
                setColor(c.id)
              }}
              className={cn(
                'h-6 w-6 rounded-md hover:scale-110 transition-transform ring-1 ring-border',
                color === c.id && 'ring-2 ring-primary'
              )}
              style={{ backgroundColor: c.swatch }}
            />
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <PanelLeft className="h-3.5 w-3.5" /> 侧边栏背景
        </DropdownMenuLabel>
        <div className="grid grid-cols-5 gap-1.5 px-2 py-1.5">
          {sidebarTones.map((t) => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => {
                setSidebarTone(t.id)
                setSidebar(t.id)
              }}
              className={cn(
                'h-6 w-6 rounded-md hover:scale-110 transition-transform ring-1 ring-border',
                sidebar === t.id && 'ring-2 ring-primary'
              )}
              style={{ background: t.swatch }}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '' })
  const [pwBusy, setPwBusy] = useState(false)

  return (
    <header className="h-14 flex items-center gap-3 border-b bg-card/70 glass px-4 sticky top-0 z-30">
      <Breadcrumb path={location.pathname} />
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => navigate('/system/about')}
          title="关于"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 px-2 gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback>
                  {(user?.nickname || user?.username || 'A').slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium max-w-[120px] truncate">
                {user?.nickname || user?.username}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.nickname || user?.username}</span>
                <span className="text-xs text-muted-foreground">@{user?.username}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPwOpen(true)}>
              <UserIcon className="h-4 w-4" /> 修改密码
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                await logout()
                navigate('/login', { replace: true })
              }}
            >
              <LogOut className="h-4 w-4" /> 退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {pwOpen && (
        <ChangePasswordDialog
          form={pwForm}
          onChange={setPwForm}
          submitting={pwBusy}
          onClose={() => setPwOpen(false)}
          onSubmit={async () => {
            if (!pwForm.oldPassword || !pwForm.newPassword) {
              toast.error('请填写原密码和新密码')
              return
            }
            setPwBusy(true)
            try {
              await SettingsAPI.changePassword(pwForm.oldPassword, pwForm.newPassword)
              toast.success('密码已更新')
              setPwOpen(false)
              setPwForm({ oldPassword: '', newPassword: '' })
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : '更新失败')
            } finally {
              setPwBusy(false)
            }
          }}
        />
      )}
    </header>
  )
}

function ChangePasswordDialog({
  form,
  onChange,
  onClose,
  onSubmit,
  submitting,
}: {
  form: { oldPassword: string; newPassword: string }
  onChange: (v: { oldPassword: string; newPassword: string }) => void
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg animate-in zoom-in-95">
        <h3 className="text-lg font-semibold mb-4">修改密码</h3>
        <div className="space-y-3">
          <div>
            <Label>原密码</Label>
            <Input
              type="password"
              value={form.oldPassword}
              onChange={(e) => onChange({ ...form, oldPassword: e.target.value })}
            />
          </div>
          <div>
            <Label>新密码</Label>
            <Input
              type="password"
              value={form.newPassword}
              onChange={(e) => onChange({ ...form, newPassword: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            确认
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  useThemeBootstrap()
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const loadProfile = useAuthStore((s) => s.loadProfile)
  const menus = useAuthStore((s) => s.menus)

  // 根路径 "/" 的默认跳转目标：
  // 优先 DEFAULT_ROUTE（/system/about），但必须确认当前用户有该菜单权限，
  // 否则降级到「第一个可访问的菜单」，避免直接跳到未授权页。
  const firstPath = useMemo(() => {
    const paths = new Set<string>()
    const walkAll = (list: RouteMenu[]) => {
      for (const m of list) {
        if (m.type === 2 && m.path) paths.add(m.path)
        if (m.children?.length) walkAll(m.children)
      }
    }
    walkAll(menus)

    if (paths.has(DEFAULT_ROUTE)) return DEFAULT_ROUTE

    const walk = (list: RouteMenu[]): string => {
      for (const m of list) {
        if (m.type === 2 && m.path) return m.path
        if (m.children && m.children.length) {
          const p = walk(m.children)
          if (p) return p
        }
      }
      return ''
    }
    return walk(menus) || DEFAULT_ROUTE
  }, [menus])

  useEffect(() => {
    if (token && !user) loadProfile()
  }, [token, user, loadProfile])

  // 兜底：客户端路由（非整页刷新）导航到根路径 "/" 时，Layout 内嵌套 <Routes> 的
  // <Route path="/"> 在 App 的 splat 路由（path="/*"）下不会匹配，主内容区会空白。
  // 这里显式把 "/" 重定向到默认页，覆盖「登录后 redirect=%2F」「点 Logo 回首页」等场景。
  useEffect(() => {
    if (location.pathname === '/') {
      navigate(firstPath, { replace: true })
    }
  }, [location.pathname, firstPath, navigate])

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true })
    return null
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto scroll-thin">
          <div className="container mx-auto p-6 max-w-screen-2xl">
            {/* 动态菜单路由必须包在 <Routes> 里，直接渲染 <Route> 会抛错并导致整棵树卸载 */}
            <Routes>
              <Route path="/" element={<Navigate to={firstPath} replace />} />
              {children}
              <Route
                path="*"
                element={
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    页面不存在或未授权
                  </div>
                }
              />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}