// Zod runtime validation şemaları
// npm install zod  (her iki app'te de)

import { CARD_DEFAULTS, VALIDATION, APP_CONFIG } from './constants'

// Zod olmadan çalışan basit validator tipleri
// Zod kurulduğunda burası z.object() ile değiştirilir

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> }

// ─── Profil ───────────────────────────────────────────────────────────────────

export interface ProfileFormData {
  display_name: string
  bio?: string
  phone: string
}

export function validateProfile(data: ProfileFormData): ValidationResult<ProfileFormData> {
  const errors: Record<string, string> = {}

  if (!data.display_name || data.display_name.trim().length < VALIDATION.DISPLAY_NAME_MIN) {
    errors.display_name = `İsim en az ${VALIDATION.DISPLAY_NAME_MIN} karakter olmalı`
  }
  if (data.display_name?.length > VALIDATION.DISPLAY_NAME_MAX) {
    errors.display_name = `İsim en fazla ${VALIDATION.DISPLAY_NAME_MAX} karakter olabilir`
  }
  if (data.bio && data.bio.length > VALIDATION.BIO_MAX) {
    errors.bio = `Bio en fazla ${VALIDATION.BIO_MAX} karakter olabilir`
  }
  if (!VALIDATION.PHONE_REGEX.test(data.phone)) {
    errors.phone = 'Geçerli bir Türk telefon numarası girin'
  }

  if (Object.keys(errors).length > 0) return { success: false, errors }
  return { success: true, data }
}

// ─── Aktivite Kartı ───────────────────────────────────────────────────────────

export interface CardFormData {
  title: string
  description?: string
  category: string
  location_name: string
  lat: number
  lng: number
  max_participants: number
  duration_hours: number
}

export function validateCard(data: CardFormData): ValidationResult<CardFormData> {
  const errors: Record<string, string> = {}

  if (!data.title || data.title.trim().length < 5) {
    errors.title = 'Başlık en az 5 karakter olmalı'
  }
  if (data.title?.length > CARD_DEFAULTS.MAX_TITLE_LENGTH) {
    errors.title = `Başlık en fazla ${CARD_DEFAULTS.MAX_TITLE_LENGTH} karakter olabilir`
  }
  if (data.description && data.description.length > CARD_DEFAULTS.MAX_DESCRIPTION_LENGTH) {
    errors.description = `Açıklama en fazla ${CARD_DEFAULTS.MAX_DESCRIPTION_LENGTH} karakter olabilir`
  }
  if (!data.category) {
    errors.category = 'Kategori seçin'
  }
  if (!data.location_name || data.location_name.trim().length < 2) {
    errors.location_name = 'Konum adı girilmeli'
  }
  if (!data.lat || !data.lng) {
    errors.location_name = 'Konum seçilmeli'
  }
  if (
    data.max_participants < CARD_DEFAULTS.MIN_PARTICIPANTS ||
    data.max_participants > CARD_DEFAULTS.MAX_PARTICIPANTS
  ) {
    errors.max_participants = `Katılımcı sayısı ${CARD_DEFAULTS.MIN_PARTICIPANTS}-${CARD_DEFAULTS.MAX_PARTICIPANTS} arasında olmalı`
  }
  if (!CARD_DEFAULTS.DURATION_OPTIONS_HOURS.includes(data.duration_hours as any)) {
    errors.duration_hours = 'Geçerli bir süre seçin'
  }

  if (Object.keys(errors).length > 0) return { success: false, errors }
  return { success: true, data }
}

// ─── Beceri Takası ────────────────────────────────────────────────────────────

export interface SkillSwapFormData {
  skill_offered: string
  skill_wanted: string
  description?: string
}

export function validateSkillSwap(data: SkillSwapFormData): ValidationResult<SkillSwapFormData> {
  const errors: Record<string, string> = {}

  if (!data.skill_offered || data.skill_offered.trim().length < 2) {
    errors.skill_offered = 'Sunduğunuz beceriyi belirtin'
  }
  if (!data.skill_wanted || data.skill_wanted.trim().length < 2) {
    errors.skill_wanted = 'Aradığınız beceriyi belirtin'
  }
  if (data.skill_offered === data.skill_wanted) {
    errors.skill_wanted = 'Sunulan ve aranan beceri aynı olamaz'
  }

  if (Object.keys(errors).length > 0) return { success: false, errors }
  return { success: true, data }
}

// ─── OTP ─────────────────────────────────────────────────────────────────────

export function validateOtp(otp: string): ValidationResult<{ otp: string }> {
  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    return { success: false, errors: { otp: '6 haneli kodu girin' } }
  }
  return { success: true, data: { otp } }
}

// ─── Şikayet ─────────────────────────────────────────────────────────────────

export interface ReportFormData {
  reason: string
  description?: string
}

export const REPORT_REASONS = [
  { value: 'spam',            label: 'Spam / Reklam' },
  { value: 'taciz',           label: 'Taciz veya Tehdit' },
  { value: 'sahte_profil',    label: 'Sahte Profil' },
  { value: 'uygunsuz_icerik', label: 'Uygunsuz İçerik' },
  { value: 'diger',           label: 'Diğer' },
] as const
