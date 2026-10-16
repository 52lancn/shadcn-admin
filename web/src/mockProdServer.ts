import { createProdMockServer } from 'vite-plugin-mock/es/createProdMockServer'
import authMock from '../mock/auth'
import dataMock from '../mock/data'

// 生产构建（build:preview）中由 injectCode 调用，聚合所有 mock 模块
export function setupProdMockServer() {
  createProdMockServer([...authMock, ...dataMock])
}
