/**
 * AuthService unit tests
 * All Supabase calls are mocked — no real DB connection needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '@/services/auth.service'

// ── Mock Supabase client ────────────────────────────────────────────────────
const mockAuth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}

const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    auth: mockAuth,
    from: mockFrom,
  })),
}))

// ── Tests ───────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signIn', () => {
    it('returns user and session on success', async () => {
      const user = { id: 'user-1', email: 'test@example.com' }
      const session = { access_token: 'token' }
      mockAuth.signInWithPassword.mockResolvedValue({ data: { user, session }, error: null })

      const result = await AuthService.signIn('test@example.com', 'password')

      expect(result.error).toBeNull()
      expect(result.data?.user).toEqual(user)
      expect(result.data?.session).toEqual(session)
    })

    it('returns error on failure', async () => {
      const error = new Error('Invalid credentials')
      mockAuth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error })

      const result = await AuthService.signIn('bad@email.com', 'wrong')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(error)
    })
  })

  describe('signOut', () => {
    it('returns success when signOut resolves', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null })
      const result = await AuthService.signOut()
      expect(result.error).toBeNull()
    })

    it('returns error when signOut fails', async () => {
      const error = new Error('Sign out failed')
      mockAuth.signOut.mockResolvedValue({ error })
      const result = await AuthService.signOut()
      expect(result.error).toEqual(error)
    })
  })

  describe('getSession', () => {
    it('returns current session', async () => {
      const session = { access_token: 'tok', user: { id: 'u1' } }
      mockAuth.getSession.mockResolvedValue({ data: { session }, error: null })

      const result = await AuthService.getSession()
      expect(result.data).toEqual(session)
    })
  })

  describe('getProfile', () => {
    it('queries profiles table with given userId', async () => {
      const profile = { id: 'u1', username: 'testuser' }
      const mockSingle = vi.fn().mockResolvedValue({ data: profile, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await AuthService.getProfile('u1')

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(result.data).toEqual(profile)
    })
  })
})
