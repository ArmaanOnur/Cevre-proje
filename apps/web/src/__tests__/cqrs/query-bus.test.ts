/**
 * QueryBus — Unit Tests (T8 Optimization / CQRS parity)
 *
 * Tests a FRESH QueryBus instance (not the singleton) for isolation.
 * Mirrors the CommandBus test suite structure so both buses have equal coverage.
 *
 * Covers:
 *  1. register + execute — handler called with correct query
 *  2. execute returns the handler's result
 *  3. execute passes the full query payload to the handler
 *  4. multiple query types can be registered independently
 *  5. registering a second handler for the same type overwrites the first
 *  6. execute unregistered query → throws with helpful message
 *  7. error message mentions setupCQRS
 *  8. isRegistered() reflects registration state before/after/clear
 *  9. clear() removes all handlers
 * 10. executing after clear() throws
 * 11. size property starts at 0
 * 12. size increments with each unique type
 * 13. size does NOT increment on overwrite
 * 14. async handlers are awaited correctly
 * 15. handler errors propagate to the caller
 * 16. unregistered query error includes query type name
 * 17. two registered handlers stay independent after clear + re-register
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryBus } from '@/cqrs/query-bus'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — build minimal query objects
// ─────────────────────────────────────────────────────────────────────────────

const makeGetFeed = (userId = 'user-1', page = 0) =>
  ({ type: 'GET_FEED' as const, payload: { userId, page } })

const makeGetNearbyCards = (lat = 39.9, lng = 32.8, radius = 5000) =>
  ({ type: 'GET_NEARBY_CARDS' as const, payload: { lat, lng, radius } })

const makeGetFollowStatus = (viewerId = 'user-a', targetId = 'user-b') =>
  ({ type: 'GET_FOLLOW_STATUS' as const, payload: { viewerId, targetId } })

// ─────────────────────────────────────────────────────────────────────────────
// Fresh bus per test (not the globalThis singleton)
// ─────────────────────────────────────────────────────────────────────────────

let bus: QueryBus

beforeEach(() => {
  bus = new QueryBus()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('QueryBus.register / execute', () => {
  it('calls the registered handler when query is executed', async () => {
    const handler = vi.fn().mockResolvedValue([])
    bus.register('GET_FEED', handler)

    const query = makeGetFeed()
    await bus.execute(query)

    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(query)
  })

  it('returns the exact value the handler resolved with', async () => {
    const cards = [{ id: 'c1' }, { id: 'c2' }]
    bus.register('GET_NEARBY_CARDS', async () => cards as never)

    const result = await bus.execute(makeGetNearbyCards())
    expect(result).toEqual(cards)
  })

  it('passes the full query payload to the handler', async () => {
    let receivedLat: number | undefined
    bus.register('GET_NEARBY_CARDS', async (q) => {
      receivedLat = q.payload.lat
      return [] as never
    })
    await bus.execute(makeGetNearbyCards(51.5, -0.1, 1000))
    expect(receivedLat).toBe(51.5)
  })

  it('different query types call their respective handlers', async () => {
    const feedHandler  = vi.fn().mockResolvedValue([])
    const cardsHandler = vi.fn().mockResolvedValue([])

    bus.register('GET_FEED', feedHandler)
    bus.register('GET_NEARBY_CARDS', cardsHandler)

    await bus.execute(makeGetFeed())
    await bus.execute(makeGetNearbyCards())

    expect(feedHandler).toHaveBeenCalledOnce()
    expect(cardsHandler).toHaveBeenCalledOnce()
  })
})

describe('QueryBus execute — unregistered query', () => {
  it('throws when no handler is registered for the query type', async () => {
    await expect(bus.execute(makeGetFeed())).rejects.toThrow('GET_FEED')
  })

  it('error message mentions setupCQRS', async () => {
    await expect(bus.execute(makeGetFollowStatus())).rejects.toThrow('setupCQRS')
  })

  it('error message includes the query type that failed', async () => {
    await expect(bus.execute(makeGetNearbyCards())).rejects.toThrow('GET_NEARBY_CARDS')
  })
})

describe('QueryBus — handler overwrite', () => {
  it('second registration for the same type replaces the first', async () => {
    bus.register('GET_FEED', async () => ['old'] as never)
    bus.register('GET_FEED', async () => ['new'] as never)

    const result = await bus.execute(makeGetFeed())
    expect(result).toEqual(['new'])
  })
})

describe('QueryBus.isRegistered', () => {
  it('returns false before registration', () => {
    expect(bus.isRegistered('GET_FEED')).toBe(false)
  })

  it('returns true after registration', () => {
    bus.register('GET_FEED', async () => [] as never)
    expect(bus.isRegistered('GET_FEED')).toBe(true)
  })

  it('returns false after clear()', () => {
    bus.register('GET_FEED', async () => [] as never)
    bus.clear()
    expect(bus.isRegistered('GET_FEED')).toBe(false)
  })
})

describe('QueryBus.clear', () => {
  it('removes all registered handlers', () => {
    bus.register('GET_FEED',         async () => [] as never)
    bus.register('GET_NEARBY_CARDS', async () => [] as never)
    bus.clear()
    expect(bus.size).toBe(0)
  })

  it('executing after clear() throws', async () => {
    bus.register('GET_FEED', async () => [] as never)
    bus.clear()
    await expect(bus.execute(makeGetFeed())).rejects.toThrow()
  })
})

describe('QueryBus.size', () => {
  it('returns 0 when no handlers registered', () => {
    expect(bus.size).toBe(0)
  })

  it('increments with each unique type registered', () => {
    bus.register('GET_FEED',         async () => [] as never)
    bus.register('GET_NEARBY_CARDS', async () => [] as never)
    expect(bus.size).toBe(2)
  })

  it('does not increment when same type is registered twice', () => {
    bus.register('GET_FEED', async () => [] as never)
    bus.register('GET_FEED', async () => ['overwrite'] as never)
    expect(bus.size).toBe(1)
  })
})

describe('QueryBus — async handlers', () => {
  it('awaits the handler before returning the result', async () => {
    bus.register('GET_FEED', () =>
      new Promise(resolve => setTimeout(() => resolve(['post-1'] as never), 10))
    )
    const result = await bus.execute(makeGetFeed())
    expect(result).toEqual(['post-1'])
  })

  it('propagates handler rejections to the caller', async () => {
    bus.register('GET_FEED', async () => {
      throw new Error('query-handler-boom')
    })
    await expect(bus.execute(makeGetFeed())).rejects.toThrow('query-handler-boom')
  })
})

describe('QueryBus — register, clear, re-register', () => {
  it('handler is callable again after clear + re-register', async () => {
    bus.register('GET_FEED', async () => [] as never)
    bus.clear()
    bus.register('GET_FEED', async () => ['after-reset'] as never)

    const result = await bus.execute(makeGetFeed())
    expect(result).toEqual(['after-reset'])
  })
})
