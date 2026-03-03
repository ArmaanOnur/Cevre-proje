/**
 * (app)/layout.tsx — Authenticated app shell
 * Wraps all protected routes (/map, /feed, /messages, /notifications, /profile).
 * - Server component: reads session for SSR
 * - AuthGuard: client-side protection fallback
 * - BottomNav: mobile tab navigation
 */

import { AuthGuard } from './components/AuthGuard'
import { BottomNav } from './components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* Main content area — pb-16 leaves room for BottomNav */}
      <div className="min-h-screen bg-gray-50 pb-16">
        {children}
      </div>
      <BottomNav />
    </AuthGuard>
  )
}
