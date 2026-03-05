'use client'

/**
 * BottomNav — Mobile-first bottom navigation (hidden on md+ screens).
 * Each tab has its own accent colour when active.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import { useConversations } from '@/hooks/useConversations'
import { NAV_TABS, NAV_COLORS, NAV_ICONS } from './nav-config'

export function BottomNav() {
  const pathname  = usePathname()
  const { unreadCount: notifCount } = useNotifications()
  const { conversations } = useConversations()
  const msgCount = conversations?.filter(c => c.unread_count && c.unread_count > 0).length ?? 0

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white shadow-nav safe-bottom">
      <div className="flex items-end justify-around h-[60px] max-w-lg mx-auto px-1">
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
              className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-opacity active:opacity-70"
            >
              {/* Icon pill */}
              <div className={`
                relative flex items-center justify-center
                w-12 h-7 rounded-full
                transition-all duration-200
                ${isActive ? `${c.bg} ${c.text}` : 'text-slate-400'}
              `}>
                <Icon filled={isActive} />

                {/* Unread badge */}
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`
                text-[9px] font-medium leading-none transition-colors
                ${isActive ? c.text : 'text-slate-400'}
              `}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

