'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { notificationQueries } from '@cevre/supabase'
import type { Notification, NotificationCounts } from '@cevre/shared'
import { groupNotificationCounts } from '@cevre/shared'

export function useNotifications() {
  const supabase = createClient()
  const { user } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    cards: 0,
    skillSwaps: 0,
    neighborhoods: 0,
    safety: 0,
    system: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bildirimleri yükle
  const loadNotifications = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await notificationQueries.getAll(supabase, user.id)
      if (error) throw error
      
      const notifs = (data ?? []) as Notification[]
      setNotifications(notifs)
      
      const unread = notifs.filter(n => !n.is_read).length
      setUnreadCount(unread)
      setCounts(groupNotificationCounts(notifs))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bildirimler yüklenemedi')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user])

  // İlk yükleme
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Realtime abonelik
  useEffect(() => {
    if (!user) return
    
    const channel = notificationQueries.subscribe(supabase, user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newNotif = payload.new as Notification
        setNotifications(prev => [newNotif, ...prev])
        setUnreadCount(c => c + 1)
        setCounts(prev => {
          const updated = { ...prev, total: prev.total + 1 }
          
          // Kategoriye göre artır
          if (newNotif.type.startsWith('card_')) updated.cards++
          else if (newNotif.type.startsWith('skill_swap_')) updated.skillSwaps++
          else if (newNotif.type === 'neighborhood_welcome') updated.neighborhoods++
          else if (newNotif.type === 'safety_ping_reminder') updated.safety++
          else if (newNotif.type === 'system') updated.system++
          
          return updated
        })
        
        // Tarayıcı bildirimi göster (web)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotif.title, {
            body: newNotif.body,
            icon: '/icon-192.png',
            tag: newNotif.id,
          })
        }
      }
    })

    return () => { supabase.removeChannel(channel) }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Okundu işaretle
  const markAsRead = useCallback(async (notificationId: string) => {
    await notificationQueries.markAsRead(supabase, notificationId)
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
    setUnreadCount(c => Math.max(0, c - 1))
    
    // Counts'u yeniden hesapla
    const updatedNotifs = notifications.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    )
    setCounts(groupNotificationCounts(updatedNotifs))
  }, [supabase, notifications])

  // Tümünü okundu işaretle
  const markAllAsRead = useCallback(async () => {
    if (!user) return
    await notificationQueries.markAllAsRead(supabase, user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    setCounts(prev => ({ ...prev, total: 0, cards: 0, skillSwaps: 0, neighborhoods: 0, safety: 0, system: 0 }))
  }, [supabase, user])

  // Sil
  const deleteNotification = useCallback(async (notificationId: string) => {
    const notif = notifications.find(n => n.id === notificationId)
    await notificationQueries.delete(supabase, notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    
    if (notif && !notif.is_read) {
      setUnreadCount(c => Math.max(0, c - 1))
      const updatedNotifs = notifications.filter(n => n.id !== notificationId)
      setCounts(groupNotificationCounts(updatedNotifs))
    }
  }, [supabase, notifications])

  // Tarayıcı bildirim izni iste (web)
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported'
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission === 'denied') return 'denied'
    
    const permission = await Notification.requestPermission()
    return permission
  }, [])

  return {
    notifications,
    unreadCount,
    counts,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPermission,
    refresh: loadNotifications,
  }
}
