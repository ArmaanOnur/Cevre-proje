'use client'

/**
 * useProfile — T2 Refactor
 * Reads: useSWR + ProfileService
 * Writes: ProfileService with cache invalidation
 */

import { useCallback } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'
import { ProfileService } from '@/services/profile.service'
import { queryKeys } from '@/lib/query-keys'
import type { EnhancedProfile } from '@cevre/shared'

export function useProfile(usernameOrId?: string) {
  const { user } = useAuth()

  // Resolve target: given usernameOrId or current user's id
  const targetId = usernameOrId ?? user?.id
  const isUuid = targetId?.includes('-') ?? false

  // ── SWR read: profile ───────────────────────────────────────────────────
  const { data: profile, isLoading, error, mutate } = useSWR<EnhancedProfile | null>(
    targetId ? queryKeys.profile(targetId) : null,
    () => {
      if (!targetId) return null
      return (isUuid
        ? ProfileService.getById(targetId)
        : ProfileService.getByUsername(targetId)
      ).then(r => { if (r.error) throw r.error; return r.data as EnhancedProfile })
    },
    { revalidateOnFocus: false }
  )

  // ── Write: update profile (optimistic) ──────────────────────────────────
  const updateProfile = useCallback(async (updates: Partial<EnhancedProfile>) => {
    if (!user) throw new Error('Giriş yapmanız gerekiyor')

    mutate({ ...profile, ...updates } as EnhancedProfile, { revalidate: false })

    const { data: updated, error } = await ProfileService.update(user.id, updates as Record<string, unknown>)
    if (error) { mutate(); throw new Error((error as any).message) }
    mutate(updated as EnhancedProfile, { revalidate: false })
    return updated
  }, [user, profile, mutate])

  // ── Write: upload avatar ─────────────────────────────────────────────────
  const uploadAvatar = useCallback(async (file: File) => {
    if (!user) throw new Error('Giriş yapmanız gerekiyor')
    const url = await ProfileService.uploadAvatar(user.id, file)
    mutate(prev => prev ? { ...prev, avatar_url: url } : prev, { revalidate: false })
    return url
  }, [user, mutate])

  // ── Read: check username availability ────────────────────────────────────
  const checkUsername = useCallback((username: string) =>
    ProfileService.checkUsername(username), [])

  const isOwnProfile = user?.id === profile?.id

  return {
    profile: profile ?? null,
    isLoading,
    error: error ? String(error) : null,
    isUpdating: false,
    isOwnProfile,
    updateProfile,
    uploadAvatar,
    checkUsername,
    refresh: () => mutate(),
  }
}

export function useProfile(usernameOrId?: string) {
  const supabase = createClient()
  const { user } = useAuth()
  
  const [profile, setProfile] = useState<EnhancedProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Load profile
  const loadProfile = useCallback(async () => {
    if (!usernameOrId) {
      if (!user) return
      usernameOrId = user.id
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const isId = usernameOrId.includes('-') // UUID check
      const { data, error } = isId
        ? await profileQueries.getById(supabase, usernameOrId)
        : await profileQueries.getByUsername(supabase, usernameOrId)
      
      if (error) throw error
      setProfile(data as EnhancedProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, usernameOrId, user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Update profile
  const updateProfile = useCallback(async (data: Partial<EnhancedProfile>) => {
    if (!user) throw new Error('Giriş yapmanız gerekiyor')
    
    setIsUpdating(true)
    try {
      const { data: updated, error } = await profileQueries.update(supabase, user.id, data)
      if (error) throw error
      
      setProfile(prev => ({ ...prev, ...updated } as EnhancedProfile))
      return updated
    } finally {
      setIsUpdating(false)
    }
  }, [supabase, user])

  // Check username availability
  const checkUsername = useCallback(async (username: string) => {
    const { available } = await profileQueries.checkUsername(supabase, username)
    return available
  }, [supabase])

  const isOwnProfile = user?.id === profile?.id

  return {
    profile,
    isLoading,
    error,
    isUpdating,
    isOwnProfile,
    updateProfile,
    checkUsername,
    refresh: loadProfile,
  }
}
