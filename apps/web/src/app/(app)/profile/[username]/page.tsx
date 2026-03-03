'use client'

/**
 * /profile/[username] — Public user profile
 * Shows another user's profile with follow action.
 */

import { useProfile } from '@/hooks/useProfile'
import { useFollow } from '@/hooks/useFollow'
import { useRouter } from 'next/navigation'

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const router = useRouter()
  const { profile, isLoading } = useProfile(params.username)
  const { status, follow, unfollow, isLoading: followLoading } = useFollow(profile?.id)

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse mx-auto mb-4" />
        <div className="h-5 bg-gray-200 rounded-full w-1/3 mx-auto mb-2 animate-pulse" />
        <div className="h-3.5 bg-gray-100 rounded-full w-1/4 mx-auto animate-pulse" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-3">🤷</p>
        <p className="font-semibold text-gray-700">Kullanıcı bulunamadı</p>
        <p className="text-sm text-gray-400 mt-1">@{params.username}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-emerald-600 hover:underline">
          ← Geri dön
        </button>
      </div>
    )
  }

  const isFollowing = status?.is_following
  const isPending = status?.request_pending

  async function handleFollowToggle() {
    if (!profile) return
    if (isFollowing) await unfollow()
    else await follow()
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-600 text-xl">←</button>
        <h1 className="text-lg font-bold text-gray-900 truncate">@{profile.username}</h1>
      </header>

      {/* Profile hero */}
      <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
        <div className="flex gap-4 items-start">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-3xl overflow-hidden shrink-0 border-2 border-white ring-2 ring-emerald-200">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : '👤'}
          </div>
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

        <div className="mt-3">
          <p className="font-bold text-gray-900">{profile.full_name}</p>
          {profile.username && <p className="text-sm text-gray-500">@{profile.username}</p>}
          {(profile as any)?.bio && (
            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{(profile as any).bio}</p>
          )}
        </div>

        {/* Follow + Message buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleFollowToggle}
            disabled={followLoading}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50
              ${isFollowing
                ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
          >
            {isPending ? '⏳ İstek gönderildi' : isFollowing ? 'Takip ediliyor' : 'Takip et'}
          </button>
          <button className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            Mesaj gönder
          </button>
        </div>
      </div>

      {/* Activity grid placeholder */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Aktiviteleri</h2>
        <div className="grid grid-cols-3 gap-1">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
