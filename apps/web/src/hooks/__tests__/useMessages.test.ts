/**
 * useMessages & useConversations — unit tests (T5)
 * Strategy: mock useSWR directly to avoid React context requirement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── SWR state shared across mocks ─────────────────────────────────────────
let swrData: unknown = []
let swrLoading = false
const mockMutate = vi.fn()

// ── Mock: swr ─────────────────────────────────────────────────────────────
vi.mock('swr', () => ({
  default: vi.fn((key: unknown) => {
    // For unreadCount keys (array starting with 'unread'), return a number
    const keyArr = Array.isArray(key) ? key : [key]
    const isUnreadKey = keyArr[0] === 'unread'
    return {
      data: isUnreadKey ? 0 : swrData,
      isLoading: swrLoading,
      error: null,
      mutate: mockMutate,
    }
  }),
}))

// ── Mock: @/lib/supabase ─────────────────────────────────────────────────
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
}
vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
  }),
}))

// ── Mock: @/hooks/useAuth ────────────────────────────────────────────────
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

// ── Mock: @/lib/query-keys ───────────────────────────────────────────────
vi.mock('@/lib/query-keys', () => ({
  queryKeys: {
    messages: (cid: string) => ['messages', cid],
    conversations: (uid: string) => ['conversations', uid],
    unreadCount: (uid: string) => ['unread', uid],
  },
}))

// ── Mock: MessagingService ───────────────────────────────────────────────
const mockSendMessage = vi.fn().mockResolvedValue({ data: { id: 'msg-1' }, error: null })
const mockSetTypingFn = vi.fn().mockResolvedValue({})
const mockSubscribeToMessages = vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
const mockGetConversations = vi.fn().mockResolvedValue({ data: [], error: null })
const mockGetUnreadCount = vi.fn().mockResolvedValue({ count: 0 })

vi.mock('@/services/messaging.service', () => ({
  MessagingService: {
    getMessages: vi.fn().mockResolvedValue({ data: [], error: null }),
    sendMessage: (...a: unknown[]) => mockSendMessage(...a),
    setTyping: (...a: unknown[]) => mockSetTypingFn(...a),
    markAllAsRead: vi.fn().mockResolvedValue({}),
    subscribeToMessages: (...a: unknown[]) => mockSubscribeToMessages(...a),
    getConversations: (...a: unknown[]) => mockGetConversations(...a),
    getUnreadCount: (...a: unknown[]) => mockGetUnreadCount(...a),
  },
}))

// Import AFTER all mocks
import { useMessages } from '../useMessages'
import { useConversations } from '../useConversations'

// ── Shared test data ──────────────────────────────────────────────────────
const MESSAGES = [
  { id: 'msg-a', conversation_id: 'conv-1', sender_id: 'user-2', content: 'Merhaba!', type: 'text', sent_at: '2024-01-01T10:00:00Z' },
  { id: 'msg-b', conversation_id: 'conv-1', sender_id: 'user-1', content: 'Selam!',   type: 'text', sent_at: '2024-01-01T10:01:00Z' },
]

// ═══════════════════════════════════════════════════════════════════════════
// useMessages
// ═══════════════════════════════════════════════════════════════════════════

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    swrData = MESSAGES
    swrLoading = false
    // Re-establish mockMutate impl after clearAllMocks
    mockMutate.mockImplementation(vi.fn())
    mockSubscribeToMessages.mockReturnValue({ unsubscribe: vi.fn() })
  })

  it('returns messages from SWR data', () => {
    const { result } = renderHook(() => useMessages('conv-1'))
    expect(result.current.messages).toEqual(MESSAGES)
    expect(result.current.isLoading).toBe(false)
  })

  it('returns isLoading=true when SWR is loading', () => {
    swrLoading = true
    swrData = []
    const { result } = renderHook(() => useMessages('conv-1'))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.messages).toEqual([])
  })

  it('sendMessage calls MessagingService.sendMessage with correct args', async () => {
    const { result } = renderHook(() => useMessages('conv-1'))

    await act(async () => {
      await result.current.sendMessage('Test mesajı')
    })

    expect(mockSendMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      content: 'Test mesajı',
    })
  })

  it('sendMessage optimistically calls mutate before API', async () => {
    const { result } = renderHook(() => useMessages('conv-1'))

    await act(async () => {
      result.current.sendMessage('Opt mesaj')
    })

    // mutate is called at least once (optimistic prepend)
    expect(mockMutate).toHaveBeenCalled()
  })

  it('setTyping calls MessagingService.setTyping', () => {
    const { result } = renderHook(() => useMessages('conv-1'))
    expect(() => result.current.setTyping()).not.toThrow()
    expect(mockSetTypingFn).toHaveBeenCalledWith('conv-1', true)
  })

  it('exposes refresh callback that calls mutate', () => {
    const { result } = renderHook(() => useMessages('conv-1'))
    result.current.refresh()
    expect(mockMutate).toHaveBeenCalled()
  })

  it('subscribes to realtime on mount with correct conversationId', () => {
    renderHook(() => useMessages('conv-1'))
    expect(mockSubscribeToMessages).toHaveBeenCalledWith(
      'conv-1',
      expect.any(Function)
    )
  })

  it('unsubscribes from realtime on unmount', () => {
    const mockUnsub = vi.fn()
    mockSubscribeToMessages.mockReturnValueOnce({ unsubscribe: mockUnsub })

    const { unmount } = renderHook(() => useMessages('conv-1'))
    unmount()
    expect(mockUnsub).toHaveBeenCalled()
  })

  it('isSending is false (no in-flight UI block in SWR version)', () => {
    const { result } = renderHook(() => useMessages('conv-1'))
    expect(result.current.isSending).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// useConversations
// ═══════════════════════════════════════════════════════════════════════════

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    swrData = []
    swrLoading = false
    mockMutate.mockImplementation(vi.fn())
  })

  it('returns conversations array from SWR data', () => {
    const { result } = renderHook(() => useConversations())
    expect(Array.isArray(result.current.conversations)).toBe(true)
  })

  it('isLoading reflects SWR loading state', () => {
    swrLoading = true
    const { result } = renderHook(() => useConversations())
    expect(result.current.isLoading).toBe(true)
  })

  it('unreadCount is a non-negative number', () => {
    const { result } = renderHook(() => useConversations())
    expect(typeof result.current.unreadCount).toBe('number')
    expect(result.current.unreadCount).toBeGreaterThanOrEqual(0)
  })

  it('exposes a refresh function that calls mutate', () => {
    const { result } = renderHook(() => useConversations())
    expect(typeof result.current.refresh).toBe('function')
    result.current.refresh()
    expect(mockMutate).toHaveBeenCalled()
  })
})
