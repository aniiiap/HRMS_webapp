import { api } from './client';

export const helpdeskApi = {
    getTickets: () => api.get('/api/helpdesk/tickets/'),
    getTicket: (id) => api.get(`/api/helpdesk/tickets/${id}/`),
    createTicket: (formData) => api.post('/api/helpdesk/tickets/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateTicketStatus: (id, status) => api.patch(`/api/helpdesk/tickets/${id}/update_status/`, { status }),
    deleteTicket: (id) => api.delete(`/api/helpdesk/tickets/${id}/`),
    
    getMessages: (ticketId) => api.get('/api/helpdesk/messages/', { params: { ticket: ticketId } }),
    createMessage: (formData) => api.post('/api/helpdesk/messages/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deleteMessage: (id) => api.delete(`/api/helpdesk/messages/${id}/`),

    getPlatformTickets: () => api.get('/api/helpdesk/platform-tickets/'),
    getPlatformTicket: (id) => api.get(`/api/helpdesk/platform-tickets/${id}/`),
    createPlatformTicket: (formData) => api.post('/api/helpdesk/platform-tickets/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updatePlatformTicketStatus: (id, status) => api.patch(`/api/helpdesk/platform-tickets/${id}/update_status/`, { status }),
    deletePlatformTicket: (id) => api.delete(`/api/helpdesk/platform-tickets/${id}/`),
    
    getPlatformMessages: (ticketId) => api.get('/api/helpdesk/platform-messages/', { params: { ticket: ticketId } }),
    createPlatformMessage: (formData) => api.post('/api/helpdesk/platform-messages/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    deletePlatformMessage: (id) => api.delete(`/api/helpdesk/platform-messages/${id}/`)
};
