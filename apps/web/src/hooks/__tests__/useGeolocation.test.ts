/**
 * useGeolocation — unit tests (T4)
 * Tests geo hook fallback and permission denial paths.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGeolocation, usePosition } from '../useGeolocation'

// ── Helpers ───────────────────────────────────────────────────────────────

const ISTANBUL = { lat: 41.0082, lng: 28.9784 }

function mockGeolocation(override: Partial<Geolocation> = {}) {
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
      ...override,
    },
    writable: true,
    configurable: true,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────

describe('useGeolocation', () => {
  it('starts in loading state after mount (geolocation request triggers immediately)', () => {
    mockGeolocation() // getCurrentPosition never resolves
    const { result } = renderHook(() => useGeolocation(false))
    // Effect runs after render, hook immediately transitions to loading
    expect(result.current.status).toBe('loading')
    expect(result.current.lat).toBeNull()
  })

  it('falls back to İstanbul when geolocation API is unavailable', async () => {
    // Remove geolocation from navigator
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useGeolocation(true))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.lat).toBe(ISTANBUL.lat)
    expect(result.current.lng).toBe(ISTANBUL.lng)
  })

  it('sets status to denied when permission is refused', async () => {
    mockGeolocation({
      getCurrentPosition: vi.fn((_success, error) =>
        error?.({ code: 1, message: 'User denied', PERMISSION_DENIED: 1 } as GeolocationPositionError)
      ),
    })

    const { result } = renderHook(() => useGeolocation(true))

    await waitFor(() => expect(result.current.status).toBe('denied'))
    // Should still fall back to İstanbul coordinates
    expect(result.current.lat).toBe(ISTANBUL.lat)
    expect(result.current.lng).toBe(ISTANBUL.lng)
  })

  it('resolves to real coordinates on success', async () => {
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 39.9208,
        longitude: 32.8541,
        accuracy: 25,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }

    mockGeolocation({
      getCurrentPosition: vi.fn((success) => success(mockPosition)),
    })

    const { result } = renderHook(() => useGeolocation(true))

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.lat).toBeCloseTo(39.9208, 4)
    expect(result.current.lng).toBeCloseTo(32.8541, 4)
    expect(result.current.accuracy).toBe(25)
  })
})

describe('usePosition', () => {
  it('returns İstanbul defaults when still locating', () => {
    mockGeolocation({
      getCurrentPosition: vi.fn(), // never resolves
    })

    const { result } = renderHook(() => usePosition())

    // Before resolution, should have default coords
    expect(result.current.lat).toBe(ISTANBUL.lat)
    expect(result.current.lng).toBe(ISTANBUL.lng)
  })
})
