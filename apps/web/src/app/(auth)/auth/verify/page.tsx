'use client'

/**
 * /auth/verify — OTP verification
 * Step 2: 6-digit code entry with auto-submit.
 * Phone is passed via URL param (E.164 format).
 */

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60 // seconds

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { verifyOtp, sendOtp } = useAuth()

  const phone = decodeURIComponent(searchParams.get('phone') ?? '')
  const redirect = decodeURIComponent(searchParams.get('redirect') ?? '')

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [isPending, startTransition] = useTransition()
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  // Countdown for resend button
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    const code = digits.join('')
    if (code.length === OTP_LENGTH && !isPending) {
      submitCode(code)
    }
  }, [digits]) // eslint-disable-line react-hooks/exhaustive-deps

  function submitCode(code: string) {
    startTransition(async () => {
      try {
        const { user } = await verifyOtp(phone, code)
        if (!user) throw new Error('Doğrulama başarısız.')

        // Check if profile is already created
        const destination = redirect || '/map'
        // Middleware will handle /auth/setup redirect if profile is incomplete
        router.replace(destination)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Doğrulama başarısız.')
        setDigits(Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
      }
    })
  }

  function handleInput(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError('')

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    const next = [...digits]
    text.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus()
  }

  async function handleResend() {
    if (cooldown > 0) return
    try {
      await sendOtp(phone)
      setCooldown(RESEND_COOLDOWN)
      setError('')
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod gönderilemedi.')
    }
  }

  const displayPhone = phone.replace(/(\+\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')

  return (
    <>
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">📱</div>
        <h2 className="text-xl font-semibold text-gray-900">Kodu gir</h2>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-medium text-gray-700">{displayPhone}</span> numarasına
          gönderilen 6 haneli kodu girin.
        </p>
      </div>

      {/* OTP digit inputs */}
      <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            autoFocus={i === 0}
            disabled={isPending}
            onChange={e => handleInput(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className={`w-11 h-14 text-center text-xl font-bold border-2 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50
              ${digit ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'}
              ${error ? 'border-red-400 bg-red-50' : ''}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-sm text-red-600 mb-3" role="alert">{error}</p>
      )}

      {isPending && (
        <div className="flex justify-center mb-3">
          <svg className="animate-spin h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        </div>
      )}

      {/* Resend */}
      <div className="text-center mt-2">
        {cooldown > 0 ? (
          <p className="text-sm text-gray-400">
            Kodu tekrar gönder ({cooldown}s)
          </p>
        ) : (
          <button
            onClick={handleResend}
            className="text-sm text-emerald-600 font-medium hover:underline"
          >
            Kodu tekrar gönder
          </button>
        )}
      </div>

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 transition"
      >
        ← Geri dön
      </button>
    </>
  )
}
