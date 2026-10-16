import {
  Activity,
  ArrowUpRight,
  Boxes,
  CircleUser,
  Cpu,
  HardDrive,
  LineChart,
  Server,
  Users,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuthStore } from '@/lib/api'

interface Stat {
  title: string
  value: string
  delta: string
  deltaPositive: boolean
  icon: React.ReactNode
}

const cards: Stat[] = [
  {
    title: '总用户数',
    value: '8,642',
    delta: '+12.5%',
    deltaPositive: true,
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: '在线用户',
    value: '243',
    delta: '+3.2%',
    deltaPositive: true,
    icon: <CircleUser className="h-5 w-5" />,
  },
  {
    title: '菜单数量',
    value: '37',
    delta: '稳定',
    deltaPositive: true,
    icon: <Boxes className="h-5 w-5" />,
  },
  {
    title: '今日请求',
    value: '154.3K',
    delta: '+8.7%',
    deltaPositive: true,
    icon: <Activity className="h-5 w-5" />,
  },
]

const trend7d = [
  { day: '周一', visits: 4200, orders: 240 },
  { day: '周二', visits: 5100, orders: 310 },
  { day: '周三', visits: 4800, orders: 280 },
  { day: '周四', visits: 6200, orders: 410 },
  { day: '周五', visits: 7400, orders: 520 },
  { day: '周六', visits: 6800, orders: 470 },
  { day: '周日', visits: 5500, orders: 380 },
]

const modules = [
  { name: '用户', perm: 'sys:user:add', icon: <Users className="h-4 w-4" /> },
  { name: '角色', perm: 'sys:role:add', icon: <Server className="h-4 w-4" /> },
]

const quick = [
  { label: '用户管理', to: '/system/user', icon: <Users className="h-4 w-4" /> },
  { label: '菜单管理', to: '/system/menu', icon: <Boxes className="h-4 w-4" /> },
  { label: '字典管理', to: '/system/dict', icon: <LineChart className="h-4 w-4" /> },
]

const sysState = [
  { name: 'API 服务', status: '运行中', percent: 92, color: 'success' },
  { name: 'MySQL', status: '运行中', percent: 65, color: 'success' },
  { name: 'Redis', status: '运行中', percent: 28, color: 'success' },
  { name: '磁盘 IO', status: '空闲', percent: 12, color: 'secondary' },
]

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          你好，{user?.nickname || user?.username} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          欢迎使用 Admin Console — 基于 shadcn/ui 与 go-zero 构建的全栈管理框架
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.title}</p>
                  <p className="text-2xl font-semibold mt-2">{c.value}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  {c.icon}
                </div>
              </div>
              <div className="mt-3 text-xs">
                <span
                  className={
                    c.deltaPositive ? 'text-emerald-500' : 'text-amber-500'
                  }
                >
                  {c.delta}
                </span>
                <span className="text-muted-foreground ml-1">较上周</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>访问趋势</CardTitle>
              <CardDescription>过去 7 天访问量与下单量</CardDescription>
            </div>
            <Badge variant="success">↑ 8.7%</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend7d}>
                <defs>
                  <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="hsl(var(--primary))"
                  fill="url(#v)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
            <CardDescription>核心组件监控</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sysState.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-medium">{s.percent}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                  <div
                    className={
                      'h-full rounded-full ' +
                      (s.color === 'success' ? 'bg-emerald-500' : 'bg-amber-400')
                    }
                    style={{ width: `${s.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>每日订单</CardTitle>
            <CardDescription>柱状图示例</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trend7d}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>快捷入口</CardTitle>
            <CardDescription>常用模块直达</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {quick.map((q) => (
              <Button
                key={q.to}
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => (window.location.href = q.to)}
              >
                <span className="text-muted-foreground">{q.icon}</span>
                <span className="text-sm">{q.label}</span>
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => (window.location.href = '/demo/data-list')}
            >
              <span className="text-muted-foreground">
                <HardDrive className="h-4 w-4" />
              </span>
              <span className="text-sm">业务示例</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => (window.location.href = '/system/about')}
            >
              <span className="text-muted-foreground">
                <Cpu className="h-4 w-4" />
              </span>
              <span className="text-sm">关于</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}