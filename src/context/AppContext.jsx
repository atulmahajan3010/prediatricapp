import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api, apiLogin, apiRegister, apiMe, apiLogout, getToken } from '../lib/api.js'
import { activateLicense, getActivation, getMachineId } from '../lib/license.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [doctor, setDoctor] = useState(null)
  const [authLoading, setAuthLoading] = useState(true) // checking existing session
  const [activation, setActivation] = useState(() => getActivation())
  const machineId = getMachineId()

  // Rehydrate session from stored JWT on page load
  useEffect(() => {
    const token = getToken()
    if (!token) { setAuthLoading(false); return }
    apiMe()
      .then(setDoctor)
      .catch(() => { apiLogout() })
      .finally(() => setAuthLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const d = await apiLogin(email, password)
    setDoctor(d)
    return d
  }, [])

  const register = useCallback(async (payload) => {
    const d = await apiRegister(payload)
    return d
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setDoctor(null)
  }, [])

  const activate = useCallback((key) => {
    const result = activateLicense(key)
    if (result.success) setActivation(result.activation)
    return result
  }, [])

  return (
    <AppContext.Provider value={{ doctor, login, register, logout, authLoading, activation, machineId, activate }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAuth must be used within AppProvider')
  return ctx
}

// Generic reactive collection hook - fetches from the API
// Same API surface as the localStorage version so all pages work unchanged,
// except add/edit/del are now async (await them in event handlers).
export function useCollection(collection, query = '') {
  const { doctor } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!doctor) { setItems([]); return }
    setLoading(true)
    try {
      const data = await api.get(`/${collection}${query ? `?${query}` : ''}`)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(`useCollection(${collection}) refresh error:`, err.message)
    } finally {
      setLoading(false)
    }
  }, [doctor, collection, query])

  useEffect(() => { refresh() }, [refresh])

  const add = useCallback(async (data) => {
    const record = await api.post(`/${collection}`, data)
    await refresh()
    return record
  }, [collection, refresh])

  const edit = useCallback(async (id, patch) => {
    const record = await api.put(`/${collection}/${id}`, patch)
    await refresh()
    return record
  }, [collection, refresh])

  const del = useCallback(async (id) => {
    await api.delete(`/${collection}/${id}`)
    await refresh()
  }, [collection, refresh])

  // Used by Medicines bulk CSV import
  const bulkImport = useCallback(async (medicines) => {
    const result = await api.post('/medicines/bulk-import', { medicines })
    await refresh()
    return result
  }, [refresh])

  const loadMore = useCallback(async () => {
    if (!doctor || !query || loading) return
    setLoading(true)
    try {
      const separator = query ? '&' : '?'
      const data = await api.get(`/${collection}?${query}${separator}offset=${items.length}`)
      if (Array.isArray(data) && data.length > 0) setItems((current) => [...current, ...data])
      return Array.isArray(data) ? data.length : 0
    } catch (err) {
      console.error(`useCollection(${collection}) load more error:`, err.message)
      return 0
    } finally {
      setLoading(false)
    }
  }, [doctor, collection, query, items.length, loading])

  return { items, loading, add, edit, del, refresh, loadMore, bulkImport }
}

// Clinic profile hook
export function useClinicProfile() {
  const { doctor } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!doctor) { setProfile(null); return }
    setLoading(true)
    try {
      const data = await api.get('/clinic-profile')
      setProfile(data)
    } finally {
      setLoading(false)
    }
  }, [doctor])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const save = useCallback(async (data) => {
    const saved = await api.put('/clinic-profile', data)
    setProfile(saved)
    return saved
  }, [])

  return { profile, loading, save }
}
