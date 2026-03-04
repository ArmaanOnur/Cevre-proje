'use client'

/**
 * /messages/[id] — Real-time Chat Thread
 * T5: Full messaging UI with bubbles, typing indicator, send bar.
 */

import { useEffect, useRef, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMessages } from '@/hooks/useMessages'
import { useAuth } from '@/hooks/useAuth'

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { messages, isLoading, sendMessage, setTyping } = useMessages(id)

  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    setTyping()
    // Auto-grow
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    setText('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    startTransition(() => sendMessage(trimmed))
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      {/* Header */}
      <header className="shrink-0 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"
          aria-label="Geri"
        >
          ‹
        </button>
        {/* Avatar placeholder — in real app pull from conversation metadata */}
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-lg">
          👤
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">Konuşma</p>
          <p className="text-xs text-emerald-500 font-medium">Çevrimiçi</p>
        </div>
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 text-lg">
          ⋯
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {isLoading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`h-9 rounded-2xl ${i % 2 === 0 ? 'bg-white w-48' : 'bg-emerald-100 w-36'}`}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <p className="text-4xl mb-3">👋</p>
            <p className="font-semibold text-gray-700 text-sm">Konuşmayı başlat</p>
            <p className="text-xs text-gray-400 mt-1">İlk mesajı gönder</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isMine = msg.sender_id === user?.id
              const prevMsg = messages[idx - 1]
              const isFirst = !prevMsg || prevMsg.sender_id !== msg.sender_id
              const sentAt = new Date(msg.sent_at ?? msg.created_at ?? '')
              const timeLabel = sentAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-0.5'}`}
                >
                  <div className={`group max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm leading-relaxed break-words
                        ${isMine
                          ? 'bg-emerald-500 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 shadow-sm rounded-bl-sm border border-gray-100'
                        }
                        ${(msg.id as string).startsWith('temp-') ? 'opacity-60' : ''}
                      `}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition px-1">
                      {timeLabel}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            <div className="flex justify-start mt-1">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1 items-center opacity-0" aria-hidden>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Send bar */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-3 py-2 flex items-end gap-2 safe-area-bottom">
        {/* Attachment */}
        <button
          type="button"
          className="w-9 h-9 mb-0.5 flex items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 transition"
          aria-label="Dosya ekle"
        >
          📎
        </button>

        {/* Textarea */}
        <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Mesaj yaz…"
            rows={1}
            className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none leading-relaxed max-h-[120px]"
          />
        </div>

        {/* Send / emoji toggle */}
        {text.trim() ? (
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="w-9 h-9 mb-0.5 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition disabled:opacity-50 shrink-0"
            aria-label="Gönder"
          >
            ➤
          </button>
        ) : (
          <button
            type="button"
            className="w-9 h-9 mb-0.5 flex items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 transition shrink-0"
            aria-label="Emoji"
          >
            😊
          </button>
        )}
      </div>
    </div>
  )
}
