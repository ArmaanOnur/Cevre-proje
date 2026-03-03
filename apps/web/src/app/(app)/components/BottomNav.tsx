'use client'

/**
 * BottomNav — Mobile-first bottom navigation bar
 * 5 tabs: Map, Feed, Messages, Notifications, Profile
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import { useConversations } from '@/hooks/useConversations'
import { useAuth } from '@/hooks/useAuth'

const TABS = [
  { href: '/map',           icon: '🗺️',   label: 'Keşfet' },
  { href: '/feed',          icon: '📰',   label: 'Akış' },
  { href: '/messages',      icon: '💬',   label: 'Mesajlar' },
  { href: '/notifications', icon: '🔔',   label: 'Bildirimler' },
  { href: '/profile',       icon: '👤',   label: 'Profil' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { unreadCount: notifCount } = useNotifications()
  const { conversations } = useConversations()
  const msgCount = conversations?.filter(c => c.unread_count && c.unread_count > 0).length ?? 0

  function badge(count: number) {
    if (!count) return null
    return (
      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
        {count > 99 ? '99+' : count}
      </span>
    )
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-100 safe-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {TABS.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          const count = tab.href === '/notifications' ? notifCount : tab.href === '/messages' ? msgCount : 0

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1 transition-all
                ${isActive
                  ? 'text-emerald-600 scale-105'
                  : 'text-gray-400 hover:text-gray-600 active:scale-95'}`}
            >
              <span className="relative text-[22px] leading-none">
                {tab.icon}
                {badge(count)}
              </span>
              <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
