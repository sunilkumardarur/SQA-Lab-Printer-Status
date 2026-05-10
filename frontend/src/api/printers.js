import axios from 'axios'

const api = axios.create({ baseURL: '/api/printers' })

export const getPrinters = () => api.get('/').then(r => r.data)

export const addPrinter = (data) => api.post('/', data).then(r => r.data)

export const removePrinter = (sl_no) => api.delete(`/${sl_no}`).then(r => r.data)

export const deleteWithPassword = (sl_no, password) =>
  api.post(`/${sl_no}/delete-with-password`, { password }).then(r => r.data)

export const refreshPrinter = (sl_no) => api.post(`/${sl_no}/refresh`).then(r => r.data)

export const refreshAll = () => api.post('/refresh-all').then(r => r.data)

export const reservePrinter = (sl_no, user) =>
  api.post(`/${sl_no}/reserve`, { user }).then(r => r.data)

export const releasePrinter = (sl_no, user = '', password = '') =>
  api.post(`/${sl_no}/release`, { user, password }).then(r => r.data)

export const clearAllPrinters = (password) =>
  api.post('/clear-all', { password }).then(r => r.data)
