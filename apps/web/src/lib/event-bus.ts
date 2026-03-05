/**
 * EventBus — T6 Event System
 * Typed, in-process event emitter singleton.
 *
 * FEATURES:
 * - Fully typed: all handlers receive the correct payload type
 * - Error-isolated: one failing handler never blocks others
 * - `once()` for single-fire subscriptions
 * - `off()` to unsubscribe by reference
 * - `clear()` for testing / cleanup
 * - Works on both client and server (no browser-only APIs)
 *
 * USAGE:
 *   import { eventBus } from '@/lib/event-bus'
 *
 *   // Subscribe
 *   eventBus.on('USER_FOLLOWED', ({ payload }) => {
 *     console.log(`${payload.followerId} followed ${payload.followingId}`)
 *   })
 *
 *   // Emit (from a service write path)
 *   eventBus.emit({
 *     id: crypto.randomUUID(),
 *     type: 'USER_FOLLOWED',
 *     occurredAt: new Date().toISOString(),
 *     schemaVersion: 1,
 *     payload: { followerId, followingId, status: 'active' },
 *   })
 */

import type { DomainEvent, EventType } from '@cevre/shared'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ExtractEvent<T extends EventType> = Extract<DomainEvent, { type: T }>
type Handler<T extends EventType> = (event: ExtractEvent<T>) => void | Promise<void>
type HandlerEntry = { handler: Handler<EventType>; once: boolean }

// ─────────────────────────────────────────────────────────────────────────────
// EventBus implementation
// ─────────────────────────────────────────────────────────────────────────────

class EventBus {
  private readonly _listeners = new Map<EventType, HandlerEntry[]>()

  /**
   * Subscribe to an event type.
   * Returns an unsubscribe function for convenience.
   */
  on<T extends EventType>(type: T, handler: Handler<T>): () => void {
    const entry: HandlerEntry = { handler: handler as Handler<EventType>, once: false }
    const list = this._listeners.get(type) ?? []
    this._listeners.set(type, [...list, entry])
    return () => this._removeEntry(type, entry)
  }

  /**
   * Subscribe to an event type, auto-unsubscribing after the first call.
   */
  once<T extends EventType>(type: T, handler: Handler<T>): () => void {
    const entry: HandlerEntry = { handler: handler as Handler<EventType>, once: true }
    const list = this._listeners.get(type) ?? []
    this._listeners.set(type, [...list, entry])
    return () => this._removeEntry(type, entry)
  }

  /**
   * Remove a specific handler by reference.
   */
  off<T extends EventType>(type: T, handler: Handler<T>): void {
    const list = this._listeners.get(type) ?? []
    this._listeners.set(
      type,
      list.filter(e => e.handler !== (handler as Handler<EventType>))
    )
  }

  /**
   * Emit a domain event.
   * Handlers are called in subscription order.
   * A failing handler logs the error but does NOT block remaining handlers.
   */
  emit(event: DomainEvent): void {
    const list = this._listeners.get(event.type) ?? []
    const remaining: HandlerEntry[] = []

    for (const entry of list) {
      try {
        const result = entry.handler(event as any)
        // Handle async handlers — swallow rejections to maintain isolation
        if (result instanceof Promise) {
          result.catch(err => this._handleError(event.type, err))
        }
      } catch (err) {
        this._handleError(event.type, err)
      }

      if (!entry.once) {
        remaining.push(entry)
      }
    }

    this._listeners.set(event.type, remaining)
  }

  /**
   * Return the number of registered handlers for a given event type.
   * Useful for debugging and tests.
   */
  listenerCount(type: EventType): number {
    return this._listeners.get(type)?.length ?? 0
  }

  /**
   * Remove all handlers (use in tests / teardown).
   */
  clear(): void {
    this._listeners.clear()
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private _removeEntry(type: EventType, entry: HandlerEntry): void {
    const list = this._listeners.get(type) ?? []
    this._listeners.set(type, list.filter(e => e !== entry))
  }

  private _handleError(type: EventType, err: unknown): void {
    // In production, replace with Sentry / structured logging
    console.error(`[EventBus] Handler error for "${type}":`, err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────────────────────────────────────

// Module-level singleton (works across hot-reloads in dev via module cache)
const GLOBAL_KEY = '__cevre_event_bus__'

function getOrCreateBus(): EventBus {
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as Record<string, unknown>
    if (!g[GLOBAL_KEY]) {
      g[GLOBAL_KEY] = new EventBus()
    }
    return g[GLOBAL_KEY] as EventBus
  }
  return new EventBus()
}

export const eventBus: EventBus = getOrCreateBus()

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a base event (fills id + occurredAt + schemaVersion)
// ─────────────────────────────────────────────────────────────────────────────

export function makeEvent<T extends DomainEvent>(
  type: T['type'],
  payload: T['payload']
): T {
  return {
    id: crypto.randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    schemaVersion: 1,
    payload,
  } as unknown as T
}
