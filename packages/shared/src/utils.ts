import { CARD_DEFAULTS } from './constants'

// ─── Tarih & Zaman ────────────────────────────────────────────────────────────

/** Kartın ne kadar süre sonra sona ereceğini Türkçe döndürür */
export function timeUntilExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Sona erdi'
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  if (hours > 0) return `${hours}s ${minutes}dk kaldı`
  return `${minutes} dakika kaldı`
}

/** n saat sonraki ISO string */
export function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString()
}

/** Türkçe tarih formatı */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

/** Ne kadar önce */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (minutes < 1) return 'az önce'
  if (minutes < 60) return `${minutes} dakika önce`
  if (hours < 24) return `${hours} saat önce`
  return `${days} gün önce`
}

// ─── Konum & Mesafe ──────────────────────────────────────────────────────────

/** İki koordinat arası Haversine mesafesi (metre) */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000 // Dünya yarıçapı (metre)
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Mesafeyi kullanıcı dostu string'e çevir */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

// ─── Telefon ─────────────────────────────────────────────────────────────────

/** Türk telefon numarasını +90 formatına çevir */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('90') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 11) return `+90${digits.slice(1)}`
  if (digits.length === 10) return `+90${digits}`
  return phone
}

/** Telefonu gizle: +90 532 *** ** 78 */
export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  if (normalized.length < 8) return phone
  return normalized.slice(0, 6) + ' *** ** ' + normalized.slice(-2)
}

// ─── Kart Yardımcıları ────────────────────────────────────────────────────────

/** Kart doluluk yüzdesi */
export function cardFillRate(current: number, max: number): number {
  return Math.min(100, Math.round((current / max) * 100))
}

/** Kart hâlâ katılıma açık mı? */
export function isCardJoinable(card: {
  status: string
  expires_at: string
  current_participants: number
  max_participants: number
}): boolean {
  return (
    card.status === 'active' &&
    new Date(card.expires_at) > new Date() &&
    card.current_participants < card.max_participants
  )
}

/** n saat sonrasına kart expiry oluştur */
export function makeCardExpiry(
  hours: number = CARD_DEFAULTS.DEFAULT_DURATION_HOURS
): string {
  return hoursFromNow(hours)
}

// ─── Genel Yardımcılar ────────────────────────────────────────────────────────

/** Türkçe karakter duyarsız küçük harf */
export function trLower(str: string): string {
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
}

/** Rastgele ID (UUID değil, kısa) */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 9)
}

/** Nesne anahtarlarını snake_case → camelCase */
export function toCamel<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ])
  ) as T
}
