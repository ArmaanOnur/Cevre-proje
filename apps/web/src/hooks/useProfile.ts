'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { profileQueries } from '@cevre/supabase'
import type { EnhancedProfile } from '@cevre/shared'

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
