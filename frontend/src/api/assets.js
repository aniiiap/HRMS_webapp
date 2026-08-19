import { api } from './client'

export const assetsApi = {
  // Categories
  getCategories: (params) => api.get('/api/asset-categories/', { params }),
  createCategory: (data) => api.post('/api/asset-categories/', data),
  deleteCategory: (id) => api.delete(`/api/asset-categories/${id}/`),
  
  // Assets
  getAssets: (params) => api.get('/api/assets/', { params }),
  getAsset: (id) => api.get(`/api/assets/${id}/`),
  createAsset: (data) => api.post('/api/assets/', data),
  updateAsset: (id, data) => api.put(`/api/assets/${id}/`, data),
  deleteAsset: (id) => api.delete(`/api/assets/${id}/`),
  
  // Assignments
  assignAsset: (id, data) => api.post(`/api/assets/${id}/assign/`, data),
  bulkAssign: (data) => api.post('/api/assets/bulk_assign/', data),
  returnAsset: (id, data) => api.post(`/api/assets/${id}/return_asset/`, data),
  
  // Assignment Records
  getAssignments: (params) => api.get('/api/asset-assignments/', { params }),
}
