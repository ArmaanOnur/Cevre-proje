// packages/shared/src/messaging.ts

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'file' 
  | 'location' 
  | 'post' 
  | 'sticker' 
  | 'voice_note'

export type ConversationType = 'direct' | 'group'
export type CallType = 'voice' | 'video'
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined' | 'failed'

export interface Conversation {
  id: string
  type: ConversationType
  name: string | null
  avatar_url: string | null
  created_by: string
  last_message_at: string | null
  
  unread_count?: number
  is_muted?: boolean
  is_pinned?: boolean
  
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  type: MessageType
  content: string | null
  media_url: string | null
  sent_at: string
  is_read?: boolean
  created_at: string
}

export interface Call {
  id: string
  conversation_id: string
  type: CallType
  status: CallStatus
  duration: number | null
  created_at: string
}

export function formatMessagePreview(message: Message): string {
  if (message.type === 'text') return message.content || ''
  const labels = { image: '📷 Fotoğraf', video: '🎥 Video', audio: '🎵 Ses' }
  return labels[message.type as keyof typeof labels] || message.type
}

export function formatCallDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  return `${mins}:${(seconds % 60).toString().padStart(2, '0')}`
}
