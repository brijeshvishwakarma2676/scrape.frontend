import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
    ...(import.meta.env.VITE_API_SECRET_KEY
      ? { 'X-API-Key': import.meta.env.VITE_API_SECRET_KEY }
      : {}),
  },
})

export default api
