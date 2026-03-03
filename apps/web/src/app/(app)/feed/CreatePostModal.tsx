'use client'

/**
 * CreatePostModal — T4
 * Post creation sheet with text, visibility selector, and character counter.
 * Wired to FeedService.createPost() via useFeed.createPost().
 */

import { useState, useTransition, useRef } from 'react'
import { useFeed } from '@/hooks/useFeed'
import { useAuth } from '@/hooks/useAuth'

const MAX_CHARS = 500

const VISIBILITY_OPTIONS = [
  { value: 'public',    label: 'Herkese açık',  emoji: '🌍' },
  { value: 'followers', label: 'Takipçiler',     emoji: '👥' },
  { value: 'private',   label: 'Sadece ben',     emoji: '🔒' },
] as const

type Visibility = typeof VISIBILITY_OPTIONS[number]['value']

interface Props {
  onClose: () => void
}

export default function CreatePostModal({ onClose }: Props) {
  const { profile } = useAuth()
  const { createPost } = useFeed()

  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remaining = MAX_CHARS - content.length
  const canSubmit = content.trim().length > 0 && remaining >= 0

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    startTransition(async () => {
      try {
        await createPost({ content: content.trim(), visibility })
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gönderi oluşturulamadı.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
            İptal
          </button>
          <h2 className="text-sm font-bold text-gray-900">Yeni Gönderi</h2>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-full transition disabled:opacity-40"
          >
            {isPending ? '⏳' : 'Paylaş'}
          </button>
        </div>

        {/* Compose area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="flex gap-3 px-4 pt-4 pb-2">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : '👤'}
            </div>

            {/* Textarea */}
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                {profile?.full_name ?? 'Sen'}
              </p>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => { setContent(e.target.value); setError(''); autoGrow() }}
                placeholder="Ne paylaşmak istersin?"
                autoFocus
                rows={4}
                maxLength={MAX_CHARS + 1}
                className="w-full text-gray-800 placeholder-gray-400 focus:outline-none resize-none text-[15px] leading-relaxed"
              />
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
            {/* Media / attachments placeholder */}
            <button type="button" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition" title="Fotoğraf ekle (yakında)">
              📷
            </button>
            <button type="button" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition" title="Konum (yakında)">
              📍
            </button>
            <button type="button" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition" title="Aktivite bağla (yakında)">
              🎯
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Char counter */}
            <span className={`text-xs font-medium tabular-nums ${
              remaining < 0 ? 'text-red-500' : remaining < 50 ? 'text-amber-500' : 'text-gray-400'
            }`}>
              {remaining}
            </span>
          </div>

          {/* Visibility */}
          <div className="px-4 pb-4 border-t border-gray-50 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Göreceği kişiler</p>
            <div className="flex gap-2">
              {VISIBILITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition
                    ${visibility === opt.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="px-4 pb-3 text-sm text-red-600" role="alert">{error}</p>
          )}
        </form>
      </div>
    </div>
  )
}
