/** 是否为 Mock 预览模式（由 .env.* 中的 VITE_USE_MOCK 控制） */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/**
 * 应用默认落地页（单一来源）。
 *
 * 登录成功后的跳转、以及 Layout 内对根路径 "/" 的兜底跳转都以此为唯一来源，
 * 避免默认值散落在多个文件里产生不一致。
 *
 * 取值规则：
 * - Mock 预览模式 (VITE_USE_MOCK=true)：默认显示「关于系统」/system/about
 * - 真实联调模式 (VITE_USE_MOCK=false/未设置)：默认显示「工作台」/dashboard
 *
 * 说明：这里只是「无参数访问时的默认页」。
 * 若用户通过 ?redirect=xxx 指定了跳转目标，仍以 redirect 优先。
 */
export const DEFAULT_ROUTE = USE_MOCK ? '/system/about' : '/dashboard'

/** 取登录后的目标地址：优先使用 URL 上的 redirect，其次默认页 */
export function resolvePostLoginPath(redirect: string | null | undefined): string {
  // 只接受站内绝对路径，避免 open redirect；
  // 根路径 "/"（如由路由守卫从首页带出的 redirect=%2F）不算有效目标，回落默认页，
  // 否则会先跳到 "/" 再由 Layout 二次重定向，客户端路由下那一跳可能落空导致内容空白。
  if (redirect && redirect !== '/' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }
  return DEFAULT_ROUTE
}