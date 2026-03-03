'use client'

/**
 * MapboxMap — T4
 * Imperative Mapbox GL JS wrapper. Loaded via dynamic import (no SSR).
 * Props are stable refs so the map only initialises once.
 */

import { useEffect, useRef, useCallback } from 'react'
import type { Map as MapboxMap, Marker, Popup } from 'mapbox-gl'
import { ACTIVITY_CATEGORIES, CATEGORY_MAP } from '@cevre/shared'

export interface MapCard {
  id: string
  title: string
  category: string
  lat: number
  lng: number
  current_participants: number
  max_participants: number
}

interface MapboxMapProps {
  token: string
  userLat: number
  userLng: number
  cards: MapCard[]
  onCardClick: (card: MapCard) => void
  onMapClick?: (lat: number, lng: number) => void
}

export default function MapboxMapComponent({
  token,
  userLat,
  userLng,
  cards,
  onCardClick,
  onMapClick,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const userMarkerRef = useRef<Marker | null>(null)

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      import('mapbox-gl/dist/mapbox-gl.css')

      mapboxgl.accessToken = token

      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [userLng, userLat],
        zoom: 14,
        attributionControl: false,
      })

      map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

      // Map click for "pin card here"
      map.on('click', (e) => {
        if (e.defaultPrevented) return
        onMapClick?.(e.lngLat.lat, e.lngLat.lng)
      })

      mapRef.current = map
    })

    return () => {
      markersRef.current.forEach(m => m.remove())
      userMarkerRef.current?.remove()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── User location marker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !userLat || !userLng) return

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      userMarkerRef.current?.remove()

      const el = document.createElement('div')
      el.className = 'user-location-dot'
      el.style.cssText = `
        width: 20px; height: 20px; border-radius: 50%;
        background: #10b981; border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(16,185,129,0.25);
        animation: pulse 2s infinite;
      `

      userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([userLng, userLat])
        .addTo(mapRef.current!)

      mapRef.current!.easeTo({ center: [userLng, userLat], zoom: 14 })
    })
  }, [userLat, userLng])

  // ── Card markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      // Clear old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      cards.forEach(card => {
        const cat = CATEGORY_MAP[card.category as keyof typeof CATEGORY_MAP]
        const emoji = cat?.emoji ?? '📍'
        const color = cat?.color ?? '#10b981'
        const isFull = card.current_participants >= card.max_participants

        const el = document.createElement('div')
        el.style.cssText = `
          width: 40px; height: 40px; border-radius: 50%;
          background: ${isFull ? '#9ca3af' : color};
          border: 2.5px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; cursor: pointer;
          transition: transform 0.15s ease;
        `
        el.textContent = emoji
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)' })
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
        el.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          onCardClick(card)
        })

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([card.lng, card.lat])
          .addTo(mapRef.current!)

        markersRef.current.push(marker)
      })
    })
  }, [cards, onCardClick])

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(16,185,129,0.25); }
          50%       { box-shadow: 0 0 0 8px rgba(16,185,129,0.1); }
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />
    </>
  )
}
