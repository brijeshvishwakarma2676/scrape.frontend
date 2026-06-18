import api from './client'

export interface Business {
  id: number
  name: string
  category: string | null
  phone: string | null
  phone_type: 'mobile' | 'landline' | 'unknown' | null
  website: string | null
  address: string | null
  rating: number | null
  review_count: number | null
  website_status: 'UNCHECKED' | 'NO_WEBSITE' | 'WORKING' | 'BROKEN'
  lead_status: 'NEW' | 'CONTACTED' | 'INTERESTED' | 'WON' | 'LOST'
  notes: string | null
  next_followup_date: string | null
  created_at: string
}

export interface BusinessCreate {
  name: string
  category?: string
  phone?: string
  website?: string
  address?: string
  rating?: number
  review_count?: number
}

export interface BusinessUpdate {
  name?: string
  category?: string
  phone?: string
  website?: string
  address?: string
  rating?: number
  review_count?: number
  website_status?: string
  lead_status?: string
  notes?: string
  next_followup_date?: string | null
}

export interface DashboardStats {
  total: number
  no_website: number
  broken_website: number
  contacted: number
  interested: number
  won: number
}

export interface TimePoint {
  date: string
  new: number
  cumulative: number
}

export interface NameValue {
  name: string
  value: number
}

export interface Analytics {
  leads_over_time: TimePoint[]
  lead_status: NameValue[]
  website_status: NameValue[]
  phone_type: NameValue[]
  top_categories: NameValue[]
  funnel: NameValue[]
  messages_sent: number
}

export interface PaginatedBusinesses {
  items: Business[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface ListParams {
  search?: string
  lead_status?: string
  website_status?: string
  phone_type?: string
  sort_by?: string
  sort_dir?: string
  page?: number
  limit?: number
}

export const businessesApi = {
  list: (params?: ListParams) =>
    api.get<PaginatedBusinesses>('/businesses', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<Business>(`/businesses/${id}`).then((r) => r.data),

  create: (data: BusinessCreate) =>
    api.post<Business>('/businesses', data).then((r) => r.data),

  update: (id: number, data: BusinessUpdate) =>
    api.put<Business>(`/businesses/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/businesses/${id}`),

  stats: () =>
    api.get<DashboardStats>('/businesses/stats').then((r) => r.data),

  analytics: () =>
    api.get<Analytics>('/businesses/analytics').then((r) => r.data),

  checkWebsite: (id: number) =>
    api.post<Business>(`/check/business/${id}`).then((r) => r.data),

  bulkProcess: (ids: number[]) =>
    api.post<{ websites_checked: number; messages_generated: number; errors: number }>(
      '/pipeline/bulk',
      { business_ids: ids }
    ).then((r) => r.data),

  bulkDelete: (ids: number[]) =>
    api.post('/businesses/bulk-delete', { ids }),

  bulkStatus: (ids: number[], status: string) =>
    api.post('/businesses/bulk-status', { ids, status }).then((r) => r.data),
}
