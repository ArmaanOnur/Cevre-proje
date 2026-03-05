'use client'

/**
 * /feed — Social Feed
 * Infinite scroll feed with posts, likes, and comments.
 * T4: Post creation modal wired ✅
 */

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useFeed } from '@/hooks/useFeed'
import { useStories } from '@/hooks/useStories'

// T8: Lazy-load the heavy modal — not needed on initial paint
const CreatePostModal = dynamic(() => import('./CreatePostModal'), {
  ssr: false,
  loading: () => null,
})

export default function FeedPage() {
  const { posts, isLoading, isLoadingMore, hasMore, loadMore, toggleLike } = useFeed()
  const { storyFeed, isLoading: storiesLoading } = useStories()
  const [showCreatePost, setShowCreatePost] = useState(false)

  return (
    <div className="max-w-xl mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 glass border-b border-slate-100 px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Akış</h1>
        <button
          onClick={() => setShowCreatePost(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition shadow-sm shadow-emerald-200"
          aria-label="Yeni gönderi oluştur"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </header>

      {/* ── Stories ────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex gap-3 overflow-x-auto scrollbar-none">
        {storiesLoading ? (
          // Skeleton
          [1,2,3,4,5].map(i => (
            <div key={i} className="shrink-0 flex flex-col items-center gap-1 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-gray-200" />
              <div className="h-2 w-10 bg-gray-100 rounded-full" />
            </div>
          ))
        ) : storyFeed.length === 0 ? (
          // Placeholder when no stories
          [1,2,3,4,5].map(i => (
            <div key={i} className="shrink-0 flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white ring-2 ring-emerald-300" />
              <span className="text-[10px] text-gray-400 truncate w-14 text-center">Hikaye</span>
            </div>
          ))
        ) : (
          storyFeed.map(item => (
            <button
              key={item.user_id}
              className="shrink-0 flex flex-col items-center gap-1 cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-full border-2 border-white ${item.has_unseen ? 'ring-2 ring-emerald-400' : 'ring-2 ring-gray-200'} overflow-hidden bg-gray-100`}>
                {item.avatar_url ? (
                  <img src={item.avatar_url} alt={item.full_name ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                )}
              </div>
              <span className="text-[10px] text-gray-500 truncate w-14 text-center">
                {item.full_name?.split(' ')[0] ?? item.username ?? 'Kullanıcı'}
              </span>
            </button>
          ))
        )}
      </div>

      {/* ── Feed posts ─────────────────────────────────────── */}
      <div className="px-4 py-3 space-y-3">
        {isLoading ? (
          <>
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-card p-4 space-y-3 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 bg-slate-200 rounded-full w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded-full w-1/4" />
                  </div>
                </div>
                <div className="h-28 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🌱</p>
            <p className="font-semibold text-slate-700">Henüz gönderi yok</p>
            <p className="text-sm text-slate-400 mt-1">İlk gönderiyi sen paylaş!</p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <article key={post.id} className="bg-white rounded-2xl shadow-card overflow-hidden card-lift">
                {/* Post header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg overflow-hidden shrink-0">
                    {(post as any).users?.avatar_url ? (
                      <img src={(post as any).users.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {(post as any).users?.full_name ?? 'Kullanıcı'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(post.created_at ?? '').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition text-lg">⋯</button>
                </div>

                {/* Post content */}
                {post.content && (
                  <p className="px-4 pb-3 text-sm text-slate-700 leading-relaxed">{post.content}</p>
                )}

                {/* Post actions */}
                <div className="flex items-center gap-1 px-3 py-2 border-t border-slate-50">
                  <button
                    onClick={() => toggleLike(post.id, (post as any).has_liked ?? false)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition ${
                      (post as any).has_liked
                        ? 'text-rose-600 bg-rose-50'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {(post as any).has_liked ? '❤️' : '🤍'}
                    <span className="font-medium">{(post as any).like_count ?? 0}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-50 transition">
                    💬 <span className="font-medium">{(post as any).comment_count ?? 0}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-50 transition ml-auto">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                    Paylaş
                  </button>
                </div>
              </article>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-2.5 bg-white shadow-card border border-slate-100 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  {isLoadingMore ? '⏳ Yükleniyor…' : 'Daha fazla göster'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} />
      )}
    </div>
  )
}
