/**
 * CommandBus — Unit Tests (T7 CQRS)
 *
 * Tests a FRESH CommandBus instance (not the singleton) for isolation.
 *
 * Covers:
 *  1. register + dispatch — handler called with correct command
 *  2. dispatch returns the handler's result
 *  3. dispatch unregistered command → throws with helpful message
 *  4. multiple command types can be registered independently
 *  5. registering a second handler for the same type overwrites the first
 *  6. isRegistered() reflects registration state
 *  7. clear() removes all handlers
 *  8. async handlers are awaited correctly
 *  9. handler errors propagate to the caller
 * 10. size property counts registered handlers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommandBus } from '@/cqrs/command-bus'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — build minimal command objects
// ─────────────────────────────────────────────────────────────────────────────

const makeDeletePost = (postId = 'post-1') =>
  ({ type: 'DELETE_POST' as const, payload: { postId } })

const makeToggleLike = (postId = 'post-1') =>
  ({ type: 'TOGGLE_LIKE' as const, payload: { postId } })

const makeFollowUser = (targetId = 'user-b') =>
  ({ type: 'FOLLOW_USER' as const, payload: { targetId } })

// ─────────────────────────────────────────────────────────────────────────────
// Fresh bus per test (not the globalThis singleton)
// ─────────────────────────────────────────────────────────────────────────────

let bus: CommandBus

beforeEach(() => {
  bus = new CommandBus()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CommandBus.register / dispatch', () => {
  it('calls the registered handler when command is dispatched', async () => {
    const handler = vi.fn().mockResolvedValue({ error: null })
    bus.register('DELETE_POST', handler)

    const cmd = makeDeletePost()
    await bus.dispatch(cmd)

    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(cmd)
  })

  it('returns the exact value the handler resolved with', async () => {
    bus.register('TOGGLE_LIKE', async () => ({ liked: true, error: null }))
    const result = await bus.dispatch(makeToggleLike())
    expect(result).toEqual({ liked: true, error: null })
  })

  it('passes the full command payload to the handler', async () => {
    let received: string | undefined
    bus.register('DELETE_POST', async (cmd) => {
      received = cmd.payload.postId
      return { error: null }
    })
    await bus.dispatch(makeDeletePost('my-post'))
    expect(received).toBe('my-post')
  })

  it('different command types call their respective handlers', async () => {
    const deleteHandler = vi.fn().mockResolvedValue({ error: null })
    const likeHandler = vi.fn().mockResolvedValue({ liked: true, error: null })

    bus.register('DELETE_POST', deleteHandler)
    bus.register('TOGGLE_LIKE', likeHandler)

    await bus.dispatch(makeDeletePost())
    await bus.dispatch(makeToggleLike())

    expect(deleteHandler).toHaveBeenCalledOnce()
    expect(likeHandler).toHaveBeenCalledOnce()
  })
})

describe('CommandBus dispatch — unregistered command', () => {
  it('throws when no handler is registered for the command type', async () => {
    await expect(bus.dispatch(makeDeletePost())).rejects.toThrow('DELETE_POST')
  })

  it('error message mentions setupCQRS', async () => {
    await expect(bus.dispatch(makeFollowUser())).rejects.toThrow('setupCQRS')
  })
})

describe('CommandBus — handler overwrite', () => {
  it('second registration for the same type replaces the first', async () => {
    bus.register('DELETE_POST', async () => ({ error: new Error('old') }))
    bus.register('DELETE_POST', async () => ({ error: null }))

    const result = await bus.dispatch(makeDeletePost())
    expect(result.error).toBeNull()
  })
})

describe('CommandBus.isRegistered', () => {
  it('returns false before registration', () => {
    expect(bus.isRegistered('DELETE_POST')).toBe(false)
  })

  it('returns true after registration', () => {
    bus.register('DELETE_POST', async () => ({ error: null }))
    expect(bus.isRegistered('DELETE_POST')).toBe(true)
  })

  it('returns false after clear()', () => {
    bus.register('DELETE_POST', async () => ({ error: null }))
    bus.clear()
    expect(bus.isRegistered('DELETE_POST')).toBe(false)
  })
})

describe('CommandBus.clear', () => {
  it('removes all registered handlers', () => {
    bus.register('DELETE_POST', async () => ({ error: null }))
    bus.register('TOGGLE_LIKE', async () => ({ liked: true, error: null }))
    bus.clear()
    expect(bus.size).toBe(0)
  })

  it('dispatching after clear throws', async () => {
    bus.register('DELETE_POST', async () => ({ error: null }))
    bus.clear()
    await expect(bus.dispatch(makeDeletePost())).rejects.toThrow()
  })
})

describe('CommandBus.size', () => {
  it('returns 0 when no handlers registered', () => {
    expect(bus.size).toBe(0)
  })

  it('increments with each unique type registered', () => {
    bus.register('DELETE_POST', async () => ({ error: null }))
    bus.register('TOGGLE_LIKE', async () => ({ liked: true, error: null }))
    expect(bus.size).toBe(2)
  })

  it('does not increment when same type is registered twice', () => {
    bus.register('DELETE_POST', async () => ({ error: null }))
    bus.register('DELETE_POST', async () => ({ error: null }))
    expect(bus.size).toBe(1)
  })
})

describe('CommandBus — async handlers', () => {
  it('awaits the handler before returning the result', async () => {
    bus.register('DELETE_POST', () =>
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 10))
    )
    const result = await bus.dispatch(makeDeletePost())
    expect(result.error).toBeNull()
  })

  it('propagates handler rejections to the caller', async () => {
    bus.register('DELETE_POST', async () => {
      throw new Error('handler-boom')
    })
    await expect(bus.dispatch(makeDeletePost())).rejects.toThrow('handler-boom')
  })
})
