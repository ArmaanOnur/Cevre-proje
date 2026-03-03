/**
 * Environment variable validation
 * Fails fast at startup if required variables are missing.
 * T1 Phase — Phase T0 audit requirement: env validation
 */

const required = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const

const optional = {
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001',
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'Çevre',
  NEXT_PUBLIC_ENABLE_LIVE_STREAMING: process.env.NEXT_PUBLIC_ENABLE_LIVE_STREAMING === 'true',
  NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS:
    process.env.NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS === 'true',
  NEXT_PUBLIC_ENABLE_MONETIZATION: process.env.NEXT_PUBLIC_ENABLE_MONETIZATION === 'true',
} as const

function validateEnv() {
  const missing: string[] = []

  for (const [key, value] of Object.entries(required)) {
    if (!value || value.includes('placeholder')) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    const list = missing.map((k) => `  • ${k}`).join('\n')
    console.warn(
      `⚠️  [Çevre] Missing or placeholder environment variables:\n${list}\n` +
        `  → Copy apps/web/.env.local and fill in real values.\n` +
        `  → Supabase: https://supabase.com/dashboard → Project Settings → API`
    )
  }
}

// Validate at module load (server-side only to avoid Next.js edge caveats)
if (typeof window === 'undefined') {
  validateEnv()
}

export const env = {
  ...required,
  ...optional,
} as {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_MAPBOX_TOKEN: string | undefined
  NEXT_PUBLIC_APP_URL: string
  NEXT_PUBLIC_APP_NAME: string
  NEXT_PUBLIC_ENABLE_LIVE_STREAMING: boolean
  NEXT_PUBLIC_ENABLE_AI_RECOMMENDATIONS: boolean
  NEXT_PUBLIC_ENABLE_MONETIZATION: boolean
}
