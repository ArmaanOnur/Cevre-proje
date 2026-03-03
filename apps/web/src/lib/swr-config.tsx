'use client'

/**
 * T2 — SWR Global Configuration
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
        // Stale-while-revalidate: 30s cache window
        dedupingInterval: 5_000,
        focusThrottleInterval: 10_000,

        // Don't revalidate on window focus for real-time data
        // (Supabase realtime handles live updates)
        revalidateOnFocus: false,
        revalidateOnReconnect: true,

        // Retry up to 3 times on network errors
        errorRetryCount: 3,
        errorRetryInterval: 2_000,

        // Global error handler
        onError: (error, key) => {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`[SWR] Error for key "${String(key)}":`, error)
          }
        },

        // Global loading slow handler
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
