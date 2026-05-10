import { useState, useCallback } from 'react'
import * as api from '../api/printers'

export function usePrinters() {
  const [printers, setPrinters] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [refreshing, setRefreshing] = useState({})
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getPrinters()
      setPrinters(data)
    } catch {
      setError('Failed to load printers.')
    } finally {
      setLoading(false)
    }
  }, [])

  const add = useCallback(async (form) => {
    const printer = await api.addPrinter(form)
    setPrinters(prev => [...prev, printer])
    return printer
  }, [])

  const remove = useCallback(async (sl_no, password) => {
    if (password) {
      await api.deleteWithPassword(sl_no, password)
    } else {
      await api.removePrinter(sl_no)
    }
    setPrinters(prev => prev.filter(p => p.sl_no !== sl_no))
  }, [])

  const refresh = useCallback(async (sl_no) => {
    setRefreshing(prev => ({ ...prev, [sl_no]: true }))
    try {
      const updated = await api.refreshPrinter(sl_no)
      setPrinters(prev => prev.map(p => p.sl_no === sl_no ? updated : p))
    } finally {
      setRefreshing(prev => ({ ...prev, [sl_no]: false }))
    }
  }, [])

  const refreshAllPrinters = useCallback(async () => {
    setRefreshingAll(true)
    try {
      const updated = await api.refreshAll()
      setPrinters(updated)
    } finally {
      setRefreshingAll(false)
    }
  }, [])

  const reserve = useCallback(async (sl_no, user) => {
    const updated = await api.reservePrinter(sl_no, user)
    setPrinters(prev => prev.map(p => p.sl_no === sl_no ? updated : p))
  }, [])

  const release = useCallback(async (sl_no, user = '', password = '') => {
    const updated = await api.releasePrinter(sl_no, user, password)
    setPrinters(prev => prev.map(p => p.sl_no === sl_no ? updated : p))
  }, [])

  return {
    printers, loading, refreshingAll, refreshing, error,
    load, add, remove, refresh, refreshAllPrinters, reserve, release,
  }
}
