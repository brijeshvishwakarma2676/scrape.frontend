import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Globe, Phone, MapPin, Star, Loader2,
  Wand2, Copy, Check, RefreshCw, Trash2, MessageCircle
} from 'lucide-react'
import { businessesApi, type BusinessUpdate } from '@/api/businesses'
import { messagesApi, parseMessage } from '@/api/messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { WebsiteStatusBadge, LeadStatusBadge } from '@/components/StatusBadge'
import { toast } from '@/components/ui/use-toast'

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'WON', 'LOST']

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={copy}>
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

function WhatsAppButton({ phone, message }: { phone: string | null; message: string }) {
  const normalise = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('91') && digits.length === 12) return digits   // already +91xxxxxxxxxx
    if (digits.startsWith('0') && digits.length === 11) return '91' + digits.slice(1) // 0xxxxxxxxxx → 91xxxxxxxxxx
    if (digits.length === 10) return '91' + digits                       // bare 10-digit
    return digits
  }
  const cleaned = phone ? normalise(phone) : ''
  const encoded = encodeURIComponent(message)
  const url = cleaned
    ? `https://wa.me/${cleaned}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`
  return (
    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-emerald-400 hover:text-emerald-300" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-3 w-3" />
        Send on WhatsApp
      </a>
    </Button>
  )
}

export function LeadDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const businessId = parseInt(id!)

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => businessesApi.get(businessId),
  })

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', businessId],
    queryFn: () => messagesApi.list(businessId),
  })

  const [notes, setNotes] = useState<string>('')
  const [notesChanged, setNotesChanged] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (data: BusinessUpdate) => businessesApi.update(businessId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['business', businessId], updated)
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast({ title: 'Saved' })
    },
    onError: () => toast({ title: 'Failed to save', variant: 'destructive' }),
  })

  const checkMutation = useMutation({
    mutationFn: () => businessesApi.checkWebsite(businessId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['business', businessId], updated)
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast({ title: `Website is ${updated.website_status.toLowerCase().replace('_', ' ')}` })
    },
    onError: () => toast({ title: 'Check failed', variant: 'destructive' }),
  })

  const generateMutation = useMutation({
    mutationFn: () => messagesApi.generate(businessId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', businessId] })
      toast({ title: 'Message generated' })
    },
    onError: () => toast({ title: 'Generation failed', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => businessesApi.delete(businessId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      navigate('/leads')
    },
  })

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    )
  }

  if (!business) return null

  const currentNotes = notesChanged ? notes : (business.notes ?? '')

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/leads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{business.name}</h1>
            <p className="text-sm text-muted-foreground">{business.category || 'No category'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WebsiteStatusBadge status={business.website_status} />
          <LeadStatusBadge status={business.lead_status} />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (confirm(`Delete "${business.name}"?`)) deleteMutation.mutate()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5 grid-cols-1">
        {/* Left column */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Business Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Business Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                { icon: Phone, label: 'Phone', key: 'phone' as const, placeholder: '+91 98765 43210' },
                { icon: Globe, label: 'Website', key: 'website' as const, placeholder: 'https://example.com' },
                { icon: MapPin, label: 'Address', key: 'address' as const, placeholder: 'MG Road, Bangalore' },
              ].map(({ icon: Icon, label, key, placeholder }) => (
                <div key={key} className="grid gap-1">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3 w-3" /> {label}
                  </Label>
                  <Input
                    defaultValue={business[key] ?? ''}
                    placeholder={placeholder}
                    className="h-8 text-sm"
                    onBlur={(e) => {
                      if (e.target.value !== (business[key] ?? '')) {
                        updateMutation.mutate({ [key]: e.target.value })
                      }
                    }}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Star className="h-3 w-3" /> Rating
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    defaultValue={business.rating ?? ''}
                    placeholder="4.2"
                    className="h-8 text-sm"
                    onBlur={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null
                      if (val !== business.rating) {
                        updateMutation.mutate({ rating: val ?? undefined })
                      }
                    }}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Reviews</Label>
                  <Input
                    type="number"
                    min="0"
                    defaultValue={business.review_count ?? ''}
                    placeholder="128"
                    className="h-8 text-sm"
                    onBlur={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : null
                      if (val !== business.review_count) {
                        updateMutation.mutate({ review_count: val ?? undefined })
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Textarea
                placeholder="Add notes about this lead..."
                className="min-h-24 resize-none text-sm"
                value={currentNotes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  setNotesChanged(true)
                }}
              />
              {notesChanged && (
                <Button
                  size="sm"
                  className="ml-auto h-7 text-xs"
                  onClick={() => {
                    updateMutation.mutate({ notes: currentNotes })
                    setNotesChanged(false)
                  }}
                >
                  Save Notes
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* CRM */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Lead Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={business.lead_status}
                onValueChange={(val) => updateMutation.mutate({ lead_status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Website Checker */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Website Status</CardTitle>
                <WebsiteStatusBadge status={business.website_status} />
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={checkMutation.isPending}
                onClick={() => checkMutation.mutate()}
              >
                {checkMutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5" /> Analyze Website</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Message Generator */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">AI Outreach Messages</CardTitle>
              <Button
                size="sm"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                ) : (
                  <><Wand2 className="h-3.5 w-3.5" /> Generate</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {messagesLoading && <Skeleton className="h-32 w-full" />}
            {!messagesLoading && (!messages || messages.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Click Generate to create personalized outreach messages.
              </p>
            )}
            {messages && messages.length > 0 && (
              <div className="space-y-4">
                {(() => {
                  const latest = messages[0]
                  const parsed = parseMessage(latest.generated_message)
                  return (
                    <>
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            WhatsApp
                          </span>
                          <div className="flex items-center gap-1">
                            <CopyButton text={parsed.whatsapp} />
                            <WhatsAppButton phone={business.phone} message={parsed.whatsapp} />
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{parsed.whatsapp}</p>
                      </div>
                      <Separator />
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            SMS
                          </span>
                          <CopyButton text={parsed.sms} />
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{parsed.sms}</p>
                      </div>
                    </>
                  )
                })()}
                {messages.length > 1 && (
                  <p className="text-xs text-muted-foreground text-right">
                    {messages.length} versions generated — showing latest
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
