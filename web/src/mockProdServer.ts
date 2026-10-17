import { createProdMockServer } from 'vite-plugin-mock/es/createProdMockServer'
import authMock from '../mock/auth'
import dataMock from '../mock/data'
import type { MockMethod } from 'vite-plugin-mock'

/** 路由特异度：路径段数优先，其次路径长度。段数越多 / 越长 → 越具体。
 *  例：/api/demo/gallery/categories（5 段）> /api/demo/gallery（4 段）
 */
function specificity(url: string): number {
  return url.split('/').filter(Boolean).length * 1000 + url.length
}

/**
 * 生产构建（build / build:preview）中由 injectCode 调用，聚合所有 mock 模块。
 *
 * 关键：注册前必须先「按特异度降序」排序。
 *
 * 背景（vite-plugin-mock 2.9.8 的坑）：
 * - 生产端 createProdMockServer 用 pathToRegexp(url, undefined, { end: false }) 注册，
 *   即非精确匹配 → 父路由 /api/demo/gallery 的正则同样能命中子路由
 *   /api/demo/gallery/categories。
 * - mockjs 的 find() 按注册顺序返回「第一个」命中项，于是父路由抢先命中，
 *   子路由永远返回列表数据（{ list, total }）。页面拿到的不是数组 → 画廊页
 *   `facets.reduce is not a function` 白屏；其余子路由（products/stats、
 *   sys/roles/menus、sys/dicts/items、sys/configs/by-key 等）则是拿到错误数据。
 * - dev 端（vite-plugin-mock/dist/index.js）用的是默认精确匹配，所以本地 dev 不复现，
 *   只有构建产物（Vercel / GitHub Pages 预览）才暴露。
 *
 * 排序让具体子路由先注册，等价于「最长匹配优先」，一次性修掉所有父子路由冲突；
 * 同时保留 end:false 对 query string 的容忍（列表接口带 ?page=1 仍能命中）。
 */
export function setupProdMockServer() {
  const list = [...authMock, ...dataMock] as MockMethod[]
  const sorted = [...list].sort((a, b) => {
    if (typeof a.url !== 'string' || typeof b.url !== 'string') return 0
    return specificity(b.url) - specificity(a.url)
  })
  createProdMockServer(sorted)
}
