import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Trash2, ExternalLink, Zap, Loader2 } from 'lucide-react'
import { businessesApi, type BusinessCreate } from '@/api/businesses'
import { useLeadStore } from '@/store/useLeadStore'
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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { filters, setSearch, setLeadStatus, setWebsiteStatus } = useLeadStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BusinessCreate>(emptyForm)

  useEffect(() => {
    const ls = searchParams.get('lead_status')
    const ws = searchParams.get('website_status')
    if (ls) setLeadStatus(ls)
    if (ws) setWebsiteStatus(ws)
  }, [searchParams, setLeadStatus, setWebsiteStatus])

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses', filters],
    queryFn: () =>
      businessesApi.list({
        search: filters.search || undefined,
        lead_status: filters.lead_status || undefined,
        website_status: filters.website_status || undefined,
      }),
  })

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
      const all = await businessesApi.list({ website_status: 'UNCHECKED' })
      if (all.length === 0) throw new Error('No unchecked businesses')
      return businessesApi.bulkProcess(all.map((b) => b.id))
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
            {businesses?.length ?? 0} businesses
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
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.lead_status || 'all'}
            onValueChange={(v) => setLeadStatus(v === 'all' ? '' : v)}
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
            value={filters.website_status || 'all'}
            onValueChange={(v) => setWebsiteStatus(v === 'all' ? '' : v)}
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
            className="flex items-start justify-between rounded-lg border border-border bg-card p-3 cursor-pointer active:bg-accent/40"
            onClick={() => navigate(`/leads/${b.id}`)}
          >
            <div className="flex-1 min-w-0 mr-3">
              <p className="font-medium text-sm truncate">{b.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[b.category, b.phone, b.rating ? `★ ${b.rating}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <WebsiteStatusBadge status={b.website_status} />
              <LeadStatusBadge status={b.lead_status} />
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
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete "${b.name}"?`)) deleteMutation.mutate(b.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
