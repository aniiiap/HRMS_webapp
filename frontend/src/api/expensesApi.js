import { api } from './client';

export const expensesApi = {
    // Categories
    getCategories: () => api.get('/api/expenses/categories/'),
    createCategory: (data) => api.post('/api/expenses/categories/', data),
    deleteCategory: (id) => api.delete(`/api/expenses/categories/${id}/`),

    // Claims
    getClaims: () => api.get('/api/expenses/claims/'),
    createClaim: (formData) => api.post('/api/expenses/claims/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    
    approveClaim: (id, data) => api.post(`/api/expenses/claims/${id}/approve/`, data),
    rejectClaim: (id, data) => api.post(`/api/expenses/claims/${id}/reject/`, data),
    bulkApprove: (claimIds) => api.post('/api/expenses/claims/bulk_approve/', { claim_ids: claimIds }),
    bulkReject: (claimIds) => api.post('/api/expenses/claims/bulk_reject/', { claim_ids: claimIds }),
    reimburseClaim: (id) => api.post(`/api/expenses/claims/${id}/reimburse/`),
    togglePayroll: (id) => api.post(`/api/expenses/claims/${id}/toggle_payroll/`),
    deleteClaim: (id) => api.delete(`/api/expenses/claims/${id}/`),
};
