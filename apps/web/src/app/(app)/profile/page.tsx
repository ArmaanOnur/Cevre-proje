'use client'

/**
 * /profile — Own profile page
 * Shows current user's profile, stats, activity cards.
 */

import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { profile, isLoading } = useProfile(user?.id)
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="px-4 pt-16 pb-6 text-center">
          <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse mx-auto mb-4" />
          <div className="h-5 bg-gray-200 rounded-full w-1/3 mx-auto mb-2 animate-pulse" />
          <div className="h-3.5 bg-gray-100 rounded-full w-1/4 mx-auto animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Profil</h1>
        <button
          onClick={() => router.push('/profile/edit')}
          className="text-sm text-emerald-600 font-medium"
        >
          Düzenle
        </button>
      </header>

      {/* Profile hero */}
      <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
        <div className="flex gap-4 items-start">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-3xl overflow-hidden shrink-0 border-2 border-white ring-2 ring-emerald-200">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : '👤'}
          </div>

          {/* Stats */}
          <div className="flex-1 pt-1">
            <div className="flex justify-around text-center">
              {[
                { label: 'Aktivite', value: (profile as any)?.cards_count ?? 0 },
                { label: 'Takipçi', value: (profile as any)?.followers_count ?? 0 },
                { label: 'Takip', value: (profile as any)?.following_count ?? 0 },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Name / username / bio */}
        <div className="mt-3">
          <p className="font-bold text-gray-900">{profile?.full_name ?? '—'}</p>
          {profile?.username && (
            <p className="text-sm text-gray-500">@{profile.username}</p>
          )}
          {(profile as any)?.bio && (
            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{(profile as any).bio}</p>
          )}
          {(profile as any)?.location && (
            <p className="text-xs text-gray-400 mt-1">📍 {(profile as any).location}</p>
          )}
        </div>

        {/* Edit / Share buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => router.push('/profile/edit')}
            className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Profili Düzenle
          </button>
          <button className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition">
            ↗️
          </button>
        </div>
      </div>

      {/* Activity cards placeholder */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Aktivitelerim</h2>
        <div className="grid grid-cols-3 gap-1">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Settings / Sign out */}
      <div className="px-4 py-4 border-t border-gray-100 mt-4">
        <button
          onClick={signOut}
          className="w-full py-3 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition"
        >
          Çıkış yap
        </button>
      </div>
    </div>
  )
}
