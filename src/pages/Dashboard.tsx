import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Globe, WifiOff, AlertTriangle, MessageSquare, TrendingUp, Trophy } from 'lucide-react'
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

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: businessesApi.stats,
  })

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview of your lead pipeline</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(({ key, label, icon: Icon, color, bg, link }) => (
          <Link to={link} key={key}>
            <Card className="transition-colors hover:border-border/80 hover:bg-accent/30 cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold tracking-tight">
                    {stats?.[key as keyof typeof stats] ?? 0}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
