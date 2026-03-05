'use client'

/**
 * EventHandlerProvider — T6 Event System
 *
 * Mounts the global event handler registry once the app
 * has booted on the client. Renders no markup of its own.
 *
 * Place this INSIDE SWRProvider so both systems share the
 * same React tree.
 */

import { useEffect } from 'react'
import { registerEventHandlers } from '@/lib/event-handlers'

export function EventHandlerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = registerEventHandlers()
    return cleanup
  }, [])

  return <>{children}</>
}
