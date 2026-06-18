import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Loader2, Globe, WifiOff, Plus, CheckSquare, Square, Zap, ChevronDown, ChevronUp, Phone, MapPin, Star, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react'
import api from '@/api/client'
import { businessesApi, type Business } from '@/api/businesses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'

interface ScrapeResult {
  name: string
  category: string | null
  phone: string | null
  phone_type: 'mobile' | 'landline' | 'unknown'
  website: string | null
  address: string | null
  rating: number | null
  review_count: number
  website_status: 'UNCHECKED' | 'NO_WEBSITE'
}

type PipelineStatus = 'idle' | 'importing' | 'processing' | 'done'

export function ScrapeModal() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ScrapeResult[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [searching, setSearching] = useState(false)
  const [autoProcess, setAutoProcess] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggleExpand = (e: React.MouseEvent, i: number) => {
    e.stopPropagation()
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('idle')
  const [pipelineResult, setPipelineResult] = useState<{ messages_generated: number; errors: number } | null>(null)

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    setSelected(new Set())
    setExpanded(new Set())
    setPipelineStatus('idle')
    setPipelineResult(null)
    try {
      const { data } = await api.get<ScrapeResult[]>('/scrape/search', {
        params: { q: query, max: 20 },
      })
      setResults(data)
      setSelected(new Set(data.map((_, i) => i)))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Search failed'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setSearching(false)
    }
  }

  const importMutation = useMutation({
    mutationFn: async () => {
      const toImport = results.filter((_, i) => selected.has(i))
      setPipelineStatus('importing')
      const created: Business[] = await Promise.all(
        toImport.map((b) =>
          businessesApi.create({
            name: b.name,
            category: b.category ?? undefined,
            phone: b.phone ?? undefined,
            website: b.website ?? undefined,
            address: b.address ?? undefined,
            rating: b.rating ?? undefined,
            review_count: b.review_count,
          })
        )
      )
      return created.map((b) => b.id)
    },
    onSuccess: async (ids) => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })

      if (!autoProcess) {
        toast({ title: `Imported ${ids.length} businesses` })
        closeAndReset()
        return
      }

      // Pipeline: check websites + generate messages
      setPipelineStatus('processing')
      try {
        const result = await businessesApi.bulkProcess(ids)
        queryClient.invalidateQueries({ queryKey: ['businesses'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
        setPipelineResult(result)
        setPipelineStatus('done')
      } catch {
        toast({ title: 'Pipeline failed — businesses were imported', variant: 'destructive' })
        closeAndReset()
      }
    },
    onError: () => {
      setPipelineStatus('idle')
      toast({ title: 'Import failed', variant: 'destructive' })
    },
  })

  const closeAndReset = () => {
    setOpen(false)
    setQuery('')
    setResults([])
    setSelected(new Set())
    setExpanded(new Set())
    setPipelineStatus('idle')
    setPipelineResult(null)
  }

  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set())
    else setSelected(new Set(results.map((_, i) => i)))
  }

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const isProcessing = pipelineStatus === 'importing' || pipelineStatus === 'processing'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isProcessing) { setOpen(v); if (!v) closeAndReset() } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Search className="h-4 w-4" />
          Scrape
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Scrape from Google Maps</DialogTitle>
        </DialogHeader>

        {/* Pipeline done state */}
        {pipelineStatus === 'done' && pipelineResult && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <Zap className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold">All done!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {pipelineResult.messages_generated} messages generated
                {pipelineResult.errors > 0 && `, ${pipelineResult.errors} errors`}
              </p>
            </div>
            <Button onClick={closeAndReset}>Close</Button>
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {pipelineStatus === 'importing' ? `Importing ${selected.size} businesses...` : 'Checking websites & generating messages...'}
            </p>
            <p className="text-xs text-muted-foreground">This may take a minute. Don't close this window.</p>
          </div>
        )}

        {/* Normal state */}
        {pipelineStatus === 'idle' && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="restaurants in Koramangala Bangalore"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                autoFocus
              />
              <Button onClick={search} disabled={searching || !query.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {results.length > 0 && (
              <>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <button
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    onClick={toggleAll}
                  >
                    {selected.size === results.length ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selected.size} / {results.length} selected
                  </button>
                  <span>Click a row to toggle</span>
                </div>

                <div className="overflow-y-auto flex-1 rounded-lg border border-border divide-y divide-border">
                  {results.map((b, i) => (
                    <div key={i} className={`transition-colors ${selected.has(i) ? 'bg-accent/40' : ''}`}>
                      {/* Main row */}
                      <div
                        className={`flex items-start gap-3 p-3 ${
                          isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/30'
                        }`}
                        onClick={() => !isProcessing && toggle(i)}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {selected.has(i) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{b.name}</span>
                            {b.category && <Badge variant="secondary" className="text-xs">{b.category}</Badge>}
                            {b.website_status === 'NO_WEBSITE' ? (
                              <Badge variant="warning" className="text-xs flex items-center gap-1">
                                <WifiOff className="h-3 w-3" /> No Website
                              </Badge>
                            ) : (
                              <Badge variant="info" className="text-xs flex items-center gap-1">
                                <Globe className="h-3 w-3" /> Has Website
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            {b.address && <span className="truncate max-w-xs">{b.address}</span>}
                            {b.phone && (
                              <span className="flex items-center gap-1">
                                {b.phone}
                                {b.phone_type === 'landline' && (
                                  <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                                    <AlertTriangle className="h-3 w-3" /> Landline
                                  </span>
                                )}
                              </span>
                            )}
                            {b.rating && <span>★ {b.rating} ({b.review_count})</span>}
                          </div>
                        </div>
                        <button
                          className="ml-1 flex-shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => toggleExpand(e, i)}
                          title="Show more details"
                        >
                          {expanded.has(i)
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Expanded detail panel */}
                      {expanded.has(i) && (
                        <div className="px-4 sm:px-10 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-border/50 pt-2.5 bg-muted/20">
                          {b.phone && (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <a href={`tel:${b.phone}`} className="text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
                                  {b.phone}
                                </a>
                              </div>
                              {b.phone_type === 'mobile' && (
                                <div className="flex items-center gap-1 text-emerald-500 font-medium pl-5">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> WhatsApp ready
                                </div>
                              )}
                              {b.phone_type === 'landline' && (
                                <div className="flex items-center gap-1 text-amber-500 font-medium pl-5">
                                  <AlertTriangle className="h-3.5 w-3.5" /> Landline — can't receive WhatsApp
                                </div>
                              )}
                              {b.phone_type === 'unknown' && (
                                <div className="flex items-center gap-1 text-muted-foreground pl-5">
                                  Unknown number type
                                </div>
                              )}
                            </div>
                          )}
                          {b.rating != null && (
                            <div className="flex items-center gap-1.5">
                              <Star className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-foreground">{b.rating} <span className="text-muted-foreground">({b.review_count} reviews)</span></span>
                            </div>
                          )}
                          {b.address && (
                            <div className="flex items-start gap-1.5 col-span-2">
                              <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{b.address}</span>
                            </div>
                          )}
                          {b.website && (
                            <div className="flex items-start gap-1.5 col-span-2">
                              <ExternalLink className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <a
                                href={b.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {b.website}
                              </a>
                            </div>
                          )}
                          {!b.phone && !b.address && !b.website && !b.rating && (
                            <p className="col-span-2 text-muted-foreground italic">No additional details available.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Auto-process toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg border border-border px-3 py-2.5 hover:bg-muted/30 transition-colors">
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors ${autoProcess ? 'bg-primary' : 'bg-muted'}`}
                    onClick={() => setAutoProcess((v) => !v)}
                  >
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoProcess ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Auto-process after import</p>
                    <p className="text-xs text-muted-foreground">Check websites + generate messages for all imported businesses</p>
                  </div>
                </label>

                <Button
                  disabled={selected.size === 0}
                  onClick={() => importMutation.mutate()}
                >
                  <Plus className="h-4 w-4" />
                  {autoProcess
                    ? `Import & Process ${selected.size} Business${selected.size !== 1 ? 'es' : ''}`
                    : `Import ${selected.size} Business${selected.size !== 1 ? 'es' : ''}`}
                </Button>
              </>
            )}

            {!searching && results.length === 0 && query && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No results. Try a different query.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
