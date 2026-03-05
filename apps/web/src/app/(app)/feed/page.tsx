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
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Akış</h1>
        <button
          onClick={() => setShowCreatePost(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition text-lg"
          aria-label="Yeni gönderi oluştur"
        >
          ✏️
        </button>
      </header>

      {/* Stories row */}
      <div className="px-4 py-3 flex gap-3 overflow-x-auto scrollbar-none border-b border-gray-100 bg-white">
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

      {/* Feed posts */}
      <div className="px-4 py-2 space-y-4">
        {isLoading ? (
          <>
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 bg-gray-200 rounded-full w-1/3" />
                    <div className="h-2.5 bg-gray-100 rounded-full w-1/4" />
                  </div>
                </div>
                <div className="h-32 bg-gray-100 rounded-xl" />
                <div className="h-2.5 bg-gray-100 rounded-full w-3/4" />
              </div>
            ))}
          </>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌱</p>
            <p className="font-semibold text-gray-700">Henüz gönderi yok</p>
            <p className="text-sm text-gray-400 mt-1">İlk gönderiyi sen paylaş!</p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <article key={post.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Post header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg overflow-hidden">
                    {(post as any).users?.avatar_url ? (
                      <img src={(post as any).users.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {(post as any).users?.full_name ?? 'Kullanıcı'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(post.created_at ?? '').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 text-lg">⋯</button>
                </div>

                {/* Post content */}
                {post.content && (
                  <p className="px-4 pb-3 text-sm text-gray-700 leading-relaxed">{post.content}</p>
                )}

                {/* Post actions */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-50">
                  <button
                    onClick={() => toggleLike(post.id, (post as any).has_liked ?? false)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition"
                  >
                    {(post as any).has_liked ? '❤️' : '🤍'} <span>{(post as any).like_count ?? 0}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-500 transition">
                    💬 <span>{(post as any).comment_count ?? 0}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-500 transition ml-auto">
                    ↗️ Paylaş
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
                  className="px-6 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
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
