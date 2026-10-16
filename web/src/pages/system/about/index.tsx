import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cpu, Database, Github, Layers, Lock, Server } from 'lucide-react'

const techStack = [
  { name: 'Go 1.24', category: '后端语言', icon: <Server className="h-4 w-4" /> },
  { name: 'go-zero v1.7.6', category: '微服务框架', icon: <Cpu className="h-4 w-4" /> },
  { name: 'MySQL 8', category: '关系数据库', icon: <Database className="h-4 w-4" /> },
  { name: 'Redis 7', category: '缓存', icon: <Lock className="h-4 w-4" /> },
  { name: 'React 18', category: '前端框架', icon: <Layers className="h-4 w-4" /> },
  { name: 'shadcn/ui', category: 'UI 组件库', icon: <Layers className="h-4 w-4" /> },
  { name: 'Tailwind CSS v3', category: '样式系统', icon: <Layers className="h-4 w-4" /> },
  { name: 'TanStack Query/Table', category: '数据层', icon: <Layers className="h-4 w-4" /> },
  { name: 'Vite 5', category: '构建工具', icon: <Layers className="h-4 w-4" /> },
]

export default function About() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>关于本框架</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Admin Console 是一个面向中后台的全栈管理框架，采用 go-zero + shadcn/ui 技术栈构建。
            前后端分离，开箱即用的用户/角色/菜单/参数/字典管理，支持动态路由权限、抽屉式 CRUD、批量操作、
            主题切换、暗色模式等特性。Docker Compose 一键起。
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">v0.1.0</Badge>
            <Badge variant="success">Prod Ready</Badge>
            <Badge variant="outline">MIT License</Badge>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" asChild>
              <a href="https://github.com/zeromicro/go-zero" target="_blank" rel="noreferrer">
                <Github className="h-4 w-4" />
                go-zero
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://ui.shadcn.com" target="_blank" rel="noreferrer">
                shadcn/ui
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>技术栈</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {techStack.map((t) => (
              <div
                key={t.name + t.category}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
              >
                <span className="text-muted-foreground">{t.icon}</span>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.category}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}