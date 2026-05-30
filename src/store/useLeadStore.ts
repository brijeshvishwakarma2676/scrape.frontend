import { create } from 'zustand'

interface LeadFilters {
  search: string
  lead_status: string
  website_status: string
}

interface LeadStore {
  filters: LeadFilters
  setSearch: (search: string) => void
  setLeadStatus: (status: string) => void
  setWebsiteStatus: (status: string) => void
  resetFilters: () => void
}

const defaultFilters: LeadFilters = {
  search: '',
  lead_status: '',
  website_status: '',
}

export const useLeadStore = create<LeadStore>((set) => ({
  filters: defaultFilters,
  setSearch: (search) => set((s) => ({ filters: { ...s.filters, search } })),
  setLeadStatus: (lead_status) => set((s) => ({ filters: { ...s.filters, lead_status } })),
  setWebsiteStatus: (website_status) => set((s) => ({ filters: { ...s.filters, website_status } })),
  resetFilters: () => set({ filters: defaultFilters }),
}))
