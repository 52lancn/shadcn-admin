import type { MockMethod } from 'vite-plugin-mock'

// 与 web/src/lib/api.ts 中的 UserInfo / RouteMenu 字段保持一致（仅本地类型，避免跨目录耦合）
interface RouteMenu {
  id: number
  parentId: number
  name: string
  path: string
  component?: string
  icon?: string
  type: number // 1 dir 2 menu 3 button
  sort: number
  visible: number
  status: number
  children?: RouteMenu[]
}

interface MockUser {
  token: string
  expireIn: number
  info: {
    id: number
    username: string
    nickname: string
    avatar: string
    roles: string[]
    perms: string[]
  }
  menus: RouteMenu[]
}

const MOCK_TOKEN = 'mock-token-admin-7f3a9c2e'

const adminUser: MockUser = {
  token: MOCK_TOKEN,
  expireIn: 7200,
  info: {
    id: 1,
    username: 'admin',
    nickname: '超级管理员',
    avatar: '',
    roles: ['admin'],
    perms: ['*'],
  },
  menus: [
    {
      id: 1,
      parentId: 0,
      name: '工作台',
      path: '/dashboard',
      component: 'dashboard/index',
      icon: 'LayoutDashboard',
      type: 2,
      sort: 1,
      visible: 1,
      status: 1,
    },
    {
      id: 3,
      parentId: 0,
      name: '业务示例',
      path: '/demo',
      icon: 'Boxes',
      type: 1,
      sort: 2,
      visible: 1,
      status: 1,
      children: [
        { id: 31, parentId: 3, name: '数据列表', path: '/demo/datalist', component: 'demo/DataList/index', icon: 'Table', type: 2, sort: 1, visible: 1, status: 1 },
        { id: 32, parentId: 3, name: '图片画廊', path: '/demo/gallery', component: 'demo/Gallery/index', icon: 'Image', type: 2, sort: 2, visible: 1, status: 1 },
        { id: 33, parentId: 3, name: '图表分析', path: '/demo/charts', component: 'demo/Charts/index', icon: 'BarChart3', type: 2, sort: 3, visible: 1, status: 1 },
        { id: 34, parentId: 3, name: '大屏监控', path: '/demo/screen', component: 'demo/Screen/index', icon: 'Monitor', type: 2, sort: 4, visible: 1, status: 1 },
      ],
    },
    // AI 智能中心（对应 sys_menu id 100-104，与后端 ai_module.sql 种子一致）
    {
      id: 100,
      parentId: 0,
      name: 'AI 智能中心',
      path: '/ai',
      icon: 'Sparkles',
      type: 1,
      sort: 6,
      visible: 1,
      status: 1,
      children: [
        { id: 101, parentId: 100, name: '内容生成', path: '/ai/content', component: 'ai/ContentStudio/index', icon: 'Wand2', type: 2, sort: 1, visible: 1, status: 1 },
        { id: 102, parentId: 100, name: '智能翻译', path: '/ai/translate', component: 'ai/Translate/index', icon: 'Languages', type: 2, sort: 2, visible: 1, status: 1 },
        { id: 103, parentId: 100, name: '舆情情感', path: '/ai/sentiment', component: 'ai/Sentiment/index', icon: 'Radar', type: 2, sort: 3, visible: 1, status: 1 },
        { id: 104, parentId: 100, name: 'AI 用量', path: '/ai/usage', component: 'ai/Usage/index', icon: 'Activity', type: 2, sort: 4, visible: 1, status: 1 },
      ],
    },
    // 系统管理固定在菜单最下方
    {
      id: 2,
      parentId: 0,
      name: '系统管理',
      path: '/system',
      icon: 'Settings',
      type: 1,
      sort: 9,
      visible: 1,
      status: 1,
      children: [
        { id: 21, parentId: 2, name: '用户管理', path: '/system/user', component: 'system/user/index', icon: 'Users', type: 2, sort: 1, visible: 1, status: 1 },
        { id: 22, parentId: 2, name: '角色管理', path: '/system/role', component: 'system/role/index', icon: 'Shield', type: 2, sort: 2, visible: 1, status: 1 },
        { id: 23, parentId: 2, name: '菜单管理', path: '/system/menu', component: 'system/menu/index', icon: 'Menu', type: 2, sort: 3, visible: 1, status: 1 },
        { id: 24, parentId: 2, name: '参数配置', path: '/system/config', component: 'system/config/index', icon: 'SlidersHorizontal', type: 2, sort: 4, visible: 1, status: 1 },
        { id: 25, parentId: 2, name: '字典管理', path: '/system/dict', component: 'system/dict/index', icon: 'BookOpen', type: 2, sort: 5, visible: 1, status: 1 },
        { id: 26, parentId: 2, name: '关于系统', path: '/system/about', component: 'system/about/index', icon: 'Info', type: 2, sort: 6, visible: 1, status: 1 },
      ],
    },
  ],
}

export default [
  // 登录：POST /api/auth/login
  {
    url: '/api/auth/login',
    method: 'post',
    response: ({ body }: { body: { username?: string; password?: string } }) => {
      const username = body?.username ?? ''
      const password = body?.password ?? ''
      if (username === 'admin' && password === '123456') {
        return {
          code: 0,
          message: 'success',
          data: { token: adminUser.token, expireIn: adminUser.expireIn },
        }
      }
      return { code: 401, message: '账号或密码错误', data: null }
    },
  },
  // 获取当前用户信息：GET /api/auth/info
  {
    url: '/api/auth/info',
    method: 'get',
    response: ({ headers }: { headers: Record<string, string> }) => {
      const auth = (headers?.authorization || headers?.Authorization || '') as string
      if (auth.includes(adminUser.token)) {
        return { code: 0, message: 'success', data: adminUser.info }
      }
      return { code: 401, message: '未登录或登录已过期', data: null }
    },
  },
  // 获取菜单（登录后 loadProfile 立即调用）：GET /api/auth/menus
  {
    url: '/api/auth/menus',
    method: 'get',
    response: () => ({
      code: 0,
      message: 'success',
      data: adminUser.menus,
    }),
  },
  // 退出登录（对应 httpDel('/auth/info')）
  {
    url: '/api/auth/info',
    method: 'delete',
    response: () => ({ code: 0, message: 'success', data: null }),
  },
  // 修改密码（对应 SettingsAPI.changePassword，保证改密弹窗在 preview 下不报错）
  {
    url: '/api/auth/password',
    method: 'post',
    response: () => ({ code: 0, message: 'success', data: null }),
  },
] as MockMethod[]
