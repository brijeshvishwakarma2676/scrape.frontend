import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Trash2, ExternalLink, Zap, Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react'
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

export function Leads() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BusinessCreate>(emptyForm)

  const search = searchParams.get('search') ?? ''
  const leadStatus = searchParams.get('lead_status') ?? ''
  const websiteStatus = searchParams.get('website_status') ?? ''
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

  const { data, isLoading } = useQuery({
    queryKey: ['businesses', search, leadStatus, websiteStatus, page, limit],
    queryFn: () =>
      businessesApi.list({
        search: search || undefined,
        lead_status: leadStatus || undefined,
        website_status: websiteStatus || undefined,
        page,
        limit,
      }),
  })

  const businesses = data?.items

  const createMutation = useMutation({
    mutationFn: businessesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setOpen(false)
      setForm(emptyForm)
      toast({ title: 'Business added' })
    },
    onError: () => toast({ title: 'Failed to add business', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: businessesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
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
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast({ title: `Done — ${result.messages_generated} messages generated` })
    },
    onError: (err: Error) => toast({ title: err.message ?? 'Process failed', variant: 'destructive' }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    createMutation.mutate(form)
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {data?.total ?? 0} businesses
          </p>
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
                Add Business
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
                    onChange={(e) => setForm({ ...form, rating: e.target.value ? parseFloat(e.target.value) : undefined })}
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
                    onChange={(e) => setForm({ ...form, review_count: e.target.value ? parseInt(e.target.value) : undefined })}
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
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses..."
            className="pl-8"
            value={search}
            onChange={(e) => setParam('search', e.target.value)}
          />
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
        {!isLoading && businesses?.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No businesses found. Add your first lead.
          </p>
        )}
        {businesses?.map((b) => (
          <div
            key={b.id}
            className="rounded-lg border border-border bg-card p-3 cursor-pointer active:bg-accent/40"
            onClick={() => navigate(`/leads/${b.id}`)}
          >
            {/* Row 1: name + sent badge */}
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm truncate">{b.name}</p>
              {b.lead_status === 'CONTACTED' && (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  <Check className="h-3 w-3" /> Sent
                </span>
              )}
              {b.lead_status === 'WON' && (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-yellow-500/15 border border-yellow-500/25 px-2 py-0.5 text-xs font-medium text-yellow-400">
                  Won
                </span>
              )}
            </div>
            {/* Row 2: meta + website/status badges */}
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground truncate">
                {[b.category, b.phone, b.rating ? `★ ${b.rating}` : null].filter(Boolean).join(' · ')}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <WebsiteStatusBadge status={b.website_status} />
                {!['CONTACTED', 'WON'].includes(b.lead_status) && (
                  <LeadStatusBadge status={b.lead_status} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && businesses?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No businesses found. Add your first lead.
                </TableCell>
              </TableRow>
            )}
            {businesses?.map((b) => (
              <TableRow
                key={b.id}
                className="cursor-pointer"
                onClick={() => navigate(`/leads/${b.id}`)}
              >
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="text-muted-foreground">{b.category || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{b.phone || '—'}</TableCell>
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
                      {new URL(b.website.startsWith('http') ? b.website : `https://${b.website}`).hostname}
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
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deleteMutation.isPending}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete "${b.name}"?`)) deleteMutation.mutate(b.id)
                    }}
                  >
                    {deleteMutation.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
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
              Showing <span className="font-medium">{Math.min((page - 1) * limit + 1, data.total)}</span> to{' '}
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
