import { defineConfig, loadEnv, type ConfigEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteMockServe } from 'vite-plugin-mock'

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  // 读取当前 mode 下的环境变量（.env / .env.[mode]）
  const env = loadEnv(mode, process.cwd())

  // 双轨开关：仅当 VITE_USE_MOCK === 'true' 时挂载 Mock 插件；
  // 真实联调（dev / build）下不加载 → 对现有业务代码零侵入、零污染。
  const useMock = env.VITE_USE_MOCK === 'true'

  return {
    // 仅 Mock 预览（build:preview）通过 .env.preview 的 VITE_BASE 设置 GitHub Pages 项目页子路径；
    // 真实部署（dev / build）不加载 .env.preview → base 默认 '/'，对业务零侵入
    base: env.VITE_BASE || '/',
    // 双轨依赖缓存隔离：mock 轨（viteMockServe 插件）与真实轨的 optimizeDeps 哈希不同，
    // 共用 node_modules/.vite 会互相判定缓存失效、反复清理；分开存放彻底避免互踩。
    cacheDir: useMock ? 'node_modules/.vite-mock' : 'node_modules/.vite',
    plugins: [
      react(),
      // 仅 Mock 轨道启用 vite-plugin-mock
      ...(useMock
        ? [
            viteMockServe({
              mockPath: 'mock',
              localEnabled: true,
              prodEnabled: true,
              // v2.9.8 通过 transform 将 injectCode 追加到入口模块末尾：
              // 默认自动识别只找 src/main.ts|js，本项目入口是 src/main.tsx，必须显式指定，否则注入静默失效
              injectFile: 'src/main.tsx',
              // 入口在 src/ 下，故相对路径写成 ./mockProdServer（解析为 src/mockProdServer.ts）
              injectCode: `
import { setupProdMockServer } from './mockProdServer';
setupProdMockServer();
`,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true, // never fall back to 5174 - keep the dev URL fixed
      // 仅真实联调时启用后端代理；Mock 轨道不连接后端，避免请求被代理到 8088
      ...(useMock
        ? {}
        : {
            proxy: {
              '/api': {
                target: 'http://127.0.0.1:8088',
                changeOrigin: true,
              },
            },
          }),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
    },
  }
})
