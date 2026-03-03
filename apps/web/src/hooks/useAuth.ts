'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { AuthService } from '@/services/auth.service'
import { ProfileService } from '@/services/profile.service'
import { isProfileComplete } from '@cevre/shared'
import { normalizePhoneForSupabase } from '@cevre/shared'
import type { InsertDto, UpdateDto } from '@cevre/supabase'

export function useAuth() {
  const router = useRouter()
  const supabase = createClient()
  const {
    supabaseUser, profile, session, isLoading,
    isAuthenticated, setSession, setProfile, setLoading, reset,
  } = useAuthStore()

  useEffect(() => {
    setLoading(true)
    AuthService.getSession().then(({ data: session }) => {
      setSession(session)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = AuthService.onAuthStateChange(async (user, session) => {
      setSession(session)
      if (user) await loadProfile(user.id)
      else reset()
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await ProfileService.getById(userId)
    setProfile(data as any ?? null)
    setLoading(false)
    return data
  }, [setProfile, setLoading])

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
    const { data: created, error } = await supabase.from('users').insert(insertData).select().single()
    if (error) {
      if (error.code === '23505') return updateProfile(data as UpdateDto<'users'>)
      throw new Error(error.message)
    }
    if (created) setProfile(created as any)
    return created
  }, [supabase, supabaseUser, setProfile])

  const updateProfile = useCallback(async (data: UpdateDto<'users'>) => {
    if (!supabaseUser) throw new Error('Oturum bulunamadı')
    const { data: updated, error } = await ProfileService.update(supabaseUser.id, data as Record<string, unknown>)
    if (error) throw new Error((error as any).message)
    if (updated) setProfile(updated as any)
    return updated
  }, [supabaseUser, setProfile])

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    if (!supabaseUser) throw new Error('Oturum bulunamadı')
    return ProfileService.uploadAvatar(supabaseUser.id, file)
    return data.publicUrl
  }, [supabase, supabaseUser])

  const signOut = useCallback(async () => {
    await AuthService.signOut()
    reset()
    router.push('/auth')
  }, [reset, router])

  const deleteAccount = useCallback(async () => {
    if (!supabaseUser) return
    await ProfileService.deactivate(supabaseUser.id)
    await signOut()
  }, [supabaseUser, signOut])

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
