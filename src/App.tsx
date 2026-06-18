import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/Layout'
import { Leads } from '@/pages/Leads'
import { LeadDetails } from '@/pages/LeadDetails'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy-loaded so the charting library (recharts) only downloads when the dashboard is opened
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route
              index
              element={
                <Suspense fallback={<div className="p-4 sm:p-8"><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-64 w-full" /></div>}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetails />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
