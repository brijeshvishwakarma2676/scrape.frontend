import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Trash2, ExternalLink, Zap, Loader2, Check,
  ChevronLeft, ChevronRight, MessageCircle, Copy, Smartphone,
  ChevronDown, ChevronUp, ChevronsUpDown, X, CheckSquare, Square,
} from 'lucide-react'
import { businessesApi, type BusinessCreate } from '@/api/businesses'
import { ScrapeModal } from '@/components/ScrapeModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { WebsiteStatusBadge, LeadStatusBadge } from '@/components/StatusBadge'
import { toast } from '@/components/ui/use-toast'

const LEAD_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'NEW', label: 'NEW' },
  { value: 'CONTACTED', label: 'CONTACTED' },
  { value: 'INTERESTED', label: 'INTERESTED' },
  { value: 'WON', label: 'WON' },
  { value: 'LOST', label: 'LOST' },
]
const WEBSITE_STATUSES = [
  { value: 'all', label: 'All Websites' },
  { value: 'UNCHECKED', label: 'UNCHECKED' },
  { value: 'NO_WEBSITE', label: 'NO_WEBSITE' },
  { value: 'WORKING', label: 'WORKING' },
  { value: 'BROKEN', label: 'BROKEN' },
]

const emptyForm: BusinessCreate = {
  name: '',
  category: '',
  phone: '',
  website: '',
  address: '',
  rating: undefined,
  review_count: undefined,
}

function toWaPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const d = phone.replace(/\D/g, '')
  if (d.length === 10 && /^[6-9]/.test(d)) return `91${d}`
  if (d.startsWith('91') && d.length === 12) return d
  return null
}

function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: string }) {
  if (sortBy !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />
  return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
}

export function Leads() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BusinessCreate>(emptyForm)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')

  const search = searchParams.get('search') ?? ''
  const leadStatus = searchParams.get('lead_status') ?? ''
  const websiteStatus = searchParams.get('website_status') ?? ''
  const phoneType = searchParams.get('phone_type') ?? ''
  const sortBy = searchParams.get('sort_by') ?? ''
  const sortDir = searchParams.get('sort_dir') ?? 'desc'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Number(searchParams.get('limit') ?? '10')

  function setParam(key: string, value: string, resetPage = true) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        if (resetPage && key !== 'page') next.set('page', '1')
        return next
      },
      { replace: true },
    )
  }

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('search', value)
        else next.delete('search')
        next.set('page', '1')
        return next
      }, { replace: true })
    }, 300)
  }

  function handleSort(col: string) {
    const nextDir = sortBy === col && sortDir === 'desc' ? 'asc' : 'desc'
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('sort_by', col)
      next.set('sort_dir', nextDir)
      next.set('page', '1')
      return next
    }, { replace: true })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['businesses', search, leadStatus, websiteStatus, phoneType, sortBy, sortDir, page, limit],
    queryFn: () =>
      businessesApi.list({
        search: search || undefined,
        lead_status: leadStatus || undefined,
        website_status: websiteStatus || undefined,
        phone_type: phoneType || undefined,
        sort_by: sortBy || undefined,
        sort_dir: sortDir,
        page,
        limit,
      }),
  })

  const businesses = data?.items ?? []
  const pageIds = businesses.map((b) => b.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const somePageSelected = pageIds.some((id) => selected.has(id))

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['businesses'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }, [queryClient])

  const createMutation = useMutation({
    mutationFn: businessesApi.create,
    onSuccess: () => {
      invalidate()
      setOpen(false)
      setForm(emptyForm)
      toast({ title: 'Business added' })
    },
    onError: () => toast({ title: 'Failed to add business', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => businessesApi.delete(id),
    onSuccess: () => {
      invalidate()
      toast({ title: 'Deleted' })
    },
  })

  const processMutation = useMutation({
    mutationFn: async () => {
      const all = await businessesApi.list({ website_status: 'UNCHECKED', limit: 0 })
      if (all.items.length === 0) throw new Error('No unchecked businesses')
      return businessesApi.bulkProcess(all.items.map((b) => b.id))
    },
    onSuccess: (result) => {
      invalidate()
      toast({ title: `Done — ${result.messages_generated} messages generated` })
    },
    onError: (err: Error) => toast({ title: err.message ?? 'Process failed', variant: 'destructive' }),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: ({ ids }: { ids: number[] }) => businessesApi.bulkDelete(ids),
    onSuccess: (_, vars) => {
      invalidate()
      setSelected(new Set())
      toast({ title: `Deleted ${vars.ids.length} leads` })
    },
    onError: () => toast({ title: 'Bulk delete failed', variant: 'destructive' }),
  })

  const bulkProcessMutation = useMutation({
    mutationFn: ({ ids }: { ids: number[] }) => businessesApi.bulkProcess(ids),
    onSuccess: (result) => {
      invalidate()
      setSelected(new Set())
      toast({ title: `Done — ${result.messages_generated} messages generated` })
    },
    onError: () => toast({ title: 'Bulk process failed', variant: 'destructive' }),
  })

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) =>
      businessesApi.bulkStatus(ids, status),
    onSuccess: (_, vars) => {
      invalidate()
      setSelected(new Set())
      toast({ title: `${vars.ids.length} leads set to ${vars.status}` })
    },
    onError: () => toast({ title: 'Status update failed', variant: 'destructive' }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    createMutation.mutate(form)
  }

  async function copyPhone(phone: string | null | undefined) {
    if (!phone) return
    await navigator.clipboard.writeText(phone)
    toast({ title: 'Phone copied' })
  }

  const anyBulkPending =
    bulkDeleteMutation.isPending || bulkProcessMutation.isPending || bulkStatusMutation.isPending

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{data?.total ?? 0} businesses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={processMutation.isPending}
            onClick={() => processMutation.mutate()}
            title="Check websites + generate messages for all unchecked leads"
          >
            {processMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Zap className="h-4 w-4" />}
            <span className="hidden sm:inline">Process Unchecked</span>
          </Button>
          <ScrapeModal />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add<span className="hidden xs:inline">&nbsp;Business</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Add Business</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="grid gap-4 pt-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    placeholder="Sharma Electronics"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="Restaurant"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://example.com"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="MG Road, Bangalore"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="rating">Rating</Label>
                    <Input
                      id="rating"
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      placeholder="4.2"
                      value={form.rating ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, rating: e.target.value ? parseFloat(e.target.value) : undefined })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="reviews">Reviews</Label>
                    <Input
                      id="reviews"
                      type="number"
                      min="0"
                      placeholder="128"
                      value={form.review_count ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, review_count: e.target.value ? parseInt(e.target.value) : undefined })
                      }
                    />
                  </div>
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="mt-1">
                  {createMutation.isPending ? 'Adding...' : 'Add Business'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={leadStatus || 'all'}
            onValueChange={(v) => setParam('lead_status', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="flex-1 sm:w-40">
              <SelectValue placeholder="Lead Status" />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={websiteStatus || 'all'}
            onValueChange={(v) => setParam('website_status', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="flex-1 sm:w-44">
              <SelectValue placeholder="Website Status" />
            </SelectTrigger>
            <SelectContent>
              {WEBSITE_STATUSES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={phoneType === 'mobile' ? 'default' : 'outline'}
            size="sm"
            className="shrink-0"
            onClick={() => setParam('phone_type', phoneType === 'mobile' ? '' : 'mobile')}
          >
            <Smartphone className="h-4 w-4" />
            <span className="hidden xs:inline">Mobile only</span>
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button
            className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSelected(new Set())}
            title="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={anyBulkPending}
              onClick={() => {
                const ids = Array.from(selected)
                if (confirm(`Delete ${ids.length} leads? This cannot be undone.`))
                  bulkDeleteMutation.mutate({ ids })
              }}
            >
              {bulkDeleteMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={anyBulkPending}
              onClick={() => bulkProcessMutation.mutate({ ids: Array.from(selected) })}
            >
              {bulkProcessMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Zap className="h-3.5 w-3.5" />}
              Process
            </Button>
            <Select
              disabled={anyBulkPending}
              onValueChange={(status) =>
                bulkStatusMutation.mutate({ ids: Array.from(selected), status })
              }
            >
              <SelectTrigger className="h-8 w-auto min-w-[130px]">
                <SelectValue placeholder="Change status…" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.filter((s) => s.value !== 'all').map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
        {!isLoading && businesses.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No businesses found. Add your first lead.
          </p>
        )}
        {businesses.map((b) => {
          const waPhone = toWaPhone(b.phone)
          const isSelected = selected.has(b.id)
          return (
            <div
              key={b.id}
              className={`rounded-lg border bg-card p-3 transition-colors ${
                isSelected ? 'border-primary/50 bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  className="mt-0.5 shrink-0 text-muted-foreground"
                  onClick={() => toggleSelect(b.id)}
                >
                  {isSelected
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4" />}
                </button>
                <div
                  className="flex-1 min-w-0 cursor-pointer active:opacity-70"
                  onClick={() => navigate(`/leads/${b.id}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{b.name}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {b.lead_status === 'CONTACTED' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          <Check className="h-3 w-3" /> Sent
                        </span>
                      )}
                      {b.lead_status === 'WON' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 border border-yellow-500/25 px-2 py-0.5 text-xs font-medium text-yellow-400">
                          Won
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {[b.category, b.phone, b.rating ? `★ ${b.rating}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                      {b.phone_type === 'mobile' && (
                        <span className="ml-1 text-emerald-500" title="Mobile — WhatsApp ready">●</span>
                      )}
                      {b.phone_type === 'landline' && (
                        <span className="ml-1 text-amber-500" title="Landline">●</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <WebsiteStatusBadge status={b.website_status} />
                      {!['CONTACTED', 'WON'].includes(b.lead_status) && (
                        <LeadStatusBadge status={b.lead_status} />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                  {b.phone_type === 'mobile' && waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      title="Open WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {b.phone && (
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      onClick={() => copyPhone(b.phone)}
                      title="Copy phone"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 px-3">
                <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                  {allPageSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : somePageSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary/50" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Business <SortIcon col="name" sortBy={sortBy} sortDir={sortDir} />
                </div>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead
                className="cursor-pointer select-none hover:text-foreground"
                onClick={() => handleSort('rating')}
              >
                <div className="flex items-center gap-1">
                  Rating <SortIcon col="rating" sortBy={sortBy} sortDir={sortDir} />
                </div>
              </TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && businesses.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  No businesses found. Add your first lead.
                </TableCell>
              </TableRow>
            )}
            {businesses.map((b) => {
              const waPhone = toWaPhone(b.phone)
              const isSelected = selected.has(b.id)
              return (
                <TableRow
                  key={b.id}
                  className={`cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                  onClick={() => navigate(`/leads/${b.id}`)}
                >
                  <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleSelect(b.id)} className="text-muted-foreground">
                      {isSelected
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4" />}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-muted-foreground">{b.category || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>{b.phone || '—'}</span>
                      {b.phone_type === 'mobile' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Mobile — WhatsApp ready" />
                      )}
                      {b.phone_type === 'landline' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Landline" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.rating ? `★ ${b.rating} (${b.review_count})` : '—'}
                  </TableCell>
                  <TableCell>
                    {b.website ? (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {(() => {
                          try {
                            return new URL(b.website.startsWith('http') ? b.website : `https://${b.website}`).hostname
                          } catch {
                            return b.website
                          }
                        })()}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <WebsiteStatusBadge status={b.website_status} />
                      <LeadStatusBadge status={b.lead_status} />
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      {b.phone_type === 'mobile' && waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 w-7 items-center justify-center rounded text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                          title="Open WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {b.phone && (
                        <button
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          onClick={() => copyPhone(b.phone)}
                          title="Copy phone"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Delete "${b.name}"?`)) deleteMutation.mutate(b.id)
                        }}
                        title="Delete"
                      >
                        {deleteMutation.isPending
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-border pt-4 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(v) => {
                  setParam('limit', v)
                  setParam('page', '1', false)
                }}
              >
                <SelectTrigger className="h-8 w-16 bg-card border-border">
                  <SelectValue placeholder={String(limit)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-medium">{Math.min((page - 1) * limit + 1, data.total)}</span> to{' '}
              <span className="font-medium">{Math.min(page * limit, data.total)}</span> of{' '}
              <span className="font-medium">{data.total}</span> leads
            </p>
          </div>

          {data.pages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setParam('page', '1', false)}
                disabled={page === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setParam('page', String(Math.max(page - 1, 1)), false)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap px-1">
                Page {page} of {data.pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setParam('page', String(Math.min(page + 1, data.pages)), false)}
                disabled={page === data.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setParam('page', String(data.pages), false)}
                disabled={page === data.pages}
              >
                Last
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
