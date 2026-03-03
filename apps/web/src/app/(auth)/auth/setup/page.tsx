'use client'

/**
 * /auth/setup — Profile onboarding
 * Step 3: New users set their name, username, and optional avatar.
 * After submission, middleware routes to /map.
 */

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function SetupPage() {
  const router = useRouter()
  const { createProfile, uploadAvatar, user } = useAuth()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30)
    setUsername(val)
    setUsernameStatus('idle')
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    if (val.length < 3) return

    setUsernameStatus('checking')
    usernameTimer.current = setTimeout(async () => {
      try {
        const { ProfileService } = await import('@/services/profile.service')
        const result = await ProfileService.checkUsername(val)
        setUsernameStatus(result.available ? 'ok' : 'taken')
      } catch {
        setUsernameStatus('idle')
      }
    }, 500)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Ad soyad zorunludur.'); return }
    if (username.length < 3) { setError('Kullanıcı adı en az 3 karakter olmalı.'); return }
    if (usernameStatus === 'taken') { setError('Bu kullanıcı adı alınmış.'); return }

    startTransition(async () => {
      try {
        let avatarUrl: string | undefined
        if (avatarFile) {
          avatarUrl = await uploadAvatar(avatarFile)
        }

        await createProfile({
          full_name: fullName.trim(),
          username,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })

        router.replace('/map')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Profil oluşturulamadı.')
      }
    })
  }

  const usernameHint = {
    idle: null,
    checking: <span className="text-gray-400">Kontrol ediliyor…</span>,
    ok: <span className="text-emerald-600">✓ Kullanılabilir</span>,
    taken: <span className="text-red-600">✗ Bu kullanıcı adı alınmış</span>,
  }[usernameStatus]

  return (
    <>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Profilini oluştur</h2>
        <p className="text-sm text-gray-500 mt-1">Çevre topluluğuna merhaba de 👋</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Avatar upload */}
        <div className="flex flex-col items-center mb-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 hover:border-emerald-400 transition overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Profil fotoğrafı" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">📷</span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <p className="text-xs text-gray-400 mt-2">Profil fotoğrafı ekle (isteğe bağlı)</p>
        </div>

        {/* Full name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ad soyad</label>
          <input
            type="text"
            placeholder="Örn: Ahmet Yılmaz"
            value={fullName}
            onChange={e => { setFullName(e.target.value); setError('') }}
            disabled={isPending}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition disabled:opacity-60"
          />
        </div>

        {/* Username */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Kullanıcı adı</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
            <input
              type="text"
              placeholder="kullanıcıadı"
              value={username}
              onChange={handleUsernameChange}
              disabled={isPending}
              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition disabled:opacity-60"
            />
          </div>
          {username.length > 0 && (
            <p className="mt-1.5 text-xs">{usernameHint}</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4" role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending || usernameStatus === 'taken' || usernameStatus === 'checking'}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Kaydediliyor…
            </span>
          ) : 'Başla →'}
        </button>
      </form>
    </>
  )
}
