'use client'

/**
 * AuthGuard — client-side auth protection fallback
 * The middleware handles server-side redirects.
 * This component provides a graceful loading state and
 * client-side protection for cases middleware might miss.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isLoading, isAuthenticated, profileComplete } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/auth')
      return
    }
    if (!profileComplete) {
      router.replace('/auth/setup')
    }
  }, [isLoading, isAuthenticated, profileComplete, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl animate-bounce">🌿</div>
          <p className="text-sm text-gray-400 font-medium">Yükleniyor…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !profileComplete) {
    return null // middleware redirect in flight
  }

  return <>{children}</>
}
