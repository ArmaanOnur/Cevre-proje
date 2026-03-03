'use client'

/**
 * useGeolocation — T4
 * Abstraction over browser Geolocation API with permission state tracking.
 * Extracted from useCards (was inlined there).
 *
 * Usage:
 *   const { lat, lng, accuracy, status, error, refresh } = useGeolocation()
 *
 * Status values:
 *   'idle'      → not requested yet
 *   'loading'   → waiting for browser permission / position
 *   'success'   → position obtained
 *   'denied'    → user denied permission
 *   'error'     → other error (timeout, unavailable)
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export type GeoStatus = 'idle' | 'loading' | 'success' | 'denied' | 'error'

export interface GeoState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  status: GeoStatus
  error: string | null
  /** Re-trigger geolocation lookup */
  refresh: () => void
}

const DEFAULT_LAT = 41.0082 // İstanbul fallback
const DEFAULT_LNG = 28.9784

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
}

/**
 * Primary hook — auto-requests location on mount.
 * Falls back to İstanbul coordinates after 10s timeout or on denial.
 */
export function useGeolocation(autoFallback = true): GeoState {
  const [state, setState] = useState<Omit<GeoState, 'refresh'>>({
    lat: null,
    lng: null,
    accuracy: null,
    status: 'idle',
    error: null,
  })

  const watchRef = useRef<number | null>(null)

  const request = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState(s => ({
        ...s,
        status: 'error',
        error: 'Tarayıcınız konum belirlemeyi desteklemiyor.',
        ...(autoFallback ? { lat: DEFAULT_LAT, lng: DEFAULT_LNG } : {}),
      }))
      return
    }

    setState(s => ({ ...s, status: 'loading', error: null }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          status: 'success',
          error: null,
        })
      },
      (err) => {
        const denied = err.code === 1 // PERMISSION_DENIED
        setState({
          lat: autoFallback ? DEFAULT_LAT : null,
          lng: autoFallback ? DEFAULT_LNG : null,
          accuracy: null,
          status: denied ? 'denied' : 'error',
          error: denied
            ? 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.'
            : 'Konum alınamadı. Lütfen tekrar deneyin.',
        })
      },
      GEO_OPTIONS
    )
  }, [autoFallback])

  useEffect(() => {
    request()
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [request])

  return { ...state, refresh: request }
}

/**
 * Lightweight version — returns just lat/lng with İstanbul fallback.
 * Good for map initialization where we just need a coordinate.
 */
export function usePosition() {
  const { lat, lng, status } = useGeolocation()
  return {
    lat: lat ?? DEFAULT_LAT,
    lng: lng ?? DEFAULT_LNG,
    isLocating: status === 'loading',
    isDefault: status !== 'success',
  }
}
