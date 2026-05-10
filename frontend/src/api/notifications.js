import axios from 'axios'

const api = axios.create({ baseURL: '/api/notifications' })

export const getNotifications = () => api.get('/').then(r => r.data)

export const createNotification = (data) => api.post('/', data).then(r => r.data)

export const markDone = (id, password) =>
  api.post(`/${id}/done`, { password }).then(r => r.data)
