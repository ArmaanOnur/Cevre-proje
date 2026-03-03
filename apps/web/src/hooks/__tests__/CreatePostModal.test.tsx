/**
 * CreatePostModal — unit tests (T4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockCreatePost = vi.fn()

vi.mock('@/hooks/useFeed', () => ({
  useFeed: () => ({
    posts: [],
    isLoading: false,
    error: null,
    hasMore: false,
    isLoadingMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    toggleLike: vi.fn(),
    deletePost: vi.fn(),
    addComment: vi.fn(),
    createPost: mockCreatePost,
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { full_name: 'Test User', avatar_url: null },
    isLoading: false,
  }),
}))

// ── Import after mocks ────────────────────────────────────────────────────
import CreatePostModal from '../../app/(app)/feed/CreatePostModal'

// ── Tests ─────────────────────────────────────────────────────────────────

describe('CreatePostModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  /** Helper: finds the textarea by its actual placeholder text */
  const getTextarea = () => screen.getByPlaceholderText(/ne paylaşmak istersin/i)

  it('renders textarea and submit button', () => {
    render(<CreatePostModal onClose={onClose} />)
    expect(getTextarea()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Paylaş' })).toBeInTheDocument()
  })

  it('submit is disabled when content is empty', () => {
    render(<CreatePostModal onClose={onClose} />)
    const btn = screen.getByRole('button', { name: 'Paylaş' })
    expect(btn).toBeDisabled()
  })

  it('submit becomes enabled after typing', async () => {
    render(<CreatePostModal onClose={onClose} />)
    await userEvent.type(getTextarea(), 'Merhaba dünya!')
    const btn = screen.getByRole('button', { name: 'Paylaş' })
    expect(btn).not.toBeDisabled()
  })

  it('character counter decreases as user types', async () => {
    render(<CreatePostModal onClose={onClose} />)
    await userEvent.type(getTextarea(), 'abc')
    expect(screen.getByText('497')).toBeInTheDocument()
  })

  it('calls createPost and onClose on submit', async () => {
    mockCreatePost.mockResolvedValue({})
    render(<CreatePostModal onClose={onClose} />)

    await userEvent.type(getTextarea(), 'Test gönderi')
    fireEvent.submit(getTextarea().closest('form')!)

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith({
        content: 'Test gönderi',
        visibility: 'public',
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows error message when createPost throws', async () => {
    mockCreatePost.mockRejectedValue(new Error('Sunucu hatası'))
    render(<CreatePostModal onClose={onClose} />)

    await userEvent.type(getTextarea(), 'Test')
    fireEvent.submit(getTextarea().closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/sunucu hatası/i)).toBeInTheDocument()
    })
  })

  it('calls onClose when İptal button is clicked', async () => {
    render(<CreatePostModal onClose={onClose} />)
    // The cancel button renders as 'İptal' (Turkish)
    const closeBtn = screen.getByRole('button', { name: 'İptal' })
    await userEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })
})
