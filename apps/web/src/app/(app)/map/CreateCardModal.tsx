'use client'

/**
 * CreateCardModal — T4
 * Multi-step activity card creation.
 * Step 1: Category selection
 * Step 2: Title, description, details
 * Wired to CardService via useCards.createCard()
 */

import { useState, useTransition } from 'react'
import { useCards } from '@/hooks/useCards'
import { ACTIVITY_CATEGORIES, CARD_DEFAULTS } from '@cevre/shared'

interface Props {
  initialLat: number
  initialLng: number
  onClose: () => void
}

type Step = 'category' | 'details'

export default function CreateCardModal({ initialLat, initialLng, onClose }: Props) {
  const { createCard } = useCards()
  const [step, setStep] = useState<Step>('category')

  // Form state
  const [category, setCategory] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(CARD_DEFAULTS.MAX_PARTICIPANTS)
  const [durationHours, setDurationHours] = useState(CARD_DEFAULTS.DEFAULT_DURATION_HOURS)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const selectedCat = ACTIVITY_CATEGORIES.find(c => c.value === category)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Başlık zorunludur.'); return }
    if (title.length > CARD_DEFAULTS.MAX_TITLE_LENGTH) {
      setError(`Başlık en fazla ${CARD_DEFAULTS.MAX_TITLE_LENGTH} karakter olabilir.`); return
    }

    startTransition(async () => {
      try {
        await createCard({
          title: title.trim(),
          description: description.trim(),
          category: category as any,
          lat: initialLat,
          lng: initialLng,
          location_name: `${initialLat.toFixed(4)}, ${initialLng.toFixed(4)}`,
          max_participants: maxParticipants,
          duration_hours: durationHours,
        })
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Aktivite oluşturulamadı.')
      }
    })
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step === 'details' && (
              <button onClick={() => setStep('category')} className="text-gray-400 hover:text-gray-600 text-xl">
                ←
              </button>
            )}
            <h2 className="text-base font-bold text-gray-900">
              {step === 'category' ? 'Kategori seç' : 'Aktivite detayları'}
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm">
            ✕
          </button>
        </div>

        {/* ── Step 1: Category ─────────────────────────────────────────── */}
        {step === 'category' && (
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">
              📍 Konumunuz seçildi. Hangi aktiviteyi organize ediyorsunuz?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setStep('details') }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-transparent bg-gray-50 hover:border-emerald-300 hover:bg-emerald-50 transition"
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-xs font-medium text-gray-700">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Details ──────────────────────────────────────────── */}
        {step === 'details' && (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Category badge */}
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white"
                style={{ background: selectedCat?.color ?? '#10b981' }}
              >
                {selectedCat?.emoji} {selectedCat?.label}
              </span>
              <span className="text-xs text-gray-400">📍 Haritadan seçildi</span>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Başlık <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); setError('') }}
                placeholder="Örn: Kadıköy sahilinde koşu"
                maxLength={CARD_DEFAULTS.MAX_TITLE_LENGTH}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-400">{title.length}/{CARD_DEFAULTS.MAX_TITLE_LENGTH}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Açıklama
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Aktivite hakkında kısa bilgi…"
                rows={3}
                maxLength={CARD_DEFAULTS.MAX_DESCRIPTION_LENGTH}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition resize-none"
              />
            </div>

            {/* Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maksimum katılımcı
              </label>
              <div className="flex gap-2 flex-wrap">
                {[2, 4, 6, 8, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxParticipants(n)}
                    className={`w-10 h-10 rounded-xl text-sm font-semibold transition
                      ${maxParticipants === n
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Süre
              </label>
              <div className="flex gap-2 flex-wrap">
                {CARD_DEFAULTS.DURATION_OPTIONS_HOURS.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDurationHours(h)}
                    className={`px-3 h-10 rounded-xl text-sm font-semibold transition
                      ${durationHours === h
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {h} saat
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Oluşturuluyor…
                </span>
              ) : '🎉 Aktivite Oluştur'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
