import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Globe, WifiOff, AlertTriangle, MessageSquare, TrendingUp, Trophy,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { businessesApi } from '@/api/businesses'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const statCards = [
  { key: 'total', label: 'Total Leads', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10', link: '/leads' },
  { key: 'no_website', label: 'No Website', icon: WifiOff, color: 'text-amber-400', bg: 'bg-amber-500/10', link: '/leads?website_status=NO_WEBSITE' },
  { key: 'broken_website', label: 'Broken Website', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', link: '/leads?website_status=BROKEN' },
  { key: 'contacted', label: 'Contacted', icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10', link: '/leads?lead_status=CONTACTED' },
  { key: 'interested', label: 'Interested', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', link: '/leads?lead_status=INTERESTED' },
  { key: 'won', label: 'Won', icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/10', link: '/leads?lead_status=WON' },
] as const

// Shared palette (kept in sync with the dark theme)
const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#a855f7',
  yellow: '#eab308',
  slate: '#64748b',
}

const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: COLORS.blue,
  CONTACTED: COLORS.purple,
  INTERESTED: COLORS.emerald,
  WON: COLORS.yellow,
  LOST: COLORS.red,
}
const WEBSITE_STATUS_COLORS: Record<string, string> = {
  'No Website': COLORS.amber,
  'Working': COLORS.emerald,
  'Broken': COLORS.red,
  'Unchecked': COLORS.slate,
}
const CATEGORY_COLORS = [COLORS.blue, COLORS.emerald, COLORS.purple, COLORS.amber, COLORS.red, COLORS.yellow]

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
}
const axisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: businessesApi.stats,
  })
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: businessesApi.analytics,
  })

  const leadStatus = (analytics?.lead_status ?? []).filter((d) => d.value > 0)
  const websiteStatus = (analytics?.website_status ?? []).filter((d) => d.value > 0)
  const phoneType = (analytics?.phone_type ?? []).filter((d) => d.value > 0)
  const funnelMax = analytics?.funnel?.[0]?.value || 1

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of your lead pipeline</p>
        </div>
        {analytics && (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{analytics.messages_sent}</span> messages generated
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map(({ key, label, icon: Icon, color, bg, link }) => (
          <Link to={link} key={key}>
            <Card className="transition-colors hover:border-border/80 hover:bg-accent/30 cursor-pointer h-full">
              <CardHeader className="pb-1.5 sm:pb-2 p-3 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{label}</CardTitle>
                  <div className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-md ${bg}`}>
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                {statsLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {stats?.[key as keyof typeof stats] ?? 0}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Leads over time — stock-style area chart */}
      <div className="mt-4 sm:mt-6">
        <ChartCard title="Leads Over Time" subtitle="Cumulative leads added">
          {analyticsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics?.leads_over_time ?? []} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false}
                  tickFormatter={(d: string) => d.slice(5)} minTickGap={20} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--muted-foreground))' }} />
                <Area type="monotone" dataKey="cumulative" name="Total leads" stroke={COLORS.emerald}
                  strokeWidth={2} fill="url(#leadGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Donut row */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <ChartCard title="Lead Status" subtitle="Where leads are in the pipeline">
          {analyticsLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : leadStatus.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={leadStatus} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={2} stroke="hsl(var(--card))">
                  {leadStatus.map((d) => (
                    <Cell key={d.name} fill={LEAD_STATUS_COLORS[d.name] ?? COLORS.slate} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Website Status" subtitle="Who needs a website most">
          {analyticsLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : websiteStatus.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={websiteStatus} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85} paddingAngle={2} stroke="hsl(var(--card))">
                  {websiteStatus.map((d) => (
                    <Cell key={d.name} fill={WEBSITE_STATUS_COLORS[d.name] ?? COLORS.slate} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Funnel + categories */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <ChartCard title="Conversion Funnel" subtitle="Total → Contacted → Interested → Won">
          {analyticsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-3 py-2">
              {(analytics?.funnel ?? []).map((step, i) => {
                const pct = Math.round((step.value / funnelMax) * 100)
                const colors = [COLORS.blue, COLORS.purple, COLORS.emerald, COLORS.yellow]
                return (
                  <div key={step.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{step.name}</span>
                      <span className="font-medium">{step.value} <span className="text-muted-foreground">({pct}%)</span></span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: colors[i] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Top Categories" subtitle="Most common business types">
          {analyticsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (analytics?.top_categories?.length ?? 0) === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, (analytics?.top_categories.length ?? 0) * 38)}>
              <BarChart data={analytics?.top_categories ?? []} layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={axisTick} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }} />
                <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]} barSize={18}>
                  {(analytics?.top_categories ?? []).map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Phone reachability */}
      <div className="mt-4 sm:mt-6">
        <ChartCard title="Phone Reachability" subtitle="Mobiles can receive WhatsApp — landlines cannot">
          {analyticsLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : phoneType.length === 0 ? (
            <EmptyChart />
          ) : (
            <PhoneBar data={phoneType} />
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function PhoneBar({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const colorFor: Record<string, string> = { Mobile: COLORS.emerald, Landline: COLORS.amber, Unknown: COLORS.slate }
  return (
    <div className="py-2">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {data.map((d) => (
          <div key={d.name} style={{ width: `${(d.value / total) * 100}%`, background: colorFor[d.name] ?? COLORS.slate }}
            title={`${d.name}: ${d.value}`} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor[d.name] ?? COLORS.slate }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      No data yet
    </div>
  )
}
