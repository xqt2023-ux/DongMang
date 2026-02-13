import axios from 'axios'

/**
 * 基础 API 客户端
 */
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const aiClient = axios.create({
  baseURL: '/ai',
  timeout: 120000, // AI接口可能较慢
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // TODO: 后续添加认证token
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败'
    console.error('API Error:', message)
    return Promise.reject(new Error(message))
  }
)

aiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'AI服务请求失败'
    console.error('AI Service Error:', message)
    return Promise.reject(new Error(message))
  }
)

export { apiClient, aiClient }
