/**
 * 应用默认落地页。
 *
 * 登录成功后的跳转、以及 Layout 内对根路径 "/" 的兜底跳转都以此为唯一来源，
 * 避免默认值散落在多个文件里产生不一致。
 *
 * 说明：这里只是「无参数访问时的默认页」。
 * 若用户通过 ?redirect=xxx 指定了跳转目标，仍以 redirect 优先。
 */
export const DEFAULT_ROUTE = '/system/about'

/** 取登录后的目标地址：优先使用 URL 上的 redirect，其次默认页 */
export function resolvePostLoginPath(redirect: string | null | undefined): string {
  // 只接受站内绝对路径，避免 open redirect
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }
  return DEFAULT_ROUTE
}