'use client'

/**
 * /map — Activity Cards Map
 * Haritada yakın çevre aktivitelerini görüntüle.
 * TODO T4: Integrate Mapbox GL JS + real card pins
 */

import { useCards } from '@/hooks/useCards'

export default function MapPage() {
  const { cards, isLoading } = useCards()

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-safe-top py-3 bg-white border-b border-gray-100 z-10">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Çevre</h1>
          <p className="text-xs text-gray-400">Yakınındaki aktiviteler</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm font-medium text-emerald-700">
          🔍 Filtrele
        </button>
      </header>

      {/* Map placeholder — T4'te Mapbox entegrasyonu */}
      <div className="flex-1 relative bg-emerald-50 overflow-hidden">
        {/* Map background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(16,185,129,0.08),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(20,184,166,0.06),transparent_50%)]" />
        
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 text-center p-8">
          <span className="text-6xl">🗺️</span>
          <p className="text-gray-500 font-medium">Harita görünümü</p>
          <p className="text-sm text-gray-400">Mapbox entegrasyonu T4 aşamasında eklenecek</p>
        </div>

        {/* Card count badge */}
        {!isLoading && (
          <div className="absolute top-4 left-4 bg-white rounded-full px-3 py-1.5 shadow-sm border border-gray-100">
            <span className="text-sm font-semibold text-gray-700">
              {cards?.length ?? 0} aktivite
            </span>
          </div>
        )}
      </div>

      {/* Bottom sheet preview (card list) */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 max-h-48 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(cards ?? []).slice(0, 5).map(card => (
              <div key={card.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                <span className="text-xl">📍</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{card.title}</p>
                  <p className="text-xs text-gray-400 truncate">{card.category}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{card.current_participants}/{card.max_participants}</span>
              </div>
            ))}
            {!cards?.length && (
              <p className="text-sm text-center text-gray-400 py-2">Yakında aktivite bulunamadı</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
