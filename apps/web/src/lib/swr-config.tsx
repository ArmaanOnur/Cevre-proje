'use client'

/**
 * T2 — SWR Global Configuration
 * T8 — Optimization: keepPreviousData, longer dedup interval, explicit suspense:false
 * Wrap the app with this provider in layout.tsx.
 * Centralizes: error handling, revalidation strategy, deduplication.
 */

import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function SWRProvider({ children }: Props) {
  return (
    <SWRConfig
      value={{
        // T8: Increase dedup window so rapid navigation doesn't re-fetch
        // Supabase Realtime keeps live data fresh; SWR polling is secondary.
        dedupingInterval: 10_000,
        focusThrottleInterval: 15_000,

        // Don't revalidate on window focus — Supabase Realtime handles live updates
        revalidateOnFocus: false,
        revalidateOnReconnect: true,

        // T8: Keep showing previous data while new data loads (avoids blank flicker)
        keepPreviousData: true,

        // Retry up to 3 times with exponential-like back-off
        errorRetryCount: 3,
        errorRetryInterval: 2_000,

        // Never use Suspense boundaries by default (explicit opt-in per hook)
        suspense: false,

        // Global error handler — log in dev only
        onError: (error, key) => {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`[SWR] Error for key "${String(key)}":`, error)
          }
        },

        // Warn in dev when a fetch takes longer than 5 s
        loadingTimeout: 5_000,
        onLoadingSlow: (key) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[SWR] Slow loading for key "${String(key)}"`)
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  )
}
