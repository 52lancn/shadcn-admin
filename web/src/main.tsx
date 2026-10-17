import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
// 本地自托管字体（可变字体，离线可用，替代 fonts.googleapis.com 外链）
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import App from './App'
import './index.css'
import { TooltipProvider } from '@/components/ui/tooltip'

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: false },
  },
})

// Vite base：dev / 真实构建为 '/'，mock 预览（build:preview）为 '/shadcn_admin/'。
// React Router 的 basename 不带尾斜杠；为 '/' 时传空串，等价于不设 basename。
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter basename={basename}>
        <TooltipProvider delayDuration={200} skipDelayDuration={0}>
          <App />
          <Toaster richColors position="top-right" closeButton />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)