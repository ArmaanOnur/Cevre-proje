// packages/shared/src/auth.ts
// Auth akışı ile ilgili sabitler ve yardımcılar

export const AUTH_STEPS = {
  PHONE: 'phone',
  OTP: 'otp',
  PROFILE: 'profile',
  COMPLETE: 'complete',
} as const

export type AuthStep = typeof AUTH_STEPS[keyof typeof AUTH_STEPS]

export const OTP_LENGTH = 6
export const OTP_RESEND_SECONDS = 60
export const PHONE_FORMAT_HINT = 'ör. 0532 000 00 00'

/** Türk numarasını +90 formatına normalize et */
export function normalizePhoneForSupabase(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('90') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 11) return `+90${digits.slice(1)}`
  if (digits.length === 10) return `+90${digits}`
  return raw
}

/** Telefon numarası geçerli mi? */
export function isValidTurkishPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  return (
    (digits.startsWith('05') && digits.length === 11) ||
    (digits.startsWith('5') && digits.length === 10) ||
    (digits.startsWith('905') && digits.length === 12) ||
    (digits.startsWith('+905') && digits.length === 13)
  )
}

/** OTP kodu geçerli mi? */
export function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp)
}

/** Profil ilk kurulum için gerekli alanlar dolu mu? */
export function isProfileComplete(profile: {
  display_name?: string | null
  avatar_url?: string | null
} | null): boolean {
  return !!profile?.display_name && profile.display_name.trim().length >= 2
}
