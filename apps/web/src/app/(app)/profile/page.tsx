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
    <div className="max-w-xl mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 glass border-b border-slate-100 px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Profil</h1>
        <button
          onClick={() => router.push('/profile/edit')}
          className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition"
        >
          Düzenle
        </button>
      </header>

      {/* ── Profile hero ──────────────────────────────────── */}
      <div className="bg-white px-4 pt-6 pb-4 border-b border-slate-100">
        <div className="flex gap-4 items-start">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-3xl overflow-hidden shrink-0 border-[3px] border-white ring-2 ring-emerald-200 shadow-sm">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : '👤'}
          </div>

          {/* Stats */}
          <div className="flex-1 pt-2">
            <div className="flex justify-around text-center">
              {[
                { label: 'Aktivite', value: (profile as any)?.cards_count ?? 0 },
                { label: 'Takipçi',  value: (profile as any)?.followers_count ?? 0 },
                { label: 'Takip',    value: (profile as any)?.following_count ?? 0 },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Name / username / bio */}
        <div className="mt-3 space-y-0.5">
          <p className="font-bold text-slate-900">{profile?.full_name ?? '—'}</p>
          {profile?.username && (
            <p className="text-sm text-slate-500">@{profile.username}</p>
          )}
          {(profile as any)?.bio && (
            <p className="text-sm text-slate-700 mt-2 leading-relaxed">{(profile as any).bio}</p>
          )}
          {(profile as any)?.location && (
            <p className="text-xs text-slate-400 mt-1">📍 {(profile as any).location}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => router.push('/profile/edit')}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-sm font-semibold text-slate-700 transition"
          >
            Profili Düzenle
          </button>
          <button className="w-11 h-10 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center transition">
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Activity grid ─────────────────────────────────── */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Aktivitelerim</h2>
        <div className="grid grid-cols-3 gap-1.5">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>

      {/* ── Sign out ──────────────────────────────────────── */}
      <div className="px-4 pb-6">
        <button
          onClick={signOut}
          className="w-full py-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-semibold hover:bg-rose-100 transition"
        >
          Çıkış yap
        </button>
      </div>
    </div>
  )
}
