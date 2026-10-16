import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Login from '@/pages/login'
import Layout from '@/layout/Layout'
import Dashboard from '@/pages/dashboard'
import SysUser from '@/pages/system/user'
import SysRole from '@/pages/system/role'
import SysMenu from '@/pages/system/menu'
import SysConfig from '@/pages/system/config'
import SysDict from '@/pages/system/dict'
import About from '@/pages/system/about'
import DemoDataList from '@/pages/demo/DataList'
import DemoGallery from '@/pages/demo/Gallery'
import DemoCharts from '@/pages/demo/Charts'
import DemoScreen from '@/pages/demo/Screen'
import { useAuthStore, type RouteMenu } from '@/lib/api'
import { storage } from '@/lib/http'

function flatMenus(menus: RouteMenu[]): RouteMenu[] {
  const out: RouteMenu[] = []
  const walk = (list?: RouteMenu[]) => {
    if (!list) return
    for (const m of list) {
      out.push(m)
      if (m.children && m.children.length) walk(m.children)
    }
  }
  walk(menus)
  return out
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation()
  const token = storage.getToken()
  if (!token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  return children
}

const componentMap: Record<string, React.ComponentType> = {
  'dashboard/index': Dashboard,
  'system/user/index': SysUser,
  'system/role/index': SysRole,
  'system/menu/index': SysMenu,
  'system/config/index': SysConfig,
  'system/dict/index': SysDict,
  'system/about/index': About,
  // Phase 2 business demos
  'demo/DataList/index': DemoDataList,
  'demo/Gallery/index': DemoGallery,
  'demo/Charts/index': DemoCharts,
  'demo/Screen/index': DemoScreen,
}

function renderRouteByComponent(co: string) {
  return componentMap[co] ?? (() => <div className="p-8 text-sm text-muted-foreground">未注册组件: {co}</div>)
}

function buildRoutes(menus: RouteMenu[]): JSX.Element[] {
  const routes: JSX.Element[] = []
  flatMenus(menus).forEach((m) => {
    if (m.type !== 2 || !m.path) return
    if (!m.component) return
    const Comp = renderRouteByComponent(m.component)
    routes.push(<Route key={m.id} path={m.path} element={<Comp />} />)
  })
  return routes
}

export default function App() {
  const token = storage.getToken()
  const menus = useAuthStore((s) => s.menus)
  const user = useAuthStore((s) => s.user)
  const loadProfile = useAuthStore((s) => s.loadProfile)

  useEffect(() => {
    if (token && !user) {
      loadProfile().catch(() => storage.clearToken())
    }
  }, [token, user, loadProfile])

  const menuRoutes = buildRoutes(menus)

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* big-screen monitor renders outside the admin shell (full-bleed) */}
      <Route
        path="/demo/screen"
        element={
          <RequireAuth>
            <DemoScreen />
          </RequireAuth>
        }
      />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Layout>{menuRoutes}</Layout>
          </RequireAuth>
        }
      />
    </Routes>
  )
}