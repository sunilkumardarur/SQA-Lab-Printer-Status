import { useState, useCallback } from 'react'
import * as api from '../api/notifications'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications()
      setNotifications(data)
    } catch {
      // silently fail — notifications are non-critical
    }
  }, [])

  const createNotification = useCallback(async (data) => {
    const notif = await api.createNotification(data)
    setNotifications(prev => [...prev, notif])
    return notif
  }, [])

  const markDone = useCallback(async (id, password) => {
    await api.markDone(id, password)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return { notifications, loadNotifications, createNotification, markDone }
}
