/**
 * nav-config.tsx
 * Shared navigation configuration: tabs, per-tab accent colours, SVG icons.
 * Consumed by both BottomNav (mobile) and SideNav (desktop).
 */

export type NavColor = 'emerald' | 'sky' | 'violet' | 'amber' | 'rose'

export interface NavTab {
  href: string
  label: string
  color: NavColor
  iconKey: keyof typeof NAV_ICONS
  hasBadge?: boolean
}

export const NAV_TABS: NavTab[] = [
  { href: '/map',           label: 'Keşfet',     color: 'emerald', iconKey: 'map' },
  { href: '/feed',          label: 'Akış',        color: 'sky',     iconKey: 'feed' },
  { href: '/messages',      label: 'Mesajlar',    color: 'violet',  iconKey: 'messages',      hasBadge: true },
  { href: '/notifications', label: 'Bildirimler', color: 'amber',   iconKey: 'notifications', hasBadge: true },
  { href: '/profile',       label: 'Profil',      color: 'rose',    iconKey: 'profile' },
]

export const NAV_COLORS: Record<NavColor, { text: string; bg: string; ring: string }> = {
  emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  sky:     { text: 'text-sky-600',     bg: 'bg-sky-50',     ring: 'ring-sky-200' },
  violet:  { text: 'text-violet-600',  bg: 'bg-violet-50',  ring: 'ring-violet-200' },
  amber:   { text: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-200' },
  rose:    { text: 'text-rose-600',    bg: 'bg-rose-50',    ring: 'ring-rose-200' },
}

// ── SVG icon components (outline / filled pair) ───────────────

interface IconProps { filled?: boolean; size?: string }
const SZ = 'w-[22px] h-[22px]'

function MapIcon({ filled, size = SZ }: IconProps) {
  return filled ? (
    <svg className={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </svg>
  ) : (
    <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

function FeedIcon({ filled, size = SZ }: IconProps) {
  return filled ? (
    <svg className={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5.75A.75.75 0 013.75 5h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.75zm0 6a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 11.75zm0 6a.75.75 0 01.75-.75H13.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" />
    </svg>
  ) : (
    <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6"  x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="15" y2="18" />
    </svg>
  )
}

function MessagesIcon({ filled, size = SZ }: IconProps) {
  return filled ? (
    <svg className={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
      <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.105-2.596-2.25-2.94a49.714 49.714 0 00-.75-.053V7.5h-3.75z" />
    </svg>
  ) : (
    <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function NotificationsIcon({ filled, size = SZ }: IconProps) {
  return filled ? (
    <svg className={size} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function ProfileIcon({ filled, size = SZ }: IconProps) {
  return filled ? (
    <svg className={size} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export const NAV_ICONS = {
  map:           MapIcon,
  feed:          FeedIcon,
  messages:      MessagesIcon,
  notifications: NotificationsIcon,
  profile:       ProfileIcon,
}
