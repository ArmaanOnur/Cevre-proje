'use client'

/**
 * /map — Activity Cards Map (T4 — full Mapbox GL implementation)
 * Interactive map with card pins, user location, bottom sheet + create modal.
 */

import { useState, useCallback, useDeferredValue } from 'react'
import dynamic from 'next/dynamic'
import { useCards } from '@/hooks/useCards'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useCardStore } from '@/store/cards.store'
import { ACTIVITY_CATEGORIES, CATEGORY_MAP } from '@cevre/shared'
import { env } from '@/lib/env'
import type { MapCard } from './MapboxMap'

// T8: Lazy-load the multi-step create modal — only needed after map click
const CreateCardModal = dynamic(() => import('./CreateCardModal'), {
  ssr: false,
  loading: () => null,
})

// Mapbox uses browser-only APIs — disable SSR
const MapboxMap = dynamic(() => import('./MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-emerald-50">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-5xl animate-bounce">🗺️</span>
        <p className="text-sm text-gray-400 font-medium">Harita yükleniyor…</p>
      </div>
    </div>
  ),
})

export default function MapPage() {
  const { cards, isLoading, requestJoin, toggleLike } = useCards()
  const { lat: userLat, lng: userLng } = useGeolocation()
  const { activeCategory, setCategory } = useCardStore()

  const [selectedCard, setSelectedCard] = useState<MapCard | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCardLat, setNewCardLat] = useState<number | null>(null)
  const [newCardLng, setNewCardLng] = useState<number | null>(null)
  const [showCategories, setShowCategories] = useState(false)

  const token = env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Normalise cards → MapCard shape
  const mapCards: MapCard[] = (cards ?? [])
    .filter(c => c.lat !== undefined && c.lng !== undefined)
    .map(c => ({
      id: c.id,
      title: c.title,
      category: c.category,
      lat: c.lat ?? c.location_point?.coordinates?.[1] ?? 0,
      lng: c.lng ?? c.location_point?.coordinates?.[0] ?? 0,
      current_participants: c.current_participants ?? 0,
      max_participants: c.max_participants ?? 8,
    }))

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setNewCardLat(lat)
    setNewCardLng(lng)
    setShowCreateModal(true)
    setSelectedCard(null)
  }, [])

  const handleCardClick = useCallback((card: MapCard) => {
    setSelectedCard(card)
    setShowCreateModal(false)
  }, [])

  const fullCard = selectedCard ? cards?.find(c => c.id === selectedCard.id) : null
  const cat = selectedCard ? CATEGORY_MAP[selectedCard.category as keyof typeof CATEGORY_MAP] : null

  if (!token) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-emerald-50 p-8 text-center">
        <span className="text-5xl mb-4">🗺️</span>
        <h2 className="font-bold text-gray-800 mb-2">Mapbox Token Eksik</h2>
        <p className="text-sm text-gray-500">
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> değerini{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env.local</code>'a ekleyin.
        </p>
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noreferrer"
          className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition"
        >
          Token al →
        </a>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 leading-tight">Çevre</h1>
          <p className="text-[10px] text-gray-400 leading-tight">
            {isLoading ? 'Yükleniyor…' : `${cards?.length ?? 0} aktivite yakında`}
          </p>
        </div>

        {/* Category filter pill */}
        <button
          onClick={() => setShowCategories(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition shrink-0
            ${activeCategory
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}
        >
          {activeCategory
            ? `${CATEGORY_MAP[activeCategory as keyof typeof CATEGORY_MAP]?.emoji} ${CATEGORY_MAP[activeCategory as keyof typeof CATEGORY_MAP]?.label}`
            : '🔍 Filtrele'}
        </button>
      </header>

      {/* ── Category filter sheet ─────────────────────────────────────────── */}
      {showCategories && (
        <div className="relative z-10 bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => { setCategory(null); setShowCategories(false) }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition
              ${!activeCategory ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Tümü
          </button>
          {ACTIVITY_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setShowCategories(false) }}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition
                ${activeCategory === cat.value ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapboxMap
          token={token}
          userLat={userLat ?? 41.0082}
          userLng={userLng ?? 28.9784}
          cards={mapCards}
          onCardClick={handleCardClick}
          onMapClick={handleMapClick}
        />

        {/* FAB — Create Card */}
        <button
          onClick={() => {
            setNewCardLat(userLat ?? 41.0082)
            setNewCardLng(userLng ?? 28.9784)
            setShowCreateModal(true)
            setSelectedCard(null)
          }}
          className="absolute bottom-6 right-4 z-10 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl shadow-xl flex items-center justify-center text-2xl transition"
          aria-label="Aktivite oluştur"
        >
          +
        </button>

        {/* Hint — tap map to place */}
        {showCreateModal && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full pointer-events-none">
            📍 Haritaya dokunarak konum seçin
          </div>
        )}
      </div>

      {/* ── Card Detail Bottom Sheet ─────────────────────────────────────── */}
      {selectedCard && (
        <div className="relative z-20 bg-white rounded-t-2xl shadow-2xl border-t border-gray-100 max-h-[55vh] overflow-y-auto">
          {/* Handle */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="px-4 pb-6">
            {/* Category + close */}
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white`}
                style={{ background: cat?.color ?? '#10b981' }}>
                {cat?.emoji} {cat?.label ?? selectedCard.category}
              </span>
              <button
                onClick={() => setSelectedCard(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition text-sm"
              >
                ✕
              </button>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedCard.title}</h3>

            {fullCard?.description && (
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">{fullCard.description}</p>
            )}

            {/* Stats row */}
            <div className="flex gap-4 text-sm text-gray-500 mb-4">
              <span>👥 {selectedCard.current_participants}/{selectedCard.max_participants} kişi</span>
              {fullCard?.scheduled_at && (
                <span>🕐 {new Date(fullCard.scheduled_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => requestJoin(selectedCard.id)}
                disabled={selectedCard.current_participants >= selectedCard.max_participants}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedCard.current_participants >= selectedCard.max_participants
                  ? '🔒 Dolu'
                  : '🎉 Katıl'}
              </button>
              <button
                onClick={() => toggleLike(selectedCard.id, false)}
                className="w-12 h-12 flex items-center justify-center border border-gray-200 rounded-xl hover:bg-gray-50 transition text-xl"
              >
                🤍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Card Modal ─────────────────────────────────────────────── */}
      {showCreateModal && newCardLat && newCardLng && (
        <CreateCardModal
          initialLat={newCardLat}
          initialLng={newCardLng}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
