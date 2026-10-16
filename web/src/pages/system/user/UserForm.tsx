import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RoleAPI, UserAPI, type RoleVO, type UserVO } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface UserFormProps {
  data?: UserVO
  onSubmit: (form: Partial<UserVO> & { password?: string }) => void | Promise<void>
  onCancel: () => void
}

const initial: Partial<UserVO> & { password?: string } = {
  username: '',
  nickname: '',
  email: '',
  phone: '',
  gender: 0,
  status: 1,
  roleIds: [],
  password: '',
}

export function UserForm({ data, onSubmit, onCancel }: UserFormProps) {
  const [form, setForm] = useState<Partial<UserVO> & { password?: string }>(initial)
  const [busy, setBusy] = useState(false)
  const [roleIds, setRoleIds] = useState<number[]>([])
  const [status, setStatus] = useState(1)
  const [gender, setGender] = useState(0)
  const { data: roles, isLoading: rolesLoading } = useQuery<RoleVO[]>({
    queryKey: ['role-options'],
    queryFn: () => RoleAPI.options(),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (data) {
      setForm({ ...data, password: '' })
      setRoleIds(data.roleIds || [])
      setStatus(data.status ?? 1)
      setGender(data.gender ?? 0)
    }
  }, [data])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username) {
      toast.error('请输入账号')
      return
    }
    if (!data && !form.password) {
      toast.error('请输入密码')
      return
    }
    setBusy(true)
    try {
      await onSubmit({ ...form, roleIds, status, gender })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 px-6 pb-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">账号</Label>
          <Input
            id="username"
            value={form.username || ''}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            disabled={!!data}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            placeholder={data ? '留空表示不修改' : '请输入密码'}
            value={form.password || ''}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!data}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nickname">昵称</Label>
          <Input
            id="nickname"
            value={form.nickname || ''}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">手机号</Label>
          <Input
            id="phone"
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>性别</Label>
          <Select
            value={String(gender)}
            onValueChange={(v) => setGender(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">未知</SelectItem>
              <SelectItem value="1">男</SelectItem>
              <SelectItem value="2">女</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>角色</Label>
        {rolesLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> 加载角色...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(roles || []).map((r) => {
              const checked = roleIds.includes(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    setRoleIds(
                      checked
                        ? roleIds.filter((x) => x !== r.id)
                        : [...roleIds, r.id]
                    )
                  }
                  className={
                    'rounded-md border px-3 py-1.5 text-sm transition-colors ' +
                    (checked
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-accent')
                  }
                >
                  {r.name}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
        <div>
          <Label className="text-sm">状态</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            禁用后用户无法登录
          </p>
        </div>
        <Switch checked={status === 1} onCheckedChange={(v) => setStatus(v ? 1 : 0)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="remark">备注</Label>
        <Input
          id="remark"
          value={form.remark || ''}
          onChange={(e) => setForm({ ...form, remark: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          取消
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          保存
        </Button>
      </div>
    </form>
  )
}