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
import { setupCQRS } from '@/cqrs'

export function EventHandlerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // CQRS must be set up before event handlers (handlers may dispatch commands)
    const cleanupCQRS = setupCQRS()
    const cleanupEvents = registerEventHandlers()
    return () => {
      cleanupEvents()
      cleanupCQRS()
    }
  }, [])

  return <>{children}</>
}
