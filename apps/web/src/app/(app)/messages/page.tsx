'use client'

/**
 * /messages — Conversations list
 * Shows DMs and group chats with unread count badges.
 */

import { useState } from 'react'
import { useConversations } from '@/hooks/useConversations'
import { useRouter } from 'next/navigation'
import { NewConversationModal } from './NewConversationModal'

export default function MessagesPage() {
  const { conversations, isLoading } = useConversations()
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)

  return (
    <div className="max-w-lg mx-auto">
      {/* New conversation modal */}
      {showNew && <NewConversationModal onClose={() => setShowNew(false)} />}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Mesajlar</h1>
        <button
          onClick={() => setShowNew(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition text-lg"
          aria-label="Yeni mesaj"
        >
          ✏️
        </button>
      </header>

      {/* Search */}
      <div className="px-4 py-2 bg-white border-b border-gray-50">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <span className="text-gray-400 text-sm">🔍</span>
          <input
            type="search"
            placeholder="Konuşmalarda ara…"
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="divide-y divide-gray-50">
        {isLoading ? (
          <>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 bg-gray-200 rounded-full w-1/3" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </>
        ) : !conversations?.length ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold text-gray-700">Henüz mesaj yok</p>
            <p className="text-sm text-gray-400 mt-1">Birine mesaj göndererek başla</p>
          </div>
        ) : (
          conversations.map(conv => {
            const other = (conv as any).other_participant
            const lastMsg = (conv as any).last_message
            const unread = (conv as any).unread_count ?? 0

            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/messages/${conv.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-xl overflow-hidden">
                    {other?.avatar_url ? (
                      <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : '👤'}
                  </div>
                  {/* Online indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <span className={`text-sm truncate ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {other?.full_name ?? 'Kullanıcı'}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${unread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {lastMsg?.content ?? 'Henüz mesaj yok'}
                    </p>
                    {unread > 0 && (
                      <span className="ml-2 shrink-0 min-w-[18px] h-[18px] bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
