import { create } from 'zustand'
import {
  get as httpGet,
  post as httpPost,
  put as httpPut,
  del as httpDel,
  storage,
  type PageResult,
} from '@/lib/http'

// ---------- types ----------
export interface RouteMenu {
  id: number
  parentId: number
  name: string
  path: string
  component?: string
  redirect?: string
  icon?: string
  type: number // 1 dir 2 menu 3 button
  perms?: string
  sort: number
  visible: number
  status: number
  children?: RouteMenu[]
}
export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
  roles: string[]
  perms: string[]
}
export interface LoginResp {
  token: string
  expireIn: number
}

interface AuthState {
  token: string
  user: UserInfo | null
  menus: RouteMenu[]
  perms: string[]
  loading: boolean
  login: (u: string, p: string) => Promise<void>
  logout: () => Promise<void>
  loadProfile: () => Promise<void>
  hasPerm: (code: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storage.getToken(),
  user: null,
  menus: [],
  perms: [],
  loading: false,
  login: async (username, password) => {
    const r = await httpPost<LoginResp>('/auth/login', { username, password })
    storage.setToken(r.token)
    set({ token: r.token })
    await get().loadProfile()
  },
  logout: async () => {
    try {
      await httpDel('/auth/info')
    } catch {
      /* ignore */
    }
    storage.clearToken()
    set({ token: '', user: null, menus: [], perms: [] })
  },
  loadProfile: async () => {
    set({ loading: true })
    try {
      const [info, menus] = await Promise.all([
        httpGet<UserInfo>('/auth/info'),
        httpGet<RouteMenu[]>('/auth/menus'),
      ])
      set({ user: info, menus, perms: info.perms || [] })
    } finally {
      set({ loading: false })
    }
  },
  hasPerm: (code: string) => {
    const perms = get().perms
    if (perms.includes('*')) return true
    return perms.includes(code)
  },
}))

// ---------- system API types & helpers ----------
export interface UserVO {
  id: number
  username: string
  nickname: string
  email: string
  phone: string
  avatar: string
  gender: number
  status: number
  remark: string
  roleIds: number[]
  createdAt: string
}
export interface RoleVO {
  id: number
  code: string
  name: string
  sort: number
  status: number
  remark: string
  menuIds: number[]
  createdAt: string
}
export interface MenuVO {
  id: number
  parentId: number
  name: string
  path: string
  component: string
  redirect: string
  icon: string
  type: number
  perms: string
  sort: number
  visible: number
  status: number
  children?: MenuVO[]
}
export interface ConfigVO {
  id: number
  name: string
  key: string
  value: string
  remark: string
  status: number
  createdAt: string
}
export interface DictVO {
  id: number
  name: string
  code: string
  status: number
  remark: string
  createdAt: string
}
export interface DictItemVO {
  id: number
  dictId: number
  label: string
  value: string
  sort: number
  status: number
}

export interface PageQuery {
  page?: number
  perPage?: number
  keyword?: string
  status?: string | number
}

// ---- users ----
export const UserAPI = {
  list: (q: PageQuery) => httpGet<PageResult<UserVO>>('/sys/users', q as Record<string, unknown>),
  get: (id: number) => httpGet<UserVO>(`/sys/users/${id}`),
  create: (b: Partial<UserVO> & { password?: string }) => httpPost('/sys/users', b as never),
  update: (b: Partial<UserVO> & { password?: string }) => httpPut(`/sys/users/${b.id}`, b as never),
  remove: (id: number) => httpDel(`/sys/users/${id}`),
  batchDelete: (ids: number[]) => httpPost('/sys/users/batch-delete', { ids }),
}

// ---- roles ----
export const RoleAPI = {
  list: (q: PageQuery) => httpGet<PageResult<RoleVO>>('/sys/roles', q as Record<string, unknown>),
  options: () => httpGet<RoleVO[]>('/sys/roles/options'),
  create: (b: Partial<RoleVO>) => httpPost('/sys/roles', b as never),
  update: (b: Partial<RoleVO>) => httpPut(`/sys/roles/${b.id}`, b as never),
  remove: (id: number) => httpDel(`/sys/roles/${id}`),
  assignMenus: (roleId: number, menuIds: number[]) =>
    httpPost('/sys/roles/menus', { roleId, menuIds }),
}

// ---- menus ----
export const MenuAPI = {
  list: (keyword?: string, status?: string) =>
    httpGet<MenuVO[]>('/sys/menus', { keyword, status }),
  get: (id: number) => httpGet<MenuVO>(`/sys/menus/${id}`),
  create: (b: Partial<MenuVO>) => httpPost('/sys/menus', b as never),
  update: (b: Partial<MenuVO>) => httpPut(`/sys/menus/${b.id}`, storePutMenuAdapter(b)),
  remove: (id: number) => httpDel(`/sys/menus/${id}`),
}
function storePutMenuAdapter(b: Partial<MenuVO>) {
  // Update goes to /api/sys/menus/:id with PUT - need to include id in body for our handler.
  return { ...b }
}

// ---- configs ----
export const ConfigAPI = {
  list: (q: PageQuery) =>
    httpGet<PageResult<ConfigVO>>('/sys/configs', q as Record<string, unknown>),
  get: (key: string) => httpGet<ConfigVO>('/sys/configs/by-key', { key }),
  create: (b: Partial<ConfigVO>) => httpPost('/sys/configs', b as never),
  update: (b: Partial<ConfigVO>) => httpPut(`/sys/configs/${b.id}`, b as never),
  remove: (id: number) => httpDel(`/sys/configs/${id}`),
}

// ---- dicts ----
export const DictAPI = {
  list: (q: PageQuery) =>
    httpGet<PageResult<DictVO>>('/sys/dicts', q as Record<string, unknown>),
  create: (b: Partial<DictVO>) => httpPost('/sys/dicts', storeOADictAdapter(b)),
  update: (b: Partial<DictVO>) =>
    httpPut(`/sys/dicts/${b.id}`, storeOADictAdapter(b)),
  remove: (id: number) => httpDel(`/sys/dicts/${id}`),
}
function storeOADictAdapter(b: Partial<DictVO>) {
  return { ...b }
}

// ---- dict items ----
export const DictItemAPI = {
  list: (dictId: number) => httpGet<DictItemVO[]>(`/sys/dicts/${dictId}/items`),
  save: (b: Partial<DictItemVO>) => httpPost('/sys/dicts/items', b as never),
  remove: (id: number) => httpDel(`/sys/dicts/items/${id}`),
}

// ============================================================
// Phase 2 — demo module
// ============================================================
export interface ProductVO {
  id: number
  name: string
  sku: string
  category: string
  brand: string
  price: number
  stock: number
  sales: number
  rating: number
  status: number
  cover: string
  tags: string
  createdAt: string
}
export interface ProductStats {
  total: number
  totalStock: number
  totalSales: number
  categories: string[]
  byCategory: { name: string; cnt: number; stock: number; sales: number; avgPrice: number }[]
}
export interface GalleryVO {
  id: number
  title: string
  category: string
  url: string
  thumb: string
  width: number
  height: number
  likes: number
  description: string
  status: number
  createdAt: string
}
export interface NameValue {
  name: string
  value: number
}
export interface TrendPoint {
  date: string
  amount: number
  orders: number
}
export interface HeatPoint {
  hour: number
  day: string
  value: number
}
export interface ChartOverview {
  summary: NameValue[]
  trend: TrendPoint[]
  category: NameValue[]
  region: NameValue[]
  channel: NameValue[]
  funnel: NameValue[]
  radar: { indicators: string[]; series: NameValue[] }
  heatmap: HeatPoint[]
}
export interface MonitorMetric {
  key: string
  label: string
  value: number
  unit: string
  max: number
  trend: number
  level: string
}
export interface TimeValue {
  time: string
  value: number
}
export interface AlertItem {
  id: number
  level: string
  title: string
  source: string
  time: string
}
export interface ServiceStatus {
  name: string
  status: string
  latency: number
  uptime: number
}
export interface MonitorSnapshot {
  timestamp: number
  metrics: MonitorMetric[]
  qps: TimeValue[]
  traffic: TimeValue[]
  onlineUsers: number
  todayOrders: number
  todayAmount: number
  conversion: number
  regions: NameValue[]
  alerts: AlertItem[]
  services: ServiceStatus[]
}

export interface ProductQuery {
  page?: number
  perPage?: number
  keyword?: string
  category?: string
  status?: string | number
  sortBy?: string
  order?: string
}
export interface GalleryQuery {
  page?: number
  perPage?: number
  keyword?: string
  category?: string
}

export const ProductAPI = {
  list: (q: ProductQuery) =>
    httpGet<PageResult<ProductVO>>('/demo/products', q as Record<string, unknown>),
  stats: () => httpGet<ProductStats>('/demo/products/stats'),
  create: (b: Partial<ProductVO>) => httpPost('/demo/products', b as never),
  update: (b: Partial<ProductVO>) => httpPut(`/demo/products/${b.id}`, b as never),
  remove: (id: number) => httpDel(`/demo/products/${id}`),
  batchDelete: (ids: number[]) => httpPost('/demo/products/batch-delete', { ids }),
}

export const GalleryAPI = {
  list: (q: GalleryQuery) =>
    httpGet<PageResult<GalleryVO>>('/demo/gallery', q as Record<string, unknown>),
  categories: () => httpGet<{ name: string; cnt: number }[]>('/demo/gallery/categories'),
  create: (b: Partial<GalleryVO>) => httpPost('/demo/gallery', b as never),
  update: (b: Partial<GalleryVO>) => httpPut(`/demo/gallery/${b.id}`, b as never),
  remove: (id: number) => httpDel(`/demo/gallery/${id}`),
  batchDelete: (ids: number[]) => httpPost('/demo/gallery/batch-delete', { ids }),
}

export const ChartAPI = {
  overview: (days = 30) => httpGet<ChartOverview>('/demo/charts/overview', { days }),
}

export const MonitorAPI = {
  snapshot: () => httpGet<MonitorSnapshot>('/demo/monitor/snapshot'),
}

// ---- settings ----
export const SettingsAPI = {
  changePassword: (oldPassword: string, newPassword: string) =>
    httpPost('/auth/password', { oldPassword, newPassword }),
}