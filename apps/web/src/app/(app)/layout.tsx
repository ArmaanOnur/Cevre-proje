/**
 * (app)/layout.tsx — Authenticated app shell
 * - Mobile:  BottomNav (fixed bottom) — SideNav hidden
 * - Desktop: SideNav (fixed left 240px) — BottomNav hidden
 */

import { AuthGuard } from './components/AuthGuard'
import { BottomNav } from './components/BottomNav'
import { SideNav }   from './components/SideNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* Desktop sidebar */}
      <SideNav />

      {/* Main content — offset by sidebar width on desktop, padded for BottomNav on mobile */}
      <div className="min-h-screen bg-slate-50 pb-[60px] md:pb-0 md:pl-60">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </AuthGuard>
  )
}

