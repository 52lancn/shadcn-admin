import type { MockMethod } from 'vite-plugin-mock'

/* ============================================================
 * 静态资源基址
 * - 生产预览（build:preview）注入 base=/shadcn_admin/ → 图片前缀自动带上
 * - dev / 真实构建 base=/ → 图片前缀为根路径
 * ============================================================ */
const BASE = (() => {
  try {
    const e = (import.meta as unknown as { env?: Record<string, string> }).env
    if (e && typeof e.BASE_URL === 'string') return e.BASE_URL.replace(/\/+$/, '')
  } catch {
    /* noop */
  }
  return ''
})()
const asset = (p: string) => `${BASE}${p}`

/* ---------- 工具 ---------- */
type Req = {
  url: string
  query: Record<string, string>
  body: any
  headers: Record<string, string>
}

const ok = <T,>(data: T) => ({ code: 0, message: 'success', data })

function num(v: unknown, def: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function paginate<T>(rows: T[], page: number, perPage: number) {
  const total = rows.length
  const start = (page - 1) * perPage
  return { list: rows.slice(start, start + perPage), total, page, perPage }
}

/** 稳定伪随机（同一 seed 结果固定，保证每次渲染一致） */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/* ============================================================
 * 商品（demo_product）—— SKU 与 public/products/*.svg 一一对应
 * ============================================================ */
interface Product {
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

const BRANDS = ['青野', '云川', '白鲸', '木石', '星野', '海风', '简白', '拾光']
const TAG_POOL = ['热销', '新品', '官方直营', '包邮', '库存紧张', '好评如潮', '限时']

// [品类, 货号前缀, 商品名库]
const CATS: Array<{ cat: string; pre: string; names: string[] }> = [
  { cat: '数码电子', pre: 'E695', names: ['降噪蓝牙耳机', '智能运动手表', '便携投影仪', '客制化机械键盘', '无线充电底座', '4K 高清摄像头', '桌面蓝牙音箱', '移动固态硬盘'] },
  { cat: '家居生活', pre: 'E5AE', names: ['记忆棉护颈枕', '静音香薰加湿器', '折叠收纳箱', '北欧陶瓷餐具', '亲肤记忆棉床垫', '氛围落地灯', '天然硅藻地垫', '新疆长绒棉四件套'] },
  { cat: '服饰鞋包', pre: 'E69C', names: ['三合一冲锋衣', '头层牛皮通勤包', '羊毛混纺开衫', '轻量缓震跑鞋', '亚麻休闲衬衫', '羊绒格纹围巾', '复古直筒牛仔裤', '户外防晒帽'] },
  { cat: '食品生鲜', pre: 'E9A3', names: ['冷萃咖啡液', '有机初榨山茶油', '每日坚果礼盒', '低温鲜酿酸奶', '手工黑芝麻丸', '海盐苏打饼干', '冻干水果脆', '原切谷饲牛排'] },
  { cat: '运动户外', pre: 'E8BF', names: ['碳纤维登山杖', '速干运动套装', '露营折叠椅', '战术户外背包', '天然橡胶瑜伽垫', '轻量骑行头盔', '真空保温水壶', '深层放松筋膜枪'] },
  { cat: '美妆个护', pre: 'E7BE', names: ['氨基酸温和洁面', '烟酰胺精华水乳', '清爽高倍防晒乳', '修护护发精油', '滋润唇部养护膏', '男士控油套装', '留香沐浴露', '声波电动牙刷'] },
]

function buildProducts(): Product[] {
  const r = rng(20260915)
  const out: Product[] = []
  let id = 0
  CATS.forEach((c, ci) => {
    c.names.forEach((n, i) => {
      id += 1
      const seq = ci * 8 + i + 1
      const sku = `SKU-${c.pre}-${String(seq).padStart(4, '0')}`
      const brand = BRANDS[(ci * 3 + i) % BRANDS.length]
      const tags: string[] = []
      while (tags.length < 2 + Math.floor(r() * 2)) {
        const t = TAG_POOL[Math.floor(r() * TAG_POOL.length)]
        if (!tags.includes(t)) tags.push(t)
      }
      out.push({
        id,
        name: `${brand} ${n}`,
        sku,
        category: c.cat,
        brand,
        price: Math.round((60 + r() * 4900) * 100) / 100,
        stock: r() < 0.15 ? 0 : 60 + Math.floor(r() * 2200),
        sales: 40 + Math.floor(r() * 17000),
        rating: Math.round((3.7 + r() * 1.3) * 10) / 10,
        status: r() < 0.85 ? 1 : 0,
        cover: asset(`/products/${sku}.svg`),
        tags: tags.join('、'),
        createdAt: `2026-0${1 + Math.floor(r() * 9)}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')} 10:00:00`,
      })
    })
  })
  return out
}

let products: Product[] = buildProducts()

/* ============================================================
 * 图片画廊（demo_gallery）—— 与 public/gallery/*.svg 对应
 * ============================================================ */
interface GalleryItem {
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

const GALLERY_META: Array<[string, string[]]> = [
  ['自然风光', ['nature-1', 'nature-2', 'nature-3', 'nature-4', 'nature-5']],
  ['城市印象', ['city-1', 'city-2', 'city-3', 'city-4', 'city-5']],
  ['科技质感', ['tech-1', 'tech-2', 'tech-3', 'tech-4', 'tech-5']],
  ['抽象艺术', ['abstract-1', 'abstract-2', 'abstract-3', 'abstract-4', 'abstract-5']],
]
const SIZE_POOL: Array<[number, number]> = [
  [1200, 800], [1600, 900], [1080, 1350], [1400, 933], [1000, 1500],
  [1920, 1080], [1280, 720], [1500, 1000],
]

function buildGallery(): GalleryItem[] {
  const r = rng(20260320)
  const out: GalleryItem[] = []
  let id = 0
  GALLERY_META.forEach(([cat, files]) => {
    files.forEach((f) => {
      id += 1
      const [w, h] = SIZE_POOL[Math.floor(r() * SIZE_POOL.length)]
      const p = asset(`/gallery/${f}.svg`)
      out.push({
        id,
        title: `${cat} · ${f}`,
        category: cat,
        url: p,
        thumb: p,
        width: w,
        height: h,
        likes: 120 + Math.floor(r() * 16000),
        description: `${cat}主题的演示配图，${w}×${h}，用于验证瀑布流布局与大图预览交互。`,
        status: 1,
        createdAt: `2026-0${1 + Math.floor(r() * 9)}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')} 12:00:00`,
      })
    })
  })
  return out
}

let gallery: GalleryItem[] = buildGallery()

/* ============================================================
 * 系统管理：用户 / 角色 / 菜单 / 参数 / 字典
 * ============================================================ */
interface UserVO {
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

const USERS_SEED: Array<[string, string, number[], number, string]> = [
  ['admin', '超级管理员', [1], 1, '系统内置账号，拥有全部权限'],
  ['editor', '内容编辑', [2], 1, '负责内容维护'],
  ['auditor', '安全审计员', [3], 1, '只读审计权限'],
  ['zhangwei', '张伟', [2, 4], 1, '运营组'],
  ['liyan', '李燕', [4], 1, '市场部'],
  ['wangfang', '王芳', [4], 1, '市场部'],
  ['zhaolei', '赵磊', [2], 1, '技术部'],
  ['chenjing', '陈静', [5], 0, '已停用'],
  ['liuyang', '刘洋', [5], 1, '客服组'],
  ['sunqi', '孙琪', [4], 1, '设计组'],
  ['zhouxue', '周雪', [3], 1, '财务部'],
  ['wujie', '吴杰', [2], 1, '技术部'],
]

let users: UserVO[] = USERS_SEED.map(([username, nickname, roleIds, status, remark], i) => ({
  id: i + 1,
  username,
  nickname,
  email: `${username}@52lancn.com`,
  phone: `13${String(800000000 + i * 1234567).slice(0, 9)}`,
  avatar: '',
  gender: i % 2 === 0 ? 1 : 2,
  status,
  remark,
  roleIds,
  createdAt: `2026-0${1 + (i % 9)}-${String(1 + (i % 28)).padStart(2, '0')} 09:30:00`,
}))

interface RoleVO {
  id: number
  code: string
  name: string
  sort: number
  status: number
  remark: string
  menuIds: number[]
  createdAt: string
}

const ROLES_SEED: Array<[string, string, string]> = [
  ['admin', '超级管理员', '拥有系统全部权限，不可删除'],
  ['editor', '内容编辑', '业务示例模块的增删改查'],
  ['auditor', '安全审计员', '系统管理与业务模块只读'],
  ['operator', '运营专员', '数据列表与图表分析查看'],
  ['guest', '访客', '仅可访问公开页面'],
]

let roles: RoleVO[] = ROLES_SEED.map(([code, name, remark], i) => ({
  id: i + 1,
  code,
  name,
  sort: i + 1,
  status: 1,
  remark,
  menuIds: code === 'admin' ? [1, 2, 3, 21, 22, 23, 24, 25, 26, 31, 32, 33, 34] : [],
  createdAt: `2026-0${1 + i}-01 08:00:00`,
}))

interface MenuVO {
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

let menus: MenuVO[] = [
  { id: 1, parentId: 0, name: '工作台', path: '/dashboard', component: 'dashboard/index', redirect: '', icon: 'LayoutDashboard', type: 2, perms: 'dashboard:view', sort: 1, visible: 1, status: 1 },
  {
    id: 3, parentId: 0, name: '业务示例', path: '/demo', component: '', redirect: '/demo/datalist', icon: 'Boxes', type: 1, perms: '', sort: 2, visible: 1, status: 1,
    children: [
      { id: 31, parentId: 3, name: '数据列表', path: '/demo/datalist', component: 'demo/DataList/index', redirect: '', icon: 'Table', type: 2, perms: 'demo:product:list', sort: 1, visible: 1, status: 1 },
      { id: 32, parentId: 3, name: '图片画廊', path: '/demo/gallery', component: 'demo/Gallery/index', redirect: '', icon: 'Image', type: 2, perms: 'demo:gallery:list', sort: 2, visible: 1, status: 1 },
      { id: 33, parentId: 3, name: '图表分析', path: '/demo/charts', component: 'demo/Charts/index', redirect: '', icon: 'BarChart3', type: 2, perms: 'demo:charts:view', sort: 3, visible: 1, status: 1 },
      { id: 34, parentId: 3, name: '大屏监控', path: '/demo/screen', component: 'demo/Screen/index', redirect: '', icon: 'Monitor', type: 2, perms: 'demo:screen:view', sort: 4, visible: 1, status: 1 },
    ],
  },
  {
    id: 2, parentId: 0, name: '系统管理', path: '/system', component: '', redirect: '/system/user', icon: 'Settings', type: 1, perms: '', sort: 9, visible: 1, status: 1,
    children: [
      { id: 21, parentId: 2, name: '用户管理', path: '/system/user', component: 'system/user/index', redirect: '', icon: 'Users', type: 2, perms: 'sys:user:list', sort: 1, visible: 1, status: 1 },
      { id: 22, parentId: 2, name: '角色管理', path: '/system/role', component: 'system/role/index', redirect: '', icon: 'Shield', type: 2, perms: 'sys:role:list', sort: 2, visible: 1, status: 1 },
      { id: 23, parentId: 2, name: '菜单管理', path: '/system/menu', component: 'system/menu/index', redirect: '', icon: 'Menu', type: 2, perms: 'sys:menu:list', sort: 3, visible: 1, status: 1 },
      { id: 24, parentId: 2, name: '参数配置', path: '/system/config', component: 'system/config/index', redirect: '', icon: 'SlidersHorizontal', type: 2, perms: 'sys:config:list', sort: 4, visible: 1, status: 1 },
      { id: 25, parentId: 2, name: '字典管理', path: '/system/dict', component: 'system/dict/index', redirect: '', icon: 'BookOpen', type: 2, perms: 'sys:dict:list', sort: 5, visible: 1, status: 1 },
      { id: 26, parentId: 2, name: '关于系统', path: '/system/about', component: 'system/about/index', redirect: '', icon: 'Info', type: 2, perms: '', sort: 6, visible: 1, status: 1 },
    ],
  },
]

interface ConfigVO {
  id: number
  name: string
  key: string
  value: string
  remark: string
  status: number
  createdAt: string
}

let configs: ConfigVO[] = [
  { id: 1, name: '系统名称', key: 'sys.name', value: 'Admin Console', remark: '登录页与页脚展示名称', status: 1, createdAt: '2026-01-05 10:00:00' },
  { id: 2, name: '默认主题', key: 'ui.theme', value: 'violet', remark: 'violet / blue / emerald', status: 1, createdAt: '2026-01-05 10:05:00' },
  { id: 3, name: '侧边栏风格', key: 'ui.sidebar', value: 'ink', remark: 'ink 墨黑 / default 跟随主题', status: 1, createdAt: '2026-01-05 10:06:00' },
  { id: 4, name: '登录会话时长(秒)', key: 'auth.expire', value: '7200', remark: 'token 有效期', status: 1, createdAt: '2026-01-06 09:00:00' },
  { id: 5, name: '列表默认每页', key: 'ui.pageSize', value: '10', remark: '分页默认条数', status: 1, createdAt: '2026-01-06 09:05:00' },
  { id: 6, name: '开放注册', key: 'auth.register', value: 'false', remark: 'true 开放注册', status: 0, createdAt: '2026-01-07 14:20:00' },
  { id: 7, name: '文件上传大小(MB)', key: 'file.maxSize', value: '20', remark: '单文件上限', status: 1, createdAt: '2026-01-08 11:10:00' },
  { id: 8, name: '接口基础路径', key: 'sys.apiBase', value: '/api', remark: 'axios baseURL', status: 1, createdAt: '2026-01-08 11:15:00' },
  { id: 9, name: '版权年份', key: 'sys.copyright', value: '2026', remark: '页脚版权', status: 1, createdAt: '2026-01-09 08:30:00' },
  { id: 10, name: '维护模式', key: 'sys.maintenance', value: 'false', remark: 'true 时仅管理员可访问', status: 0, createdAt: '2026-01-09 08:35:00' },
]

interface DictVO {
  id: number
  name: string
  code: string
  status: number
  remark: string
  createdAt: string
}

interface DictItemVO {
  id: number
  dictId: number
  label: string
  value: string
  sort: number
  status: number
}

const DICTS_SEED: Array<[string, string, string, Array<[string, string]>]> = [
  ['通用状态', 'common_status', '启用/停用通用字典', [['正常', '1'], ['停用', '0']]],
  ['性别', 'sys_gender', '用户性别', [['未知', '0'], ['男', '1'], ['女', '2']]],
  ['商品状态', 'product_status', '商品上下架', [['在售', '1'], ['下架', '0']]],
  ['告警级别', 'alert_level', '监控告警级别', [['提示', 'info'], ['警告', 'warn'], ['严重', 'danger']]],
]

let dicts: DictVO[] = DICTS_SEED.map(([name, code, remark], i) => ({
  id: i + 1,
  name,
  code,
  status: 1,
  remark,
  createdAt: `2026-02-0${i + 1} 09:00:00`,
}))

let dictItems: DictItemVO[] = DICTS_SEED.flatMap((dict, di) =>
  dict[3].map(([label, value], i) => ({
    id: di * 100 + i + 1,
    dictId: di + 1,
    label,
    value,
    sort: i + 1,
    status: 1,
  }))
)

/* ============================================================
 * 图表聚合（/demo/charts/overview）
 * ============================================================ */
const CHART_CATS = CATS.map((c) => c.cat)
const REGIONS = ['华东', '华南', '华北', '华中', '西南', '西北', '东北']
const CHANNELS = ['小程序', 'PC 官网', 'App', '第三方平台', '线下门店']
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function buildChartOverview(days: number) {
  const n = Math.min(Math.max(days, 7), 90)
  const r = rng(20261016)

  // 趋势：近 n 天，末位为今天
  const trend = Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 9, 16)
    d.setDate(d.getDate() - (n - 1 - i))
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const base = weekend ? 52000 : 38000
    const amount = Math.round(base * (0.7 + r() * 0.9))
    const orders = Math.round(amount / (180 + r() * 90))
    return { date, amount, orders }
  })

  const totalAmount = trend.reduce((a, b) => a + b.amount, 0)
  const totalOrders = trend.reduce((a, b) => a + b.orders, 0)
  const summary = [
    { name: '累计销售额', value: totalAmount },
    { name: '累计订单量', value: totalOrders },
    { name: '客单价', value: totalOrders ? Math.round((totalAmount / totalOrders) * 100) / 100 : 0 },
    { name: '覆盖天数', value: n },
  ]

  const scale = totalAmount / (CHART_CATS.length * (CHART_CATS.length + 1) / 2)
  const category = CHART_CATS.map((name, i) => ({ name, value: Math.round(scale * (i + 1) * (0.85 + r() * 0.3)) }))
  const region = REGIONS.map((name, i) => ({ name, value: Math.round(scale * 2.2 * (i + 1) * (0.8 + r() * 0.4)) }))
  const channel = CHANNELS.map((name, i) => ({ name, value: Math.round(scale * 1.8 * (i + 1) * (0.8 + r() * 0.4)) }))

  const fBase = Math.round(totalOrders * 14)
  const funnel = [
    { name: '曝光', value: fBase },
    { name: '点击', value: Math.round(fBase * 0.42) },
    { name: '加购', value: Math.round(fBase * 0.19) },
    { name: '下单', value: Math.round(fBase * 0.11) },
    { name: '支付', value: totalOrders },
  ]

  const radarMax = Math.max(...category.map((c) => c.value))
  const radar = {
    indicators: category.map((c) => c.name),
    series: category.map((c) => ({ name: c.name, value: Math.round((c.value / radarMax) * 100) })),
  }

  const heatmap: Array<{ hour: number; day: string; value: number }> = []
  WEEKDAYS.forEach((day) => {
    for (let hour = 0; hour < 24; hour += 1) {
      const peak = hour >= 10 && hour <= 22 ? 1 : 0.35
      const weekend = day === '周六' || day === '周日' ? 1.25 : 1
      heatmap.push({ hour, day, value: Math.round(rBase() * 9000 * peak * weekend) })
    }
  })

  return { summary, trend, category, region, channel, funnel, radar, heatmap }
  function rBase() {
    return 0.4 + r()
  }
}

/* ============================================================
 * 大屏监控快照（/demo/monitor/snapshot）—— 每次刷新轻微波动
 * ============================================================ */
function buildMonitorSnapshot() {
  const tick = Math.floor(Date.now() / 3000)
  const r = rng(tick + 1)
  const wave = (base: number, amp: number, min = 0) =>
    Math.max(min, Math.round(base + Math.sin(tick / 3) * amp + (r() - 0.5) * amp))

  const now = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  const labels = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * 2000)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  })

  const qps = labels.map((_, i) => ({ time: labels[i], value: wave(820 + Math.sin(i / 4) * 220, 90, 60) }))
  const traffic = labels.map((_, i) => ({ time: labels[i], value: Math.round((wave(24 + Math.sin(i / 5) * 6, 3, 2) * 1024 * 1024) / 1024) }))

  const metrics = [
    { key: 'cpu', label: 'CPU 使用率', value: wave(43, 14, 5), unit: '%', max: 100, trend: Math.round((r() - 0.4) * 12 * 10) / 10, level: 'ok' },
    { key: 'mem', label: '内存占用', value: wave(66, 10, 10), unit: '%', max: 100, trend: Math.round((r() - 0.5) * 8 * 10) / 10, level: 'ok' },
    { key: 'disk', label: '磁盘占用', value: 78, unit: '%', max: 100, trend: 0.4, level: 'warn' },
    { key: 'net', label: '网络带宽', value: wave(36, 12, 5), unit: '%', max: 100, trend: Math.round((r() - 0.5) * 10 * 10) / 10, level: 'ok' },
    { key: 'gpu', label: 'GPU 负载', value: wave(52, 20, 5), unit: '%', max: 100, trend: Math.round((r() - 0.5) * 18 * 10) / 10, level: 'ok' },
    { key: 'conn', label: '并发连接', value: wave(1260, 260, 100), unit: '', max: 5000, trend: Math.round((r() - 0.5) * 14 * 10) / 10, level: 'ok' },
  ]

  const services = [
    { name: 'api-gateway', status: 'healthy', latency: wave(28, 12, 8), uptime: 99.98 },
    { name: 'user-service', status: 'healthy', latency: wave(34, 14, 10), uptime: 99.96 },
    { name: 'order-service', status: 'healthy', latency: wave(46, 18, 12), uptime: 99.92 },
    { name: 'product-service', status: 'degraded', latency: wave(182, 60, 60), uptime: 99.31 },
    { name: 'file-service', status: 'healthy', latency: wave(52, 20, 15), uptime: 99.89 },
    { name: 'search-service', status: 'healthy', latency: wave(41, 16, 10), uptime: 99.95 },
    { name: 'message-queue', status: 'healthy', latency: wave(12, 6, 3), uptime: 99.99 },
  ]

  const alerts = [
    { id: 1, level: 'warn', title: 'product-service P99 响应时间超过 200ms', source: 'order-service / 监控', time: pad(now.getHours()) + ':' + pad(now.getMinutes()) },
    { id: 2, level: 'info', title: '自动扩容完成，新增 2 个应用实例', source: 'k8s-autoscaler', time: pad((now.getHours() + 23) % 24) + ':' + pad((now.getMinutes() + 41) % 60) },
    { id: 3, level: 'warn', title: 'MySQL 慢查询数量上升至 12 条/分钟', source: 'mysql-prod-01', time: pad((now.getHours() + 22) % 24) + ':' + pad((now.getMinutes() + 18) % 60) },
    { id: 4, level: 'danger', title: 'Redis 内存使用率达到 92%，建议清理缓存', source: 'redis-cluster-03', time: pad((now.getHours() + 22) % 24) + ':' + pad((now.getMinutes() + 5) % 60) },
    { id: 5, level: 'info', title: '今日累计成交额已达成 68% 阶段目标', source: '业务大盘', time: pad((now.getHours() + 21) % 24) + ':' + pad((now.getMinutes() + 52) % 60) },
  ]

  const regionScale = wave(42000, 12000, 5000)
  const regions = REGIONS.map((name, i) => ({ name, value: Math.round(regionScale * (0.5 + i * 0.22)) }))

  return {
    timestamp: Date.now(),
    metrics,
    qps,
    traffic,
    onlineUsers: wave(8642, 1400, 200),
    todayOrders: wave(1286, 260, 100),
    todayAmount: Math.round(wave(268400, 52000, 10000) * 100) / 100,
    conversion: Math.round(wave(3.86, 0.9, 0.5) * 100) / 100,
    regions,
    alerts,
    services,
  }
}

/* ============================================================
 * 路由拦截
 * ============================================================ */
export default [
  /* ---------- 商品 ---------- */
  {
    url: '/api/demo/products',
    method: 'get',
    response: ({ query }: Req) => {
      let rows = [...products]
      const kw = (query.keyword || '').trim().toLowerCase()
      if (kw) {
        rows = rows.filter((r) =>
          [r.name, r.sku, r.brand].some((v) => v.toLowerCase().includes(kw))
        )
      }
      if (query.category) rows = rows.filter((r) => r.category === query.category)
      if (query.status !== undefined && query.status !== '') {
        rows = rows.filter((r) => String(r.status) === String(query.status))
      }
      const sortBy = query.sortBy || 'id'
      const dir = query.order === 'asc' ? 1 : -1
      if (sortBy !== 'id' || dir === 1) {
        rows.sort((a, b) => {
          const av = (a as unknown as Record<string, number>)[sortBy]
          const bv = (b as unknown as Record<string, number>)[sortBy]
          if (typeof av === 'string' || typeof bv === 'string') {
            return String(av).localeCompare(String(bv)) * dir
          }
          return ((av ?? 0) - (bv ?? 0)) * dir
        })
      }
      return ok(paginate(rows, num(query.page, 1), num(query.perPage, 10)))
    },
  },
  {
    url: '/api/demo/products/stats',
    method: 'get',
    response: () => {
      const categories = Array.from(new Set(products.map((p) => p.category)))
      const byCategory = categories.map((name) => {
        const list = products.filter((p) => p.category === name)
        const stock = list.reduce((a, b) => a + b.stock, 0)
        return {
          name,
          cnt: list.length,
          stock,
          sales: list.reduce((a, b) => a + b.sales, 0),
          avgPrice: Math.round((list.reduce((a, b) => a + b.price, 0) / list.length) * 100) / 100,
        }
      })
      return ok({
        total: products.length,
        totalStock: products.reduce((a, b) => a + b.stock, 0),
        totalSales: products.reduce((a, b) => a + b.sales, 0),
        categories,
        byCategory,
      })
    },
  },
  { url: '/api/demo/products/batch-delete', method: 'post', response: ({ body }: Req) => { const ids: number[] = body?.ids ?? []; products = products.filter((p) => !ids.includes(p.id)); return ok(null) } },
  { url: '/api/demo/products', method: 'post', response: ({ body }: Req) => { const id = Math.max(0, ...products.map((p) => p.id)) + 1; const p: Product = { id, name: body?.name ?? '新商品', sku: body?.sku ?? `SKU-NEW-${id}`, category: body?.category ?? CHART_CATS[0], brand: body?.brand ?? '自营', price: num(body?.price, 0), stock: num(body?.stock, 0), sales: 0, rating: 5, status: body?.status ?? 1, cover: body?.cover ?? asset(`/products/${body?.sku ?? `SKU-NEW-${id}`}.svg`), tags: body?.tags ?? '', createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }; products.unshift(p); return ok(p) } },
  { url: '/api/demo/products/:id', method: 'put', response: ({ body }: Req) => { const i = products.findIndex((p) => p.id === num(body?.id, -1)); if (i >= 0) products[i] = { ...products[i], ...body, id: products[i].id }; return ok(products[i] ?? null) } },
  { url: '/api/demo/products/:id', method: 'delete', response: ({ url }: Req) => { const id = num(url.split('/').pop(), -1); products = products.filter((p) => p.id !== id); return ok(null) } },

  /* ---------- 画廊 ---------- */
  {
    url: '/api/demo/gallery',
    method: 'get',
    response: ({ query }: Req) => {
      let rows = [...gallery]
      const kw = (query.keyword || '').trim().toLowerCase()
      if (kw) rows = rows.filter((r) => `${r.title}${r.description}`.toLowerCase().includes(kw))
      if (query.category) rows = rows.filter((r) => r.category === query.category)
      return ok(paginate(rows, num(query.page, 1), num(query.perPage, 12)))
    },
  },
  {
    url: '/api/demo/gallery/categories',
    method: 'get',
    response: () => {
      const map = new Map<string, number>()
      gallery.forEach((g) => map.set(g.category, (map.get(g.category) ?? 0) + 1))
      return ok(Array.from(map, ([name, cnt]) => ({ name, cnt })))
    },
  },
  { url: '/api/demo/gallery/batch-delete', method: 'post', response: ({ body }: Req) => { const ids: number[] = body?.ids ?? []; gallery = gallery.filter((g) => !ids.includes(g.id)); return ok(null) } },
  { url: '/api/demo/gallery', method: 'post', response: ({ body }: Req) => { const id = Math.max(0, ...gallery.map((g) => g.id)) + 1; const g: GalleryItem = { id, title: body?.title ?? '新图片', category: body?.category ?? '自然风光', url: body?.url ?? asset('/gallery/nature-1.svg'), thumb: body?.thumb ?? body?.url ?? asset('/gallery/nature-1.svg'), width: num(body?.width, 1200), height: num(body?.height, 800), likes: 0, description: body?.description ?? '', status: 1, createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }; gallery.unshift(g); return ok(g) } },
  { url: '/api/demo/gallery/:id', method: 'put', response: ({ body }: Req) => { const i = gallery.findIndex((g) => g.id === num(body?.id, -1)); if (i >= 0) gallery[i] = { ...gallery[i], ...body, id: gallery[i].id }; return ok(gallery[i] ?? null) } },
  { url: '/api/demo/gallery/:id', method: 'delete', response: ({ url }: Req) => { const id = num(url.split('/').pop(), -1); gallery = gallery.filter((g) => g.id !== id); return ok(null) } },

  /* ---------- 图表 / 大屏 ---------- */
  { url: '/api/demo/charts/overview', method: 'get', response: ({ query }: Req) => ok(buildChartOverview(num(query.days, 30))) },
  { url: '/api/demo/monitor/snapshot', method: 'get', response: () => ok(buildMonitorSnapshot()) },

  /* ---------- 用户 ---------- */
  {
    url: '/api/sys/users',
    method: 'get',
    response: ({ query }: Req) => {
      let rows = [...users]
      const kw = (query.keyword || '').trim().toLowerCase()
      if (kw) rows = rows.filter((r) => `${r.username}${r.nickname}${r.email}`.toLowerCase().includes(kw))
      if (query.status !== undefined && query.status !== '') rows = rows.filter((r) => String(r.status) === String(query.status))
      return ok(paginate(rows, num(query.page, 1), num(query.perPage, 10)))
    },
  },
  { url: '/api/sys/users/batch-delete', method: 'post', response: ({ body }: Req) => { const ids: number[] = body?.ids ?? []; users = users.filter((u) => !ids.includes(u.id)); return ok(null) } },
  { url: '/api/sys/users', method: 'post', response: ({ body }: Req) => { const id = Math.max(0, ...users.map((u) => u.id)) + 1; const u: UserVO = { id, username: body?.username ?? `user${id}`, nickname: body?.nickname ?? '新用户', email: body?.email ?? '', phone: body?.phone ?? '', avatar: '', gender: num(body?.gender, 0), status: num(body?.status, 1), remark: body?.remark ?? '', roleIds: body?.roleIds ?? [], createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }; users.unshift(u); return ok(u) } },
  { url: '/api/sys/users/:id', method: 'put', response: ({ body }: Req) => { const i = users.findIndex((u) => u.id === num(body?.id, -1)); if (i >= 0) users[i] = { ...users[i], ...body, id: users[i].id }; return ok(users[i] ?? null) } },
  { url: '/api/sys/users/:id', method: 'delete', response: ({ url }: Req) => { const id = num(url.split('/').pop(), -1); users = users.filter((u) => u.id !== id); return ok(null) } },

  /* ---------- 角色 ---------- */
  {
    url: '/api/sys/roles',
    method: 'get',
    response: ({ query }: Req) => {
      let rows = [...roles]
      const kw = (query.keyword || '').trim().toLowerCase()
      if (kw) rows = rows.filter((r) => `${r.code}${r.name}${r.remark}`.toLowerCase().includes(kw))
      if (query.status !== undefined && query.status !== '') rows = rows.filter((r) => String(r.status) === String(query.status))
      return ok(paginate(rows, num(query.page, 1), num(query.perPage, 10)))
    },
  },
  { url: '/api/sys/roles/options', method: 'get', response: () => ok(roles.map((r) => ({ id: r.id, code: r.code, name: r.name, sort: r.sort, status: r.status, remark: r.remark, menuIds: r.menuIds, createdAt: r.createdAt }))) },
  { url: '/api/sys/roles/menus', method: 'post', response: ({ body }: Req) => { const i = roles.findIndex((r) => r.id === num(body?.roleId, -1)); if (i >= 0) roles[i].menuIds = body?.menuIds ?? []; return ok(null) } },
  { url: '/api/sys/roles', method: 'post', response: ({ body }: Req) => { const id = Math.max(0, ...roles.map((r) => r.id)) + 1; const r: RoleVO = { id, code: body?.code ?? `role${id}`, name: body?.name ?? '新角色', sort: num(body?.sort, id), status: num(body?.status, 1), remark: body?.remark ?? '', menuIds: [], createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }; roles.push(r); return ok(r) } },
  { url: '/api/sys/roles/:id', method: 'put', response: ({ body }: Req) => { const i = roles.findIndex((r) => r.id === num(body?.id, -1)); if (i >= 0) roles[i] = { ...roles[i], ...body, id: roles[i].id }; return ok(roles[i] ?? null) } },
  { url: '/api/sys/roles/:id', method: 'delete', response: ({ url }: Req) => { const id = num(url.split('/').pop(), -1); roles = roles.filter((r) => r.id !== id); return ok(null) } },

  /* ---------- 菜单 ---------- */
  { url: '/api/sys/menus', method: 'get', response: ({ query }: Req) => { const kw = (query.keyword || '').trim().toLowerCase(); const hit = (m: MenuVO) => !kw || `${m.name}${m.path}`.toLowerCase().includes(kw) || (m.children ?? []).some(hit); return ok(menus.filter(hit)) } },
  { url: '/api/sys/menus', method: 'post', response: ({ body }: Req) => { const id = Math.max(0, ...menus.flatMap((m) => [m.id, ...(m.children ?? []).map((c) => c.id)])) + 1; const m: MenuVO = { id, parentId: num(body?.parentId, 0), name: body?.name ?? '新菜单', path: body?.path ?? '', component: body?.component ?? '', redirect: body?.redirect ?? '', icon: body?.icon ?? '', type: num(body?.type, 2), perms: body?.perms ?? '', sort: num(body?.sort, 0), visible: num(body?.visible, 1), status: num(body?.status, 1) }; const parent = menus.find((x) => x.id === m.parentId); if (parent) { parent.children = [...(parent.children ?? []), m] } else { menus.push(m) } return ok(m) } },
  { url: '/api/sys/menus/:id', method: 'put', response: ({ body }: Req) => { const id = num(body?.id, -1); const apply = (m: MenuVO): MenuVO => { if (m.id === id) return { ...m, ...body, id }; return m.children ? { ...m, children: m.children.map(apply) } : m }; menus = menus.map(apply); return ok(menus) } },
  { url: '/api/sys/menus/:id', method: 'delete', response: ({ url }: Req) => { const id = num(url.split('/').pop(), -1); const strip = (list: MenuVO[]): MenuVO[] => list.filter((m) => m.id !== id).map((m) => (m.children ? { ...m, children: strip(m.children) } : m)); menus = strip(menus); return ok(null) } },

  /* ---------- 参数配置 ---------- */
  {
    url: '/api/sys/configs',
    method: 'get',
    response: ({ query }: Req) => {
      let rows = [...configs]
      const kw = (query.keyword || '').trim().toLowerCase()
      if (kw) rows = rows.filter((r) => `${r.name}${r.key}${r.value}`.toLowerCase().includes(kw))
      if (query.status !== undefined && query.status !== '') rows = rows.filter((r) => String(r.status) === String(query.status))
      return ok(paginate(rows, num(query.page, 1), num(query.perPage, 10)))
    },
  },
  { url: '/api/sys/configs/by-key', method: 'get', response: ({ query }: Req) => ok(configs.find((c) => c.key === query.key) ?? null) },
  { url: '/api/sys/configs', method: 'post', response: ({ body }: Req) => { const id = Math.max(0, ...configs.map((c) => c.id)) + 1; const c: ConfigVO = { id, name: body?.name ?? '新参数', key: body?.key ?? `sys.new.${id}`, value: body?.value ?? '', remark: body?.remark ?? '', status: num(body?.status, 1), createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }; configs.unshift(c); return ok(c) } },
  { url: '/api/sys/configs/:id', method: 'put', response: ({ body }: Req) => { const i = configs.findIndex((c) => c.id === num(body?.id, -1)); if (i >= 0) configs[i] = { ...configs[i], ...body, id: configs[i].id }; return ok(configs[i] ?? null) } },
  { url: '/api/sys/configs/:id', method: 'delete', response: ({ url }: Req) => { const id = num(url.split('/').pop(), -1); configs = configs.filter((c) => c.id !== id); return ok(null) } },

  /* ---------- 字典 ---------- */
  {
    url: '/api/sys/dicts',
    method: 'get',
    response: ({ query }: Req) => {
      let rows = [...dicts]
      const kw = (query.keyword || '').trim().toLowerCase()
      if (kw) rows = rows.filter((r) => `${r.name}${r.code}`.toLowerCase().includes(kw))
      if (query.status !== undefined && query.status !== '') rows = rows.filter((r) => String(r.status) === String(query.status))
      return ok(paginate(rows, num(query.page, 1), num(query.perPage, 10)))
    },
  },
  { url: '/api/sys/dicts/items', method: 'post', response: ({ body }: Req) => { const id = Math.max(0, ...dictItems.map((d) => d.id)) + 1; const d: DictItemVO = { id, dictId: num(body?.dictId, 1), label: body?.label ?? '新项', value: body?.value ?? '', sort: num(body?.sort, id), status: num(body?.status, 1) }; dictItems.push(d); return ok(d) } },
  { url: '/api/sys/dicts', method: 'post', response: ({ body }: Req) => { const id = Math.max(0, ...dicts.map((d) => d.id)) + 1; const d: DictVO = { id, name: body?.name ?? '新字典', code: body?.code ?? `dict_${id}`, status: num(body?.status, 1), remark: body?.remark ?? '', createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }; dicts.unshift(d); return ok(d) } },
  { url: '/api/sys/dicts/:id/items', method: 'get', response: ({ url }: Req) => { const id = num(url.split('/').slice(-2)[0], -1); return ok(dictItems.filter((d) => d.dictId === id).sort((a, b) => a.sort - b.sort)) } },
  { url: '/api/sys/dicts/:id', method: 'put', response: ({ body }: Req) => { const i = dicts.findIndex((d) => d.id === num(body?.id, -1)); if (i >= 0) dicts[i] = { ...dicts[i], ...body, id: dicts[i].id }; return ok(dicts[i] ?? null) } },
  { url: '/api/sys/dicts/:id', method: 'delete', response: ({ url }: Req) => { const id = num(url.split('/').pop(), -1); dicts = dicts.filter((d) => d.id !== id); dictItems = dictItems.filter((d) => d.dictId !== id); return ok(null) } },
  { url: '/api/sys/dicts/items/:id', method: 'delete', response: ({ url }: Req) => { const id = num(url.split('/').pop(), -1); dictItems = dictItems.filter((d) => d.id !== id); return ok(null) } },
] as MockMethod[]