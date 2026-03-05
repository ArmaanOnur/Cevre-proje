'use client'

/**
 * T8 — Performance Utility Hooks
 *
 * Three general-purpose hooks used throughout the app to reduce unnecessary
 * re-renders and network requests:
 *
 * • useDebounce  — delay propagating a rapidly-changing value (e.g. search input)
 * • useThrottle  — cap how often a value updates (e.g. scroll position, resize)
 * • usePrevious  — remember the last render's value (e.g. optimistic UI diffing)
 */

import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useDebounce
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms of
 * inactivity. Ideal for search inputs where you want to wait until the user
 * stops typing before firing a network request.
 *
 * @example
 *   const debouncedSearch = useDebounce(searchInput, 350)
 *   useSWR(debouncedSearch ? [KEYS.search, debouncedSearch] : null, fetcher)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

// ─────────────────────────────────────────────────────────────────────────────
// useThrottle
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a throttled copy of `value` that updates at most once per `interval`
 * ms. Ideal for values tied to high-frequency events like scroll or resize.
 *
 * @example
 *   const throttledScrollY = useThrottle(scrollY, 100)
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttled, setThrottled] = useState<T>(value)
  const lastUpdated = useRef<number>(0)

  useEffect(() => {
    const now = Date.now()
    const remaining = interval - (now - lastUpdated.current)

    if (remaining <= 0) {
      // Enough time has passed — update immediately
      lastUpdated.current = now
      setThrottled(value)
    } else {
      // Schedule an update for after the remaining interval
      const id = setTimeout(() => {
        lastUpdated.current = Date.now()
        setThrottled(value)
      }, remaining)

      return () => clearTimeout(id)
    }
  }, [value, interval])

  return throttled
}

// ─────────────────────────────────────────────────────────────────────────────
// usePrevious
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the value from the *previous* render cycle.
 * Useful for comparing before/after in effects or for optimistic UI diffing.
 * Returns `undefined` on the very first render.
 *
 * @example
 *   const prevCount = usePrevious(postCount)
 *   const newPosts = postCount - (prevCount ?? postCount)
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  })

  return ref.current
}
