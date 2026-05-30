import api from './client'

export interface Message {
  id: number
  business_id: number
  generated_message: string
  created_at: string
}

export interface ParsedMessage {
  whatsapp: string
  sms: string
}

export function parseMessage(raw: string): ParsedMessage {
  try {
    return JSON.parse(raw)
  } catch {
    return { whatsapp: raw, sms: raw }
  }
}

export const messagesApi = {
  list: (businessId: number) =>
    api.get<Message[]>(`/messages/${businessId}`).then((r) => r.data),

  generate: (businessId: number) =>
    api.post<Message>('/messages', { business_id: businessId }).then((r) => r.data),
}
