'use client'

/**
 * useNotifications â€” T2 Refactor
 * Reads: useSWR + NotificationService
 * Realtime: Supabase channel â†’ optimistic mutate
 */

import { useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'
import { NotificationService } from '@/services/notification.service'
import { queryKeys } from '@/lib/query-keys'
import type { Notification } from '@cevre/shared'

export function useNotifications() {
  const { user } = useAuth()

  // â”€â”€ SWR read: notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: notifications = [], isLoading, error, mutate } = useSWR<Notification[]>(
    user ? queryKeys.notifications(user.id) : null,
    () => NotificationService.getAll(user!.id)
      .then(r => { if (r.error) throw r.error; return (r.data ?? []) as Notification[] }),
    { revalidateOnFocus: false, refreshInterval: 60_000 }
  )

  const unreadCount = notifications.filter(n => !n.is_read).length
  const counts = NotificationService.computeCounts(notifications as any[])

  // â”€â”€ Realtime: new notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!user) return
    const channel = NotificationService.subscribe(user.id, (newNotif) => {
      mutate(prev => [newNotif as Notification, ...(prev ?? [])], { revalidate: false })
      NotificationService.showBrowserNotification(
        (newNotif as any).title,
        (newNotif as any).body,
        (newNotif as any).id
      )
    })
    return () => { channel.unsubscribe() }
  }, [user, mutate])

  // â”€â”€ Write: mark single as read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const markAsRead = useCallback(async (notificationId: string) => {
    mutate(
      prev => prev?.map(n => n.id === notificationId ? { ...n, is_read: true } : n),
      { revalidate: false }
    )
    await NotificationService.markAsRead(notificationId)
  }, [mutate])

  // â”€â”€ Write: mark all as read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const markAllAsRead = useCallback(async () => {
    if (!user) return
    mutate(prev => prev?.map(n => ({ ...n, is_read: true })), { revalidate: false })
    await NotificationService.markAllAsRead(user.id)
  }, [user, mutate])

  // â”€â”€ Write: delete notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const deleteNotification = useCallback(async (notificationId: string) => {
    mutate(prev => prev?.filter(n => n.id !== notificationId), { revalidate: false })
    await NotificationService.delete(notificationId)
  }, [mutate])

  // â”€â”€ Browser push permission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const requestPushPermission = useCallback(
    () => NotificationService.requestBrowserPermission(), []
  )

  return {
    notifications,
    unreadCount,
    counts,
    isLoading,
    error: error ? String(error) : null,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPushPermission,
    refresh: () => mutate(),
  }
}
