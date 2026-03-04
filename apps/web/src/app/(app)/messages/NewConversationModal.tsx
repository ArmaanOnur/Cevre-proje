'use client'

/**
 * NewConversationModal
 * T5: Search users by username/name, then open a direct chat.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MessagingService } from '@/services/messaging.service'

interface UserResult {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface Props {
  onClose: () => void
}

export function NewConversationModal({ onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isCreating, setIsCreating] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus on open
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(20)

        setResults((data as UserResult[]) ?? [])
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [query])

  async function startChat(userId: string) {
    if (isCreating) return
    setIsCreating(userId)
    try {
      const { data, error } = await MessagingService.createDirectConversation(userId)
      if (error || !data) throw error
      onClose()
      router.push(`/messages/${(data as any).id}`)
    } catch {
      setIsCreating(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-in fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal
        aria-label="Yeni mesaj"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-xl animate-in slide-in-from-bottom max-h-[90dvh] flex flex-col"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 shrink-0 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Yeni Mesaj</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
            <span className="text-gray-400 text-sm shrink-0">🔍</span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Kullanıcı ara…"
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            {isSearching && (
              <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 pb-safe">
          {query.trim().length < 2 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm text-gray-400">Kullanıcı adı veya isim yaz</p>
            </div>
          ) : !isSearching && results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">😕</p>
              <p className="text-sm text-gray-500 font-medium">Kullanıcı bulunamadı</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {results.map(u => (
                <li key={u.id}>
                  <button
                    onClick={() => startChat(u.id)}
                    disabled={!!isCreating}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left disabled:opacity-60"
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-lg overflow-hidden shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : '👤'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {u.full_name ?? u.username ?? 'Kullanıcı'}
                      </p>
                      {u.username && (
                        <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                      )}
                    </div>

                    {/* Spinner while creating */}
                    {isCreating === u.id ? (
                      <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <span className="text-emerald-500 text-lg shrink-0">›</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
