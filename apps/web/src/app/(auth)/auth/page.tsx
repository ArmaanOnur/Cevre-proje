'use client'

/**
 * /auth — Phone number entry
 * Step 1 of OTP auth flow.
 * Sends SMS OTP via Supabase.
 */

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { sendOtp } = useAuth()

  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function formatDisplay(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length <= 4) return digits
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(digits)
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phone.length < 10) {
      setError('Geçerli bir telefon numarası girin.')
      return
    }

    startTransition(async () => {
      try {
        const normalised = await sendOtp(phone)
        // Pass normalised phone (E.164) to verify page via URL param
        const redirect = searchParams.get('redirect') ?? ''
        router.push(`/auth/verify?phone=${encodeURIComponent(normalised)}&redirect=${encodeURIComponent(redirect)}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu.')
      }
    })
  }

  return (
    <>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Giriş yap</h2>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        Telefon numaranı gir, sana doğrulama kodu gönderelim.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Phone input */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Telefon numarası
          </label>
          <div className="flex gap-2">
            {/* Country prefix */}
            <div className="flex items-center gap-1.5 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 shrink-0 select-none">
              🇹🇷 <span className="text-slate-500">+90</span>
            </div>
            {/* Number input */}
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="555 123 4567"
              value={formatDisplay(phone)}
              onChange={handleChange}
              disabled={isPending}
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-base text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5" role="alert">
              <span className="text-base">⚠️</span> {error}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isPending || phone.length < 10}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold rounded-2xl shadow-sm shadow-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Kod gönderiliyor…
            </span>
          ) : 'Kod gönder →'}
        </button>
      </form>
    </>
  )
}
