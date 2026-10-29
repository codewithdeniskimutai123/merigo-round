
import axios from 'axios'

const baseURL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '')

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})


const refreshClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})


const publicAuthEndpoints = [
  '/api/auth/login/',
  '/api/auth/register/',
  '/api/auth/refresh/',
  '/api/auth/forgot-password/',
  '/api/auth/reset-password/',
  '/api/auth/google/',
]

function isPublicAuthRequest(url = '') {
  return publicAuthEndpoints.some((endpoint) =>
    url.includes(endpoint),
  )
}


function isAccessTokenExpired(token) {
  try {
    const payload = token.split('.')[1]
    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const decodedPayload = atob(
      normalizedPayload.padEnd(
        Math.ceil(normalizedPayload.length / 4) * 4,
        '=',
      ),
    )

    const { exp } = JSON.parse(decodedPayload)

    if (typeof exp !== 'number') {
      return true
    }

    const currentTime = Math.floor(Date.now() / 1000)

    return exp <= currentTime + 30
  } catch {
   
    return true
  }
}

function clearAuthentication() {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
  localStorage.removeItem('user')

  window.dispatchEvent(new Event('auth-change'))
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}


let refreshPromise = null

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const refresh = localStorage.getItem('refresh')

    if (!refresh) {
      throw new Error('Your session has expired. Please log in again.')
    }

    const response = await refreshClient.post(
      '/api/auth/refresh/',
      { refresh },
    )

    const { access, refresh: newRefresh } = response.data

    if (!access || isAccessTokenExpired(access)) {
      throw new Error('The server did not return a valid access token.')
    }

    localStorage.setItem('access', access)

   
    if (newRefresh) {
      localStorage.setItem('refresh', newRefresh)
    }

    return access
  })()

  try {
    return await refreshPromise
  } catch (error) {
    clearAuthentication()
    redirectToLogin()
    throw error
  } finally {
    refreshPromise = null
  }
}


api.interceptors.request.use(
  async (config) => {
    if (isPublicAuthRequest(config.url)) {
      return config
    }

    let access = localStorage.getItem('access')

    if (!access || isAccessTokenExpired(access)) {
      access = await refreshAccessToken()
    }

    config.headers.set('Authorization', `Bearer ${access}`)

    return config
  },
)


api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isPublicAuthRequest(originalRequest.url)
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const access = await refreshAccessToken()

      originalRequest.headers.set(
        'Authorization',
        `Bearer ${access}`,
      )

      return api(originalRequest)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  },
)

export default api
