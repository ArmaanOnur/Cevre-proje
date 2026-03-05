/**
 * EventBus — Unit Tests (T6)
 *
 * Covers:
 *  1. emit + on — handler receives correct event
 *  2. Multiple handlers for the same type
 *  3. once — auto-removed after first fire
 *  4. off — removes by reference, does not call handler again
 *  5. Unsubscribe fn returned by on/once
 *  6. Error isolation — one bad handler does NOT block others
 *  7. Async handlers — resolved without blocking emit
 *  8. listenerCount — reflects adds/removes
 *  9. clear — removes all listeners
 * 10. makeEvent — fills id, occurredAt, schemaVersion
 * 11. emit unknown type — no-op, no throw
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import a FRESH bus (not the singleton) for isolation
// We create a local class clone via the module export utilities
import { eventBus, makeEvent } from '@/lib/event-bus'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeFollowedEvent(overrides?: object) {
  return makeEvent('USER_FOLLOWED', {
    followerId: 'user-a',
    followingId: 'user-b',
    status: 'active',
    ...overrides,
  })
}

function makePostCreatedEvent(overrides?: object) {
  return makeEvent('POST_CREATED', {
    postId: 'post-1',
    authorId: 'user-a',
    postType: 'text',
    visibility: 'public',
    ...overrides,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset bus state before every test
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  eventBus.clear()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('EventBus.on / emit', () => {
  it('calls the handler with the emitted event', () => {
    const handler = vi.fn()
    eventBus.on('USER_FOLLOWED', handler)
    const evt = makeFollowedEvent()
    eventBus.emit(evt)
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(evt)
  })

  it('calls multiple handlers in subscription order', () => {
    const calls: number[] = []
    eventBus.on('USER_FOLLOWED', () => calls.push(1))
    eventBus.on('USER_FOLLOWED', () => calls.push(2))
    eventBus.on('USER_FOLLOWED', () => calls.push(3))
    eventBus.emit(makeFollowedEvent())
    expect(calls).toEqual([1, 2, 3])
  })

  it('does NOT call handlers for a different event type', () => {
    const handler = vi.fn()
    eventBus.on('POST_CREATED', handler)
    eventBus.emit(makeFollowedEvent())
    expect(handler).not.toHaveBeenCalled()
  })

  it('handler receives typed payload correctly', () => {
    let received: string | undefined
    eventBus.on('USER_FOLLOWED', (evt) => {
      received = evt.payload.followerId
    })
    eventBus.emit(makeFollowedEvent({ followerId: 'alice' }))
    expect(received).toBe('alice')
  })
})

describe('EventBus.once', () => {
  it('fires the handler exactly once', () => {
    const handler = vi.fn()
    eventBus.once('USER_FOLLOWED', handler)
    eventBus.emit(makeFollowedEvent())
    eventBus.emit(makeFollowedEvent())
    eventBus.emit(makeFollowedEvent())
    expect(handler).toHaveBeenCalledOnce()
  })

  it('is automatically removed after first fire', () => {
    eventBus.once('USER_FOLLOWED', vi.fn())
    expect(eventBus.listenerCount('USER_FOLLOWED')).toBe(1)
    eventBus.emit(makeFollowedEvent())
    expect(eventBus.listenerCount('USER_FOLLOWED')).toBe(0)
  })
})

describe('EventBus.off', () => {
  it('removes the handler by reference', () => {
    const handler = vi.fn()
    eventBus.on('USER_FOLLOWED', handler)
    eventBus.off('USER_FOLLOWED', handler)
    eventBus.emit(makeFollowedEvent())
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not remove other handlers of the same type', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    eventBus.on('USER_FOLLOWED', h1)
    eventBus.on('USER_FOLLOWED', h2)
    eventBus.off('USER_FOLLOWED', h1)
    eventBus.emit(makeFollowedEvent())
    expect(h1).not.toHaveBeenCalled()
    expect(h2).toHaveBeenCalledOnce()
  })
})

describe('Unsubscribe function (returned by on/once)', () => {
  it('on() returns a working unsubscribe function', () => {
    const handler = vi.fn()
    const unsub = eventBus.on('USER_FOLLOWED', handler)
    unsub()
    eventBus.emit(makeFollowedEvent())
    expect(handler).not.toHaveBeenCalled()
  })

  it('once() returns a working unsubscribe function (before first fire)', () => {
    const handler = vi.fn()
    const unsub = eventBus.once('USER_FOLLOWED', handler)
    unsub()
    eventBus.emit(makeFollowedEvent())
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('Error isolation', () => {
  it('a throwing handler does not block subsequent handlers', () => {
    const afterBad = vi.fn()
    eventBus.on('USER_FOLLOWED', () => { throw new Error('boom') })
    eventBus.on('USER_FOLLOWED', afterBad)

    expect(() => eventBus.emit(makeFollowedEvent())).not.toThrow()
    expect(afterBad).toHaveBeenCalledOnce()
  })

  it('logs the error to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    eventBus.on('USER_FOLLOWED', () => { throw new Error('oops') })
    eventBus.emit(makeFollowedEvent())
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})

describe('Async handlers', () => {
  it('emit does not await async handlers (fire-and-forget)', async () => {
    const order: string[] = []
    eventBus.on('USER_FOLLOWED', async () => {
      await new Promise(r => setTimeout(r, 10))
      order.push('async')
    })

    eventBus.emit(makeFollowedEvent())
    order.push('after-emit')

    // async handler hasn't settled yet
    expect(order).toEqual(['after-emit'])

    // wait for microtask/timer
    await new Promise(r => setTimeout(r, 20))
    expect(order).toEqual(['after-emit', 'async'])
  })

  it('async handler rejection is caught without throwing', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    eventBus.on('USER_FOLLOWED', async () => { throw new Error('async-boom') })
    expect(() => eventBus.emit(makeFollowedEvent())).not.toThrow()
    await new Promise(r => setTimeout(r, 10))
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('EventBus.listenerCount', () => {
  it('returns 0 for event type with no handlers', () => {
    expect(eventBus.listenerCount('USER_FOLLOWED')).toBe(0)
  })

  it('increments with on()', () => {
    eventBus.on('USER_FOLLOWED', vi.fn())
    eventBus.on('USER_FOLLOWED', vi.fn())
    expect(eventBus.listenerCount('USER_FOLLOWED')).toBe(2)
  })

  it('decrements after off()', () => {
    const h = vi.fn()
    eventBus.on('USER_FOLLOWED', h)
    eventBus.off('USER_FOLLOWED', h)
    expect(eventBus.listenerCount('USER_FOLLOWED')).toBe(0)
  })

  it('decrements after once handler fires', () => {
    eventBus.once('USER_FOLLOWED', vi.fn())
    expect(eventBus.listenerCount('USER_FOLLOWED')).toBe(1)
    eventBus.emit(makeFollowedEvent())
    expect(eventBus.listenerCount('USER_FOLLOWED')).toBe(0)
  })
})

describe('EventBus.clear', () => {
  it('removes all handlers', () => {
    eventBus.on('USER_FOLLOWED', vi.fn())
    eventBus.on('POST_CREATED', vi.fn())
    eventBus.clear()
    expect(eventBus.listenerCount('USER_FOLLOWED')).toBe(0)
    expect(eventBus.listenerCount('POST_CREATED')).toBe(0)
  })

  it('handlers are not called after clear', () => {
    const h = vi.fn()
    eventBus.on('USER_FOLLOWED', h)
    eventBus.clear()
    eventBus.emit(makeFollowedEvent())
    expect(h).not.toHaveBeenCalled()
  })
})

describe('makeEvent helper', () => {
  it('sets schemaVersion to 1', () => {
    const evt = makeFollowedEvent()
    expect(evt.schemaVersion).toBe(1)
  })

  it('generates a unique id for each call', () => {
    const a = makeFollowedEvent()
    const b = makeFollowedEvent()
    expect(a.id).not.toBe(b.id)
  })

  it('sets occurredAt to a valid ISO string', () => {
    const { occurredAt } = makeFollowedEvent()
    expect(() => new Date(occurredAt)).not.toThrow()
    expect(isNaN(new Date(occurredAt).getTime())).toBe(false)
  })

  it('preserves the type field', () => {
    const evt = makePostCreatedEvent()
    expect(evt.type).toBe('POST_CREATED')
  })

  it('preserves the payload', () => {
    const evt = makePostCreatedEvent({ postId: 'p-42' })
    expect(evt.payload.postId).toBe('p-42')
  })
})

describe('emit with no listeners', () => {
  it('does not throw when there are no handlers for an event type', () => {
    expect(() => eventBus.emit(makeFollowedEvent())).not.toThrow()
  })
})
