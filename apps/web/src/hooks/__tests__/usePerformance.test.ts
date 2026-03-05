/**
 * usePerformance — Unit Tests (T8)
 *
 * Tests for useDebounce, useThrottle, and usePrevious hooks.
 * Uses @testing-library/react renderHook + vitest fake timers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce, useThrottle, usePrevious } from '@/hooks/usePerformance'

// ─────────────────────────────────────────────────────────────────────────────
// useDebounce
// ─────────────────────────────────────────────────────────────────────────────

describe('useDebounce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(()  => { vi.useRealTimers() })

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does NOT update before the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    )
    rerender({ value: 'ab', delay: 300 })
    vi.advanceTimersByTime(100)
    expect(result.current).toBe('a')
  })

  it('updates after the full delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    )
    rerender({ value: 'abc', delay: 300 })
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('abc')
  })

  it('resets the timer on each value change', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    )
    rerender({ value: 'ab', delay: 300 })
    vi.advanceTimersByTime(200)
    rerender({ value: 'abc', delay: 300 })
    vi.advanceTimersByTime(200)
    // Only 200ms since last change — should NOT have updated yet
    expect(result.current).toBe('a')
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toBe('abc')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useThrottle
// ─────────────────────────────────────────────────────────────────────────────

describe('useThrottle', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(()  => { vi.useRealTimers() })

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useThrottle(0, 200))
    expect(result.current).toBe(0)
  })

  it('updates immediately when interval has passed', () => {
    const { result, rerender } = renderHook(
      ({ value, interval }: { value: number; interval: number }) =>
        useThrottle(value, interval),
      { initialProps: { value: 0, interval: 200 } }
    )
    // Advance past one interval first so "lastUpdated" is stale
    act(() => { vi.advanceTimersByTime(200) })
    rerender({ value: 42, interval: 200 })
    act(() => { vi.advanceTimersByTime(0) })
    expect(result.current).toBe(42)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// usePrevious
// ─────────────────────────────────────────────────────────────────────────────

describe('usePrevious', () => {
  it('returns undefined on the first render', () => {
    const { result } = renderHook(() => usePrevious('initial'))
    expect(result.current).toBeUndefined()
  })

  it('returns the previous value after a rerender', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => usePrevious(value),
      { initialProps: { value: 'first' } }
    )
    rerender({ value: 'second' })
    expect(result.current).toBe('first')
  })

  it('keeps tracking the most recent previous value', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => usePrevious(value),
      { initialProps: { value: 1 } }
    )
    rerender({ value: 2 })
    expect(result.current).toBe(1)
    rerender({ value: 3 })
    expect(result.current).toBe(2)
  })
})
