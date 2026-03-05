'use client'

/**
 * SideNav — Desktop left sidebar navigation (hidden on mobile, visible on md+).
 * Mirrors BottomNav tabs with per-tab accent colours and user profile footer.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useConversations } from '@/hooks/useConversations'
import { NAV_TABS, NAV_COLORS, NAV_ICONS } from './nav-config'

export function SideNav() {
  const pathname = usePathname()
  const { user }  = useAuth()
  const { unreadCount: notifCount } = useNotifications()
  const { conversations } = useConversations()
  const msgCount = conversations?.filter(c => c.unread_count && c.unread_count > 0).length ?? 0

  return (
    <aside className="hidden md:flex fixed top-0 left-0 h-full w-60 flex-col bg-white shadow-side z-40">

      {/* ── Logo ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white text-xl shadow-sm shadow-emerald-200">
          🌿
        </div>
        <div className="leading-none">
          <p className="font-bold text-slate-900 text-base">Çevre</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Sosyal platform</p>
        </div>
      </div>

      {/* ── Nav items ─────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-none">
        {NAV_TABS.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          const count    = tab.href === '/notifications' ? notifCount
                         : tab.href === '/messages'      ? msgCount
                         : 0
          const c    = NAV_COLORS[tab.color]
          const Icon = NAV_ICONS[tab.iconKey]

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-sm font-medium transition-all duration-150
                ${isActive
                  ? `${c.bg} ${c.text}`
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              {/* Left accent bar */}
              {isActive && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${c.bg.replace('bg-', 'bg-').replace('-50', '-400')}`} />
              )}

              {/* Icon */}
              <span className={isActive ? c.text : 'text-slate-400 group-hover:text-slate-600'}>
                <Icon filled={isActive} />
              </span>

              {tab.label}

              {/* Badge */}
              {count > 0 && (
                <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── User footer ───────────────────────────────────────── */}
      <div className="px-3 pb-5 pt-3 border-t border-slate-100 shrink-0">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition group"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-base shrink-0">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate leading-none">
              {user?.phone ? user.phone.replace('+90', '0') : 'Kullanıcı'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-emerald-600 transition">
              Profili görüntüle
            </p>
          </div>
          <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
    </aside>
  )
}
