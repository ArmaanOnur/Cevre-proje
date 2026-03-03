'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { userQueries } from '@cevre/supabase'
import type { InsertDto, UpdateDto } from '@cevre/supabase'
import { normalizePhoneForSupabase, isProfileComplete } from '@cevre/shared'

export function useAuth() {
  const router = useRouter()
  const supabase = createClient()
  const {
    supabaseUser, profile, session, isLoading,
    isAuthenticated, setSession, setProfile, setLoading, reset,
  } = useAuthStore()

  useEffect(() => {
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session?.user) await loadProfile(session.user.id)
      else reset()
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await userQueries.getProfile(supabase, userId)
    setProfile(data ?? null)
    setLoading(false)
    return data
  }, [supabase, setProfile, setLoading])

  const sendOtp = useCallback(async (rawPhone: string): Promise<string> => {
    const phone = normalizePhoneForSupabase(rawPhone)
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: 'sms' } })
    if (error) throw new Error(mapSupabaseError(error.message))
    return phone
  }, [supabase])

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    if (error) throw new Error(mapSupabaseError(error.message))
    return data
  }, [supabase])

  const createProfile = useCallback(async (data: Omit<InsertDto<'users'>, 'id' | 'phone'>) => {
    if (!supabaseUser) throw new Error('Oturum bulunamadı')
    const insertData: InsertDto<'users'> = { id: supabaseUser.id, phone: supabaseUser.phone ?? '', ...data }
    const { data: profile, error } = await userQueries.createProfile(supabase, insertData)
    if (error) {
      if (error.code === '23505') return updateProfile(data)
      throw new Error(error.message)
    }
    if (profile) setProfile(profile)
    return profile
  }, [supabase, supabaseUser, setProfile])

  const updateProfile = useCallback(async (data: UpdateDto<'users'>) => {
    if (!supabaseUser) throw new Error('Oturum bulunamadı')
    const { data: updated, error } = await userQueries.updateProfile(supabase, supabaseUser.id, data)
    if (error) throw new Error(error.message)
    if (updated) setProfile(updated)
    return updated
  }, [supabase, supabaseUser, setProfile])

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    if (!supabaseUser) throw new Error('Oturum bulunamadı')
    const ext = file.name.split('.').pop()
    const path = `avatars/${supabaseUser.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }, [supabase, supabaseUser])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    reset()
    router.push('/auth')
  }, [supabase, reset, router])

  const deleteAccount = useCallback(async () => {
    if (!supabaseUser) return
    await updateProfile({ is_active: false })
    await signOut()
  }, [supabaseUser, updateProfile, signOut])

  return {
    user: supabaseUser, profile, session, isLoading, isAuthenticated,
    profileComplete: isProfileComplete(profile),
    sendOtp, verifyOtp, createProfile, updateProfile, uploadAvatar,
    signOut, deleteAccount,
    refreshProfile: () => supabaseUser ? loadProfile(supabaseUser.id) : Promise.resolve(null),
  }
}

function mapSupabaseError(msg: string): string {
  if (msg.includes('Invalid OTP') || msg.includes('Token has expired'))
    return 'Kod hatalı veya süresi dolmuş. Yeni kod isteyin.'
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Çok fazla deneme yapıldı. Lütfen bekleyin.'
  if (msg.includes('Phone') || msg.includes('phone'))
    return 'Geçersiz telefon numarası.'
  if (msg.includes('Network'))
    return 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.'
  return 'Bir hata oluştu. Lütfen tekrar deneyin.'
}
