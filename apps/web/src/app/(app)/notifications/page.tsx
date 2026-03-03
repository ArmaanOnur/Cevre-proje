'use client'

/**
 * /notifications — Notification center
 * Real-time notifications with mark-as-read and categorized tabs.
 */

import { useNotifications } from '@/hooks/useNotifications'

const TYPE_ICONS: Record<string, string> = {
  like:         '❤️',
  comment:      '💬',
  follow:       '👤',
  follow_req:   '🤝',
  join:         '🎉',
  mention:      '@',
  message:      '📩',
  system:       '📢',
}

export default function NotificationsPage() {
  const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } = useNotifications()

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-gray-900">Bildirimler</h1>
          {unreadCount > 0 && (
            <span className="min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-emerald-600 font-medium hover:underline"
          >
            Tümünü okundu say
          </button>
        )}
      </header>

      {/* Notification list */}
      <div className="divide-y divide-gray-50">
        {isLoading ? (
          <>
            {[1,2,3,4].map(i => (
              <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </>
        ) : !notifications?.length ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔔</p>
            <p className="font-semibold text-gray-700">Henüz bildirim yok</p>
            <p className="text-sm text-gray-400 mt-1">Aktivite ve etkileşimler burada görünür</p>
          </div>
        ) : (
          notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left
                ${!notif.is_read ? 'bg-emerald-50/40' : 'bg-white'}`}
            >
              {/* Icon / Avatar */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl overflow-hidden">
                  {(notif as any).actor?.avatar_url ? (
                    <img src={(notif as any).actor.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    TYPE_ICONS[notif.type] ?? '📢'
                  )}
                </div>
                {/* Type icon overlay */}
                {(notif as any).actor?.avatar_url && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs border border-gray-100">
                    {TYPE_ICONS[notif.type] ?? '📢'}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                  {notif.title}
                </p>
                {notif.body && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(notif.created_at ?? '').toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Unread dot */}
              {!notif.is_read && (
                <span className="shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
