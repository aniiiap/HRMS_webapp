import { api } from './client'

export const getHolidays = () => api.get('/api/holidays/')
export const createHoliday = (data) => api.post('/api/holidays/', data)
export const updateHoliday = (id, data) => api.patch(`/api/holidays/${id}/`, data)
export const deleteHoliday = (id) => api.delete(`/api/holidays/${id}/`)
export const getShiftTemplates = () => api.get('/api/employees/shift-templates/')
