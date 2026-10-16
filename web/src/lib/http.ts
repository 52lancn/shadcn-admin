import axios, { type AxiosInstance } from 'axios'

export interface ApiResult<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  perPage: number
}

const TOKEN_KEY = 'admin.token'
const THEME_KEY = 'admin.theme'
const COLOR_KEY = 'admin.color'
const SIDEBAR_KEY = 'admin.sidebar-style'

/**
 * 侧边栏色调联合类型。
 *
 * 这里独立声明而非从 @/lib/theme 引入：theme.ts 依赖本文件的 storage，
 * 反向 import 会形成循环依赖。两者保持一致即可。
 */
type SidebarTone = 'default' | 'white' | 'gray' | 'graphite' | 'ink'

export const storage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || ''
  },
  setToken(v: string) {
    localStorage.setItem(TOKEN_KEY, v)
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY)
  },
  getTheme() {
    return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light'
  },
  setTheme(v: 'light' | 'dark') {
    localStorage.setItem(THEME_KEY, v)
  },
  getColor() {
    // 默认主色：翡翠绿
    return localStorage.getItem(COLOR_KEY) || 'emerald'
  },
  setColor(v: string) {
    localStorage.setItem(COLOR_KEY, v)
  },
  getSidebar(): SidebarTone {
    // 默认侧边栏背景：墨黑
    const v = localStorage.getItem(SIDEBAR_KEY) || 'ink'
    // 兼容旧的开关值：dark → 墨黑，light → 跟随主题
    if (v === 'dark') return 'ink'
    if (v === 'light') return 'default'
    // 仅接受合法取值，非法/历史脏值一律回落到墨黑
    const allowed: readonly string[] = ['default', 'white', 'gray', 'graphite', 'ink']
    return (allowed.includes(v) ? v : 'ink') as SidebarTone
  },
  setSidebar(v: string) {
    localStorage.setItem(SIDEBAR_KEY, v)
  },
}

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

http.interceptors.request.use((cfg) => {
  const token = storage.getToken()
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

http.interceptors.response.use(
  (resp) => {
    const body = resp.data as ApiResult
    if (body && typeof body.code === 'number') {
      if (body.code === 0) return resp
      // auth-related failures
      if (body.code === 401 || body.code === 403) {
        storage.clearToken()
        // soft redirect to login
        if (!location.pathname.startsWith('/login')) {
          location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`
        }
        return Promise.reject(new Error(body.message || 'unauthorized'))
      }
      return Promise.reject(new Error(body.message || 'request failed'))
    }
    return resp
  },
  (err) => {
    if (err?.response?.status === 401) {
      storage.clearToken()
      if (!location.pathname.startsWith('/login')) {
        location.href = '/login'
      }
    }
    const msg = err?.response?.data?.message || err.message || 'network error'
    return Promise.reject(new Error(msg))
  }
)

export async function get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
  const resp = await http.get<ApiResult<T>>(url, { params })
  return resp.data.data
}

export async function post<T = unknown>(
  url: string,
  body?: Record<string, unknown> | unknown[]
): Promise<T> {
  const resp = await http.post<ApiResult<T>>(url, body)
  return resp.data.data
}

export async function put<T = unknown>(
  url: string,
  body?: Record<string, unknown> | unknown[]
): Promise<T> {
  const resp = await http.put<ApiResult<T>>(url, body)
  return resp.data.data
}

export async function del<T = unknown>(url: string): Promise<T> {
  const resp = await http.delete<ApiResult<T>>(url)
  return resp.data.data
}

export { http }