import axios, { type AxiosError } from 'axios'
import { toast } from '@/components/ui/use-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

// Always attach the API key on every request (read per-request, not once at module load)
api.interceptors.request.use((config) => {
  config.headers['Content-Type'] = 'application/json'
  const key = import.meta.env.VITE_API_SECRET_KEY
  if (key) config.headers['X-API-Key'] = key
  return config
})

// Global error handler — show toast for common failures
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status

    if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
      toast({ title: 'Cannot reach server. Is the backend running?', variant: 'destructive' })
    } else if (status === 401) {
      toast({ title: 'Unauthorized — check your API key.', variant: 'destructive' })
    } else if (status === 422) {
      // Validation errors — let individual callers handle these
    } else if (status && status >= 500) {
      toast({ title: 'Server error. Check backend logs.', variant: 'destructive' })
    }

    return Promise.reject(err)
  }
)

export default api
