'use client'
import {
  Award,
  Bell,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Library,
  LogOut,
  Plus,
  Search,
  Settings,
  Trophy,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { OnlineIndicator } from '../../components/OnlineIndicator'
import { getSupabaseBrowserClient } from '../../lib/supabase/client'

const NAV = [
  { href: '/library', label: 'Defterlerim', icon: Library },
  { href: '/gallery', label: 'Keşfet', icon: Compass },
  { href: '/leaderboard', label: 'Liderlik', icon: Trophy },
  { href: '/achievements', label: 'Rozetler', icon: Award },
  { href: '/clans', label: 'Klanlar', icon: Users },
  { href: '/orgs', label: 'Kurumsal', icon: Building2 },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    init()

    const persisted = localStorage.getItem('sidebar-collapsed')
    if (persisted === '1') setCollapsed(true)

    // Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [])

  const toggleCollapse = () => {
    setCollapsed((c) => {
      localStorage.setItem('sidebar-collapsed', !c ? '1' : '0')
      return !c
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-cream-50 flex">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-16' : 'w-60'} bg-white border-r border-slate-100 flex flex-col transition-all duration-200 sticky top-0 h-screen`}
      >
        <div className="p-4 flex items-center justify-between">
          {!collapsed && (
            <Link href="/library" className="font-serif text-2xl text-ink-900">
              Kavra
            </Link>
          )}
          <button onClick={toggleCollapse} className="text-slate-400 hover:text-ink-900 ml-auto">
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>

        {!collapsed && (
          <Link
            href="/notebooks/new"
            className="mx-3 mb-4 bg-ink-900 text-cream-50 rounded-full py-2 px-3 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-ink-950"
          >
            <Plus size={14} />
            Yeni Defter
          </Link>
        )}

        <nav className="flex-1 px-2 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon
            const active = path === n.href || path.startsWith(n.href + '/')
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  active ? 'bg-amber-50 text-ink-900 font-bold' : 'text-slate-600 hover:bg-cream-50'
                }`}
              >
                <Icon size={18} />
                {!collapsed && <span>{n.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          {!collapsed && (
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-ink-900 flex items-center justify-center text-amber-500 text-xs font-bold">
                {(user?.email ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ink-900 font-semibold truncate">
                  {user?.user_metadata?.full_name ?? user?.email}
                </div>
                <OnlineIndicator />
              </div>
            </div>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-cream-50"
          >
            <Settings size={16} />
            {!collapsed && <span>Ayarlar</span>}
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-cream-50"
          >
            <LogOut size={16} />
            {!collapsed && <span>Çıkış</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
