// HTTP API client — talks to Express backend at /api/*
// Vite proxies /api/* to localhost:3001 in development.

const TOKEN_KEY = 'dpa:jwt'
const REFRESH_TOKEN_KEY = 'dpa:refresh-token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

function setRefreshToken(token) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token)
  else localStorage.removeItem(REFRESH_TOKEN_KEY)
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return false
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
  if (!res.ok) {
    setToken(null)
    setRefreshToken(null)
    return false
  }
  const data = await res.json()
  setToken(data.token)
  setRefreshToken(data.refreshToken)
  return true
}

async function request(method, path, body, retried = false) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined
  })

  // Handle no-content responses
  if (res.status === 204) return null

  const responseText = await res.text()
  let data = {}
  if (responseText.trim()) {
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(`Server returned an invalid response (${res.status}). Check that the API server is running.`)
    }
  }
  if (!res.ok) {
    if (res.status === 401 && !retried && path !== '/auth/refresh' && await refreshAccessToken()) {
      return request(method, path, body, true)
    }
    const detail = data.detail ? ` - ${data.detail}` : ''
    throw new Error((data.error || `Request failed: ${res.status}`) + detail)
  }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path)
}

// Auth-specific helpers
export async function apiLogin(email, password) {
  const { doctor, token, refreshToken } = await api.post('/auth/login', { email, password })
  setToken(token)
  setRefreshToken(refreshToken)
  return doctor
}

export async function apiRegister(payload) {
  const { doctor, token, refreshToken, clinicSlug, clinicLoginUrl } = await api.post('/auth/register', payload)
  setToken(token)
  setRefreshToken(refreshToken)
  return { ...doctor, token, clinicSlug, clinicLoginUrl }
}

export async function apiMe() {
  return api.get('/auth/me')
}

export function apiLogout() {
  setToken(null)
  setRefreshToken(null)
}
