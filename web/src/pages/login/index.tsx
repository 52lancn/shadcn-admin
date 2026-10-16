import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/api'
import { useThemeBootstrap } from '@/lib/theme'

export default function Login() {
  useThemeBootstrap()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const login = useAuthStore((s) => s.login)
  const token = useAuthStore((s) => s.token)
  const [form, setForm] = useState({ username: 'admin', password: '123456' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (token) {
      navigate(params.get('redirect') || '/dashboard', { replace: true })
    }
  }, [token, navigate, params])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(form.username, form.password)
      toast.success('登录成功')
      navigate(params.get('redirect') || '/dashboard', { replace: true })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/40 to-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-fade-in" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground mb-4">
            <svg viewBox="0 0 32 32" className="w-7 h-7">
              <path d="M9 9 L16 23 L23 9 L20 9 L16 17 L12 9 Z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            shadcn/ui + go-zero • 全栈管理框架
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="username">账号</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="请输入账号"
                className="pl-9"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoFocus
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                className="pl-9"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            登录
          </Button>
          <p className="text-xs text-muted-foreground text-center pt-2 border-t">
            默认账号 admin / 密码 123456
          </p>
        </form>
      </div>
    </div>
  )
}